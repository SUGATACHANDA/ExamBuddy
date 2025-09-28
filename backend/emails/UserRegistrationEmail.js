// backend/emails/UserRegistrationEmail.js
const UserRegistrationEmail = ({ name, role, collegeId, password }) => {
    return `
  <div style="max-width:650px;margin:auto;background:#f9fafb;
              border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;color:#111827;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);
                padding:30px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:26px;">🎉 Welcome to ExamBuddy</h1>
      <p style="margin-top:8px;font-size:16px;">Your journey starts here 🚀</p>
    </div>

    <!-- Body -->
    <div style="padding:30px;">
      <p style="font-size:16px;">Hello <b>${name}</b>,</p>
      <p>We’re thrilled to have you join <b>ExamBuddy</b> as a <b style="color:#2563eb; text-transform: uppercase;">${role}</b>!</p>
      <p>You can now log in and access the platform using the credentials below:</p>

      <!-- Credential Card -->
      <div style="margin:20px 0;padding:20px;background:#ffffff;border:1px solid #e5e7eb;
                  border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
        <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Your login credentials</p>
        <p style="margin:4px 0;font-size:16px;"><b>College ID:</b> ${collegeId}</p>
        <p style="margin:4px 0;font-size:16px;"><b>Temporary Password:</b> ${password}</p>
      </div>

      <!-- Security Notice -->
      <div style="margin:20px 0;padding:15px;background:#fff7ed;border-left:6px solid #f97316;
                  border-radius:8px;color:#92400e;">
        ⚠️ <b>Important:</b> For your security, please log in and <u>change your password immediately</u>.
      </div>

      <p style="margin-top:25px;font-size:14px;color:#6b7280;text-align:center;">
        If you didn’t expect this email, please ignore it or contact support.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;text-align:center;padding:15px;">
      <p style="margin:0;font-size:12px;color:#6b7280;">
        © ${new Date().getFullYear()} ExamBuddy. All rights reserved.
      </p>
    </div>
  </div>
  `;
};

module.exports = UserRegistrationEmail;
