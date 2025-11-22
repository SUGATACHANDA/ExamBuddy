import { useEffect, useState } from "react";

export default function OpenExamBuddy() {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const examId = params.get("examId") || "";

        const deepLink = `exam-buddy://open?examId=${examId}`;

        // Try to open Electron App
        window.location.href = deepLink;

        // Fallback redirect timer
        const timer = setTimeout(() => {
            window.location.href = "/download";
        }, 5000);

        // UI countdown
        const interval = setInterval(() => {
            setCountdown(prev => Math.max(prev - 1, 0));
        }, 1000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    return (
        <div style={styles.container}>
            <h2>Launching Exam Buddy...</h2>
            <p>If the app does not open, you will be redirected in {countdown} seconds.</p>
            <button style={styles.button} onClick={() => window.location.reload()}>
                Try Again
            </button>
            <p><a href="/download">Download App</a></p>
        </div>
    );
}

const styles = {
    container: {
        textAlign: "center",
        marginTop: "80px",
        fontFamily: "Segoe UI, sans-serif"
    },
    button: {
        marginTop: "15px",
        padding: "10px 20px",
        background: "#4466ff",
        color: "white",
        borderRadius: "6px",
        border: "none",
        cursor: "pointer"
    }
};
