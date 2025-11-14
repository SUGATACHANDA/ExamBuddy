import React, { useState, useEffect } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

const VirtualNumericKeyboard = ({ initialValue = "", onChange, onSubmit, onClose }) => {
    const [input, setInput] = useState(initialValue || "");

    useEffect(() => {
        setInput(initialValue || "");
    }, [initialValue]);

    const handleChange = (value) => {
        setInput(value);
        if (onChange) onChange(value);
    };

    return (
        <div className="keyboard-overlay">
            <div className="keyboard-popup">
                <div className="keyboard-header">
                    <h3>Virtual Keyboard</h3>
                    <button className="keyboard-close" onClick={onClose}>✖</button>
                </div>

                <div className="keyboard-input-area">
                    <input
                        type="text"
                        value={input}
                        readOnly
                        placeholder="Type your answer..."
                        className="keyboard-input-field"
                    />
                    <button
                        className="keyboard-submit-btn"
                        onClick={() => onSubmit && onSubmit(input)}
                    >
                        ✅ Submit
                    </button>
                </div>

                <Keyboard
                    layout={{
                        default: [
                            "1 2 3",
                            "4 5 6",
                            "7 8 9",
                            "0 .",
                            "{bksp}",
                            "{space}"
                        ],
                    }}
                    display={{
                        "{bksp}": "⌫",
                        "{space}": "Space",
                    }}
                    theme="hg-theme-default hg-layout-default myTheme1"
                    onChange={handleChange}
                    value={input}
                />
            </div>
        </div>
    );
};

export default VirtualNumericKeyboard;
