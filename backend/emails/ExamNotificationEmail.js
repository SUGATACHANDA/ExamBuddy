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

  // IMPORTANT: Replace this with your actual backend server's base URL
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
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #f9fafb;
        color: #111827;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 650px;
        margin: 30px auto;
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.07);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        padding: 25px;
        text-align: center;
        color: #ffffff;
      }
      .header h1 {
        margin: 0;
        font-size: 26px;
      }
      .header p {
        margin: 8px 0 0;
        font-size: 15px;
        opacity: 0.9;
      }
      .content {
        padding: 30px;
      }
      .content h2 {
        margin-top: 0;
        color: #1e3a8a;
      }
      .exam-card {
        background: #f3f4f6;
        padding: 20px;
        border-radius: 10px;
        margin: 20px 0;
      }
      .exam-card p {
        margin: 6px 0;
        font-size: 15px;
      }
      /* Style for the countdown image container */
      .countdown-container {
        width: 100%;
        text-align: center;
        margin: 15px 0;
      }
      .countdown-container img {
        max-width: 100%;
        height: auto;
      }
      .footer {
        background: #f3f4f6;
        text-align: center;
        padding: 15px;
        font-size: 12px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📚 Upcoming Exam Alert</h1>
        <p>Stay prepared — your next challenge awaits!</p>
      </div>
      <div class="content">
        <p>Hi <b>${name}</b>,</p>
        <p>Your upcoming exam is scheduled soon. Here are the details:</p>

        <div class="exam-card">
          <p><b>Exam Title:</b> ${examTitle}</p>
          <p><b>Subject:</b> ${subject}</p>
          <p><b>Scheduled Date:</b> ${formattedDate}</p>
          <p><b>Duration:</b> ${duration} mins</p>
          <p><b>Time Remaining:</b></p>
           <!-- The live countdown image is now here -->
          <div class="countdown-container">
            <img src="${countdownImageUrl}" alt="Live Countdown Timer" />
          </div>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} ExamBuddy — Automated Exam Notification System</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = ExamNotificationEmail;