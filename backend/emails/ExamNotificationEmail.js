// --- START OF FILE ExamNotificationEmail.js ---
const DeepLinkToken = require('../models/DeepLinkToken')
const crypto = require("crypto");

const ExamNotificationEmail = async ({ name, examTitle, subject, startTime, examId, duration }) => {
  const startDate = new Date(startTime);
  const formattedDate = startDate.toLocaleString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const token = crypto.randomUUID(); // NEW
  const tokenRecord = await DeepLinkToken.create({
    token,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  const redirectUrl = `https://exam-buddy-backend.vercel.app/open?token=${tokenRecord.token}`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exam Notification</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f5f7fa;
      font-family: 'Inter', Arial, sans-serif;
      color: #1a1a1a;
    }

    .wrapper {
      max-width: 640px;
      margin: 28px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }

    .header {
      background: #0f172a;
      padding: 32px 20px;
      text-align: center;
      color: #ffffff;
    }

    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }

    .header p {
      margin: 6px 0 0;
      font-size: 14px;
      opacity: 0.85;
    }

    .content {
      padding: 26px;
      line-height: 1.65;
      font-size: 15px;
    }

    .content h2 {
      font-size: 17px;
      margin-bottom: 14px;
      font-weight: 600;
      color: #111827;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
    }

    .info-box {
      background: #fafafa;
      border: 1px solid #e5e7eb;
      padding: 18px;
      border-radius: 10px;
      margin: 18px 0;
    }

    .info-row {
      margin: 6px 0;
      font-size: 14px;
    }

    .label {
      font-weight: 600;
      color: #374151;
    }

    .cta-btn {
      display: inline-block;
      background: #0f172a;
      color: white;
      padding: 12px 18px;
      font-size: 14px;
      border-radius: 6px;
      text-decoration: none;
      margin-top: 16px;
    }

    .cta-btn:hover {
      background: #1e293b;
    }

    .countdown-container {
      text-align: center;
      margin: 22px 0;
    }

    .countdown-container img {
      width: 100%;
      max-width: 380px;
      border-radius: 6px;
    }

    .footer {
      padding: 16px;
      background: #f8f9fc;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    @media (max-width: 600px) {
      .wrapper { margin: 10px; }
      .content { padding: 18px; }
    }
  </style>
  </head>

  <body>
  <div class="wrapper">
    
    <!-- Header -->
    <div class="header">
      <h1>Upcoming Exam Reminder</h1>
      <p>Your exam details are below</p>
    </div>

    <!-- Body Content -->
    <div class="content">
      <p>Hello <b>${name}</b>,</p>
      <p>This is a reminder for your upcoming scheduled exam. Please review the information:</p>

      <div class="info-box">
        <div class="info-row"><span class="label">Exam Title:</span> ${examTitle}</div>
        <div class="info-row"><span class="label">Subject:</span> ${subject}</div>
        <div class="info-row"><span class="label">Date & Time:</span> ${formattedDate}</div>
        <div class="info-row"><span class="label">Duration:</span> ${duration} minutes</div>
      </div>

      <a href="${redirectUrl}"
   style="padding:12px 18px; background:#136CFB;color:white;border-radius:6px;text-decoration:none;">
   Open ExamBuddy
</a>

      <p>Prepare well and stay confident. Wishing you success!</p>
      <p>Best regards,<br><b>ExamBuddy Team</b></p>
    </div>

    <!-- Footer -->
    <div class="footer">
      © ${new Date().getFullYear()} ExamBuddy — Automated Exam Notification System
    </div>

  </div>
  </body>
  </html>
  `;
};

module.exports = ExamNotificationEmail;
