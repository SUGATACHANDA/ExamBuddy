// utils/mailer.js
const nodemailer = require("nodemailer");

// Configure your transporter
const transporter = nodemailer.createTransport({
    service: "gmail", // or "outlook", "yahoo", or use custom SMTP
    auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS, // app password (NOT normal password)
    },
});

/**
 * Send email
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
const sendEmail = async (to, subject, html) => {
    await transporter.sendMail({
        from: `"ExamBuddy Support" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
};

module.exports = sendEmail;
