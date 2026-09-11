import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Simple inline icons (no extra packages)
function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M6.6 6.7C4.3 8.2 2.5 12 2.5 12s3.5 7 9.5 7c1.8 0 3.4-.5 4.7-1.3M17.5 17.4C19.7 15.9 21.5 12 21.5 12s-1.1-2.2-3-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Abstract "document similarity network" visual — built with plain SVG, no external assets
function AcademicNetworkVisual() {
  const nodes = [
    { x: 60, y: 60 }, { x: 180, y: 40 }, { x: 300, y: 90 },
    { x: 110, y: 160 }, { x: 250, y: 190 }, { x: 40, y: 230 },
    { x: 320, y: 240 }, { x: 190, y: 270 },
  ];
  const edges = [
    [0, 1], [1, 2], [0, 3], [1, 3], [2, 4], [3, 4],
    [3, 5], [4, 6], [4, 7], [5, 7],
  ];
  // "matched" pair drawn with a stronger, highlighted edge
  const matched = [1, 4];

  return (
    <svg viewBox="0 0 360 300" className="w-full max-w-sm" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="rgba(148, 163, 184, 0.35)"
          strokeWidth="1.5"
        />
      ))}
      <line
        x1={nodes[matched[0]].x} y1={nodes[matched[0]].y}
        x2={nodes[matched[1]].x} y2={nodes[matched[1]].y}
        stroke="rgba(16, 185, 129, 0.9)"
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x} cy={n.y}
          r={matched.includes(i) ? 9 : 6}
          fill={matched.includes(i) ? "#10B981" : "rgba(203, 213, 225, 0.9)"}
          stroke={matched.includes(i) ? "#ECFDF5" : "none"}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setApiError("");

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const loggedInUser = await login(email.trim(), password);
        setSuccessMessage("Login successful! Redirecting...");

        setTimeout(() => {
          if (loggedInUser.role === "professor") {
            navigate("/professor/dashboard");
          } else {
            navigate("/student/dashboard");
          }
        }, 500);
      } catch (err) {
        setApiError(err.message || "Invalid email or password");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* LEFT SECTION — brand identity */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#0F172A] text-slate-100 px-14 py-12 relative overflow-hidden">
        <div>
          <p className="text-sm font-medium tracking-wide text-emerald-400">
            AI Academic Integrity
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-white max-w-md">
            Plagiarism Detection &amp; Academic Review System
          </h1>
          <p className="mt-6 text-slate-300 max-w-sm leading-relaxed">
            A review platform that helps institutions compare submitted
            documents, surface textual similarity, and support fair,
            evidence-based academic integrity decisions.
          </p>
        </div>

        <div className="flex justify-center py-10">
          <AcademicNetworkVisual />
        </div>

        <p className="text-xs text-slate-400 max-w-sm">
          Built for students, professors, and academic review committees.
        </p>
      </div>

      {/* RIGHT SECTION — login card */}
      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {/* Mobile-only brand header */}
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-medium tracking-wide text-emerald-500">
              AI Academic Integrity
            </p>
            <h1 className="mt-1 font-serif text-2xl text-slate-900">
              Plagiarism Detection &amp; Academic Review System
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-7 py-8 sm:px-9 sm:py-10">
            <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your credentials to access your dashboard.
            </p>

            {/* Role selector */}
            <fieldset className="mt-6">
              <legend className="text-sm font-medium text-slate-700 mb-2">
                Login as
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {["student", "professor"].map((option) => {
                  const isActive = role === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      aria-pressed={isActive}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                        isActive
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                    errors.email
                      ? "border-red-400"
                      : "border-slate-300 focus:border-emerald-500"
                  }`}
                />
                {errors.email && (
                  <p id="email-error" className="mt-1.5 text-sm text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-sm text-emerald-500 hover:text-emerald-600"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={`w-full rounded-lg border px-3.5 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                      errors.password
                        ? "border-red-400"
                        : "border-slate-300 focus:border-emerald-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="mt-1.5 text-sm text-red-600">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-slate-600">
                  Remember me
                </label>
              </div>

              {/* API error message */}
              {apiError && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"
                >
                  {apiError}
                </div>
              )}

              {/* Success message */}
              {successMessage && (
                <div
                  role="status"
                  className="rounded-lg bg-green-50 border border-green-200 px-3.5 py-2.5 text-sm text-green-700"
                >
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? "Signing in..." : `Sign in as ${role === "student" ? "Student" : "Professor"}`}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-medium text-emerald-500 hover:text-emerald-600">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}