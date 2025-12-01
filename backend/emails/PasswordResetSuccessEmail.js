// backend/emails/PasswordResetSuccessEmail.js
const PasswordResetSuccessEmail = ({ name }) => {
  return `
  <div style="max-width:620px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#ffffff;border:1px solid #d1d5db;border-radius:10px;overflow:hidden;">

    <!-- Banner -->
    <div style="background:#1e3a8a;padding:28px 40px;text-align:left;">
      <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
        ExamBuddy Security Division
      </div>
      <div style="color:#e2e8f0;font-size:13px;margin-top:4px;">
        Password Reset Confirmation Notice
      </div>
    </div>

    <!-- Body -->
    <div style="padding:40px;">

      <p style="font-size:15px;color:#111827;margin:0 0 12px 0;">
        Dear <strong>${name}</strong>,
      </p>

      <p style="font-size:14px;color:#374151;margin:0 0 22px 0;line-height:1.6;">
        This is to inform you that the password for your ExamBuddy account was successfully updated.
        If you performed this action, no further steps are required.
      </p>

      <!-- Security Box -->
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:18px 22px;margin:30px 0;color:#0f172a;font-size:14px;line-height:1.6;">
        <strong>Important:</strong>  
        If you did <strong>not</strong> initiate this password change, please contact the ExamBuddy
        Security Team immediately at  
        <a href="mailto:support@exambuddy.com" style="color:#b91c1c;text-decoration:none;font-weight:600;">support@exambuddy.com</a>.
        Unauthorized access will be investigated according to our security protocols.
      </div>

      <p style="font-size:14px;color:#374151;margin:0 0 18px 0;">
        You may now log in using your new password.
      </p>

      <p style="font-size:14px;color:#374151;margin-top:26px;">
        Regards,<br>
        <strong>ExamBuddy Security Division</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#6b7280;margin:0;">
        © ${new Date().getFullYear()} ExamBuddy • Corporate Security & Compliance
      </p>
    </div>
  </div>
  `;
};

module.exports = PasswordResetSuccessEmail;
