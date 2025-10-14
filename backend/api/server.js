// server.js
const express = require('express');
require("dotenv").config();
const cors = require('cors');
const http = require('http');
const connectDB = require('../config/db.js');
const { notFound, errorHandler } = require('../middlewares/errorMiddleware.js');
const seedData = require('../utils/seed.js');
const { createCanvas } = require('canvas');
const Exam = require('../models/Exam.js');
const path = require('path');

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

/**
 * @desc    Generate a live countdown GIF for an exam
 * @route   GET /api/exams/countdown/:examId.gif
 * @access  Public
 */
try {
    const fontPath = path.join(__dirname, 'backend', 'assets', 'fonts', 'Poppins-Bold.ttf');
    registerFont(fontPath, { family: 'Poppins' });
    console.log('Custom font "Poppins" registered successfully for image generation.');
} catch (error) {
    // If the font can't be loaded, log a critical error and continue.
    // The server will run, but generated images will have rendering issues.
    console.error('CRITICAL ERROR: Failed to load custom font. Text on countdown images will not render correctly.', error);
}
app.get('/api/exams/countdown/:examId.gif', async (req, res) => {
    // --- Set headers IMMEDIATELY ---
    // This tells the email client this is an image and that it should NOT be cached.
    res.setHeader('Content-Type', 'image/png'); // Using PNG for better quality than GIF
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const exam = await Exam.findById(req.params.examId).lean();

        if (!exam) {
            console.error(`Countdown Error: Exam not found for ID: ${req.params.examId}`);
            return res.send(createErrorImage('Exam not found.'));
        }

        const canvas = createCanvas(300, 80);
        const ctx = canvas.getContext('2d');

        // Draw Background
        ctx.fillStyle = '#f3f4f6'; // Light gray background to match email card
        ctx.fillRect(0, 0, 300, 80);

        // Calculate time remaining and format it
        const distance = new Date(exam.scheduledAt).getTime() - new Date().getTime();
        const displayText = formatDistance(distance);

        // Draw Text (using the registered 'Poppins' font)
        ctx.font = '32px Poppins'; // <--- THIS USES THE LOADED FONT
        ctx.fillStyle = '#1d4ed8'; // Dark blue text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, 150, 40);

        res.send(canvas.toBuffer('image/png'));
    } catch (error) {
        console.error(`Failed to generate countdown image for exam ${req.params.examId}:`, error);
        res.status(500).send(createErrorImage('Error generating timer.'));
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

const formatDistance = (distance) => {
    if (distance <= 0) return "Starting Now!";

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // If more than a day left, show days, hours, and minutes.
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    }

    // If less than a day, show HH:MM:SS format
    const pad = (num) => (num < 10 ? '0' + num : num); // Pads with leading zero
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Creates a fallback PNG image buffer to send in case of an error.
 * @param {string} text - The error message to display on the image.
 * @returns {Buffer} - A PNG image buffer.
 */
const createErrorImage = (text) => {
    const canvas = createCanvas(300, 80);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fee2e2'; // Light red background
    ctx.fillRect(0, 0, 300, 80);
    ctx.font = '16px sans-serif'; // Use a generic fallback font for the error image itself
    ctx.fillStyle = '#b91c1c'; // Dark red text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 150, 40);
    return canvas.toBuffer('image/png');
};


server.listen(PORT, console.log(`Server running on port ${PORT}`));