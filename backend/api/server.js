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
app.get('/api/exams/countdown/:examId.gif', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.examId).lean();

        if (!exam) {
            // Send a 1x1 transparent pixel if exam not found
            res.setHeader('Content-Type', 'image/gif');
            res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
            return;
        }

        const width = 300;
        const height = 80;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const now = new Date().getTime();
        const examTime = new Date(exam.scheduledAt).getTime();
        const distance = examTime - now;

        let displayText = "Time's up!";
        if (distance > 0) {
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            displayText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        // --- Drawing the image ---

        // Background
        ctx.fillStyle = '#f3f4f6'; // Light gray background to match card
        ctx.fillRect(0, 0, width, height);

        // Text Styling
        ctx.font = 'bold 32px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        ctx.fillStyle = '#1d4ed8'; // Blue text color
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw the text in the center of the canvas
        ctx.fillText(displayText, width / 2, height / 2);

        // --- Send the response ---
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Important: prevent caching
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const buffer = canvas.toBuffer('image/png'); // Using PNG for better quality, but sending as GIF
        res.send(buffer);

    } catch (error) {
        console.error('Failed to generate countdown image:', error);
        // Fallback to a 1x1 pixel in case of an error
        res.setHeader('Content-Type', 'image/gif');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
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


server.listen(PORT, console.log(`Server running on port ${PORT}`));