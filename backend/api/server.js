// =================================================================
//                 SERVER.JS - THE DEFINITIVE FINAL VERSION
// =================================================================
const express = require('express');
require("dotenv").config();
const cors = require('cors');
const http = require('http');
const fs = require('fs'); // <-- Import File System for the check
const path = require('path');
const sharp = require('sharp')
const { GifCodec, GifFrame, BitmapImage } = require('gifwrap')



const connectDB = require('../config/db.js');
const { notFound, errorHandler } = require('../middlewares/errorMiddleware.js');
const seedData = require('../utils/seed.js');
const Exam = require('../models/Exam.js');

// Route Imports
const authRoutes = require('../routes/authRoutes.js');
const questionRoutes = require('../routes/questionRoutes.js');
const examRoutes = require('../routes/examRoutes.js');
const resultRoutes = require('../routes/resultRoutes.js');
const adminRoutes = require('../routes/adminRoutes');
const teacherRoutes = require('../routes/teacherRoutes');
const dataRoutes = require('../routes/dataRoutes');
const universityAffairsRoutes = require('../routes/universityAffairsRoutes');
const hodRoutes = require('../routes/hodRoutes');

const startServer = async () => {
    await connectDB();
    await seedData();
};
startServer();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// =================================================================
//                  *** CRITICAL FIX APPLIED HERE ***
//  Define the specific image route BEFORE the general /api/exams router
// =================================================================
async function renderFrame(text, color = "#1d4ed8") {
    const svg = `
    <svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="200" y="60"
      font-size="30"
      font-family="sans-serif"
      fill="${color}"
      text-anchor="middle"
      dominant-baseline="middle">
  ${text}
</text>
    </svg>
  `;
    return await sharp(Buffer.from(svg)).png().toBuffer();
}

// Route: Generate countdown GIF
app.get("/api/exams/countdown/:id.gif", async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).lean();
        if (!exam) throw new Error("Exam not found");

        const start = new Date(exam.scheduledAt);
        const now = new Date();
        let secondsLeft = Math.max(0, Math.floor((start - now) / 1000));

        const frames = [];

        // Generate 5 frames (one per second)
        for (let i = 0; i < 5; i++) {
            const mins = Math.floor(secondsLeft / 60);
            const secs = secondsLeft % 60;
            const timeText =
                secondsLeft <= 0
                    ? "Exam Started!"
                    : `Exam starts in ${mins}:${secs.toString().padStart(2, "0")}`;
            const color = secondsLeft <= 60 ? "#dc2626" : "#1d4ed8"; // red if <1 min

            const pngBuffer = await renderFrame(timeText, color);

            // ✅ FIX: Decode PNG → BitmapImage correctly
            const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
            const bmp = new BitmapImage({
                width: info.width,
                height: info.height,
                data
            });
            frames.push(new GifFrame(bmp, { delayCentisecs: 100 }));

            secondsLeft = Math.max(0, secondsLeft - 1);
        }

        const codec = new GifCodec();
        const gif = await codec.encodeGif(frames, { loops: 0 });

        res.set("Content-Type", "image/gif");
        res.send(gif.buffer);

        console.log(`[info] Countdown GIF generated for ${req.params.id}`);
    } catch (err) {
        console.error("[CRITICAL] Failed during countdown generation:", err);
        res.status(500).send("Error generating countdown");
    }
});


// --- General API Routes are mounted AFTER the specific route ---
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes); // Now this will correctly handle all OTHER /api/exams routes
app.use('/api/results', resultRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/university-affairs', universityAffairsRoutes);
app.use('/api/hod', hodRoutes);

app.get('/', (req, res) => {
    res.send('Exam App API is running...');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, console.log(`Server running on port ${PORT}`));