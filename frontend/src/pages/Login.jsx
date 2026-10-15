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
        stroke="rgba(59, 130, 246, 0.9)"
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x} cy={n.y}
          r={matched.includes(i) ? 9 : 6}
          fill={matched.includes(i) ? "#3B82F6" : "rgba(203, 213, 225, 0.9)"}
          stroke={matched.includes(i) ? "#EFF6FF" : "none"}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

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
        setSuccessMessage("Login successful! Redirecting to dashboard...");
        navigate("/student/dashboard", { replace: true });
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
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#0B1120] text-slate-100 px-14 py-12 relative overflow-hidden border-r border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Academic Integrity System
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white max-w-md">
            AI-Based Plagiarism Detector
          </h1>
          <p className="mt-4 text-sm text-slate-300 max-w-sm leading-relaxed">
            Deterministic similarity analysis comparing academic submissions against indexed reference literature and peer documents using TF-IDF and cosine similarity.
          </p>
        </div>

        <div className="flex justify-center py-8">
          <AcademicNetworkVisual />
        </div>

        <p className="text-xs text-slate-400 max-w-sm">
          Built for academic course submissions, student document verification, and faculty review.
        </p>
      </div>

      {/* RIGHT SECTION — login card */}
      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {/* Mobile-only brand header */}
          <div className="mb-8 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Plagiarism Detector
            </span>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Academic Integrity System
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 px-7 py-8 sm:px-9 sm:py-10">
            <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter your academic credentials to access the system.
            </p>

            <form className="mt-6 space-y-4.5" onSubmit={handleSubmit} noValidate autoComplete="on">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Institutional Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student_a_f6@example.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                    errors.email
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-slate-300 focus:border-blue-500"
                  }`}
                />
                {errors.email && (
                  <p id="email-error" className="mt-1 text-xs text-rose-600">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-11 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                      errors.password
                        ? "border-rose-400 focus:border-rose-500"
                        : "border-slate-300 focus:border-blue-500"
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
                  <p id="password-error" className="mt-1 text-xs text-rose-600">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* API error message */}
              {apiError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium"
                >
                  {apiError}
                </div>
              )}

              {/* Success message */}
              {successMessage && (
                <div
                  role="status"
                  className="rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-2.5 text-xs text-blue-700 font-medium"
                >
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-800">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}