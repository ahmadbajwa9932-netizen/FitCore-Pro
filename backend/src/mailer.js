const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"FLEXOS GYM" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your Password Reset Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color:#15316e;">Password Reset</h2>
        <p>Use the code below to reset your password. It expires in 10 minutes.</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background:#f1f2f5; padding: 16px; text-align:center; border-radius:8px;">${otp}</div>
        <p style="color:#6b7280; font-size:13px; margin-top:16px;">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };