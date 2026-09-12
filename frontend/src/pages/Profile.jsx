import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCurrentUser, updateUserProfile, changePassword } from "../service/api";

function getInitials(name) {
  if (!name) return "U";
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
  const { user: authUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [profile, setProfile] = useState({
    id: "",
    fullName: "",
    email: "",
    phone: "",
    department: "",
    institution: "",
    role: "student",
    memberSince: "",
  });

  const [draftProfile, setDraftProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "",
    institution: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Role-aware navigation
  const isProfessor = (profile.role || authUser?.role) === "professor";

  const sidebarItems = isProfessor
    ? [
        { label: "Dashboard", href: "/professor/dashboard" },
        { label: "Submissions", href: "/professor/submissions" },
        { label: "Reports", href: "/professor/reports" },
        { label: "Courses", href: "/professor/courses" },
        { label: "Profile", href: "/professor/profile" },
        { label: "Settings", href: "/professor/settings" },
      ]
    : [
        { label: "Dashboard", href: "/student/dashboard" },
        { label: "Upload Submission", href: "/student/upload" },
        { label: "My Submissions", href: "/student/submissions" },
        { label: "Reports", href: "/student/reports" },
        { label: "Profile", href: "/student/profile" },
        { label: "Settings", href: "/student/settings" },
      ];

  const dashboardHref = isProfessor ? "/professor/dashboard" : "/student/dashboard";

  // Load profile data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadProfileData() {
      setLoading(true);
      setFetchError("");
      try {
        const response = await getCurrentUser();
        if (isMounted && response.success && response.user) {
          const u = response.user;
          const memberDate = u.created_at
            ? new Date(u.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : "Recent";

          const profileData = {
            id: u.id,
            fullName: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            department: u.department || "",
            institution: u.institution || "",
            role: u.role || "student",
            memberSince: memberDate,
          };

          setProfile(profileData);
          setDraftProfile({
            fullName: profileData.fullName,
            email: profileData.email,
            phone: profileData.phone,
            department: profileData.department,
            institution: profileData.institution,
          });
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || "Failed to load profile details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute profile completion percentage dynamically
  const profileCompletion = Math.round(
    [
      profile.fullName,
      profile.email,
      profile.phone,
      profile.department,
      profile.institution,
    ].filter((val) => val && val.trim().length > 0).length * 20
  );

  function handleStartEdit() {
    setDraftProfile({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
      institution: profile.institution,
    });
    setErrors({});
    setSuccessMessage("");
    setSaveError("");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setDraftProfile({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
      institution: profile.institution,
    });
    setErrors({});
    setSaveError("");
    setIsEditing(false);
  }

  function handleDraftChange(field, value) {
    setDraftProfile((prev) => ({ ...prev, [field]: value }));
  }

  function validateProfile(data) {
    const newErrors = {};
    if (!data.fullName.trim()) newErrors.fullName = "Full name is required.";
    return newErrors;
  }

  async function handleSaveChanges() {
    const validationErrors = validateProfile(draftProfile);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const response = await updateUserProfile({
        name: draftProfile.fullName.trim(),
        department: draftProfile.department.trim(),
        institution: draftProfile.institution.trim(),
        phone: draftProfile.phone.trim(),
      });

      if (response.success && response.user) {
        const u = response.user;
        setProfile((prev) => ({
          ...prev,
          fullName: u.name,
          department: u.department,
          institution: u.institution,
          phone: u.phone,
        }));
        setIsEditing(false);
        setSuccessMessage("Profile updated successfully.");
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setSaveError(response.message || "Failed to update profile.");
      }
    } catch (err) {
      setSaveError(err.message || "An error occurred while updating profile.");
    } finally {
      setIsSaving(false);
    }
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
    if (!data.currentPassword) newErrors.currentPassword = "Current password is required.";
    if (!data.newPassword) {
      newErrors.newPassword = "New password is required.";
    } else if (data.newPassword.length < 6) {
      newErrors.newPassword = "New password must be at least 6 characters.";
    } else if (data.newPassword === data.currentPassword) {
      newErrors.newPassword = "New password cannot be the same as the current password.";
    }
    if (!data.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password.";
    } else if (data.newPassword && data.confirmPassword !== data.newPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    return newErrors;
  }

  async function handleUpdatePassword() {
    const validationErrors = validatePassword(passwordFields);
    setPasswordErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsChangingPassword(true);
    setPasswordSuccess("");

    try {
      const response = await changePassword({
        current_password: passwordFields.currentPassword,
        new_password: passwordFields.newPassword,
      });

      if (response.success) {
        setPasswordSuccess("Password changed successfully.");
        setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => {
          setPasswordModalOpen(false);
        }, 1800);
      } else {
        setPasswordErrors({ general: response.message || "Failed to change password." });
      }
    } catch (err) {
      setPasswordErrors({ general: err.message || "Failed to change password." });
    } finally {
      setIsChangingPassword(false);
    }
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
              <button
                type="button"
                onClick={logout}
                className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Logout
              </button>
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
            <Link to={dashboardHref} className="hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded">
              Dashboard
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-700">Profile</span>
          </nav>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              View and manage your personal and academic account details.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent" />
              <p className="mt-3 text-sm text-slate-600">Loading profile information...</p>
            </div>
          ) : fetchError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-red-800">{fetchError}</p>
            </div>
          ) : (
            <>
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

              {saveError && (
                <div
                  role="alert"
                  className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {saveError}
                </div>
              )}

              {/* Profile header card */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-white uppercase shadow-sm"
                      aria-hidden="true"
                    >
                      {getInitials(profile.fullName)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{profile.fullName || "User"}</h2>
                      <p className="text-sm text-slate-500">{profile.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 capitalize">
                          {isProfessor ? "Professor" : "Student"}
                        </span>
                        {profile.department && (
                          <span className="text-xs text-slate-500">{profile.department}</span>
                        )}
                        {profile.institution && (
                          <span className="text-xs text-slate-400">• {profile.institution}</span>
                        )}
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
                  {/* Personal & Academic information */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-900">
                      {isProfessor ? "Faculty Information" : "Personal & Academic Information"}
                    </h3>
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
                              placeholder="Your full name"
                            />
                            {errors.fullName && (
                              <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-700">{profile.fullName || "—"}</p>
                        )}
                      </div>

                      <div>
                        <FieldLabel htmlFor="email">Email Address</FieldLabel>
                        <p className="text-sm text-slate-700">{profile.email || "—"}</p>
                        <span className="text-xs text-slate-400">Account login address</span>
                      </div>

                      <div>
                        <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                        {isEditing ? (
                          <input
                            id="phone"
                            type="tel"
                            value={draftProfile.phone}
                            onChange={(e) => handleDraftChange("phone", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="+1 555-0100"
                          />
                        ) : (
                          <p className="text-sm text-slate-700">{profile.phone || "Not specified"}</p>
                        )}
                      </div>

                      <div>
                        <FieldLabel htmlFor="department">Department</FieldLabel>
                        {isEditing ? (
                          <input
                            id="department"
                            type="text"
                            value={draftProfile.department}
                            onChange={(e) => handleDraftChange("department", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="e.g. Computer Science"
                          />
                        ) : (
                          <p className="text-sm text-slate-700">{profile.department || "Not specified"}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <FieldLabel htmlFor="institution">Institution / University</FieldLabel>
                        {isEditing ? (
                          <input
                            id="institution"
                            type="text"
                            value={draftProfile.institution}
                            onChange={(e) => handleDraftChange("institution", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="e.g. University School of Engineering"
                          />
                        ) : (
                          <p className="text-sm text-slate-700">{profile.institution || "Not specified"}</p>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-6 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSaveChanges}
                          disabled={isSaving}
                          className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
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
                      Sign out of your academic session on this device.
                    </p>
                    <button
                      type="button"
                      onClick={logout}
                      className="mt-4 inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                        <dd className="text-sm font-medium text-slate-700 capitalize">
                          {isProfessor ? "Professor" : "Student"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-slate-500">Account Status</dt>
                        <dd>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            Active
                          </span>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-slate-500">Member Since</dt>
                        <dd className="text-sm font-medium text-slate-700">{profile.memberSince || "Recent"}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-slate-500">User ID</dt>
                        <dd className="text-sm font-medium text-slate-700">USR-{String(profile.id).padStart(4, "0")}</dd>
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
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Complete your profile details to keep your academic institution records current.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
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
              Choose a new secure password for your account.
            </p>

            {passwordErrors.general && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                {passwordErrors.general}
              </div>
            )}

            {passwordSuccess && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                {passwordSuccess}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwordFields.currentPassword}
                  onChange={(e) => handlePasswordFieldChange("currentPassword", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="••••••••"
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
                  placeholder="Minimum 6 characters"
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
                  placeholder="Repeat new password"
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
                disabled={isChangingPassword}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isChangingPassword}
                className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}