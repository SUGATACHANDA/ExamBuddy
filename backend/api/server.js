// server.js
const express = require('express');
require("dotenv").config();
const cors = require('cors');
const http = require('http');
const connectDB = require('../config/db.js');
const { notFound, errorHandler } = require('../middlewares/errorMiddleware.js');
const seedData = require('../utils/seed.js');

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