const express = require("express");
const router = express.Router();

router.get("/maintenance", (req, res) => {
    res.json({
        maintenance: process.env.MAINTENANCE_MODE,
        endsAt: process.env.MAINTENANCE_END_TIME // ISO string
    });
});

module.exports = router;
