import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";

import StudentDashboard from "./pages/StudentDashboard";
import UploadSubmission from "./pages/UploadSubmission";
import MySubmissions from "./pages/MySubmissions";
import PlagiarismReport from "./pages/PlagiarismReport";
import StudentCourses from "./pages/StudentCourses";

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

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 font-medium">Loading session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = user.role === "professor" ? "/professor/dashboard" : "/student/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 font-medium">Loading session...</div>
      </div>
    );
  }

  if (user) {
    const redirectPath = user.role === "professor" ? "/professor/dashboard" : "/student/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default route */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public routes (only accessible when logged out) */}
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

          {/* Student routes (protected) */}
          <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/courses" element={<ProtectedRoute allowedRoles={["student"]}><StudentCourses /></ProtectedRoute>} />
          <Route path="/student/upload" element={<ProtectedRoute allowedRoles={["student"]}><UploadSubmission /></ProtectedRoute>} />
          <Route path="/student/submissions" element={<ProtectedRoute allowedRoles={["student"]}><MySubmissions /></ProtectedRoute>} />
          <Route path="/student/reports" element={<ProtectedRoute allowedRoles={["student"]}><PlagiarismReport /></ProtectedRoute>} />
          <Route path="/student/reports/:id" element={<ProtectedRoute allowedRoles={["student"]}><PlagiarismReport /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={["student"]}><Profile /></ProtectedRoute>} />
          <Route path="/student/settings" element={<ProtectedRoute allowedRoles={["student"]}><Settings /></ProtectedRoute>} />

          {/* Professor routes (protected) */}
          <Route path="/professor/dashboard" element={<ProtectedRoute allowedRoles={["professor"]}><ProfessorDashboard /></ProtectedRoute>} />
          <Route path="/professor/submissions" element={<ProtectedRoute allowedRoles={["professor"]}><ReviewSubmissions /></ProtectedRoute>} />
          <Route path="/professor/reports" element={<ProtectedRoute allowedRoles={["professor"]}><ReportReview /></ProtectedRoute>} />
          <Route path="/professor/reports/:id" element={<ProtectedRoute allowedRoles={["professor"]}><ReportReview /></ProtectedRoute>} />
          <Route path="/professor/courses" element={<ProtectedRoute allowedRoles={["professor"]}><Courses /></ProtectedRoute>} />
          <Route path="/professor/profile" element={<ProtectedRoute allowedRoles={["professor"]}><Profile /></ProtectedRoute>} />
          <Route path="/professor/settings" element={<ProtectedRoute allowedRoles={["professor"]}><Settings /></ProtectedRoute>} />

          {/* Unknown routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}