// =================================================================
//                 SERVER.JS - THE DEFINITIVE FINAL VERSION
// =================================================================
const express = require('express');
require("dotenv").config();
const cors = require('cors');
const http = require('http');
const fs = require('fs'); // <-- Import File System for the check
const path = require('path');
const { GifCodec, GifFrame, BitmapImage } = require('gifwrap')
const { Jimp, loadFont } = require('jimp')

const { FONT_SANS_128_WHITE } = require("jimp/fonts");


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
app.get("/api/exams/countdown/:id.gif", async (req, res) => {
    try {
        // 1️⃣ Fetch the actual exam
        const exam = await Exam.findById(req.params.id).lean();
        if (!exam) {
            throw new Error("Exam not found");
        }

        const start = new Date(exam.scheduledAt);
        const now = new Date();
        let secondsLeft = Math.max(0, Math.floor((start - now) / 1000));

        // 2️⃣ Setup GIF encoder
        const width = 400;
        const height = 120;
        const frames = [];

        // Load your bitmap font
        const fontPath = path.join(__dirname, "../assets/font/font.fnt");
        if (!fs.existsSync(fontPath)) {
            console.error("[CRITICAL] FONT FILE NOT FOUND AT:", fontPath);
            throw new Error("Font file missing");
        }
        const font = await loadFont(fontPath);

        // 3️⃣ Create 5 frames (1 second each)
        for (let i = 0; i < 5; i++) {
            const img = new Jimp(width, height, "#ffffff");

            const mins = Math.floor(secondsLeft / 60);
            const secs = secondsLeft % 60;
            const timeText = `${mins.toString().padStart(2, "0")}:${secs
                .toString()
                .padStart(2, "0")}`;

            let color = "#1d4ed8"; // blue
            if (secondsLeft <= 60) color = "#dc2626"; // red when <1min

            img.print(
                font,
                0,
                0,
                {
                    text:
                        secondsLeft > 0
                            ? `Exam starts in\n${timeText}`
                            : "Exam Started!",
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
                },
                width,
                height
            );

            // Add border color for better visibility
            img.scan(0, 0, width, height, (x, y, idx) => {
                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                    img.bitmap.data.writeUInt32BE(0x000000ff, idx); // black border
                }
            });

            const bmp = new BitmapImage(await img.getBufferAsync(Jimp.MIME_PNG));
            frames.push(new GifFrame(bmp, { delayCentisecs: 100 }));

            secondsLeft = Math.max(0, secondsLeft - 1);
        }

        // 4️⃣ Encode frames into a GIF
        const codec = new GifCodec();
        const gif = await codec.encodeGif(frames, { loops: 0 });

        res.set("Content-Type", "image/gif");
        res.send(gif.buffer);

        console.log(
            `[info] Countdown GIF generated for Exam ID: ${req.params.id}`
        );
    } catch (err) {
        console.error(
            `[CRITICAL] Failed during image generation for ${req.params.id}:`,
            err
        );

        // fallback image
        const fallback = new Jimp(400, 120, "#ffffff");
        const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
        fallback.print(
            font,
            10,
            40,
            "Error generating countdown image"
        );
        const buf = await fallback.getBufferAsync(Jimp.MIME_PNG);
        res.set("Content-Type", "image/png");
        res.status(500).send(buf);
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