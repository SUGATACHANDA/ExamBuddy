import { ALERT_TYPES } from "components/ui/AlertModal";
import { useState } from "react";

export function useAlert() {
    const [alertConfig, setAlertConfig] = useState({
        isOpen: false,
        type: ALERT_TYPES.INFO,
        title: "",
        message: "",
    });

    const openAlert = (config) => {
        setAlertConfig({
            isOpen: true,
            type: ALERT_TYPES.INFO,
            ...config,
        });
    };

    const closeAlert = () => {
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
    };

    return [alertConfig, setAlertConfig, openAlert, closeAlert];
}