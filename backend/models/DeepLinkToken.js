import mongoose from "mongoose";

const deepLinkTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    createdAt: { type: Date, default: Date.now, expires: 300 } // auto delete in 5 min
});

export default mongoose.model("DeepLinkToken", deepLinkTokenSchema);
