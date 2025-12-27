const express = require("express");
const router = express.Router();

router.get("/maintenance", (req, res) => {
    res.json({
        maintenance: true,
        endsAt: process.env.MAINTENANCE_END_TIME // ISO string
    });
});

module.exports = router;
