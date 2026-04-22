import { NextResponse } from "next/server";

export async function GET() {
    try {
        const key = process.env.GEMINI_API_KEY;

        if (!key) {
            return NextResponse.json(
                { success: false, message: "Missing GEMINI_API_KEY" },
                { status: 500 }
            );
        }

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        );

        const data = await res.json();

        return NextResponse.json({
            success: res.ok,
            status: res.status,
            data,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                message: error?.message || "Failed to list models",
            },
            { status: 500 }
        );
    }
}