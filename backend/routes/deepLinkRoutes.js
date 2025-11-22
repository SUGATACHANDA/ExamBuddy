const express = require("express");
const router = express.Router();

// redirect to frontend deep link handling page
router.get("/open", (req, res) => {
    const examId = req.query.examId;

    if (!examId) {
        return res.status(400).send("Missing examId");
    }

    // Redirect to hosted deep link landing page (React redirect page)
    return res.redirect(`https://exam-buddy.vercel.app/open?examId=${examId}`);
});

module.exports = router;
