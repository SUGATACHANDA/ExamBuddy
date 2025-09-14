// backend/utils/seed.js

// const College = require('../models/College');
const User = require('../models/User');

const seedData = async () => {
    // --- 1. Seed Default College ---
    try {
        // let defaultCollege = await College.findOne({ name: 'Default University' });
        // if (!defaultCollege) {
        //     defaultCollege = await College.create({
        //         name: 'Default University',
        //         location: 'Main Campus',
        //     });
        //     console.log('Default University created.');
        // } else {
        //     console.log('Default University already exists.');
        // }

        // --- 2. Seed Default Admin ---
        const adminExists = await User.findOne({ email: 'admin@example.com' });

        if (!adminExists) {
            await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                password: 'password123', // Use a strong password in a real app!
                collegeId: 'ADMIN001',
                role: 'admin',
                college: defaultCollege._id, // Link to the default college
            });
            console.log('Default admin account created with password: password123');
        } else {
            console.log('Default admin account already exists.');
        }

    } catch (error) {
        console.error('Error during data seeding:', error);
    }
};

module.exports = seedData;