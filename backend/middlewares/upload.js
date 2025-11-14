// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use memory storage to directly send buffer to Cloudinary
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });


module.exports = upload;
