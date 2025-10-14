// backend/emails/ExamResultEmail.js
const ExamResultEmail = ({ name, examTitle, score, total, percentage, status, rank }) => {
    const color = status === "Pass" ? "#16a34a" : "#dc2626";
    return `
  <div style="max-width:650px;margin:auto;background:#f9fafb;border-radius:12px;
              font-family:Arial,sans-serif;color:#111827;overflow:hidden;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:25px;text-align:center;color:white;">
      <h1 style="margin:0;">🎓 ExamBuddy Results</h1>
      <p style="margin:8px 0 0;font-size:16px;">Your ${examTitle} performance summary</p>
    </div>

    <!-- Body -->
    <div style="padding:30px;">
      <p>Hello <b>${name}</b>,</p>
      <p>Thank you for completing the <b>${examTitle}</b> exam! Here’s your result summary:</p>

      <!-- Result Card -->
      <div style="margin:20px 0;padding:20px;background:#ffffff;border:1px solid #e5e7eb;
                  border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
        <p style="margin:8px 0;font-size:16px;"><b>Score:</b> ${score} / ${total}</p>
        <p style="margin:8px 0;font-size:16px;"><b>Percentage:</b> ${percentage}%</p>
        <p style="margin:8px 0;font-size:16px;">
          <b>Status:</b> <span style="color:${color};font-weight:bold;">${status}</span>
        </p>
        ${rank ? `<p style="margin:8px 0;font-size:16px;"><b>Rank:</b> #${rank}</p>` : ""}
      </div>

      <p style="margin-top:10px;">Keep up the ${status === "Pass" ? "great" : "hard"} work and continue improving with each attempt.</p>

      <p style="margin-top:25px;font-size:14px;color:#6b7280;text-align:center;">
        This result was generated automatically. Please contact your teacher or department if you have questions.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;text-align:center;padding:15px;">
      <p style="margin:0;font-size:12px;color:#6b7280;">
        © ${new Date().getFullYear()} ExamBuddy. All rights reserved.
      </p>
    </div>
  </div>`;
};

module.exports = ExamResultEmail;
