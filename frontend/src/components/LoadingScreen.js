import React from "react";

const LoadingScreen = () => {
    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <div className="pulse-ring">
                    <div className="pulse-core"></div>
                </div>
                <span className="loading-text">Loading...</span>
            </div>
        </div>
    );
};

export default LoadingScreen;
