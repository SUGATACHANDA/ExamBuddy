// server.js
const express = require('express');
require("dotenv").config();
const cors = require('cors');
const http = require('http');
const connectDB = require('../config/db.js');
const { notFound, errorHandler } = require('../middlewares/errorMiddleware.js');
const seedData = require('../utils/seed.js');
const Exam = require('../models/Exam.js');
const path = require('path');
const Jimp = require('jimp');

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
    await connectDB(); // Connect to the database
    await seedData();  // THEN, seed the initial data
};

startServer(); // <-- CALL THE ASYNC FUNCTION

const app = express();
app.use(express.json()); // to accept json data
app.use(cors({
    origin: '*', // Allows all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
})); // to allow cross-origin requests

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/university-affairs', universityAffairsRoutes);
app.use('/api/hod', hodRoutes);

app.get('/api/exams/countdown/:examId.gif', async (req, res) => {
    const examId = req.params.examId;
    console.log(`\n--- REQUEST RECEIVED FOR COUNTDOWN IMAGE ---`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Requested Exam ID: ${examId}`);

    try {
        const exam = await Exam.findById(examId).lean();

        if (!exam) {
            console.error(`[ERROR] Exam with ID "${examId}" was not found in the database.`);
            const errorImage = await createErrorImage('Exam Not Found');
            return res.status(404).type('image/png').send(errorImage);
        }

        console.log(`[SUCCESS] Found exam: "${exam.title}" scheduled at ${exam.scheduledAt}`);

        // 1. Create a blank image
        const image = new Jimp(300, 80, '#f3f4f6');

        // 2. Load the font file. **This path must be correct.**
        const fontPath = path.join(__dirname, '..', 'assets', 'font', 'Poppins-Bold.fnt');
        console.log(`Attempting to load font from: ${fontPath}`);
        const font = await Jimp.loadFont(fontPath);
        console.log(`[SUCCESS] Font loaded successfully.`);

        // 3. Calculate and format the time
        const distance = new Date(exam.scheduledAt).getTime() - new Date().getTime();
        const displayText = formatDistance(distance);
        console.log(`Calculated display text: "${displayText}"`);

        // 4. Print text onto the image
        image.print(font, 0, 0, { text: displayText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 300, 80);

        // 5. Convert to buffer and send
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        console.log(`[SUCCESS] Image buffer created. Sending response to client.`);

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(buffer);

    } catch (error) {
        console.error(`[CRITICAL ERROR] An error occurred during image generation for exam ID "${examId}":`, error);
        const errorImage = await createErrorImage('Server Error');
        res.status(500).type('image/png').send(errorImage);
    }
});

app.get('/', (req, res) => {
    res.send('Exam App API is running...');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Setup for Socket.IO
const server = http.createServer(app);

const _formatDistance = (distance) => {
    if (distance <= 0) return "Starting Now!";
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    const pad = (num) => (num < 10 ? '0' + num : num);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};
formatDistance = _formatDistance;

const _createErrorImage = async (text) => {
    const image = new Jimp(300, 80, '#fee2e2');
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    image.print(font, 0, 0, { text: text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 300, 80);
    return await image.getBufferAsync(Jimp.MIME_PNG);
};
createErrorImage = _createErrorImage;


server.listen(PORT, console.log(`Server running on port ${PORT}`));