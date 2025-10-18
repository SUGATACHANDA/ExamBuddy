// --- START OF FILE ExamNotificationEmail.js ---

const ExamNotificationEmail = ({ name, examTitle, subject, startTime, duration, examId }) => {
  const startDate = new Date(startTime);
  const formattedDate = startDate.toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Replace with your backend base URL
  const API_BASE_URL = process.env.API_BASE_URL;
  const countdownImageUrl = `${API_BASE_URL}/api/exams/countdown/${examId}.gif`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Upcoming Exam Notification</title>
    <style>
      body {
        font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
        margin: 0;
        padding: 0;
      }

      .container {
        max-width: 640px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 6px 25px rgba(0,0,0,0.08);
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }

      .header {
        background: linear-gradient(135deg, #2563eb, #1e40af);
        padding: 28px 20px;
        text-align: center;
        color: #ffffff;
      }

      .header h1 {
        font-size: 26px;
        margin: 0;
        letter-spacing: 0.5px;
      }

      .header p {
        margin: 8px 0 0;
        font-size: 15px;
        opacity: 0.9;
      }

      .content {
        padding: 30px;
        line-height: 1.6;
      }

      .content h2 {
        margin-top: 0;
        color: #1e3a8a;
        font-size: 20px;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 6px;
        margin-bottom: 15px;
      }

      .exam-card {
        background: #f9fafb;
        padding: 22px 20px;
        border-radius: 12px;
        margin: 20px 0;
        border: 1px solid #e2e8f0;
      }

      .exam-card p {
        margin: 8px 0;
        font-size: 15px;
      }

      .countdown-container {
        width: 100%;
        text-align: center;
        margin: 20px 0 10px;
      }

      .countdown-container img {
        width: 90%;
        max-width: 400px;
        border-radius: 8px;
      }

      .cta-button {
        display: inline-block;
        background: #2563eb;
        color: #ffffff;
        text-decoration: none;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 15px;
        margin-top: 10px;
        transition: background 0.3s ease;
      }

      .cta-button:hover {
        background: #1e40af;
      }

      .footer {
        background: #f1f5f9;
        text-align: center;
        padding: 18px;
        font-size: 13px;
        color: #64748b;
      }

      @media (max-width: 600px) {
        .container {
          margin: 20px;
        }
        .content {
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📅 Upcoming Exam Reminder</h1>
        <p>Your exam details are summarized below</p>
      </div>

      <div class="content">
        <p>Dear <b>${name}</b>,</p>
        <p>This is a friendly reminder about your upcoming exam. Please review the details carefully:</p>

        <div class="exam-card">
          <p><b>Exam Title:</b> ${examTitle}</p>
          <p><b>Subject:</b> ${subject}</p>
          <p><b>Scheduled Date:</b> ${formattedDate}</p>
          <p><b>Duration:</b> ${duration} minutes</p>
        </div>

        <p>We wish you the very best in your preparation. Stay focused and confident!</p>
        <p>— <b>ExamBuddy Team</b></p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ExamBuddy • Automated Exam Notification System</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = ExamNotificationEmail;
