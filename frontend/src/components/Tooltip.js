import React, { useState } from "react";

const Tooltip = ({ content, position = "top", children }) => {
    const [visible, setVisible] = useState(false);

    return (
        <div
            className="tooltip-container"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
            style={{ display: "inline-block", position: "relative" }}
        >
            {children}
            {visible && (
                <div className={`tooltip-box tooltip-${position}`}>
                    {content}
                    <span className={`tooltip-arrow tooltip-arrow-${position}`} />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
