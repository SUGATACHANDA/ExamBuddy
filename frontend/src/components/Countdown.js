import React, { useState, useEffect, useMemo } from 'react';

/**
 * A flexible, self-contained countdown timer component.
 * @param {object} props
 * @param {Date|string} props.targetDate - The timestamp (or a string representing it) to count down to.
 * @param {string} [props.prefixText=''] - Optional text to display before the timer.
 * @param {string} [props.completionText='Time is up!'] - Text to display when the countdown finishes.
 */
const Countdown = ({ targetDate, prefixText = '', completionText = 'Time is up!' }) => {

    const calculateTimeLeft = React.useCallback(() => {
        // Calculate the difference between the target time and the current time.
        // `+new Date()` is a shorthand way to get the timestamp (number of milliseconds).
        const difference = +new Date(targetDate) - +new Date();

        let timeLeft = {};

        if (difference > 0) {
            // Calculate days, hours, minutes, and seconds from the total milliseconds.
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        // If the difference is zero or negative, return an empty object.
        return timeLeft;
    }, [targetDate]);

    // Initialize state with the first calculation.
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    // This effect hook sets up and tears down the one-second interval.
    useEffect(() => {
        // Create an interval that calls our calculation function every second.
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // This is the cleanup function. It runs when the component unmounts,
        // which is crucial for preventing memory leaks from dangling intervals.
        return () => clearInterval(timer);
    }, [calculateTimeLeft, targetDate]); // The effect re-runs only if the targetDate prop changes.


    // useMemo is used to create the timer display.
    // This part of the code will only re-run if `timeLeft` changes, which is a small performance optimization.
    const timerComponents = useMemo(() => {
        const components = [];

        // Build an array of JSX elements to display
        if (timeLeft.days > 0) {
            components.push(<span key="days">{timeLeft.days}d </span>);
        }
        if (timeLeft.hours > 0 || timeLeft.days > 0) { // Show hours if days are present, even if hours is 0
            components.push(<span key="hours">{String(timeLeft.hours || 0).padStart(2, '0')}h </span>);
        }
        if (timeLeft.minutes > 0 || timeLeft.hours > 0 || timeLeft.days > 0) {
            components.push(<span key="minutes">{String(timeLeft.minutes || 0).padStart(2, '0')}m </span>);
        }

        // Seconds are always shown, unless the entire time is up.
        components.push(<span key="seconds">{String(timeLeft.seconds || 0).padStart(2, '0')}s</span>);

        // If the array is empty (meaning timeLeft is empty), the time is up.
        if (Object.keys(timeLeft).length === 0) {
            return <span className="timer-complete">{completionText}</span>;
        }

        return components;
    }, [timeLeft, completionText]);

    return (
        <div className="countdown-container">
            {prefixText && <span>{prefixText}</span>}
            <div className="countdown-timer">
                {timerComponents}
            </div>
        </div>
    );
};

export default Countdown;