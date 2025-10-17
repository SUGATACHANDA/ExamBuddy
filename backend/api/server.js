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
// =================================================================
//                 PIXEL-PERFECT TEXT RENDERING FOR GIF
// =================================================================

// =================================================================
//                 FIXED COUNTDOWN GIF - PROPER TEXT & CONSISTENT TIME
// =================================================================

// =================================================================
//                 FIXED COUNTDOWN GIF - PROPER TEXT & CONSISTENT TIME
// =================================================================

app.get("/api/exams/countdown/:id.gif", async (req, res) => {
    try {
        console.log(`[Countdown] Generating GIF for exam: ${req.params.id}`);

        const exam = await Exam.findById(req.params.id).lean();
        if (!exam) {
            return sendErrorGif(res, "Exam Not Found");
        }

        const start = new Date(exam.scheduledAt);
        const now = new Date();
        // FIX: Calculate once and use for all frames
        const initialSecondsLeft = Math.max(0, Math.floor((start - now) / 1000));

        console.log(`[Countdown] Initial seconds: ${initialSecondsLeft}`);

        // Set GIF headers
        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        });

        const gifBuffer = await generateFixedCountdownGif(initialSecondsLeft);
        res.send(gifBuffer);
        console.log(`✅ Countdown GIF sent successfully`);

    } catch (err) {
        console.error("[Countdown Error]:", err);
        sendErrorGif(res, "Server Error");
    }
});

// Fixed version with proper text orientation and consistent time
async function generateFixedCountdownGif(initialSecondsLeft) {
    const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
    const codec = new GifCodec();
    const frames = [];

    // Generate 5 frames using the same initial time reference
    for (let i = 0; i < 5; i++) {
        // FIX: Use consistent time reference, don't recalculate
        const currentSeconds = Math.max(0, initialSecondsLeft - i);
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;

        const timeText = currentSeconds <= 0 ? "STARTED" : `${mins}:${secs.toString().padStart(2, "0")}`;
        const isRed = currentSeconds <= 60;

        // Create frame with properly oriented text
        const frame = createFixedTextFrame(timeText, isRed);
        frames.push(frame);
    }

    const gif = await codec.encodeGif(frames, {
        loops: 0,
        delayCentisecs: 100
    });

    return gif.buffer;
}

// Fixed text rendering with proper orientation
function createFixedTextFrame(text, isRed) {
    const width = 200;
    const height = 60;
    const frameData = Buffer.alloc(width * height * 4);

    const color = isRed ? [255, 0, 0] : [0, 0, 255];
    const bgColor = [255, 255, 255];

    // Fill background
    for (let i = 0; i < frameData.length; i += 4) {
        frameData[i] = bgColor[0];
        frameData[i + 1] = bgColor[1];
        frameData[i + 2] = bgColor[2];
        frameData[i + 3] = 255;
    }

    // Draw border
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (x < 3 || x >= width - 3 || y < 3 || y >= height - 3) {
                const index = (y * width + x) * 4;
                frameData[index] = color[0];
                frameData[index + 1] = color[1];
                frameData[index + 2] = color[2];
            }
        }
    }

    // FIX: Use properly oriented text rendering
    drawFixedPixelText(frameData, text, color, width, height);

    return new GifFrame(new BitmapImage({
        width: width,
        height: height,
        data: frameData
    }), { delayCentisecs: 100 });
}

