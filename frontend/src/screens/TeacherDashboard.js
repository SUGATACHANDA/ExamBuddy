import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Clock, getInitials } from "./StudentDashboad";
import { ClockIcon, FileText, Layers, UserCircle2 } from "lucide-react";

export default function TeacherDashboard() {
    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const initials = getInitials(userInfo?.name);

    return (
        <div className="teacher-dashboard-container">

            {/* ---- HEADER ---- */}
            <header className="teacher-header">
                <div className="teacher-header-left">
                    {userInfo?.photoUrl ? (
                        <img src={userInfo.photoUrl} className="teacher-profile-photo" alt="profile" />
                    ) : (
                        <div className="teacher-avatar">{initials}</div>
                    )}
                </div>

                <div className="teacher-header-center">
                    <h2 className="teacher-name">{userInfo?.name}</h2>
                    <p className="teacher-subinfo">{userInfo?.department?.name}</p>
                    <p className="teacher-subinfo college">{userInfo?.college?.name}</p>
                </div>

                <div className="teacher-header-right">
                    <div className="teacher-clock">
                        <ClockIcon size={18} />
                        <Clock />
                    </div>

                    <button
                        className="teacher-profile-btn"
                        onClick={() => navigate(`/teacher/profile/${userInfo._id}`)}
                    >
                        <UserCircle2 size={20} />
                        Profile
                    </button>
                </div>
            </header>

            {/* ---- MAIN BODY ---- */}
            <div className="teacher-main">

                {/* Welcome Box */}
                {/* <div className="teacher-welcome-card">
                    <h1>Hello, {userInfo?.name.split(" ")[0]} 👋</h1>
                    <p>Manage questions, schedule exams, evaluate results — all from one dashboard.</p>
                </div> */}

                {/* ACTION CARDS */}
                <div className="teacher-cards-grid">

                    <Link to="/teacher/questions" className="teacher-card">
                        <div className="icon-box">
                            <FileText size={26} />
                        </div>
                        <h3>Manage Questions</h3>
                        <p>Create, edit & organize question banks for your subjects.</p>
                    </Link>

                    <Link to="/teacher/exams" className="teacher-card">
                        <div className="icon-box purple">
                            <Layers size={26} />
                        </div>
                        <h3>Manage Exams</h3>
                        <p>Schedule exams, proctor students & monitor exam activity.</p>
                    </Link>

                </div>
            </div>
        </div>
    );
}
