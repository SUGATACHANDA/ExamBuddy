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
            return sendSimpleErrorGif(res, "Exam Not Found");
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

        // Create a simple animated GIF using multiple frames
        const gifBuffer = await generateSimpleCountdownGif(secondsLeft);
        res.send(gifBuffer);
        console.log(`✅ Countdown GIF sent successfully`);

    } catch (err) {
        console.error("[Countdown Error]:", err);
        sendSimpleErrorGif(res, "Server Error");
    }
});

// Simple GIF generator without complex text rendering
async function generateSimpleCountdownGif(secondsLeft) {
    const { GifFrame, GifCodec } = require('gifwrap');
    const codec = new GifCodec();
    const frames = [];

    // Generate 3 frames for simplicity
    for (let i = 0; i < 3; i++) {
        const currentSeconds = Math.max(0, secondsLeft - i);
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;

        const timeText = currentSeconds <= 0 ? "STARTED!" : `${mins}:${secs.toString().padStart(2, "0")}`;
        const color = currentSeconds <= 60 ? [255, 0, 0] : [0, 0, 255]; // Red or Blue

        // Create simple frame with colored background and text
        const frame = createSimpleFrame(timeText, color);
        frames.push(frame);
    }

    const gif = await codec.encodeGif(frames, {
        loops: 0, // Infinite loop
        delayCentisecs: 100 // 1 second per frame
    });

    return gif.buffer;
}

// Create a simple frame without complex text rendering
function createSimpleFrame(text, color) {
    const width = 200;
    const height = 60;

    // Create a simple colored rectangle with "text" as pattern
    const frameData = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;

            // Create a simple pattern based on text and position
            const isTextArea = y > 20 && y < 40 && x > 50 && x < 150;

            if (isTextArea) {
                // White background for text area
                frameData[index] = 255;     // R
                frameData[index + 1] = 255; // G  
                frameData[index + 2] = 255; // B
                frameData[index + 3] = 255; // A
            } else {
                // Colored background
                frameData[index] = color[0];     // R
                frameData[index + 1] = color[1]; // G
                frameData[index + 2] = color[2]; // B
                frameData[index + 3] = 255;      // A
            }
        }
    }

    const { GifFrame, BitmapImage } = require('gifwrap');
    return new GifFrame(new BitmapImage({
        width: width,
        height: height,
        data: frameData
    }), { delayCentisecs: 100 });
}

// Simple error GIF generator
async function sendSimpleErrorGif(res, message) {
    try {
        const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
        const codec = new GifCodec();

        const width = 200;
        const height = 60;
        const frameData = Buffer.alloc(width * height * 4);

        // Red background
        for (let i = 0; i < frameData.length; i += 4) {
            frameData[i] = 255;     // R
            frameData[i + 1] = 200; // G
            frameData[i + 2] = 200; // B
            frameData[i + 3] = 255; // A
        }

        const frame = new GifFrame(new BitmapImage({
            width: width,
            height: height,
            data: frameData
        }), { delayCentisecs: 500 });

        const gif = await codec.encodeGif([frame], { loops: 1 });

        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache"
        });
        res.send(gif.buffer);
    } catch (error) {
        // Ultimate fallback - 1x1 red pixel GIF
        const simpleGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set("Content-Type", "image/gif");
        res.send(simpleGif);
    }
}

// TEST ENDPOINT - Simple working GIF
app.get("/api/test-simple.gif", async (req, res) => {
    try {
        const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
        const codec = new GifCodec();
        const frames = [];

        // Create 3 different colored frames
        const colors = [
            [255, 0, 0],    // Red
            [0, 255, 0],    // Green  
            [0, 0, 255]     // Blue
        ];

        for (const color of colors) {
            const width = 100;
            const height = 50;
            const frameData = Buffer.alloc(width * height * 4);

            // Fill with solid color
            for (let i = 0; i < frameData.length; i += 4) {
                frameData[i] = color[0];     // R
                frameData[i + 1] = color[1]; // G
                frameData[i + 2] = color[2]; // B
                frameData[i + 3] = 255;      // A
            }

            frames.push(new GifFrame(new BitmapImage({
                width: width,
                height: height,
                data: frameData
            }), { delayCentisecs: 100 }));
        }

        const gif = await codec.encodeGif(frames, { loops: 0 });

        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache"
        });
        res.send(gif.buffer);
        console.log("✅ Simple test GIF sent");

    } catch (error) {
        console.error("Simple test failed:", error);
        const simpleGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set("Content-Type", "image/gif");
        res.send(simpleGif);
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