const express = require("express");
const router = express.Router();

// redirect to frontend deep link handling page
router.get("/open", (req, res) => {

    // Deep link to open the app homepage
    const deeplink = `exam-buddy://open-app`;

    res.send(`
    <html>
      <head>
        <title>Opening ExamBuddy...</title>
        <meta http-equiv="refresh" content="2;url=${deeplink}">
        <style>
          body {
            font-family: "Segoe UI", sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            height: 100vh;
            background: #f9fbff;
            color: #1a1a1a;
          }
          h2 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          p {
            font-size: 15px;
            opacity: 0.7;
          }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 20px;
            background: #0066ff;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 15px;
            transition: 0.2s;
          }
          .btn:hover {
            background: #0052cc;
          }
        </style>
      </head>
      <body>
        <h2>Launching ExamBuddy...</h2>
        <p>If the app doesn't open automatically, click below:</p>
        <a class="btn" href="${deeplink}">Open ExamBuddy App</a>

        <p style="margin-top:30px;">Don't have the app?</p>
        <a class="btn" href="https://example.com/download">Download ExamBuddy</a>
      </body>
    </html>
  `);
});

module.exports = router;
