"use server";

import nodemailer from "nodemailer";

export async function submitContactForm(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (!name || !email || !message) {
      return { success: false, message: "Missing required fields" };
    }

    // In a production app, you would configure these variables in .env
    // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_TO
    
    // For now we will setup a transporter that will use the env vars
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // Use `true` for port 465, `false` for all other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER, // Sender address
      to: process.env.SMTP_TO || process.env.SMTP_USER, // List of receivers
      subject: `New Contact Form Submission from ${name} ${lastName}`, // Subject line
      text: `Name: ${name} ${lastName}\nEmail: ${email}\nMessage: ${message}`, // plain text body
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #00d4aa;">New Bizdhan Contact Submission</h2>
          <p><strong>Name:</strong> ${name} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `, // html body
    };

    // Attempt to send the email
    // If credentials aren't set, this will fail in development but we return a generic success/error
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.warn("⚠️ SMTP credentials are not set. Simulating successful email send.");
      // Just simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    return { success: true, message: "Email sent successfully" };
  } catch (error: unknown) {
    console.error("Error sending contact email:", error);
    return { success: false, message: "Error sending email. Please try again later." };
  }
}
