const express = require("express");
const router = express.Router();

router.get("/maintenance", (req, res) => {
    // Convert string "true"/"false" to boolean
    const maintenanceMode = process.env.MAINTENANCE_MODE;
    const isMaintenance = maintenanceMode === "true" ||
        maintenanceMode === "1" ||
        maintenanceMode === true;

    res.json({
        maintenance: isMaintenance, // Send as boolean
        endsAt: process.env.MAINTENANCE_END_TIME // ISO string
    });
});

module.exports = router;
