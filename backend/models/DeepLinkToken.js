const mongoose = require("mongoose");

const deepLinkSchema = new mongoose.Schema(
    {
        token: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true }, // expiry support
        used: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// auto delete expired tokens
deepLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.DeepLinkToken || mongoose.model("DeepLinkToken", deepLinkSchema);
