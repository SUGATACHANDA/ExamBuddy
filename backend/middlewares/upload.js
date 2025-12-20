const multer = require("multer");

// -----------------------------
// STORAGE (memory, prod-safe)
// -----------------------------
const storage = multer.memoryStorage();

// -----------------------------
// FILE FILTER FACTORY
// -----------------------------
const fileFilterFactory = (allowedTypes) => {
    return (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    `Unsupported file type: ${file.mimetype}`
                ),
                false
            );
        }
    };
};

// -----------------------------
// COMMON MIME TYPES
// -----------------------------
const IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/jpg",
];

const DOC_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const CSV_TYPES = [
    "text/csv",
    "application/vnd.ms-excel",
];

// -----------------------------
// UPLOAD HANDLERS
// -----------------------------

// 🔹 For images + documents
const uploadFiles = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilterFactory([...IMAGE_TYPES, ...DOC_TYPES]),
});

// 🔹 For CSV only
const uploadCSV = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilterFactory(CSV_TYPES),
});

// -----------------------------
// EXPORTS
// -----------------------------
module.exports = {
    uploadFiles, // images / pdf / docs
    uploadCSV,   // csv only
};
