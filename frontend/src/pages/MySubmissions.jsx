import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStudentSubmissions } from "../service/api";

const icons = {
  manuscripts: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function MySubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await getStudentSubmissions();
        if (response && response.success) {
          setSubmissions(response.submissions || []);
        }
      } catch (err) {
        setError(err.message || "Failed to load submissions.");
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((m) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        m.title?.toLowerCase().includes(q) ||
        m.filename?.toLowerCase().includes(q) ||
        m.course?.toLowerCase().includes(q)
      );
    });
  }, [submissions, search]);

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-slate-50 min-h-screen">
      <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm sticky top-0 z-30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">My Documents</h1>
            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
              History
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review your previously uploaded documents and plagiarism reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/student/upload"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
          >
            {icons.upload({ className: "h-4 w-4" })}
            Check Document
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            {icons.search({ className: "h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" })}
            <input
              type="text"
              placeholder="Search documents by title, filename or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
                {icons.manuscripts({ className: "h-6 w-6" })}
              </div>
              <h4 className="text-sm font-bold text-slate-900">No documents found</h4>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto mb-6">
                You haven't uploaded any documents for plagiarism checking yet.
              </p>
              <Link
                to="/student/upload"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition shadow-sm"
              >
                {icons.upload({ className: "h-4 w-4" })}
                Check Document
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200 bg-slate-50/80">
                    <th className="px-6 py-4 font-semibold">Document Details</th>
                    <th className="px-6 py-4 font-semibold">Course</th>
                    <th className="px-6 py-4 font-semibold">Upload Date</th>
                    <th className="px-6 py-4 font-semibold">Similarity</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{m.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{m.filename}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 font-medium">{m.course}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.course_code}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {m.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                          m.similarity < 15 ? "bg-emerald-100 text-emerald-800" :
                          m.similarity <= 40 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {m.similarity !== null ? `${m.similarity}%` : "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border ${
                          m.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          m.status === "Review Required" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/student/reports/${m.report_id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
                        >
                          View Report {icons.arrowRight({ className: "h-3.5 w-3.5" })}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}