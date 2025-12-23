// config/db.js
const mongoose = require('mongoose');

mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", true);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            keepAliveInitialDelay: 300000000,
            keepAlive: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;