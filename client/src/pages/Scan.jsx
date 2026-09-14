import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-ada-red" />
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function Scan() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", surname: "", studentId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    fetch(`/api/scan/${token}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.status);
        setMessage(data.message || "");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error, please try again.");
      });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("submitted");
      } else {
        setSubmitError(data.error || "Something went wrong.");
        setSubmitting(false);
      }
    } catch (err) {
      setSubmitError("Network error, please try again.");
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="h-8 w-8 border-2 border-slate-200 border-t-ada-blue rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-500">Loading session…</p>
        </div>
      </Shell>
    );
  }

  if (status === "error") {
    return (
      <Shell>
        <div className="text-center py-2">
          <p className="text-sm font-medium text-ada-red">{message}</p>
        </div>
      </Shell>
    );
  }

  if (status === "already_submitted" || status === "submitted") {
    return (
      <Shell>
        <div className="text-center py-4">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-ada-blue-light flex items-center justify-center">
            <svg
              className="h-6 w-6 text-ada-blue"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Attendance recorded
          </h2>
          <p className="text-sm text-slate-500">You can close this page.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-lg font-semibold text-slate-900 mb-1">
        Mark Attendance
      </h1>
      <p className="text-sm text-slate-500 mb-5">
        Fill in your details to check in.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            First Name
          </label>
          <input
            required
            autoComplete="given-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ada-blue/30 focus:border-ada-blue transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Surname
          </label>
          <input
            required
            autoComplete="family-name"
            value={form.surname}
            onChange={(e) => setForm({ ...form, surname: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ada-blue/30 focus:border-ada-blue transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Student ID
          </label>
          <input
            required
            inputMode="numeric"
            autoComplete="off"
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ada-blue/30 focus:border-ada-blue transition"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-ada-blue py-2.5 text-sm font-semibold text-white hover:bg-ada-blue-dark disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </form>

      {submitError && (
        <div className="mt-4 rounded-lg border border-ada-red/25 bg-ada-red-light px-4 py-3 text-sm text-ada-red">
          {submitError}
        </div>
      )}
    </Shell>
  );
}
