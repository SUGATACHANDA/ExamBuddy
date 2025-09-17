// src/App.js
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginScreen from './screens/LoginScreen';
import StudentDashboard from './screens/StudentDashboad';
import TeacherDashboard from './screens/TeacherDashboard';
import ExamScreen from './screens/ExamScreen';
import ProctorScreen from './screens/ProctorScreen';
import ResultsScreen from './screens/ResultsScreen';

import ManageQuestions from './components/teacher/ManageQuestion';
import ScheduleExams from './components/teacher/ScheduleExam';
import SubmissionSuccessScreen from './screens/SubmissionSuccessScreen';

import './App.css'; // Add some basic styling
import ManageExams from 'screens/ManageExams';

import AdminDashboard from './screens/admin/AdminDashboard';
import AdminManageColleges from './screens/admin/AdminManageColleges';
import AdminManageUA from './screens/admin/AdminManageUA';


import MyResultsScreen from 'screens/MyResultsScreen';
import FloatingSupportButton from 'components/FloatingSupportButton';

import UniversityAffairsDashboard from './screens/university_affairs/UADashboard';
import UAManageHierarchy from './screens/university_affairs/UAManageHierarchy';
import UAManageHods from './screens/university_affairs/UAManageHods';

import HODDashboard from './screens/hod/HODDashboard';
import HODManageUsers from './screens/hod/HODManageUsers';
import HODViewExams from 'screens/hod/HODViewExams';

import WhatsNewModal from './components/WhatsNewModal';


function App() {
  const [releaseInfo, setReleaseInfo] = useState(null);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      // Listen for a message from the main process
      window.electronAPI.onShowReleaseNotes((data) => {
        console.log("Received release notes from main process:", data);
        setReleaseInfo(data);
        setIsWhatsNewOpen(true);
      });
    }

    // It's good practice to have a cleanup function, though not strictly needed here
    // if onShowReleaseNotes doesn't return a remover function.
  }, []); // Empty dependency array means this runs only once on startup.

  const handleCloseWhatsNew = () => {
    setIsWhatsNewOpen(false);
    if (window.electronAPI) {
      window.electronAPI.releaseNotesShown();
    }
  };
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* --- RENDER THE MODAL IF NEEDED --- */}
          {isWhatsNewOpen && releaseInfo && (
            <WhatsNewModal
              version={releaseInfo.version}
              notes={releaseInfo.notes}
              onClose={handleCloseWhatsNew}
            />
          )}
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/" element={<LoginScreen />} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/exam/:id/question/:qIndex" element={<ProtectedRoute role="student"><ExamScreen /></ProtectedRoute>} />
            <Route
              path="/student/my-results"
              element={
                <ProtectedRoute role="student">
                  <MyResultsScreen />
                </ProtectedRoute>
              }
            />

            {/* A redirect from the base exam URL to the first question */}
            <Route path="/exam/:id" element={<ProtectedRoute role="student"><Navigate to="question/0" replace /></ProtectedRoute>} />
            <Route
              path="/submission-success"
              element={
                <ProtectedRoute role="student">
                  <SubmissionSuccessScreen />
                </ProtectedRoute>
              }
            />

            {/* Teacher Routes */}
            <Route path="/teacher/dashboard" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/results/:examId" element={<ProtectedRoute role='teacher'><ResultsScreen /></ProtectedRoute>} />
            <Route path="/teacher/proctor/:examId" element={<ProtectedRoute role="teacher"><ProctorScreen /></ProtectedRoute>} />

            <Route path="/teacher/questions" element={<ProtectedRoute role="teacher"><ManageQuestions /></ProtectedRoute>} />
            <Route path="/teacher/schedule" element={<ProtectedRoute role="teacher"><ScheduleExams /></ProtectedRoute>} />
            <Route path="/teacher/exams" element={<ProtectedRoute roles={['teacher', 'HOD']}><ManageExams /></ProtectedRoute>} />

            <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/colleges" element={<ProtectedRoute role="admin"><AdminManageColleges /></ProtectedRoute>} />
            <Route path="/admin/university-affairs" element={<ProtectedRoute role="admin"><AdminManageUA /></ProtectedRoute>} />

            <Route path="/ua/dashboard" element={<ProtectedRoute role="university_affairs"><UniversityAffairsDashboard /></ProtectedRoute>} />
            <Route path="/ua/hierarchy" element={<ProtectedRoute role="university_affairs"><UAManageHierarchy /></ProtectedRoute>} />
            <Route path="/ua/hods" element={<ProtectedRoute role="university_affairs"><UAManageHods /></ProtectedRoute>} />

            <Route path="/hod/dashboard" element={<ProtectedRoute role="HOD"><HODDashboard /></ProtectedRoute>} />
            <Route path="/hod/manage-users" element={<ProtectedRoute role="HOD"><HODManageUsers /></ProtectedRoute>} />
            <Route path="/hod/exams" element={<ProtectedRoute role="HOD"><HODViewExams /></ProtectedRoute>} />
            <Route path="/hod/results/:examId" element={<ProtectedRoute role="HOD"><ResultsScreen /></ProtectedRoute>} />

          </Routes>
          <FloatingSupportButton />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;