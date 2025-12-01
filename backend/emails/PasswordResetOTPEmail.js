// backend/emails/PasswordResetOTPEmail.js
const PasswordResetOTPEmail = ({ name, otp }) => {
  return `
  <div style="max-width:620px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#ffffff;border:1px solid #d1d5db;border-radius:10px;overflow:hidden;">

    <!-- Banner -->
    <div style="background:#1e3a8a;padding:28px 40px;text-align:left;">
      <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
        ExamBuddy Security Division
      </div>
      <div style="color:#e2e8f0;font-size:13px;margin-top:4px;">
        Confidential Account Verification Notice
      </div>
    </div>

    <!-- Body Container -->
    <div style="padding:40px;">

      <p style="font-size:15px;color:#111827;margin:0 0 12px 0;">
        Dear <strong>${name}</strong>,
      </p>

      <p style="font-size:14px;color:#374151;margin:0 0 24px 0;line-height:1.6;">
        We received a request to reset the password associated with your ExamBuddy account.
        As part of our corporate security protocol, please use the One-Time Password (OTP) below
        to verify your identity and proceed with the password reset process.
      </p>

      <!-- OTP Section -->
      <div style="text-align:center;margin:36px 0;">
        <div style="display:inline-block;background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:26px 38px;box-shadow:0 3px 10px rgba(0,0,0,0.06);">
          <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#0f172a;">
            ${otp}
          </span>
        </div>
        <div style="margin-top:10px;font-size:12px;color:#6b7280;">
          OTP valid for <strong>10 minutes</strong>.
        </div>
      </div>

      <p style="font-size:14px;color:#374151;margin:0 0 18px 0;line-height:1.6;">
        If you did not initiate this request, we strongly advise contacting the ExamBuddy Security Team immediately at  
        <a href="mailto:support@exambuddy.com" style="color:#b91c1c;font-weight:600;text-decoration:none;">
          support@exambuddy.com
        </a>.  
        Unauthorized activity will be investigated according to our security compliance policies.
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

module.exports = PasswordResetOTPEmail;
