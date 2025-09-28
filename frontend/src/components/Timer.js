// src/components/Timer.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Import useParams to get a unique key for storage

/**
 * A persistent countdown timer that survives page refreshes.
 * @param {object} props - The component's props.
 * @param {number} props.initialMinutes - The starting duration for the countdown in minutes.
 * @param {function} props.onTimeUp - The callback function to execute when the timer reaches zero.
 */
const Timer = ({ initialMinutes, onTimeUp }) => {
    // We need a unique key for each exam's timer in session storage. The examId is perfect for this.
    const { examId } = useParams();
    const storageKey = `examEndTime_${examId}`;

    // --- The Definitive State Initialization ---
    // This function runs only ONCE when the component first mounts.
    const getInitialTimeLeft = () => {
        // 1. Check if an end time is already stored for this exam.
        const storedEndTime = sessionStorage.getItem(storageKey);

        if (storedEndTime) {
            // If it exists, this is a refresh. Calculate remaining time.
            const endTime = parseInt(storedEndTime, 10);
            const remainingTime = Math.round((endTime - Date.now()) / 1000);
            console.log("Timer restored from session storage. Seconds remaining:", remainingTime);
            return remainingTime > 0 ? remainingTime : 0;
        } else {
            // 2. If it does not exist, this is the very first load.
            // Calculate the end time and store it.
            const endTime = Date.now() + initialMinutes * 60 * 1000;
            sessionStorage.setItem(storageKey, endTime.toString());
            console.log("First load. Timer end time set in session storage.");
            return initialMinutes * 60; // Return the full duration in seconds.
        }
    };

    // Initialize state with our smart function.
    const [secondsLeft, setSecondsLeft] = useState(getInitialTimeLeft);

    // --- Countdown Effect ---
    // This useEffect hook is responsible for the 1-second tick.
    useEffect(() => {
        // If the countdown is finished, trigger the onTimeUp callback.
        if (secondsLeft <= 0) {
            // Clean up session storage when the exam is over.
            sessionStorage.removeItem(storageKey);
            onTimeUp();
            return;
        }

        // Set up an interval that decrements the seconds left.
        const intervalId = setInterval(() => {
            setSecondsLeft(prevSeconds => prevSeconds - 1);
        }, 1000);

        // Crucial cleanup function to clear the interval on unmount or re-render.
        return () => clearInterval(intervalId);
    }, [secondsLeft, onTimeUp, storageKey]); // Add storageKey to dependency array for correctness.


    // --- Time Formatting (This logic is unchanged) ---
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const timerClassName = secondsLeft < 60 ? 'timer timer-warning' : 'timer';

    return (
        <div className={timerClassName}>
            Time Left: {formattedMinutes}:{formattedSeconds}
        </div>
    );
};

export default Timer;