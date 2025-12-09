import React, { useEffect, useRef } from "react";

/**
 * Props:
 * - isOpen (bool)
 * - type ("info" | "success" | "error" | "warning") — affects accent color
 * - title (string)
 * - message (string or node)
 * - confirmText (string) default "OK"
 * - cancelText (string) optional
 * - showCancel (bool) default false
 * - onConfirm (fn) optional
 * - onCancel (fn) optional — called for cancel or when modal dismissed
 * - nonCloseable (bool) if true prevents closing via ESC or backdrop
 */
export default function AlertModal({
    isOpen,
    type = "info",
    title,
    message,
    confirmText = "OK",
    cancelText = "Cancel",
    showCancel = false,
    onConfirm,
    onCancel,
    nonCloseable = false,
}) {
    const confirmRef = useRef(null);
    const backdropRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        // focus confirm button on open
        const t = setTimeout(() => {
            confirmRef.current?.focus();
        }, 50);

        const onKey = (e) => {
            if (nonCloseable) {
                // only allow Enter to confirm
                if (e.key === "Enter") {
                    e.preventDefault();
                    onConfirm?.();
                }
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel?.();
            } else if (e.key === "Enter") {
                e.preventDefault();
                onConfirm?.();
            }
        };

        document.addEventListener("keydown", onKey);
        return () => {
            clearTimeout(t);
            document.removeEventListener("keydown", onKey);
        };
    }, [isOpen, nonCloseable, onConfirm, onCancel]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (nonCloseable) return;
        if (e.target === backdropRef.current) {
            onCancel?.();
        }
    };

    return (
        <div
            className="alert-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-title"
            onMouseDown={handleBackdropClick}
            ref={backdropRef}
        >
            <div className={`alert-box alert-${type}`} onMouseDown={(e) => e.stopPropagation()}>
                <header className="alert-header">
                    <div className="alert-icon" aria-hidden>
                        {type === "success" ? "✔" : type === "error" ? "✖" : type === "warning" ? "⚠" : "ℹ"}
                    </div>
                    <h3 id="alert-title" className="alert-title">{title}</h3>
                </header>

                <div className="alert-body">
                    {typeof message === "string" ? <p>{message}</p> : message}
                </div>

                <footer className="alert-footer">
                    {showCancel && (
                        <button
                            className="alert-btn alert-cancel"
                            onClick={() => onCancel?.()}
                            aria-label="Cancel"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        className="alert-btn alert-confirm"
                        onClick={() => onConfirm?.()}
                        ref={confirmRef}
                        aria-label="Confirm"
                    >
                        {confirmText}
                    </button>
                </footer>
            </div>
        </div>
    );
}
