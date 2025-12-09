import { useState, useCallback } from "react";

/**
 * Usage:
 * const [alertState, Alert] = useAlert();
 * // To show:
 * setAlert({ isOpen: true, type: 'error', title: 'Oops', message: 'Something' });
 */
export function useAlert() {
    const [config, setConfig] = useState({
        isOpen: false,
        type: "info",
        title: "",
        message: "",
        confirmText: "OK",
        cancelText: "Cancel",
        showCancel: false,
        onConfirm: null,
        onCancel: null,
        nonCloseable: false,
    });

    const open = useCallback((cfg) => {
        setConfig({ ...config, ...cfg, isOpen: true });
    }, [config]);

    const close = useCallback(() => setConfig((c) => ({ ...c, isOpen: false })), []);

    return [config, setConfig, open, close];
}
