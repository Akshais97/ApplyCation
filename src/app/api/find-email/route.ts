/* src/app/api/find-email/route.ts */

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const EMAIL_REGEX =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function uniqueEmails(
    emails: string[]
) {
    return [
        ...new Set(
            emails.map((e) =>
                e.trim().toLowerCase()
            )
        ),
    ];
}

function cleanJson(
    text: string
) {
    return text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
}

function safeParse(
    text: string
) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function extractEmails(
    text: string
) {
    return text.match(
        EMAIL_REGEX
    ) || [];
}

export async function POST(
    req: Request
) {
    try {
        const { company, serpApiKey, geminiApiKey } =
            await req.json();

        if (
            !company ||
            !company.trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Company name is required",
                },
                { status: 400 }
            );
        }

        const cleanCompany =
            company.trim();

        const serpKey = serpApiKey || process.env.SERP_API_KEY;
        if (!serpKey) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Serper API Key is required",
                },
                { status: 400 }
            );
        }

        const geminiKey = geminiApiKey || process.env.GEMINI_API_KEY;

        /* ----------------------------------
           1. SERPER SEARCH (USA MODE)
        -----------------------------------*/
        const serpRes =
            await fetch(
                "https://google.serper.dev/search",
                {
                    method: "POST",
                    headers: {
                        "X-API-KEY":
                            serpKey,
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        q: `${cleanCompany} HR Career Email`,
                        gl: "us",
                        hl: "en",
                    }),
                }
            );

        const serpData =
            await serpRes.json();

        const organic =
            serpData.organic ||
            [];

        const answerBox =
            serpData.answerBox ||
            {};

        const knowledgeGraph =
            serpData.knowledgeGraph ||
            {};

        const allSearchText = [
            JSON.stringify(
                answerBox
            ),
            JSON.stringify(
                knowledgeGraph
            ),
            ...organic.map(
                (item: any) =>
                    `${item.title || ""}
${item.snippet || ""}
${item.link || ""}`
            ),
        ].join("\n\n");

        /* ----------------------------------
           3. EXTRACT EMAILS FROM SERPER
        -----------------------------------*/
        let serpEmails =
            extractEmails(
                allSearchText
            );

        serpEmails =
            uniqueEmails(
                serpEmails
            );

        /* ----------------------------------
           4. GEMINI FAILSAFE SEARCH
           ONLY APPEND MORE EMAILS
        -----------------------------------*/
        let geminiEmails: string[] =
            [];

        let domain = "";
        let confidence =
            "unknown";

        if (geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model =
                    genAI.getGenerativeModel(
                        {
                            model:
                                "gemini-2.5-flash-lite",

                            systemInstruction:
                                "You are an email extraction assistant. Only extract public emails. Never invent emails. Return only JSON.",

                            generationConfig:
                            {
                                temperature:
                                    0.1,
                            },
                        }
                    );

                const prompt = `
Company Name:
${cleanCompany}

Search Result Data:
${allSearchText}

Already Found Emails:
${JSON.stringify(
                    serpEmails
                )}

Task:
Look carefully through the provided text.

Find ONLY additional real public emails that are visible in the text but may have been missed.

DO NOT guess.
DO NOT generate likely emails.
DO NOT remove existing emails.

Return ONLY JSON:

{
  "emails": [],
  "domain": "",
  "confidence": "high|medium|low"
}
`;

                const result =
                    await model.generateContent(
                        prompt
                    );

                const raw =
                    result.response.text();

                const parsed =
                    safeParse(
                        cleanJson(
                            raw
                        )
                    );

                if (parsed) {
                    geminiEmails =
                        parsed.emails ||
                        [];

                    domain =
                        parsed.domain ||
                        "";

                    confidence =
                        parsed.confidence ||
                        "unknown";
                }
            } catch {
                // Gemini fallback failure ignored
            }
        }

        /* ----------------------------------
           5. APPEND BOTH SOURCES
        -----------------------------------*/
        let finalEmails =
            uniqueEmails([
                ...serpEmails,
                ...geminiEmails,
            ]);

        finalEmails =
            finalEmails.slice(
                0,
                3
            );

        if (
            finalEmails.length ===
            0
        ) {
            return NextResponse.json({
                success: false,
                message:
                    "No emails found",
            });
        }

        if (!domain) {
            domain =
                finalEmails[0].split(
                    "@"
                )[1] || "";
        }



        /* ----------------------------------
           7. RETURN TO FRONTEND
        -----------------------------------*/
        return NextResponse.json({
            success: true,
            emails: finalEmails,
            domain,
            confidence,
            source:
                "serper+gemini",
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