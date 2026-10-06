import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";

import StudentDashboard from "./pages/StudentDashboard";
import CreateResearchProject from "./pages/CreateResearchProject";
import UploadSubmission from "./pages/UploadSubmission";
import MySubmissions from "./pages/MySubmissions";
import LiteratureCorpus from "./pages/LiteratureCorpus";
import GapAnalysis from "./pages/GapAnalysis";
import ContributionAnalysis from "./pages/ContributionAnalysis";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import ReasoningWorkbench from "./pages/ReasoningWorkbench";
import EvidenceCoverage from "./pages/EvidenceCoverage";
import RevisionComparison from "./pages/RevisionComparison";
import SubmissionReadiness from "./pages/SubmissionReadiness";
import FacultyFeedback from "./pages/FacultyFeedback";
import PlagiarismReport from "./pages/PlagiarismReport";
import StudentCourses from "./pages/StudentCourses";

import ProfessorDashboard from "./pages/ProfessorDashboard";
import ReviewSubmissions from "./pages/ReviewSubmissions";
import FacultyReview from "./pages/FacultyReview";
import FacultyReviewDashboard from "./pages/FacultyReviewDashboard";
import FacultyReviewHistory from "./pages/FacultyReviewHistory";
import ReportReview from "./pages/ReportReview";
import Courses from "./pages/Courses";

import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import StudentLayout from "./components/StudentLayout";

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

function DashboardRedirect() {
  const { user } = useAuth();
  const target = user?.role === "professor" ? "/professor/dashboard" : "/student/dashboard";
  return <Navigate to={target} replace />;
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

          {/* Student routes (protected with shared StudentLayout) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/projects/create" element={<CreateResearchProject />} />
            <Route path="/student/courses" element={<StudentCourses />} />
            <Route path="/student/upload" element={<UploadSubmission />} />
            <Route path="/student/literature" element={<LiteratureCorpus />} />
            <Route path="/student/gap-analysis" element={<GapAnalysis />} />
            <Route path="/student/contribution-analysis" element={<ContributionAnalysis />} />
            <Route path="/student/knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="/student/reasoning" element={<ReasoningWorkbench />} />
            <Route path="/student/evidence-coverage" element={<EvidenceCoverage />} />
            <Route path="/student/revision-comparison" element={<RevisionComparison />} />
            <Route path="/student/submission-readiness" element={<SubmissionReadiness />} />
            <Route path="/student/faculty-feedback" element={<FacultyFeedback />} />
            <Route path="/student/revision-history/:projectId" element={<FacultyReviewHistory />} />
            <Route path="/student/submissions" element={<MySubmissions />} />
            <Route path="/student/reports" element={<PlagiarismReport />} />
            <Route path="/student/reports/:id" element={<PlagiarismReport />} />
            <Route path="/student/profile" element={<Profile />} />
            <Route path="/student/settings" element={<Settings />} />
          </Route>
          <Route path="/student/projects" element={<Navigate to="/student/dashboard#projects" replace />} />
          <Route path="/student/manuscripts" element={<Navigate to="/student/submissions" replace />} />

          {/* Professor routes (protected) */}
          <Route path="/professor/dashboard" element={<ProtectedRoute allowedRoles={["professor"]}><ProfessorDashboard /></ProtectedRoute>} />
          <Route path="/professor/submissions" element={<ProtectedRoute allowedRoles={["professor"]}><ReviewSubmissions /></ProtectedRoute>} />
          <Route path="/professor/reviews" element={<ProtectedRoute allowedRoles={["professor"]}><FacultyReviewDashboard /></ProtectedRoute>} />
          <Route path="/faculty/reviews" element={<ProtectedRoute allowedRoles={["professor"]}><FacultyReviewDashboard /></ProtectedRoute>} />
          <Route path="/professor/review/:projectId" element={<ProtectedRoute allowedRoles={["professor"]}><FacultyReview /></ProtectedRoute>} />
          <Route path="/faculty/review/:projectId" element={<ProtectedRoute allowedRoles={["professor"]}><FacultyReview /></ProtectedRoute>} />
          <Route path="/professor/review-history/:projectId" element={<ProtectedRoute allowedRoles={["professor"]}><FacultyReviewHistory /></ProtectedRoute>} />
          <Route path="/faculty/review-history/:projectId" element={<ProtectedRoute allowedRoles={["professor"]}><FacultyReviewHistory /></ProtectedRoute>} />
          <Route path="/professor/reports" element={<ProtectedRoute allowedRoles={["professor"]}><ReportReview /></ProtectedRoute>} />
          <Route path="/professor/reports/:id" element={<ProtectedRoute allowedRoles={["professor"]}><ReportReview /></ProtectedRoute>} />
          <Route path="/professor/courses" element={<ProtectedRoute allowedRoles={["professor"]}><Courses /></ProtectedRoute>} />
          <Route path="/professor/profile" element={<ProtectedRoute allowedRoles={["professor"]}><Profile /></ProtectedRoute>} />
          <Route path="/professor/settings" element={<ProtectedRoute allowedRoles={["professor"]}><Settings /></ProtectedRoute>} />

          {/* Friendly Aliases / Deep Links */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["student", "professor"]}><DashboardRedirect /></ProtectedRoute>} />
          <Route path="/research-projects" element={<Navigate to="/student/dashboard#projects" replace />} />
          <Route path="/manuscripts" element={<Navigate to="/student/submissions" replace />} />
          <Route path="/literature" element={<Navigate to="/student/literature" replace />} />
          <Route path="/gap-analysis" element={<Navigate to="/student/gap-analysis" replace />} />
          <Route path="/contribution-analysis" element={<Navigate to="/student/contribution-analysis" replace />} />
          <Route path="/knowledge-graph" element={<Navigate to="/student/knowledge-graph" replace />} />
          <Route path="/reasoning" element={<Navigate to="/student/reasoning" replace />} />
          <Route path="/evidence-coverage" element={<Navigate to="/student/evidence-coverage" replace />} />
          <Route path="/revision-comparison" element={<Navigate to="/student/revision-comparison" replace />} />
          <Route path="/submission-readiness" element={<Navigate to="/student/submission-readiness" replace />} />
          <Route path="/faculty-feedback" element={<Navigate to="/student/faculty-feedback" replace />} />
          <Route path="/faculty-review" element={<Navigate to="/faculty/reviews" replace />} />

          {/* Unknown routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}