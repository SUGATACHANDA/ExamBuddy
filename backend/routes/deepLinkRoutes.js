const express = require("express");
const router = express.Router();

// redirect to frontend deep link handling page
router.get("/open", (req, res) => {

  // Deep link to open the app homepage
  const deeplink = `exam-buddy://open-app`;

  res.send(`
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Opening ExamBuddy...</title>
  <meta http-equiv="refresh" content="2;url=${deeplink}" />

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Inter", "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #eef3ff, #f8fbff);
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #1f1f1f;
      animation: fadeIn 0.6s ease-out;
    }

    .container {
      text-align: center;
      max-width: 450px;
      padding: 40px;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.06);
      animation: slideUp 0.65s ease-out;
    }

    h2 {
      font-size: 22px;
      margin-bottom: 14px;
    }

    p {
      font-size: 15px;
      opacity: 0.68;
      margin-bottom: 18px;
      line-height: 1.5;
    }

    /* Spinner */
    .loader {
      width: 48px;
      height: 48px;
      border: 4px solid #d9e3ff;
      border-top-color: #3b6cff;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 20px auto;
    }

    a.button {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 12px;
      border-radius: 8px;
      text-align: center;
      text-decoration: none;
      font-size: 15px;
      transition: 0.25s ease;
      cursor: pointer;
    }

    .primary-btn {
      background: #3b6cff;
      color: #fff;
    }

    .primary-btn:hover {
      background: #2c55d4;
    }

    .outline-btn {
      border: 2px solid #3b6cff;
      color: #3b6cff;
      background: transparent;
    }

    .outline-btn:hover {
      background: #eaf0ff;
    }

    /* Animations */
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        transform: translateY(25px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  </style>
</head>

<body>
  <div class="container">
    <h2>Opening ExamBuddy...</h2>
    <p>Please wait, the app should launch shortly.</p>

    <div class="loader"></div>

    <p>If nothing happens, use the button below:</p>
    <a href="${deeplink}" class="button primary-btn">Open ExamBuddy App</a>

    <p style="margin-top: 20px;">Don't have the app installed?</p>
    <a href="https://example.com/download" class="button outline-btn">Download ExamBuddy</a>
  </div>
</body>
</html>
  `);
});

module.exports = router;
