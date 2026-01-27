import React, { useEffect, useRef } from "react";
import "./AlertModal.css";

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
export const ALERT_TYPES = Object.freeze({
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error",
});

export default function AlertModal({
    isOpen,
    type = ALERT_TYPES,
    title,
    message,
    confirmText = "Confirm",
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

        document.body.style.overflow = "hidden";

        const t = setTimeout(() => {
            confirmRef.current?.focus();
        }, 50);

        const onKey = (e) => {
            if (nonCloseable) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    onConfirm?.();
                }
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel?.();
            } else if (e.key === "Enter" && !showCancel) {
                e.preventDefault();
                onConfirm?.();
            }
        };

        document.addEventListener("keydown", onKey);
        return () => {
            clearTimeout(t);
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, nonCloseable, onConfirm, onCancel, showCancel]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (nonCloseable) return;
        if (e.target === backdropRef.current) {
            onCancel?.();
        }
    };

    const getIcon = () => {
        switch (type) {
            case ALERT_TYPES.SUCCESS:
                return "✔";
            case ALERT_TYPES.ERROR:
                return "✖";
            case ALERT_TYPES.WARNING:
                return "!";
            case ALERT_TYPES.INFO:
            default:
                return "i";
        }
    };

    return (
        <div
            className="alert-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-title"
            onMouseDown={handleBackdropClick}
            ref={backdropRef}
        >
            <div
                className="alert-modal-wrapper"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className={`alert-modal-card alert-modal-${type}`}>
                    {/* Header with icon */}
                    <div className="alert-modal-header">
                        <div className="alert-modal-icon-wrapper">
                            <div className="alert-modal-icon-circle">
                                <span className="alert-modal-icon">{getIcon()}</span>
                            </div>
                        </div>
                        <div className="alert-modal-header-content">
                            <h2 id="alert-title" className="alert-modal-title">{title}</h2>
                            {/* {type === "info" && <span className="alert-modal-type-badge">Information</span>}
                            {type === "success" && <span className="alert-modal-type-badge alert-modal-type-success">Success</span>}
                            {type === "error" && <span className="alert-modal-type-badge alert-modal-type-error">Error</span>}
                            {type === "warning" && <span className="alert-modal-type-badge alert-modal-type-warning">Warning</span>} */}
                        </div>
                    </div>

                    {/* Message body */}
                    <div className="alert-modal-body">
                        <div className="alert-modal-message">
                            {typeof message === "string" ? <p>{message}</p> : message}
                        </div>
                    </div>

                    {/* Action buttons - Cancel comes first in professional dialogs */}
                    <div className="alert-modal-actions">
                        {(
                            showCancel
                            ||
                            // ||
                            // type === ALERT_TYPES.ERROR
                            type === ALERT_TYPES.WARNING
                        ) && (
                                <button
                                    className="alert-btn alert-btn-cancel"
                                    onClick={onCancel}
                                >
                                    {cancelText}
                                </button>
                            )}

                        <button
                            className={`alert-btn alert-btn-confirm alert-btn-${type}`}
                            onClick={onConfirm}
                            ref={confirmRef}
                        >
                            {confirmText}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}