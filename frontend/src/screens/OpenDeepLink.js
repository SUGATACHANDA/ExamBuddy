import { useEffect } from "react";

export default function OpenDeepLink() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const examId = params.get("examId");

        // Desktop Deep Link Scheme
        const appUrl = `exam-buddy://open?examId=${examId}`;

        // Try to open the app
        window.location.href = appUrl;

        // If app not installed → after 2 secs show fallback UI
        setTimeout(() => {
            document.getElementById("fallback").style.display = "block";
        }, 2000);
    }, []);

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>Opening Exam Buddy...</h2>
            <p>If nothing happens, click below to download the app.</p>

            <div id="fallback" style={{ display: "none", marginTop: "20px" }}>
                <a href="https://your-download-link.com" className="btn">
                    Download Exam Buddy
                </a>
            </div>
        </div>
    );
}
