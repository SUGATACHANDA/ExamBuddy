const React = require("react");
const {
    Html,
    Head,
    Preview,
    Body,
    Container,
    Section,
    Text,
} = require("@react-email/components");

function PasswordResetSuccessEmail({ user }) {
    return React.createElement(
        Html,
        null,
        React.createElement(Head, null),
        React.createElement(Preview, null, "Password Reset Successful"),
        React.createElement(
            Body,
            { style: { backgroundColor: "#f4f7f9", fontFamily: "Arial, sans-serif" } },
            React.createElement(
                Container,
                { style: { maxWidth: "600px", margin: "0 auto", padding: "20px" } },
                React.createElement(
                    Section,
                    { style: { backgroundColor: "#ffffff", borderRadius: "10px", padding: "30px" } },
                    React.createElement(
                        Text,
                        { style: { fontSize: "20px", fontWeight: "bold", color: "#333", marginBottom: "20px" } },
                        `Hi ${user.name},`
                    ),
                    React.createElement(
                        Text,
                        { style: { fontSize: "16px", color: "#555", marginBottom: "20px" } },
                        "Your password has been successfully reset. You can now log in to your ExamBuddy account with your new password."
                    ),
                    React.createElement(
                        Text,
                        { style: { fontSize: "14px", color: "#999", marginTop: "30px" } },
                        "If you didn’t reset your password, please contact support immediately."
                    )
                )
            )
        )
    );
}

module.exports = PasswordResetSuccessEmail;