// Fixed text rendering with proper orientation
function drawFixedPixelText(frameData, text, color, width, height) {
    const textX = 50;
    const textY = 25;

    // FIX: Properly oriented 5x7 pixel font (right-side up)
    const font = {
        '0': [0x1F, 0x11, 0x11, 0x11, 0x1F], // 0b11111, 0b10001, 0b10001, 0b10001, 0b11111
        '1': [0x04, 0x0C, 0x04, 0x04, 0x0E], // 0b00100, 0b01100, 0b00100, 0b00100, 0b01110
        '2': [0x1F, 0x01, 0x1F, 0x10, 0x1F], // 0b11111, 0b00001, 0b11111, 0b10000, 0b11111
        '3': [0x1F, 0x01, 0x0F, 0x01, 0x1F], // 0b11111, 0b00001, 0b01111, 0b00001, 0b11111
        '4': [0x11, 0x11, 0x1F, 0x01, 0x01], // 0b10001, 0b10001, 0b11111, 0b00001, 0b00001
        '5': [0x1F, 0x10, 0x1F, 0x01, 0x1F], // 0b11111, 0b10000, 0b11111, 0b00001, 0b11111
        '6': [0x1F, 0x10, 0x1F, 0x11, 0x1F], // 0b11111, 0b10000, 0b11111, 0b10001, 0b11111
        '7': [0x1F, 0x01, 0x02, 0x04, 0x04], // 0b11111, 0b00001, 0b00010, 0b00100, 0b00100
        '8': [0x1F, 0x11, 0x1F, 0x11, 0x1F], // 0b11111, 0b10001, 0b11111, 0b10001, 0b11111
        '9': [0x1F, 0x11, 0x1F, 0x01, 0x1F], // 0b11111, 0b10001, 0b11111, 0b00001, 0b11111
        ':': [0x00, 0x0C, 0x00, 0x0C, 0x00], // 0b00000, 0b01100, 0b00000, 0b01100, 0b00000
        'S': [0x1F, 0x10, 0x1F, 0x01, 0x1F], // 0b11111, 0b10000, 0b11111, 0b00001, 0b11111
        'T': [0x1F, 0x04, 0x04, 0x04, 0x04], // 0b11111, 0b00100, 0b00100, 0b00100, 0b00100
        'A': [0x0E, 0x11, 0x1F, 0x11, 0x11], // 0b01110, 0b10001, 0b11111, 0b10001, 0b10001
        'R': [0x1E, 0x11, 0x1E, 0x12, 0x11], // 0b11110, 0b10001, 0b11110, 0b10010, 0b10001
        'E': [0x1F, 0x10, 0x1F, 0x10, 0x1F], // 0b11111, 0b10000, 0b11111, 0b10000, 0b11111
        'D': [0x1E, 0x11, 0x11, 0x11, 0x1E]  // 0b11110, 0b10001, 0b10001, 0b10001, 0b11110
    };

    let currentX = textX;

    for (let char of text) {
        if (font[char]) {
            const charData = font[char];

            // Draw each column of the character
            for (let col = 0; col < 5; col++) {
                const colData = charData[col];

                // FIX: Proper orientation - draw from top to bottom
                for (let row = 0; row < 7; row++) {
                    // Check if this pixel should be drawn (bit is set)
                    if (colData & (1 << (6 - row))) { // FIX: Use (6 - row) for proper orientation
                        const x = currentX + col;
                        const y = textY + row;

                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            const index = (y * width + x) * 4;
                            frameData[index] = color[0];
                            frameData[index + 1] = color[1];
                            frameData[index + 2] = color[2];
                        }
                    }
                }
            }

            currentX += 7; // Move to next character position
        } else {
            currentX += 4; // Space for unknown characters
        }
    }
}

// Test endpoint with fixed orientation and consistent time
app.get("/api/test-fixed.gif", async (req, res) => {
    try {
        const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
        const codec = new GifCodec();
        const frames = [];

        // FIX: Use consistent time values
        const testTimes = [300, 299, 298, 60, 59]; // 5:00, 4:59, 4:58, 1:00, 0:59

        for (let i = 0; i < testTimes.length; i++) {
            const seconds = testTimes[i];
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            const timeText = seconds <= 0 ? "STARTED" : `${mins}:${secs.toString().padStart(2, "0")}`;
            const isRed = seconds <= 60;

            const frameData = Buffer.alloc(200 * 60 * 4);

            // White background
            for (let j = 0; j < frameData.length; j += 4) {
                frameData[j] = 255;
                frameData[j + 1] = 255;
                frameData[j + 2] = 255;
                frameData[j + 3] = 255;
            }

            drawFixedPixelText(frameData, timeText, isRed ? [255, 0, 0] : [0, 0, 255], 200, 60);

            frames.push(new GifFrame(new BitmapImage({
                width: 200,
                height: 60,
                data: frameData
            }), { delayCentisecs: 200 }));
        }

        const gif = await codec.encodeGif(frames, { loops: 0 });

        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache"
        });
        res.send(gif.buffer);
        console.log("✅ Fixed test GIF sent");

    } catch (error) {
        console.error("Fixed test failed:", error);
        res.status(500).send("Test failed");
    }
});

// Error GIF
async function sendErrorGif(res, message) {
    try {
        const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
        const codec = new GifCodec();

        const width = 200;
        const height = 60;
        const frameData = Buffer.alloc(width * height * 4);

        // Red background
        for (let i = 0; i < frameData.length; i += 4) {
            frameData[i] = 255;
            frameData[i + 1] = 200;
            frameData[i + 2] = 200;
            frameData[i + 3] = 255;
        }

        drawFixedPixelText(frameData, "ERROR", [255, 0, 0], width, height);

        const frame = new GifFrame(new BitmapImage({
            width: width,
            height: height,
            data: frameData
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