import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import BiometricRegisterModal from "../components/BiometricRegisterModal";
import LoadingScreen from "components/LoadingScreen";
import { getInitials } from "./StudentDashboad";
import ChangePasswordModal from "components/ui/ChangePasswordModal";
import { useAlert } from "hooks/useAlert";
import AlertModal from "components/ui/AlertModal";

export default function TeacherProfilePage() {
    const { id } = useParams();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bioModalOpen, setBioModalOpen] = useState(false);
    const [isChangePassOpen, setIsChangePassOpen] = useState(false);
    const [alertConfig, setAlertConfig, openAlert, closeAlert] = useAlert();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get(`/teacher/profile/${id}`);
                setProfile(res.data);
            } catch (err) {
                console.error("Failed to load teacher profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    if (loading) {
        return (
            <LoadingScreen />
        );
    }

    if (!profile) {
        return (
            <div className="t-profile-container">
                <div className="t-error">Profile not found.</div>
            </div>
        );
    }

    return (
        <div className="t-profile-container">
            <div className="t-header">
                <button className="back-btn" onClick={() => navigate("/teacher/dashboard")}>
                    ← Back to Dashboard
                </button>
                <h1>My Profile</h1>
            </div>

            <div className="t-main-card">
                <div className="t-left-panel">
                    <div className="avatar-wrap">
                        {profile.photoUrl ? (
                            <img src={profile.photoUrl} className="avatar-img" alt="Profile" />
                        ) : (
                            <div className="avatar-fallback">
                                {(getInitials(profile.name) || "U")}
                            </div>
                        )}
                    </div>
                    <h2 className="t-name">{profile.name}</h2>
                    <p className="t-role">Teacher</p>

                    <div className="t-info-grid">
                        <div className="info-row">
                            <span className="info-label">Email</span>
                            <span className="info-value">{profile.email}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">College ID</span>
                            <span className="info-value">{profile.collegeId}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Department</span>
                            <span className="info-value">{profile.department?.name || "-"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">College</span>
                            <span className="info-value">{profile.college?.name || "-"}</span>
                        </div>
                    </div>

                    <div className="t-actions">
                        <button
                            className="btn btn-outline"
                            onClick={() => setIsChangePassOpen(true)}
                        >
                            Change Password
                        </button>
                        <button className="btn btn-dark" onClick={() => setBioModalOpen(true)}>
                            {profile.faceDescriptor && profile.faceDescriptor.length > 0
                                ? "Re-Register Biometric"
                                : "Register Biometric"}
                        </button>


                    </div>
                </div>

                <div className="t-right-panel">
                    <div className="card">
                        <h3>Account Details</h3>
                        <div className="detail-row">
                            <span className="label">Role</span>
                            <span className="value">{(profile.role).toUpperCase()}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Joined On</span>
                            <span className="value">{new Date(profile.createdAt).toLocaleDateString("en-UK")}</span>
                        </div>
                        <div className="detail-row biometric-status">
                            <span className="label">Biometric Status</span>
                            <span className={`value ${profile.faceDescriptor && profile.faceDescriptor.length > 0 ? "yes" : "no"}`}>
                                {profile.faceDescriptor && profile.faceDescriptor.length > 0 ? "REGISTERED" : "NOT REGISTERED"}
                            </span>
                        </div>
                        <div style={{ marginTop: "10px" }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => {
                                    openAlert({
                                        type: "warning",
                                        title: "Logout?",
                                        message: "Are you sure you want to logout?",
                                        confirmText: "Logout",
                                        cancelText: "Cancel",
                                        onConfirm: () => {
                                            logout();
                                            closeAlert();
                                        },
                                        onCancel: () => closeAlert()
                                    });
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    {/* Add more info cards if needed */}
                </div>
            </div>
            {isChangePassOpen && (
                <ChangePasswordModal onClose={() => setIsChangePassOpen(false)} />
            )}

            <AlertModal
                {...alertConfig}
                isOpen={alertConfig.isOpen}
                onConfirm={() => {
                    alertConfig.onConfirm?.();
                    closeAlert();
                }}
                onCancel={() => {
                    alertConfig.onCancel?.();
                    closeAlert();
                }}
            />

            <BiometricRegisterModal
                isOpen={bioModalOpen}
                allowClose={true}
                onComplete={async (updated) => {
                    setBioModalOpen(false);
                    if (updated) {
                        const res = await api.get(`/teacher/profile/${id}`);
                        setProfile(res.data);
                    }
                }}
            />
        </div>
    );
}
