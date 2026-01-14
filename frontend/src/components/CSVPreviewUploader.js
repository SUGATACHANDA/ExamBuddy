import React, { useState } from "react";
import Papa from "papaparse";
import api from "../api/axiosConfig";

const REQUIRED_HEADERS = {
    student: ["collegeId", "name", "email", "password", "role", "college", "department", "degree", "course", "semester"],
    teacher: ["name", "collegeId", "email", "password"]
};

export default function CSVPreviewUploader() {
    const [role, setRole] = useState("student");
    const [rows, setRows] = useState([]);
    const [displayHeaders, setDisplayHeaders] = useState([]);
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState([]);
    const [uploadStatus, setUploadStatus] = useState(null);

    // CSV handling
    const handleCSV = (file) => {
        setFile(file);
        setRows([]);
        setErrors([]);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
                let parsedRows = result.data;
                let headers = result.meta.fields;

                // -----------------------------
                // 1️⃣ Remove BOM from headers
                // -----------------------------
                const cleanHeaders = headers.map(h => h.replace(/^\uFEFF/, "").trim());

                // -----------------------------
                // 2️⃣ Clean BOM inside rows
                // -----------------------------
                const cleanedRows = parsedRows.map((row) => {
                    const cleanRow = {};
                    Object.keys(row).forEach((key) => {
                        const cleanKey = key.replace(/^\uFEFF/, "").trim(); // remove BOM + trim
                        cleanRow[cleanKey] = row[key];
                    });
                    return cleanRow;
                });

                // -----------------------------
                // 3️⃣ Validate headers
                // -----------------------------
                const missing = REQUIRED_HEADERS[role].filter(h => !cleanHeaders.includes(h));
                if (missing.length > 0) {
                    setErrors([`Missing required columns: ${missing.join(", ")}`]);
                    return;
                }

                // -----------------------------
                // 4️⃣ Save clean rows and compute unified headers
                // -----------------------------
                // derive a union of headers preserving original order from cleanHeaders
                const headerSet = new Set();
                // prefer the parsed header order first
                cleanHeaders.forEach(h => headerSet.add(h));
                // then include any additional keys found in rows
                cleanedRows.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));

                const allHeaders = Array.from(headerSet);

                setRows(cleanedRows);
                setDisplayHeaders(allHeaders);
            },
            error: (error) => {
                setErrors([`CSV Parse Error: ${error.message}`]);
            }
        });
    };

    // Upload to server
    const uploadCSV = async () => {
        if (!file || rows.length === 0) return;

        const fd = new FormData();
        fd.append("file", file);
        fd.append("role", role);

        try {
            const res = await api.post("/hod/users/bulk-upload", fd, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            setUploadStatus(res.data);
        } catch (err) {
            setErrors([err.response?.data?.message || "Upload failed"]);
        }
    };

    return (
        <div className="csv-container">
            <h3>Bulk Upload Users via CSV</h3>

            {/* Role Selector */}
            <div style={{ marginBottom: "10px" }}>
                <label>CSV Type:&nbsp;</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="student">Student CSV</option>
                    <option value="teacher">Teacher CSV</option>
                </select>
            </div>

            {/* File Input */}
            <input
                type="file"
                accept=".csv"
                onChange={(e) => handleCSV(e.target.files[0])}
                style={{ marginBottom: "10px" }}
            />

            {/* Errors */}
            {errors.length > 0 && (
                <div className="csv-error-box">
                    {errors.map((e, idx) => (
                        <p key={idx}>⚠️ {e}</p>
                    ))}
                </div>
            )}

            {/* CSV Preview Table */}
            {rows.length > 0 && (
                <div>
                    <h4>Preview ({rows.length} rows)</h4>

                    <div className="csv-preview-wrapper">
                        <table className="csv-preview-table">
                            <thead>
                                <tr>
                                    {(displayHeaders.length ? displayHeaders : Object.keys(rows[0])).map((col) => (
                                        <th key={col}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={idx}>
                                        {(displayHeaders.length ? displayHeaders : Object.keys(row)).map((col, i2) => (
                                            <td key={i2}>{row[col] ?? ""}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button className="btn-primary" onClick={uploadCSV} style={{ marginTop: "16px" }}>
                        Confirm & Upload CSV
                    </button>
                </div>
            )}

            {/* Upload Status */}
            {uploadStatus && (
                <div className="upload-report-card">
                    <h4>📊 Upload Summary</h4>

                    <div className="report-stats">
                        <div className="stat total">
                            <span className="label">Total</span>
                            <span className="value">{uploadStatus.total}</span>
                        </div>

                        <div className="stat success">
                            <span className="label">Successful</span>
                            <span className="value">{uploadStatus.success}</span>
                        </div>

                        <div className="stat failed">
                            <span className="label">Failed</span>
                            <span className="value">{uploadStatus.failed}</span>
                        </div>
                    </div>

                    {uploadStatus.errors?.length > 0 && (
                        <div className="report-errors">
                            <h5>⚠️ Failed Records</h5>
                            <ul>
                                {uploadStatus.errors.map((err, idx) => (
                                    <li key={idx}>
                                        <strong>Row Data:</strong>{" "}
                                        {err.row?.email || err.row?.collegeId || "Unknown"} <br />
                                        <span style={{ color: "red" }}>{err.error}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
