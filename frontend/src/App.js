// src/App.js
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginScreen from "./screens/LoginScreen";
import StudentDashboard from "./screens/StudentDashboad";
import TeacherDashboard from "./screens/TeacherDashboard";
import ExamScreen from "./screens/ExamScreen";
import ProctorScreen from "./screens/ProctorScreen";
import ResultsScreen from "./screens/ResultsScreen";

import ManageQuestions from "./components/teacher/ManageQuestion";
import ScheduleExams from "./components/teacher/ScheduleExam";
import SubmissionSuccessScreen from "./screens/SubmissionSuccessScreen";

import "./App.css"; // Add some basic styling
import ManageExams from "screens/ManageExams";

import AdminDashboard from "./screens/admin/AdminDashboard";
import AdminManageColleges from "./screens/admin/AdminManageColleges";
import AdminManageUA from "./screens/admin/AdminManageUA";

import MyResultsScreen from "screens/MyResultsScreen";
import FloatingSupportButton from "components/FloatingSupportButton";

import UniversityAffairsDashboard from "./screens/university_affairs/UADashboard";
import UAManageHierarchy from "./screens/university_affairs/UAManageHierarchy";
import UAManageHods from "./screens/university_affairs/UAManageHods";

import HODDashboard from "./screens/hod/HODDashboard";
import HODManageUsers from "./screens/hod/HODManageUsers";
import HODViewExams from "screens/hod/HODViewExams";

import ReviewScreen from "screens/ReviewScreen";
import RequestOTP from "screens/RequestOTP";
import VerifyOTP from "screens/VerifyOTP";
import ResetPasswordOTP from "screens/ResetPasswordOTP";

function App() {
  const location = useLocation();
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onResetToken((token) => {
        console.log("Received reset token:", token);
        // Navigate to reset password page with token
        Navigate(`/reset-password/${token}`); // using react-router
      });
    }
  }, []);

  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  return (
    <AuthProvider>
      <div className="App">
        {/* --- RENDER THE MODAL IF NEEDED ---
          {releaseNotes && (
            <WhatsNewModal
              version={releaseNotes.version}
              notes={releaseNotes.notes}
              onClose={handleCloseModal}
            />
          )} */}
        <Routes>

          <Route path="/forgot-password" element={
            <RequestOTP onSuccess={(em) => setEmail(em)} />
          } />
          <Route path="/verify-otp" element={
            <VerifyOTP email={email} onVerified={(code) => setOtp(code)} />
          } />
          <Route path="/reset-password" element={
            <ResetPasswordOTP
              email={email}
              otp={otp}
              onDone={() => (window.location.href = "/login")}
            />
          } />

          <Route path="/login" element={<LoginScreen />} />
          <Route path="/" element={<LoginScreen />} />

          {/* <Route path="/forgot-password" element={<ForgotPasswordScreen />} /> */}
          {/* <Route
            path="/reset-password/:token"
            element={<ResetPasswordScreen />}
          /> */}

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:id/question/:qIndex"
            element={
              <ProtectedRoute role="student">
                <ExamScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/my-results"
            element={
              <ProtectedRoute role="student">
                <MyResultsScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/exam/:examId/q/:questionNumber"
            element={
              <ProtectedRoute roles="student">
                <ExamScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/exam/:id/section/:secIndex/question/:qIndex"
            element={
              <ProtectedRoute roles={["student"]}>
                <ExamScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/exam/:id"
            element={
              <ProtectedRoute roles="student">
                <Navigate to="q/0" replace />
              </ProtectedRoute>
            }
          />

          {/* A redirect from the base exam URL to the first question */}
          {/* <Route
            path="/exam/:id"
            element={
              <ProtectedRoute role="student">
                <Navigate to="question/0" replace />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/exam/review/:id"
            element={
              <ProtectedRoute roles={["student"]}>
                <ReviewScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/submission-success"
            element={
              <ProtectedRoute role="student">
                <SubmissionSuccessScreen />
              </ProtectedRoute>
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/results/:examId"
            element={
              <ProtectedRoute role="teacher">
                <ResultsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/proctor/:examId"
            element={
              <ProtectedRoute role="teacher">
                <ProctorScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/questions"
            element={
              <ProtectedRoute role="teacher">
                <ManageQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/schedule"
            element={
              <ProtectedRoute role="teacher">
                <ScheduleExams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/exams"
            element={
              <ProtectedRoute roles={["teacher", "HOD"]}>
                <ManageExams />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges"
            element={
              <ProtectedRoute role="admin">
                <AdminManageColleges />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/university-affairs"
            element={
              <ProtectedRoute role="admin">
                <AdminManageUA />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ua/dashboard"
            element={
              <ProtectedRoute role="university_affairs">
                <UniversityAffairsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ua/hierarchy"
            element={
              <ProtectedRoute role="university_affairs">
                <UAManageHierarchy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ua/hods"
            element={
              <ProtectedRoute role="university_affairs">
                <UAManageHods />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hod/dashboard"
            element={
              <ProtectedRoute role="HOD">
                <HODDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/manage-users"
            element={
              <ProtectedRoute role="HOD">
                <HODManageUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/exams"
            element={
              <ProtectedRoute role="HOD">
                <HODViewExams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/results/:examId"
            element={
              <ProtectedRoute role="HOD">
                <ResultsScreen />
              </ProtectedRoute>
            }
          />
        </Routes>
        {!location.pathname.startsWith("/exam") && <FloatingSupportButton />}
      </div>
    </AuthProvider>
  );
}

export default App;
