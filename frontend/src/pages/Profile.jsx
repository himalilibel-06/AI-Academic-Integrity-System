import { useState } from "react";
import { Link } from "react-router-dom";

const initialProfile = {
  fullName: "Hima Lilibel",
  email: "student@example.com",
  phone: "+91 98765 43210",
  department: "Computer Science and Engineering",
  institution: "Karunya Institute of Technology and Sciences",
  yearOfStudy: "2nd Year",
};

const accountInfo = {
  role: "Student",
  status: "Active",
  memberSince: "September 2026",
  userId: "USR-2026-001",
};

const academicInfo = {
  program: "B.Tech Computer Science and Engineering",
  year: "2nd Year",
  institution: "Karunya Institute of Technology and Sciences",
};

const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const sidebarItems = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Upload Submission", href: "/student/upload" },
  { label: "My Submissions", href: "/student/submissions" },
  { label: "Reports", href: "/student/reports" },
  { label: "Profile", href: "/student/profile" },
  { label: "Settings", href: "/student/settings" },
];

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function FieldLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

export default function Profile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profile, setProfile] = useState(initialProfile);
  const [draftProfile, setDraftProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const profileCompletion = 85;

  function handleStartEdit() {
    setDraftProfile(profile);
    setErrors({});
    setSuccessMessage("");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setDraftProfile(profile);
    setErrors({});
    setIsEditing(false);
  }

  function handleDraftChange(field, value) {
    setDraftProfile((prev) => ({ ...prev, [field]: value }));
  }

  function validateProfile(data) {
    const newErrors = {};
    if (!data.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!data.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(data.email)) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!data.phone.trim()) newErrors.phone = "Phone number is required.";
    if (!data.department.trim()) newErrors.department = "Department is required.";
    if (!data.institution.trim()) newErrors.institution = "Institution is required.";
    if (!data.yearOfStudy.trim()) newErrors.yearOfStudy = "Year of study is required.";
    return newErrors;
  }

  function handleSaveChanges() {
    const validationErrors = validateProfile(draftProfile);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setSuccessMessage("");
      return;
    }
    setProfile(draftProfile);
    setIsEditing(false);
    setSuccessMessage("Profile updated successfully (demo mode).");
  }

  function openPasswordModal() {
    setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordErrors({});
    setPasswordSuccess("");
    setPasswordModalOpen(true);
  }

  function closePasswordModal() {
    setPasswordModalOpen(false);
  }

  function handlePasswordFieldChange(field, value) {
    setPasswordFields((prev) => ({ ...prev, [field]: value }));
  }

  function validatePassword(data) {
    const newErrors = {};
    if (!data.currentPassword.trim()) newErrors.currentPassword = "Current password is required.";
    if (!data.newPassword.trim()) {
      newErrors.newPassword = "New password is required.";
    } else if (data.newPassword.length < 8) {
      newErrors.newPassword = "New password must be at least 8 characters.";
    }
    if (!data.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password.";
    } else if (data.newPassword && data.confirmPassword !== data.newPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    return newErrors;
  }

  function handleUpdatePassword() {
    const validationErrors = validatePassword(passwordFields);
    setPasswordErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setPasswordSuccess("Password updated successfully (demo mode).");
    setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <span className="text-lg font-semibold text-slate-900">
            Integrity<span className="text-emerald-600">Check</span>
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-controls="profile-sidebar"
            aria-label="Toggle navigation menu"
            className="rounded-md border border-slate-200 p-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Sidebar */}
        <aside
          id="profile-sidebar"
          className={`fixed inset-y-0 left-0 z-20 w-64 transform border-r border-slate-800 bg-[#0F172A] transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } pt-16 lg:pt-0`}
        >
          <div className="flex h-full flex-col">
            <div className="hidden border-b border-slate-800 px-6 py-5 lg:block">
              <span className="text-lg font-semibold text-white">
                Integrity<span className="text-emerald-400">Check</span>
              </span>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {sidebarItems.map((item) => {
                const isActive = item.label === "Profile";
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-800 px-3 py-4">
              <Link
                to="/logout"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Logout
              </Link>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-10 bg-slate-900/30 lg:hidden"
          />
        )}

        {/* Main content */}
        <main className="min-h-screen w-full flex-1 px-4 pb-12 pt-20 sm:px-6 lg:px-10 lg:pt-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-3 text-sm text-slate-500">
            <Link to="/student/dashboard" className="hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded">
              Dashboard
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-700">Profile</span>
          </nav>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              View and manage your personal and academic information.
            </p>
          </div>

          {successMessage && (
            <div
              role="status"
              className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75l2.25 2.25 6-6M12 21a9 9 0 100-18 9 9 0 000 18z" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Profile header card */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-white"
                  aria-hidden="true"
                >
                  {getInitials(profile.fullName)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{profile.fullName}</h2>
                  <p className="text-sm text-slate-500">{profile.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {accountInfo.role}
                    </span>
                    <span className="text-xs text-slate-400">{profile.department}</span>
                  </div>
                </div>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left / main column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Personal information */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Personal Information</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                    {isEditing ? (
                      <>
                        <input
                          id="fullName"
                          type="text"
                          value={draftProfile.fullName}
                          onChange={(e) => handleDraftChange("fullName", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        {errors.fullName && (
                          <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-700">{profile.fullName}</p>
                    )}
                  </div>

                  <div>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    {isEditing ? (
                      <>
                        <input
                          id="email"
                          type="email"
                          value={draftProfile.email}
                          onChange={(e) => handleDraftChange("email", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                      </>
                    ) : (
                      <p className="text-sm text-slate-700">{profile.email}</p>
                    )}
                  </div>

                  <div>
                    <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                    {isEditing ? (
                      <>
                        <input
                          id="phone"
                          type="tel"
                          value={draftProfile.phone}
                          onChange={(e) => handleDraftChange("phone", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                      </>
                    ) : (
                      <p className="text-sm text-slate-700">{profile.phone}</p>
                    )}
                  </div>

                  <div>
                    <FieldLabel htmlFor="department">Department</FieldLabel>
                    {isEditing ? (
                      <>
                        <input
                          id="department"
                          type="text"
                          value={draftProfile.department}
                          onChange={(e) => handleDraftChange("department", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        {errors.department && (
                          <p className="mt-1 text-xs text-red-600">{errors.department}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-700">{profile.department}</p>
                    )}
                  </div>

                  <div>
                    <FieldLabel htmlFor="institution">Institution</FieldLabel>
                    {isEditing ? (
                      <>
                        <input
                          id="institution"
                          type="text"
                          value={draftProfile.institution}
                          onChange={(e) => handleDraftChange("institution", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        {errors.institution && (
                          <p className="mt-1 text-xs text-red-600">{errors.institution}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-700">{profile.institution}</p>
                    )}
                  </div>

                  <div>
                    <FieldLabel htmlFor="yearOfStudy">Year of Study</FieldLabel>
                    {isEditing ? (
                      <>
                        <select
                          id="yearOfStudy"
                          value={draftProfile.yearOfStudy}
                          onChange={(e) => handleDraftChange("yearOfStudy", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                        {errors.yearOfStudy && (
                          <p className="mt-1 text-xs text-red-600">{errors.yearOfStudy}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-700">{profile.yearOfStudy}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Academic information */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Academic Information</h3>
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Program</dt>
                    <dd className="mt-1 text-sm text-slate-700">{academicInfo.program}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Year</dt>
                    <dd className="mt-1 text-sm text-slate-700">{academicInfo.year}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Institution</dt>
                    <dd className="mt-1 text-sm text-slate-700">{academicInfo.institution}</dd>
                  </div>
                </dl>
              </div>

              {/* Security */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Security</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Keep your account secure by updating your password regularly.
                </p>
                {passwordSuccess && (
                  <div
                    role="status"
                    className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75l2.25 2.25 6-6M12 21a9 9 0 100-18 9 9 0 000 18z" />
                    </svg>
                    {passwordSuccess}
                  </div>
                )}
                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="mt-4 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Change Password
                </button>
              </div>

              {/* Account actions */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Account Actions</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Sign out of your account on this device.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Account information */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Account Information</h3>
                <dl className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-slate-500">Role</dt>
                    <dd className="text-sm font-medium text-slate-700">{accountInfo.role}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-slate-500">Account Status</dt>
                    <dd>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                        {accountInfo.status}
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-slate-500">Member Since</dt>
                    <dd className="text-sm font-medium text-slate-700">{accountInfo.memberSince}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-slate-500">User ID</dt>
                    <dd className="text-sm font-medium text-slate-700">{accountInfo.userId}</dd>
                  </div>
                </dl>
              </div>

              {/* Profile completion */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Profile Completion</h3>
                  <span className="text-sm font-semibold text-emerald-600">{profileCompletion}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={profileCompletion}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Profile completion"
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Complete your profile information to keep your academic account up to date.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Change password modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close change password dialog"
            onClick={closePasswordModal}
            className="fixed inset-0 bg-slate-900/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="relative z-50 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h3 id="change-password-title" className="text-base font-semibold text-slate-900">
              Change Password
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose a new password for your account.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwordFields.currentPassword}
                  onChange={(e) => handlePasswordFieldChange("currentPassword", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword}</p>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                <input
                  id="newPassword"
                  type="password"
                  value={passwordFields.newPassword}
                  onChange={(e) => handlePasswordFieldChange("newPassword", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</p>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwordFields.confirmPassword}
                  onChange={(e) => handlePasswordFieldChange("confirmPassword", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closePasswordModal}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePassword}
                className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}