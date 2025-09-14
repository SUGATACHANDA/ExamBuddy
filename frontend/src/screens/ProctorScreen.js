import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC'; // Import the custom hook that handles all the hard work

// --- STUDENT MONITOR COMPONENT (Child) ---
// This is a simple, "dumb" component whose only job is to display a video stream.
const StudentMonitor = ({ peer }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        // When the `stream` prop from the peer object is available,
        // attach it to the srcObject of the <video> element.
        if (videoRef.current && peer.stream) {
            videoRef.current.srcObject = peer.stream;
        }
    }, [peer.stream]); // This effect runs whenever the stream changes.

    // Note: The `handleExpel` logic would be added back here later,
    // potentially by passing a function from the main hook.
    // For now, we focus on displaying the video.
    const handleExpel = () => {
        alert(`Expel functionality would be triggered for peer with ID: ${peer.socketId}`);
    };

    return (
        <div className="student-monitor">
            {/* The peer object might eventually contain the student's name */}
            <h4>Student: {peer.socketId}</h4>
            <div className="video-container">
                {/* 
                  - The `ref` attaches this element to our `videoRef`.
                  - `autoPlay` makes the video play as soon as it's received.
                  - `playsInline` is important for mobile compatibility.
                  - `muted` is added because browsers often block un-muted autoplaying video.
                    The teacher can manually unmute if needed.
                */}
                <video ref={videoRef} autoPlay playsInline muted />
            </div>
            {/* The proctoring log for violations would be implemented here */}
            {/* <div className="proctor-log">...</div> */}
            <button onClick={handleExpel} className="btn-danger">
                Expel Student
            </button>
        </div>
    );
};


// --- PROCTOR SCREEN COMPONENT (Parent) ---
// This is the main screen for the teacher. It is now clean and declarative.
const ProctorScreen = () => {
    const { examId } = useParams();
    const { userInfo } = useAuth(); // Get the currently logged-in teacher

    // --- THIS IS THE CORE OF THE NEW ARCHITECTURE ---
    // We call our custom hook with the exam ID and the current user's info.
    // The hook handles EVERYTHING: Socket.IO, permissions, WebRTC signaling, etc.
    // It returns a clean, simple array of "peers" (the connected students).
    const { peers } = useWebRTC(examId, userInfo);
    // ---------------------------------------------

    return (
        <div className="proctor-container">
            <h1>Live Proctoring: Exam "{examId}"</h1>
            <p><strong>Status:</strong> {peers.length > 0 ? `${peers.length} student(s) connected.` : 'Waiting for students...'}</p>
            <hr />

            <div className="monitors-grid">
                {peers.length > 0 ? (
                    // We simply map over the array of peers and render a monitor for each one.
                    peers.map(peer => (
                        <StudentMonitor key={peer.socketId} peer={peer} />
                    ))
                ) : (
                    <div className="status-container">
                        <p>No students have connected to this proctoring session yet.</p>
                        <p>Please ensure students have started the correct exam.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProctorScreen;