function PasswordResetEmail({ name, resetUrl }) {
    return `
        <div style="font-family: sans-serif; color: #333;">
            <h1>Hello ${name},</h1>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" 
               style="display:inline-block; padding:10px 20px; background-color:#4CAF50; color:white; text-decoration:none; border-radius:5px;">
               Reset Password
            </a>
            <p>This link will expire in 10 minutes.</p>
        </div>
    `;
}

module.exports = PasswordResetEmail;