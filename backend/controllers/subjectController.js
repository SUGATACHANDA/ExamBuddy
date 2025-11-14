const Subject = require("../models/Subject");

// Create Subject
const createSubject = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: "Name is required" });
        }

        const subject = await Subject.create({
            name,
            teacherId: req.user.id
        });

        res.status(201).json(subject);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({ teacherId: req.user.id });
        res.json(subjects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

const deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findByIdAndDelete(req.params.id);
        if (!subject) {
            return res.status(404).json({ error: "Subject not found" });
        }
        res.json({ message: "Subject deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = { createSubject, getSubjects, deleteSubject }