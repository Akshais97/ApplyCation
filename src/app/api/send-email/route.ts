import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const to = formData.getAll("to") as string[];
        const subject = formData.get("subject") as string;
        const text = formData.get("text") as string;
        const resume = formData.get("resume") as File;

        const emailUser = (formData.get("emailUser") as string) || process.env.EMAIL_USER;
        const emailPass = (formData.get("emailPass") as string) || process.env.EMAIL_PASS;

        if (!emailUser || !emailPass) {
            return NextResponse.json({ success: false, message: "Missing email credentials" }, { status: 400 });
        }

        const bytes = await resume.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        await transporter.sendMail({
            from: emailUser,
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