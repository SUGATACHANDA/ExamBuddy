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
        console.log(`[Countdown] Generating GIF for exam: ${req.params.id}`);

        const exam = await Exam.findById(req.params.id).lean();
        if (!exam) {
            return sendErrorGif(res, "Exam Not Found");
        }

        const start = new Date(exam.scheduledAt);
        const now = new Date();
        let secondsLeft = Math.max(0, Math.floor((start - now) / 1000));

        console.log(`[Countdown] ${secondsLeft} seconds remaining`);

        // Set GIF headers
        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        });

        const gifBuffer = await generateCountdownGifWithText(secondsLeft);
        res.send(gifBuffer);
        console.log(`✅ Countdown GIF sent successfully`);

    } catch (err) {
        console.error("[Countdown Error]:", err);
        sendErrorGif(res, "Server Error");
    }
});

// Working text rendering using canvas
async function generateCountdownGifWithText(secondsLeft) {
    const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
    const { createCanvas } = require('canvas');
    const codec = new GifCodec();
    const frames = [];

    // Generate 5 frames
    for (let i = 0; i < 5; i++) {
        const currentSeconds = Math.max(0, secondsLeft - i);
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;

        const timeText = currentSeconds <= 0 ? "EXAM STARTED!" : `${mins}:${secs.toString().padStart(2, "0")}`;
        const color = currentSeconds <= 60 ? "#ff0000" : "#0000ff";

        // Create canvas and draw text
        const canvas = createCanvas(300, 80);
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 80);

        // Draw border
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, 290, 70);

        // Draw text
        ctx.fillStyle = color;
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeText, 150, 40);

        // Convert canvas to buffer and then to GIF frame
        const buffer = canvas.toBuffer('image/png');

        const { data, info } = await sharp(buffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        frames.push(new GifFrame(new BitmapImage({
            width: info.width,
            height: info.height,
            data: data
        }), { delayCentisecs: 100 }));
    }

    const gif = await codec.encodeGif(frames, {
        loops: 0,
        delayCentisecs: 100
    });

    return gif.buffer;
}

// Error GIF with text
async function sendErrorGif(res, message) {
    try {
        const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
        const { createCanvas } = require('canvas');
        const codec = new GifCodec();

        const canvas = createCanvas(300, 80);
        const ctx = canvas.getContext('2d');

        // Red background
        ctx.fillStyle = '#ffebee';
        ctx.fillRect(0, 0, 300, 80);

        // Red border
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, 290, 70);

        // Error text
        ctx.fillStyle = '#d32f2f';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, 150, 40);

        const buffer = canvas.toBuffer('image/png');
        const { data, info } = await sharp(buffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const frame = new GifFrame(new BitmapImage({
            width: info.width,
            height: info.height,
            data: data
        }), { delayCentisecs: 500 });

        const gif = await codec.encodeGif([frame], { loops: 1 });

        res.set("Content-Type", "image/gif");
        res.send(gif.buffer);
    } catch (error) {
        const simpleGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set("Content-Type", "image/gif");
        res.send(simpleGif);
    }
}

// TEST ENDPOINT - Working text GIF
app.get("/api/test-text.gif", async (req, res) => {
    try {
        const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
        const { createCanvas } = require('canvas');
        const codec = new GifCodec();
        const frames = [];

        const texts = ["TEST 1", "TEST 2", "TEST 3"];
        const colors = ["#ff0000", "#00ff00", "#0000ff"];

        for (let i = 0; i < texts.length; i++) {
            const canvas = createCanvas(250, 60);
            const ctx = canvas.getContext('2d');

            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 250, 60);

            // Colored text
            ctx.fillStyle = colors[i];
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(texts[i], 125, 30);

            const buffer = canvas.toBuffer('image/png');
            const { data, info } = await sharp(buffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            frames.push(new GifFrame(new BitmapImage({
                width: info.width,
                height: info.height,
                data: data
            }), { delayCentisecs: 200 }));
        }

        const gif = await codec.encodeGif(frames, { loops: 0 });

        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache"
        });
        res.send(gif.buffer);
        console.log("✅ Text test GIF sent");

    } catch (error) {
        console.error("Text test failed:", error);
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