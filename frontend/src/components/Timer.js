// src/components/Timer.js
import React, { useState, useEffect } from 'react';

const Timer = ({ initialMinutes, onTimeUp }) => {
    const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);

    useEffect(() => {
        if (timeLeft <= 0) {
            onTimeUp();
            return;
        }

        const intervalId = setInterval(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timeLeft, onTimeUp]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="timer">
            Time Left: {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>
    );
};

export default Timer;