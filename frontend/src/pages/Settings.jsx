import { useState } from "react";
import { Link } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/student/dashboard" },
  { label: "Upload Submission", to: "/student/upload" },
  { label: "My Submissions", to: "/student/submissions" },
  { label: "Reports", to: "/student/reports" },
  { label: "Profile", to: "/student/profile" },
  { label: "Settings", to: "/student/settings" },
];

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "security", label: "Security" },
];

function Toggle({ id, checked, onChange, label }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        checked ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SuccessNote({ message }) {
  if (!message) return null;
  return (
    <p className="mt-3 text-sm text-green-700" role="status">
      {message}
    </p>
  );
}

export default function Settings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("general");

  // General
  const [language, setLanguage] = useState("English");
  const [timeZone, setTimeZone] = useState("India Standard Time (IST)");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [generalMessage, setGeneralMessage] = useState("");

  // Notifications
  const [notifications, setNotifications] = useState({
    submissionUpdates: true,
    reportAvailable: true,
    reviewRequired: true,
    systemAnnouncements: false,
  });
  const [notificationMessage, setNotificationMessage] = useState("");

  // Privacy
  const [profileVisibility, setProfileVisibility] = useState(
    "Institution Only"
  );
  const [submissionHistory, setSubmissionHistory] = useState(true);
  const [reportVisibility, setReportVisibility] = useState(
    "Student and Professor"
  );
  const [privacyMessage, setPrivacyMessage] = useState("");

  // Security
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");

  const flashMessage = (setter, text) => {
    setter(text);
    setTimeout(() => setter(""), 3000);
  };

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    flashMessage(setGeneralMessage, "Preferences saved successfully (demo mode).");
  };

  const handleToggleNotification = (key, value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveNotifications = (e) => {
    e.preventDefault();
    flashMessage(
      setNotificationMessage,
      "Notification settings saved successfully (demo mode)."
    );
  };

  const handleSavePrivacy = (e) => {
    e.preventDefault();
    flashMessage(
      setPrivacyMessage,
      "Privacy settings saved successfully (demo mode)."
    );
  };

  const handlePasswordFieldChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const openPasswordModal = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordErrors({});
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Current password is required.";
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = "New password is required.";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters.";
    }
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    return errors;
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    const errors = validatePasswordForm();
    setPasswordErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsPasswordModalOpen(false);
      flashMessage(
        setPasswordMessage,
        "Password updated successfully (demo mode)."
      );
    }
  };

  const handleSignOutOtherSessions = () => {
    flashMessage(
      setSessionMessage,
      "Other sessions signed out (demo mode)."
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 lg:flex">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5L3 8.25l9 3.75 9-3.75-9-3.75zM3 8.25v7.5l9 3.75m0-11.25l9 3.75m-9-3.75v11.25m9-11.25v7.5l-9 3.75"
              />
            </svg>
          </div>
          <span className="text-sm font-medium">Academic Integrity</span>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-label="Open navigation menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
            />
          </svg>
        </button>
      </div>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:flex-shrink-0 lg:min-h-screen ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5L3 8.25l9 3.75 9-3.75-9-3.75zM3 8.25v7.5l9 3.75m0-11.25l9 3.75m-9-3.75v11.25m9-11.25v7.5l-9 3.75"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">
                Academic Integrity
              </p>
              <p className="text-xs text-slate-400 leading-tight">
                Student Portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="Close navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="px-3 py-4" aria-label="Student navigation">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.label === "Settings";
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className={`block rounded-lg px-3.5 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-white/10 text-white font-medium border border-white/20"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 mt-auto border-t border-white/10">
          <Link
            to="/"
            className="block rounded-lg px-3.5 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            Logout
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex items-center gap-2 text-sm text-slate-500">
              <li>
                <Link to="/student/dashboard" className="hover:text-emerald-600">
                  Dashboard
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-slate-700 font-medium">Settings</li>
            </ol>
          </nav>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your application preferences and notification settings.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
            {/* Settings categories */}
            <nav aria-label="Settings categories">
              <ul className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <li key={cat.id} className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`w-full text-left rounded-lg px-3.5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "text-slate-600 hover:bg-white border border-transparent"
                        }`}
                        aria-current={isActive ? "true" : undefined}
                      >
                        {cat.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Selected settings */}
            <div>
              {activeCategory === "general" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
                  <h2 className="text-base font-semibold text-slate-900 mb-4">
                    General Preferences
                  </h2>

                  <form onSubmit={handleSaveGeneral} className="space-y-5">
                    <div>
                      <label
                        htmlFor="language"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Language
                      </label>
                      <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full sm:max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="English">English</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="timeZone"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Time Zone
                      </label>
                      <select
                        id="timeZone"
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        className="w-full sm:max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="India Standard Time (IST)">
                          India Standard Time (IST)
                        </option>
                        <option value="UTC">UTC</option>
                        <option value="GMT">GMT</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="dateFormat"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Date Format
                      </label>
                      <select
                        id="dateFormat"
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full sm:max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        Save Preferences
                      </button>
                      <SuccessNote message={generalMessage} />
                    </div>
                  </form>
                </div>
              )}

              {activeCategory === "notifications" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
                  <h2 className="text-base font-semibold text-slate-900 mb-4">
                    Notification Preferences
                  </h2>

                  <form
                    onSubmit={handleSaveNotifications}
                    className="space-y-5"
                  >
                    <div className="divide-y divide-slate-200">
                      <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
                        <div>
                          <label
                            htmlFor="submissionUpdates"
                            className="text-sm font-medium text-slate-900"
                          >
                            Submission Processing Updates
                          </label>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Receive updates when your assignment analysis
                            status changes.
                          </p>
                        </div>
                        <Toggle
                          id="submissionUpdates"
                          checked={notifications.submissionUpdates}
                          onChange={(value) =>
                            handleToggleNotification("submissionUpdates", value)
                          }
                          label="Submission Processing Updates"
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 py-4">
                        <div>
                          <label
                            htmlFor="reportAvailable"
                            className="text-sm font-medium text-slate-900"
                          >
                            Similarity Report Available
                          </label>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Receive a notification when your similarity
                            report is ready.
                          </p>
                        </div>
                        <Toggle
                          id="reportAvailable"
                          checked={notifications.reportAvailable}
                          onChange={(value) =>
                            handleToggleNotification("reportAvailable", value)
                          }
                          label="Similarity Report Available"
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 py-4">
                        <div>
                          <label
                            htmlFor="reviewRequired"
                            className="text-sm font-medium text-slate-900"
                          >
                            Review Required
                          </label>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Receive notifications when a submission requires
                            academic review.
                          </p>
                        </div>
                        <Toggle
                          id="reviewRequired"
                          checked={notifications.reviewRequired}
                          onChange={(value) =>
                            handleToggleNotification("reviewRequired", value)
                          }
                          label="Review Required"
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 py-4 last:pb-0">
                        <div>
                          <label
                            htmlFor="systemAnnouncements"
                            className="text-sm font-medium text-slate-900"
                          >
                            System Announcements
                          </label>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Receive important platform announcements.
                          </p>
                        </div>
                        <Toggle
                          id="systemAnnouncements"
                          checked={notifications.systemAnnouncements}
                          onChange={(value) =>
                            handleToggleNotification(
                              "systemAnnouncements",
                              value
                            )
                          }
                          label="System Announcements"
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        Save Notification Settings
                      </button>
                      <SuccessNote message={notificationMessage} />
                    </div>
                  </form>
                </div>
              )}

              {activeCategory === "privacy" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
                  <h2 className="text-base font-semibold text-slate-900 mb-4">
                    Privacy
                  </h2>

                  <form onSubmit={handleSavePrivacy} className="space-y-5">
                    <div>
                      <label
                        htmlFor="profileVisibility"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Profile Visibility
                      </label>
                      <select
                        id="profileVisibility"
                        value={profileVisibility}
                        onChange={(e) => setProfileVisibility(e.target.value)}
                        className="w-full sm:max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="Private">Private</option>
                        <option value="Institution Only">
                          Institution Only
                        </option>
                      </select>
                    </div>

                    <div className="flex items-start justify-between gap-4 py-2">
                      <div>
                        <label
                          htmlFor="submissionHistory"
                          className="text-sm font-medium text-slate-900"
                        >
                          Submission History
                        </label>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Allow submission history to remain available for
                          academic records.
                        </p>
                      </div>
                      <Toggle
                        id="submissionHistory"
                        checked={submissionHistory}
                        onChange={setSubmissionHistory}
                        label="Submission History"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="reportVisibility"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Report Visibility
                      </label>
                      <select
                        id="reportVisibility"
                        value={reportVisibility}
                        onChange={(e) => setReportVisibility(e.target.value)}
                        className="w-full sm:max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="Student and Professor">
                          Student and Professor
                        </option>
                        <option value="Student Only">Student Only</option>
                      </select>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <p className="text-sm text-emerald-900">
                        Privacy settings control how your academic
                        information is displayed within the platform.
                      </p>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        Save Privacy Settings
                      </button>
                      <SuccessNote message={privacyMessage} />
                    </div>
                  </form>
                </div>
              )}

              {activeCategory === "security" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <h2 className="text-base font-semibold text-slate-900 mb-4">
                      Security
                    </h2>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-200">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Password
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Keep your account password secure.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openPasswordModal}
                        className="flex-shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        Change Password
                      </button>
                    </div>
                    <SuccessNote message={passwordMessage} />

                    <div className="pt-5">
                      <h3 className="text-sm font-medium text-slate-900 mb-3">
                        Active Sessions
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-slate-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              Windows PC · Chrome
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Current Session
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 text-xs font-medium">
                            Active
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={handleSignOutOtherSessions}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        >
                          Sign Out Other Sessions
                        </button>
                        <SuccessNote message={sessionMessage} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <h2 className="text-base font-semibold text-slate-900 mb-1">
                      Account Actions
                    </h2>
                    <p className="text-sm text-slate-500 mb-4">
                      Manage this session's access to your account.
                    </p>
                    <Link
                      to="/"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      Sign Out
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changePasswordTitle"
        >
          <div
            className="fixed inset-0 bg-black/40"
            onClick={closePasswordModal}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md p-6 sm:p-7">
            <h2
              id="changePasswordTitle"
              className="text-lg font-semibold text-slate-900 mb-4"
            >
              Change Password
            </h2>

            <form onSubmit={handleUpdatePassword} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordFieldChange}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    passwordErrors.currentPassword
                      ? "border-red-400"
                      : "border-slate-300"
                  }`}
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                  aria-describedby={
                    passwordErrors.currentPassword
                      ? "currentPassword-error"
                      : undefined
                  }
                />
                {passwordErrors.currentPassword && (
                  <p
                    id="currentPassword-error"
                    className="mt-1.5 text-sm text-red-600"
                  >
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordFieldChange}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    passwordErrors.newPassword
                      ? "border-red-400"
                      : "border-slate-300"
                  }`}
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                  aria-describedby={
                    passwordErrors.newPassword
                      ? "newPassword-error"
                      : undefined
                  }
                />
                {passwordErrors.newPassword && (
                  <p
                    id="newPassword-error"
                    className="mt-1.5 text-sm text-red-600"
                  >
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordFieldChange}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    passwordErrors.confirmPassword
                      ? "border-red-400"
                      : "border-slate-300"
                  }`}
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                  aria-describedby={
                    passwordErrors.confirmPassword
                      ? "confirmPassword-error"
                      : undefined
                  }
                />
                {passwordErrors.confirmPassword && (
                  <p
                    id="confirmPassword-error"
                    className="mt-1.5 text-sm text-red-600"
                  >
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}