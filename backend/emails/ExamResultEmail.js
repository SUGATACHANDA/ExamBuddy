// backend/emails/ExamResultEmail.js
const ExamResultEmail = ({ name, examTitle, score, total, percentage, status, rank, subject }) => {
  const statusColor = status === "Pass" ? "#22c55e" : "#ef4444"; // Tailwind-inspired tones

  return `
  <div style="
      max-width: 620px;
      margin: auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #111827;">
      
    <!-- Header -->
    <div style="
        background: #1f2937;
        padding: 28px;
        text-align: center;
        border-radius: 10px 10px 0 0;
        color: #ffffff;">
      <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Exam Result Summary</h2>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.85;">${examTitle}</p>
    </div>

    <!-- Body -->
    <div style="padding: 26px;">
      <p style="margin: 0 0 12px;">Hello <strong>${name}</strong>,</p>
      <p style="margin: 0 0 20px;">
        Your exam results are now available. Below is a summary of your performance:
      </p>

      <div style="display:flex; margin-bottom: 16px; gap: 12px;">
        ${subject ? `<span style="font-size:13px; color:#374151; background:#f1f5f9; padding:8px 10px; border-radius:8px; border:1px solid #e5e7eb;">Subject: <strong style="margin-left:6px; color:#111827;">${subject}</strong></span>` : ""}
        <span style="font-size:13px; color:#374151; background:#f9fafb; padding:8px 10px; border-radius:8px; border:1px solid #e5e7eb;">Total Marks: <strong style="margin-left:6px; color:#111827;">${total}</strong></span>
      </div>

      <!-- Result Card -->
      <div style="
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;">
          
        <div style="margin-bottom: 8px;">
          <span style="font-weight: 600;">Score:</span> ${score} / ${total}
        </div>
        <div style="margin-bottom: 8px;">
          <span style="font-weight: 600;">Percentage:</span> ${percentage}%
        </div>
        <div style="margin-bottom: 8px;">
          <span style="font-weight: 600;">Status:</span> 
          <span style="font-weight: 600; color: ${statusColor};">${status}</span>
        </div>
        ${rank ? `<div><span style="font-weight: 600;">Rank:</span> ${rank}</div>` : ""}
      </div>

      <p style="margin-top: 22px; font-size: 14px; line-height: 1.6; color: #374151;">
        ${status === "Pass"
      ? "Congratulations on your achievement! Keep striving for excellence."
      : "Don't get discouraged — review your answers and keep improving. Every effort counts."
    }
      </p>
    </div>

    <!-- Footer -->
    <div style="
        background: #f3f4f6;
        text-align: center;
        padding: 16px;
        border-radius: 0 0 10px 10px;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        This is an automated email. If you have any questions, please contact your examination department.
      </p>
      <p style="margin: 6px 0 0; font-size: 11px; color: #9ca3af;">
        © ${new Date().getFullYear()} ExamBuddy • All rights reserved.
      </p>
    </div>
  </div>
  `;
};

module.exports = ExamResultEmail;
