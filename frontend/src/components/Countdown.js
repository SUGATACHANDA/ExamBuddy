// src/components/Countdown.js
import React, { useState, useEffect, useMemo } from 'react';

/**
 * A flexible, self-contained countdown timer component.
 * @param {object} props
 * @param {Date|string} props.targetDate - The timestamp (or a string representing it) to count down to.
 * @param {string} [props.prefixText=''] - Optional text to display before the timer.
 * @param {string} [props.completionText='Time is up!'] - Text to display when the countdown finishes.
 * @param {function} [props.onComplete] - Callback function when countdown completes.
 */
const Countdown = ({ targetDate, prefixText = '', completionText = 'Time is up!', onComplete }) => {

    const calculateTimeLeft = React.useCallback(() => {
        const difference = +new Date(targetDate) - +new Date();

        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    }, [targetDate]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    const [hasCompleted, setHasCompleted] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);

            // Check if countdown just completed
            if (Object.keys(newTimeLeft).length === 0 && !hasCompleted) {
                setHasCompleted(true);
                if (onComplete) {
                    onComplete();
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [calculateTimeLeft, targetDate, onComplete, hasCompleted]);

    const timerComponents = useMemo(() => {
        const components = [];

        if (timeLeft.days > 0) {
            components.push(<span key="days">{timeLeft.days}d </span>);
        }
        if (timeLeft.hours > 0 || timeLeft.days > 0) {
            components.push(<span key="hours">{String(timeLeft.hours || 0).padStart(2, '0')}h </span>);
        }
        if (timeLeft.minutes > 0 || timeLeft.hours > 0 || timeLeft.days > 0) {
            components.push(<span key="minutes">{String(timeLeft.minutes || 0).padStart(2, '0')}m </span>);
        }

        components.push(<span key="seconds">{String(timeLeft.seconds || 0).padStart(2, '0')}s</span>);

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