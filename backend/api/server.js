// =================================================================
//                 SERVER.JS - THE DEFINITIVE FINAL VERSION
// =================================================================
const express = require('express');
require("dotenv").config();
const cors = require('cors');
const http = require('http');
const fs = require('fs'); // <-- Import File System for the check
const path = require('path');
const { Jimp } = require('jimp').Jimp;

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
app.get('/api/exams/countdown/:examId.gif', async (req, res) => {
    const examId = req.params.examId;
    console.log(`[REQUEST] Image request received for Exam ID: ${examId}`);

    try {
        const exam = await Exam.findById(examId).lean();
        if (!exam) {
            const errorImage = await createErrorImage('Exam Not Found');
            return res.status(404).type('image/png').send(errorImage);
        }

        // --- VERCEL-COMPATIBLE PATH CONSTRUCTION ---
        // process.cwd() is the project root in Vercel's environment.
        // It's the location from which you started the 'node' process.
        // This is more reliable than __dirname for finding assets.
        const projectRoot = process.cwd();
        const fontPath = path.join(__dirname, '../assets/font/font.fnt');

        console.log(`[INFO] Current working directory (project root): ${projectRoot}`);
        console.log(`[INFO] Attempting to find font at absolute path: ${fontPath}`);

        if (!fs.existsSync(fontPath)) {
            console.error(`[CRITICAL] FONT FILE NOT FOUND AT PATH: ${fontPath}`);
            const errorImage = await createErrorImage('Server Font Missing');
            return res.status(500).type('image/png').send(errorImage);
        }

        const font = await Jimp.loadFont(fontPath);

        const image = await Jimp.create(300, 80, '#f3f4f6');
        const distance = new Date(exam.scheduledAt).getTime() - new Date().getTime();
        const displayText = formatDistance(distance);

        image.print(font, 0, 0, { text: displayText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 300, 80);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        console.log(`[SUCCESS] Sending image for Exam ID: ${examId}`);

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(buffer);
    } catch (error) {
        console.error(`[CRITICAL] Failed during image generation for ${examId}.`, error);
        const errorImage = await createErrorImage('Image Gen Error');
        res.status(500).type('image/png').send(errorImage);
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

// ============================================================
//               HELPER FUNCTIONS (Unchanged)
// ============================================================
const formatDistance = (distance) => {
    if (distance <= 0) return "Starting Now!";
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    const pad = (num) => (num < 10 ? '0' + num : num);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const createErrorImage = async (message) => {
    const image = new Jimp(400, 200, '#ffffff'); // ✅ FIXED
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

    image.print(
        font,
        10,
        80,
        {
            text: message,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        },
        380,
        100
    );

    return await image.getBufferAsync(Jimp.MIME_PNG);
};