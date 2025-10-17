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

const fontPath = path.join(__dirname, "../assets/font/Poppins-Regular.ttf");
const fontBase64 = fs.readFileSync(fontPath).toString("base64");
async function renderFrame(text, color = "#1d4ed8") {
    const width = 400;
    const height = 120;

    // Create SVG with text - more reliable than sharp's text rendering
    const svgImage = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="white"/>
            <text 
                x="50%" 
                y="50%" 
                font-family="Arial, sans-serif" 
                font-size="20" 
                font-weight="bold"
                fill="${color}" 
                text-anchor="middle" 
                dominant-baseline="middle"
            >${text}</text>
        </svg>
    `;

    try {
        const buffer = await sharp(Buffer.from(svgImage))
            .png()
            .toBuffer();

        return buffer;
    } catch (error) {
        console.error('Error rendering frame:', error);
        // Fallback: create a simple colored rectangle with text
        return await sharp({
            create: {
                width,
                height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
            .composite([{
                input: {
                    text: {
                        text: text,
                        width: width - 20,
                        height: height - 20,
                        rgba: false
                    }
                },
                top: 50,
                left: 10
            }])
            .png()
            .toBuffer();
    }
}

// Route: Generate countdown GIF - COMPLETELY FIXED
app.get("/api/exams/countdown/:id.gif", async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).lean();
        if (!exam) {
            return res.status(404).send("Exam not found");
        }

        const start = new Date(exam.scheduledAt);
        const now = new Date();
        let secondsLeft = Math.max(0, Math.floor((start - now) / 1000));

        // Set headers first
        res.set({
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        });

        const frames = [];
        const codec = new GifCodec();

        // Generate 5 frames (one per second)
        for (let i = 0; i < 5; i++) {
            const mins = Math.floor(secondsLeft / 60);
            const secs = secondsLeft % 60;
            const timeText =
                secondsLeft <= 0
                    ? "Exam Started!"
                    : `Starts in ${mins}:${secs.toString().padStart(2, "0")}`;

            const color = secondsLeft <= 60 ? "#dc2626" : "#1d4ed8"; // red if <1 min

            try {
                const pngBuffer = await renderFrame(timeText, color);

                // Convert PNG to bitmap for GIF frame
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
                    delayCentisecs: 100 // 1 second delay
                }));

                secondsLeft = Math.max(0, secondsLeft - 1);

            } catch (frameError) {
                console.error(`Error generating frame ${i}:`, frameError);
                continue; // Skip this frame but continue with others
            }
        }

        // If no frames were created, send error
        if (frames.length === 0) {
            return res.status(500).send("Failed to generate countdown frames");
        }

        // Encode GIF
        const gif = await codec.encodeGif(frames, {
            loops: 0 // Infinite looping
        });

        res.send(gif.buffer);
        console.log(`✅ Countdown GIF successfully generated for exam ${req.params.id}`);

    } catch (err) {
        console.error("[CRITICAL] Failed to generate countdown GIF:", err);

        // Send a simple error image instead of text
        try {
            const errorSvg = `
                <svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="white"/>
                    <text x="50%" y="50%" font-family="Arial" font-size="16" fill="red" 
                          text-anchor="middle" dominant-baseline="middle">
                        Error Loading Countdown
                    </text>
                </svg>
            `;
            const errorImage = await sharp(Buffer.from(errorSvg))
                .png()
                .toBuffer();

            res.set("Content-Type", "image/png");
            res.send(errorImage);
        } catch (fallbackError) {
            res.status(500).send("Error generating countdown");
        }
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