/* src/app/api/find-email/route.ts */

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY!
);

export async function POST(req: Request) {
    try {
        const { company } = await req.json();

        if (!company || !company.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Company name is required",
                },
                { status: 400 }
            );
        }

        const cleanCompany =
            company.trim();

        /* ----------------------------------
           1. CHECK DATABASE FIRST
        -----------------------------------*/
        const { data: existing } =
            await supabase
                .from("company_contacts")
                .select("*")
                .ilike(
                    "company_name",
                    cleanCompany
                )
                .limit(3);

        if (
            existing &&
            existing.length > 0
        ) {
            const emails =
                existing.map(
                    (row) => row.email
                );

            return NextResponse.json({
                success: true,
                emails,
                source: "database",
                confidence:
                    existing[0]
                        ?.confidence ||
                    "verified",
            });
        }

        /* ----------------------------------
           2. GEMINI SEARCH + EXTRACTION
        -----------------------------------*/
        const model =
            genAI.getGenerativeModel({
                model:
                    "gemini-2.5-flash-lite",

                tools: [
                    {
                        // @ts-ignore
                        googleSearch: {},
                    },
                ],

                systemInstruction:
                    "You are a web research extraction assistant. Only extract facts explicitly found in search results or trusted public sources. Never infer company websites or invent emails. Return only valid JSON.",

                generationConfig: {
                    temperature: 0.1,
                },
            });


        const prompt = `
Perform a Google Search for the exact company name: "${company}"

Rules:
1. First determine whether this exact company exists publicly.
2. Match the company name carefully. Do not confuse with similarly named businesses.
3. Find the official website or trustworthy public profile.
4. Search snippets, official pages, LinkedIn, directories, careers/contact pages.

Extract ONLY email addresses that are explicitly visible in search results or public pages.

DO NOT:
- invent domains
- assume company website
- create likely emails
- use similar companies
- guess from company name

If exact company cannot be confidently identified, return empty results.

Return ONLY valid JSON:

{
  "company_matched": true,
  "exact_emails_found": [],
  "source_url": "",
  "verified_domain": "",
  "confidence": "high|medium|low"
}
`;

        const result = await model.generateContent(prompt);

        const raw = result.response.text();

        const cleaned = raw
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const parsed = JSON.parse(cleaned);

        let emails =
            parsed.emails || [];

        const domain =
            parsed.domain || "";

        const confidence =
            parsed.confidence ||
            "unknown";

        const foundOn =
            parsed.found_on ||
            "gemini-search";

        /* ----------------------------------
           3. CLEAN / VALIDATE EMAILS
        -----------------------------------*/
        emails = emails
            .filter(
                (email: string) =>
                    typeof email ===
                    "string"
            )
            .map(
                (email: string) =>
                    email
                        .trim()
                        .toLowerCase()
            )
            .filter(
                (email: string) =>
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                        email
                    )
            );

        emails = [
            ...new Set(emails),
        ].slice(0, 3);

        if (emails.length === 0) {
            return NextResponse.json({
                success: false,
                message:
                    "No verified emails found",
            });
        }

        /* ----------------------------------
           4. SAVE TO SUPABASE
        -----------------------------------*/
        for (const email of emails) {
            await supabase
                .from(
                    "company_contacts"
                )
                .upsert(
                    {
                        company_name:
                            cleanCompany,
                        domain,
                        email,
                        confidence,
                        source: foundOn,
                    },
                    {
                        onConflict:
                            "email",
                    }
                );
        }

        /* ----------------------------------
           5. RETURN TO FRONTEND
        -----------------------------------*/
        return NextResponse.json({
            success: true,
            emails,
            domain,
            source: foundOn,
            confidence,
        });
    } catch (error: any) {
        console.error(
            "FIND EMAIL ERROR:",
            error
        );

        if (
            error?.message?.includes(
                "429"
            ) ||
            error?.message?.includes(
                "quota"
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "AI quota reached. Try again shortly.",
                },
                { status: 429 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to find company emails",
            },
            { status: 500 }
        );
    }
}