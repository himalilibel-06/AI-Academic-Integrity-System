import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";

import StudentDashboard from "./pages/StudentDashboard";
import UploadSubmission from "./pages/UploadSubmission";
import MySubmissions from "./pages/MySubmissions";
import PlagiarismReport from "./pages/PlagiarismReport";

import ProfessorDashboard from "./pages/ProfessorDashboard";
import ReviewSubmissions from "./pages/ReviewSubmissions";
import ReportReview from "./pages/ReportReview";
import Courses from "./pages/Courses";

import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center">
        <p className="text-sm font-medium text-indigo-600">404</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/upload" element={<UploadSubmission />} />
        <Route path="/student/submissions" element={<MySubmissions />} />
        <Route path="/student/reports" element={<PlagiarismReport />} />
        <Route path="/student/profile" element={<Profile />} />
        <Route path="/student/settings" element={<Settings />} />

        {/* Professor routes */}
        <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
        <Route path="/professor/submissions" element={<ReviewSubmissions />} />
        <Route path="/professor/reports" element={<ReportReview />} />
        <Route path="/professor/reports/:id" element={<ReportReview />} />
        <Route path="/professor/courses" element={<Courses />} />
        <Route path="/professor/profile" element={<Profile />} />
        <Route path="/professor/settings" element={<Settings />} />

        {/* Unknown routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}