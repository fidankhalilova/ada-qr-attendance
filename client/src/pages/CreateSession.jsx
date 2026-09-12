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
    <div className="page-center">
      <div className="card">
        <h2>Create Attendance Session</h2>
        <form onSubmit={handleSubmit}>
          <label>Class / Session name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. CS101 - Sept 9"
          />
          <label>Duration (minutes)</label>
          <input
            type="number"
            min="1"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Session'}
          </button>
        </form>

        {error && <div className="result result-error">{error}</div>}

        {result && (
          <div className="result">
            <p><strong>Session created!</strong></p>
            <p>Open this link on the classroom screen (keep it private — it controls the session):</p>
            <p><a href={displayUrl} target="_blank" rel="noreferrer">{displayUrl}</a></p>
            <p className="hint">
              Admin key: <code>{result.adminKey}</code> — save this if you want to re-open the
              display or export results later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
