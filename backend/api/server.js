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
const { createCanvas } = require('canvas');





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

const fontPath = path.join(__dirname, "../assets/font/Poppins-Regular.ttf");
const fontBase64 = fs.readFileSync(fontPath).toString("base64");
async function renderFrame(text, color = "#1d4ed8") {
    const width = 400;
    const height = 120;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Text styling
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(text, width / 2, height / 2);

    // Convert to buffer
    return canvas.toBuffer('image/png');
}

// Route: Generate countdown GIF - RETURNS ONLY GIF
app.get("/api/exams/countdown/:id.gif", async (req, res) => {
    try {
        console.log(`[Countdown] Request for exam: ${req.params.id}`);

        const exam = await Exam.findById(req.params.id).lean();
        if (!exam) {
            console.log(`[Countdown] Exam not found: ${req.params.id}`);
            // Return error as GIF, not text
            return sendErrorGif(res, "Exam not found");
        }

        const start = new Date(exam.scheduledAt);
        const now = new Date();
        let secondsLeft = Math.max(0, Math.floor((start - now) / 1000));

        console.log(`[Countdown] Seconds left: ${secondsLeft} for exam ${req.params.id}`);

        const frames = [];
        const codec = new GifCodec();

        // Generate 5 frames
        for (let i = 0; i < 5; i++) {
            const mins = Math.floor(secondsLeft / 60);
            const secs = secondsLeft % 60;
            const timeText =
                secondsLeft <= 0
                    ? "Exam Started!"
                    : `Starts in ${mins}:${secs.toString().padStart(2, "0")}`;

            const color = secondsLeft <= 60 ? "#dc2626" : "#1d4ed8";

            console.log(`[Countdown] Frame ${i}: ${timeText}`);

            try {
                const pngBuffer = await renderFrame(timeText, color);

                // Convert to GIF frame
                const { data, info } = await sharp(pngBuffer)
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true });

                const bmp = new BitmapImage({
                    width: info.width,
                    height: info.height,
                    data: data
                });

                frames.push(new GifFrame(bmp, {
                    delayCentisecs: 100 // 1 second
                }));

                secondsLeft = Math.max(0, secondsLeft - 1);

            } catch (frameError) {
                console.error(`Error in frame ${i}:`, frameError);
                // Create fallback frame as GIF
                const fallbackText = `Error: ${i}`;
                const fallbackBuffer = await renderFrame(fallbackText, "#ff0000");
                const { data, info } = await sharp(fallbackBuffer)
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true });

                frames.push(new GifFrame(new BitmapImage({
                    width: info.width,
                    height: info.height,
                    data: data
                }), { delayCentisecs: 100 }));
            }
        }

        if (frames.length === 0) {
            throw new Error("No frames generated");
        }

        console.log(`[Countdown] Encoding ${frames.length} frames to GIF`);

        const gif = await codec.encodeGif(frames, {
            loops: 0 // Infinite loop
        });

        // Set GIF headers
        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        });

        console.log(`✅ Countdown GIF successfully generated with ${frames.length} frames`);
        res.send(gif.buffer);

    } catch (err) {
        console.error("[CRITICAL] Countdown generation failed:", err);
        sendErrorGif(res, "Countdown Error");
    }
});

// Helper function to send errors as GIF (not text)
async function sendErrorGif(res, errorMessage) {
    try {
        const canvas = createCanvas(400, 120);
        const ctx = canvas.getContext('2d');

        // Red background for error
        ctx.fillStyle = '#ffebee';
        ctx.fillRect(0, 0, 400, 120);
        ctx.fillStyle = '#d32f2f';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(errorMessage, 200, 60);

        const errorBuffer = canvas.toBuffer('image/png');
        const { data, info } = await sharp(errorBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const frame = new GifFrame(new BitmapImage({
            width: info.width,
            height: info.height,
            data: data
        }), { delayCentisecs: 500 }); // Longer delay for error

        const codec = new GifCodec();
        const errorGif = await codec.encodeGif([frame], { loops: 1 });

        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache"
        });
        res.send(errorGif.buffer);
    } catch (finalError) {
        // Ultimate fallback - simple 1x1 pixel GIF
        const ultimateFallbackGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set("Content-Type", "image/gif");
        res.send(ultimateFallbackGif);
    }
}

// TEST ROUTE - ALSO RETURNS GIF, NOT PNG
app.get("/api/test-countdown.gif", async (req, res) => {
    try {
        const frames = [];
        const codec = new GifCodec();

        // Generate test frames
        for (let i = 0; i < 3; i++) {
            const testText = `Test Frame ${i + 1}`;
            const pngBuffer = await renderFrame(testText, "#1d4ed8");

            const { data, info } = await sharp(pngBuffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            const bmp = new BitmapImage({
                width: info.width,
                height: info.height,
                data: data
            });

            frames.push(new GifFrame(bmp, { delayCentisecs: 100 }));
        }

        const gif = await codec.encodeGif(frames, { loops: 0 });

        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache"
        });
        res.send(gif.buffer);
        console.log("✅ Test GIF generated successfully");

    } catch (error) {
        console.error("Test GIF failed:", error);
        sendErrorGif(res, "Test Failed");
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