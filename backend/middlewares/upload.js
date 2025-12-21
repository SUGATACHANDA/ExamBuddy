const multer = require('multer');

// Use memory storage for Vercel (serverless compatible)
const storage = multer.memoryStorage(); // <-- CHANGE TO MEMORY STORAGE

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Validate file types if needed
        if (file.mimetype.startsWith('image/') ||
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type'), false);
        }
    }
});

module.exports = upload;