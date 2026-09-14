import { useState } from 'react';

export default function CreateSession() {
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, durationMinutes: Number(durationMinutes) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Network error, please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const displayUrl = result
    ? `${window.location.origin}/display?sessionId=${result.sessionId}&adminKey=${result.adminKey}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex justify-between items-center w-full">
            <p className="text-2xl font-semibold text-slate-900 leading-tight">
              QR Attendance System
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-ada-blue" />
          <div className="p-6 sm:p-7">
            <h1 className="text-lg font-semibold text-slate-900 mb-1">
              Create Attendance Session
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Set up a QR code for your class to scan.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Class / Session name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. CS101 - Sept 9"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ada-blue/30 focus:border-ada-blue transition"
                />
              </div>

              <div>
                <label
                  htmlFor="duration"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Duration (minutes)
                </label>
                <input
                  id="duration"
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ada-blue/30 focus:border-ada-blue transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-ada-blue py-2.5 text-sm font-semibold text-white hover:bg-ada-blue-dark disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? "Creating…" : "Create Session"}
              </button>
            </form>

            {error && (
              <div className="mt-5 rounded-lg border border-ada-red/25 bg-ada-red-light px-4 py-3 text-sm text-ada-red">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-5 rounded-lg border border-ada-blue/20 bg-ada-blue-light px-4 py-4">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Session created
                </p>
                <p className="text-sm text-slate-600 mb-2">
                  Open this link on the classroom screen. Keep it private — it
                  controls the session.
                </p>

                <a
                  href={displayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all text-sm font-medium text-ada-blue hover:underline"
                >
                  {displayUrl}
                </a>
                <p className="mt-3 text-xs text-slate-500">
                  Admin key:{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-700 border border-slate-200">
                    {result.adminKey}
                  </code>{" "}
                  — save this to reopen the display or export results later.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}