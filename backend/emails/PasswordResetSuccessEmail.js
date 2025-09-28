// backend/emails/PasswordResetSuccessEmail.js
const PasswordResetSuccessEmail = ({ name }) => {
    return `
  <div style="max-width:600px;margin:auto;background:#f9fafb;padding:30px;border-radius:12px;
              font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
    <div style="text-align:center;">
      <h1 style="color:#16a34a;">✅ Password Reset Successful</h1>
      <p style="font-size:16px;">Hello <b>${name}</b>,</p>
      <p>Your password has been successfully reset.</p>
      <div style="margin:20px 0;padding:15px;background:#ecfdf5;border:1px solid #6ee7b7;
                  border-radius:10px;color:#065f46;font-weight:bold;">
        If you did not perform this action, please <a href="mailto:support@exambuddy.com"
        style="color:#dc2626;text-decoration:none;">contact support immediately</a>.
      </div>
      <p>You can now log in with your new password.</p>
    </div>
    <hr style="margin:30px 0;border:none;border-top:1px solid #e5e7eb;">
    <p style="text-align:center;font-size:12px;color:#9ca3af;">
      © ${new Date().getFullYear()} ExamBuddy. All rights reserved.
    </p>
  </div>
  `;
};

module.exports = PasswordResetSuccessEmail;
