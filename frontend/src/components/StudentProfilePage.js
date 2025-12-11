import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import BiometricRegisterModal from "../components/BiometricRegisterModal";
import ChangePasswordModal from "../components/ui/ChangePasswordModal";
import UserDetailsCard from "./UserDetailsCard";
import { Fingerprint, KeyRound, LogOut, User2 } from "lucide-react";
import api from "api/axiosConfig";

const StudentProfilePage = () => {
    const { userInfo, logout } = useAuth();
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();


    const [isBiometricModalOpen, setBiometricModalOpen] = useState(false);
    const [activePage, setActivePage] = useState("details");
    const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
    const [loadingUser, setLoadingUser] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/student/profile/${id}`);
                setProfileData(res.data);
            } catch (error) {
                console.error("Failed to load profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    return (
        <div className="profile-wrapper">

            {/* ---- Sidebar ---- */}
            <div className="profile-sidebar">
                <h2 className="sidebar-title">My Profile</h2>

                <button
                    className={`sidebar-btn ${activePage === "details" ? "active" : ""}`}
                    onClick={() => setActivePage("details")}
                >
                    <span className="sidebar-btn-content">
                        <User2 size={18} />
                        <span>User Details</span>
                    </span>
                </button>

                <button
                    className={`sidebar-btn ${activePage === "biometric" ? "active" : ""}`}
                    onClick={() => {
                        setActivePage("biometric");
                        setBiometricModalOpen(true);
                    }}
                >
                    <span className="sidebar-btn-content">
                        <Fingerprint size={18} />
                        <span>Biometric Registration</span>
                    </span>
                </button>

                <button
                    className={`sidebar-btn ${activePage === "password" ? "active" : ""}`}
                    onClick={() => {
                        setActivePage("password");
                        setIsChangePassModalOpen(true);
                    }}
                >
                    <span className="sidebar-btn-content">
                        <KeyRound size={18} />
                        <span>Change Password</span>
                    </span>
                </button>

                <button
                    className="sidebar-btn logout"
                    onClick={logout}
                >
                    <span className="sidebar-btn-content">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </span>
                </button>

                <button
                    className="sidebar-btn back-btn"
                    onClick={() => navigate("/student/dashboard")}
                >
                    ← Back to Dashboard
                </button>
            </div>

            {/* ---- Main Content ---- */}
            <div className="profile-content">
                {activePage === "details" && (
                    <UserDetailsCard user={profileData} loading={loading} />
                )}
            </div>

            {/* Biometric Modal */}
            <BiometricRegisterModal
                isOpen={isBiometricModalOpen}
                onComplete={() => {
                    setBiometricModalOpen(false)
                    setActivePage("details")
                }}
                allowClose={true}
            />

            {/* Change Password Modal */}
            {isChangePassModalOpen && (
                <ChangePasswordModal
                    isOpen={isChangePassModalOpen}
                    onClose={() => {
                        setIsChangePassModalOpen(false);
                        setActivePage("details");
                    }}
                />
            )}
        </div>
    );
};

export default StudentProfilePage;
