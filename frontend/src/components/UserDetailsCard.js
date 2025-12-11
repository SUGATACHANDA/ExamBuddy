import React from "react";

export default function UserDetailsCard({ user, loading }) {
    if (loading) {
        return (
            <div className="user-card skeleton-card">
                <div className="user-photo-section">
                    <div className="skeleton skeleton-photo"></div>
                </div>

                <div className="user-info-section">
                    <div className="skeleton skeleton-title"></div>
                    <div className="skeleton skeleton-subtitle"></div>

                    <div className="user-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="user-field skeleton-field">
                                <div className="skeleton skeleton-label"></div>
                                <div className="skeleton skeleton-value"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ---- Original card ----
    return (
        <div className="user-card">
            <div className="user-photo-section">
                <img
                    src={user?.photoUrl || "/default-avatar.png"}
                    alt={user?.name}
                    className="user-photo"
                />
            </div>

            <div className="user-info-section">
                <h2 className="user-card-name">{user?.name}</h2>
                <p className="user-card-role">{user?.role?.toUpperCase()}</p>

                <div className="user-grid">
                    <div className="user-field">
                        <span className="label">Email</span>
                        <span className="value">{user?.email}</span>
                    </div>

                    <div className="user-field">
                        <span className="label">College ID</span>
                        <span className="value">{user?.collegeId}</span>
                    </div>

                    <div className="user-field">
                        <span className="label">College</span>
                        <span className="value">{user?.college?.name || "N/A"}</span>
                    </div>

                    <div className="user-field">
                        <span className="label">Department</span>
                        <span className="value">{user?.department?.name || "N/A"}</span>
                    </div>

                    <div className="user-field">
                        <span className="label">Degree</span>
                        <span className="value">{user?.degree?.name || "N/A"}</span>
                    </div>

                    <div className="user-field">
                        <span className="label">Course</span>
                        <span className="value">{user?.course?.name || "N/A"}</span>
                    </div>

                    <div className="user-field">
                        <span className="label">Semester</span>
                        <span className="value">{user?.semester?.number || "N/A"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
