// backend/emails/PasswordResetOTPEmail.js
const PasswordResetOTPEmail = ({ name, otp }) => {
    return `
  <div style="max-width:600px;margin:auto;background:#f9fafb;padding:30px;border-radius:12px;
              font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
    <div style="text-align:center;">
      <h1 style="color:#2563eb;">🔐 Password Reset Request</h1>
      <p style="font-size:16px;">Hello <b>${name}</b>,</p>
      <p>You requested to reset your password. Please use the OTP below:</p>
      <div style="margin:20px 0;font-size:32px;font-weight:bold;color:#2563eb;
                  letter-spacing:8px;background:#fff;padding:15px;border-radius:10px;
                  display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        ${otp}
      </div>
      <p style="margin-top:10px;font-size:14px;color:#6b7280;">
        This OTP is valid for <b>10 minutes</b>. Please do not share it with anyone.
      </p>
      <p>If you did not request this, please <a href="mailto:support@exambuddy.com" style="color:#dc2626;text-decoration:none;">contact support</a> immediately.</p>
    </div>
    <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;">
    <p style="text-align:center;font-size:12px;color:#9ca3af;">
      © ${new Date().getFullYear()} ExamBuddy. All rights reserved.
    </p>
  </div>
  `;
};

module.exports = PasswordResetOTPEmail;
