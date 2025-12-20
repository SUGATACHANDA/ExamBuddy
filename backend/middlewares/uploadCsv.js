const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === "text/csv" ||
            file.mimetype === "application/vnd.ms-excel"
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only CSV files are allowed"));
        }
    }
});

module.exports = upload;
