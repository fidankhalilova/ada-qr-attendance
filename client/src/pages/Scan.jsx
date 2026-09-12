import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function Scan() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | form | error | already_submitted | submitted
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', surname: '', studentId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    fetch(`/api/scan/${token}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.status);
        setMessage(data.message || '');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error, please try again.');
      });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('submitted');
      } else {
        setSubmitError(data.error || 'Something went wrong.');
        setSubmitting(false);
      }
    } catch (err) {
      setSubmitError('Network error, please try again.');
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="page-center">
        <div className="card"><h2>Loading…</h2></div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page-center">
        <div className="card"><h2>⚠️ {message}</h2></div>
      </div>
    );
  }

  if (status === 'already_submitted' || status === 'submitted') {
    return (
      <div className="page-center">
        <div className="card">
          <h2>Attendance recorded</h2>
          <p>You can close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center">
      <div className="card">
        <h2>Mark Attendance</h2>
        <form onSubmit={handleSubmit}>
          <label>First Name</label>
          <input
            required
            autoComplete="given-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <label>Surname</label>
          <input
            required
            autoComplete="family-name"
            value={form.surname}
            onChange={(e) => setForm({ ...form, surname: e.target.value })}
          />
          <label>Student ID</label>
          <input
            required
            inputMode="numeric"
            autoComplete="off"
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
        {submitError && <div className="error">{submitError}</div>}
      </div>
    </div>
  );
}
