import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const to = formData.getAll("to") as string[];
        const subject = formData.get("subject") as string;
        const text = formData.get("text") as string;
        const resume = formData.get("resume") as File;

        const bytes = await resume.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to.join(", "),
            subject,
            text,
            attachments: [
                {
                    filename: resume.name,
                    content: buffer,
                },
            ],
        });

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { success: false },
            { status: 500 }
        );
    }
}