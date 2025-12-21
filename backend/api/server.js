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
const axios = require('axios');




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
const faceRoutes = require('../routes/faceRoutes.js');
const subjectRoutes = require("../routes/subjectRoutes.js");
const deepLinkRoutes = require("../routes/deepLinkRoutes.js");
const studentRoutes = require("../routes/studentRoutes");

const startServer = async () => {
    await connectDB();
    await seedData();
};
startServer();

export const config = {
    api: {
        bodyParser: false,
    },
};

const app = express();
app.use('/api/hod', hodRoutes);
app.use(express.json());
app.use(cors({ origin: '*' }));

app.use((req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
        express.json({ limit: "10mb" })(req, res, next);
    } else {
        next();
    }
});


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

        // FIX: Calculate initial time once and use it consistently
        const initialSecondsLeft = Math.max(0, Math.floor((start - now) / 1000));

        console.log(`[Countdown] Initial seconds: ${initialSecondsLeft}, Exam: ${exam.name}`);

        // Set GIF headers
        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        });

        const gifBuffer = await generateCountdownWithOnlineText(initialSecondsLeft);
        res.send(gifBuffer);
        console.log(`✅ Countdown GIF sent successfully`);

    } catch (err) {
        console.error("[Countdown Error]:", err);
        sendErrorGif(res, "Server Error");
    }
});

// Generate countdown using online text-to-image service
async function generateCountdownWithOnlineText(initialSecondsLeft) {
    const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
    const codec = new GifCodec();
    const frames = [];

    // Generate 5 frames using consistent time reference
    for (let i = 0; i < 5; i++) {
        const currentSeconds = Math.max(0, initialSecondsLeft - i);
        const mins = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;

        const timeText = currentSeconds <= 0 ? "EXAM STARTED" : `Starts in ${mins}:${secs.toString().padStart(2, "0")}`;
        const color = currentSeconds <= 60 ? "red" : "blue";

        try {
            // Generate text image using QuickChart API
            const textImageUrl = await generateTextImage(timeText, color);
            const frame = await createFrameFromImageUrl(textImageUrl);
            frames.push(frame);
        } catch (error) {
            console.error(`Error generating frame ${i}:`, error);
            // Fallback: create simple colored frame
            const fallbackFrame = createSimpleFrame(timeText, color);
            frames.push(fallbackFrame);
        }
    }

    const gif = await codec.encodeGif(frames, {
        loops: 0,
        delayCentisecs: 100
    });

    return gif.buffer;
}

// Generate text image using QuickChart API
async function generateTextImage(text, color = "blue") {
    const width = 300;
    const height = 80;

    // Use QuickChart API for text generation
    const chartConfig = {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [1], // Single value for full circle
                backgroundColor: [color],
                borderColor: [color],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '80%',
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: text,
                    font: { size: 16, family: 'Arial', weight: 'bold' },
                    color: color,
                    position: 'bottom',
                    padding: { top: 20, bottom: 10 }
                },
                tooltip: { enabled: false }
            },
            responsive: false,
            maintainAspectRatio: false
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    const imageUrl = `https://quickchart.io/chart?c=${encodedConfig}&width=${width}&height=${height}&backgroundColor=white`;

    return imageUrl;
}

// Alternative: Use a simpler text-only API
async function generateSimpleTextImage(text, color = "blue") {
    const width = 300;
    const height = 80;

    // Simple text image using QuickChart's label API
    const imageUrl = `https://quickchart.io/chart?cht=tx&chl=${encodeURIComponent(text)}&chco=${color}&chf=bg,s,FFFFFF&chs=${width}x${height}`;

    return imageUrl;
}

// Create frame from online image URL
async function createFrameFromImageUrl(imageUrl) {
    const { GifFrame, BitmapImage } = require('gifwrap');

    try {
        // Download image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        // Convert to PNG and then to raw bitmap data
        const { data, info } = await sharp(imageBuffer)
            .resize(300, 80) // Ensure consistent size
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        return new GifFrame(new BitmapImage({
            width: info.width,
            height: info.height,
            data: data
        }), { delayCentisecs: 100 });
    } catch (error) {
        throw new Error(`Failed to download/process image: ${error.message}`);
    }
}

// Fallback: Create simple frame if online service fails
function createSimpleFrame(text, color) {
    const { GifFrame, BitmapImage } = require('gifwrap');
    const width = 300;
    const height = 80;
    const frameData = Buffer.alloc(width * height * 4);

    const rgbColor = color === "red" ? [255, 0, 0] : [0, 0, 255];

    // Fill with white background
    for (let i = 0; i < frameData.length; i += 4) {
        frameData[i] = 255;     // R
        frameData[i + 1] = 255; // G
        frameData[i + 2] = 255; // B
        frameData[i + 3] = 255; // A
    }

    // Draw colored border
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) {
                const index = (y * width + x) * 4;
                frameData[index] = rgbColor[0];
                frameData[index + 1] = rgbColor[1];
                frameData[index + 2] = rgbColor[2];
            }
        }
    }

    return new GifFrame(new BitmapImage({
        width: width,
        height: height,
        data: frameData
    }), { delayCentisecs: 100 });
}

// Test endpoint with online text generation
app.get("/api/test-online-text.gif", async (req, res) => {
    try {
        const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
        const codec = new GifCodec();
        const frames = [];

        const testTexts = [
            "Test: 05:00",
            "Test: 04:59",
            "Test: 01:00",
            "Test: 00:59",
            "EXAM STARTED"
        ];

        for (let i = 0; i < testTexts.length; i++) {
            const color = i >= 2 ? "red" : "blue"; // Last two in red

            try {
                const imageUrl = await generateSimpleTextImage(testTexts[i], color);
                const frame = await createFrameFromImageUrl(imageUrl);
                frames.push(frame);
            } catch (error) {
                console.error(`Test frame ${i} failed:`, error);
                const fallbackFrame = createSimpleFrame(testTexts[i], color);
                frames.push(fallbackFrame);
            }
        }

        const gif = await codec.encodeGif(frames, { loops: 0 });

        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache"
        });
        res.send(gif.buffer);
        console.log("✅ Online text test GIF sent");

    } catch (error) {
        console.error("Online text test failed:", error);
        sendErrorGif(res, "Test Failed");
    }
});

// Error GIF
async function sendErrorGif(res, message) {
    try {
        const { GifFrame, GifCodec, BitmapImage } = require('gifwrap');
        const codec = new GifCodec();

        // Try to generate error image online
        try {
            const imageUrl = await generateSimpleTextImage(message, "red");
            const frame = await createFrameFromImageUrl(imageUrl);
            const gif = await codec.encodeGif([frame], { loops: 1 });
            res.set("Content-Type", "image/gif");
            res.send(gif.buffer);
        } catch (onlineError) {
            // Fallback to simple error frame
            const frame = createSimpleFrame(message, "red");
            const gif = await codec.encodeGif([frame], { loops: 1 });
            res.set("Content-Type", "image/gif");
            res.send(gif.buffer);
        }
    } catch (error) {
        const simpleGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set("Content-Type", "image/gif");
        res.send(simpleGif);
    }
}


app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
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

app.use('/api/face', faceRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/", deepLinkRoutes);
app.use("/api/student", studentRoutes);

app.get('/', (req, res) => {
    res.send('Exam App API is running...');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// server.listen(PORT, console.log(`Server running on port ${PORT}`));

export default app