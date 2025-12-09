const multer = require("multer");
const path = require("path");

// Memory storage — file is stored in RAM as buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (ext === ".csv" || mime === "text/csv") {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file type"), false);
    }
};

module.exports = multer({ storage, fileFilter });
