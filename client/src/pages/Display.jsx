import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Display() {
  const [params] = useSearchParams();
  const sessionId = params.get('sessionId');
  const adminKey = params.get('adminKey');

  const [qr, setQr] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [ended, setEnded] = useState(false);
  const [count, setCount] = useState(0);

  // Keep the latest refresh function in a ref so the 1-second ticker
  // (set up once) always calls the current version without re-subscribing.
  const refreshRef = useRef(() => {});

  useEffect(() => {
    if (!sessionId || !adminKey) return;

    async function refresh() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/token?adminKey=${adminKey}`);
        const data = await res.json();
        if (data.ended) {
          setEnded(true);
          return;
        }
        setQr(data.qr);
        setSecondsLeft(data.expiresInSeconds);
      } catch (err) {
        // transient network hiccup — the next tick will retry
      }
    }

    async function updateCount() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/stats?adminKey=${adminKey}`);
        if (!res.ok) return;
        const data = await res.json();
        setCount(data.count);
      } catch (err) {
        // ignore, will retry
      }
    }

    refreshRef.current = refresh;
    refresh();
    updateCount();

    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          refreshRef.current();
          return 30;
        }
        return s - 1;
      });
    }, 1000);
    const countInterval = setInterval(updateCount, 4000);

    return () => {
      clearInterval(tick);
      clearInterval(countInterval);
    };
  }, [sessionId, adminKey]);

  if (!sessionId || !adminKey) {
    return (
      <div className="display-page">
        <h1 className="ended">Missing session info</h1>
      </div>
    );
  }

  const downloadUrl = `/api/sessions/${sessionId}/export?adminKey=${adminKey}`;

  return (
    <div className="display-page">
      {ended ? (
        <h1 className="ended">Attendance Closed</h1>
      ) : (
        <>
          <h1>Scan to Mark Attendance</h1>
          <div className="sub">QR code refreshes every 30 seconds — a screenshot won't work after that</div>
          <div className="qr-box">{qr && <img src={qr} alt="QR code" />}</div>
          <div className="bar-bg">
            <div className="bar" style={{ width: `${(secondsLeft / 30) * 100}%` }} />
          </div>
          <div className="timer">New code in {secondsLeft}s</div>
        </>
      )}
      <div className="count">{count} student(s) checked in</div>
      <a className="download-btn" href={downloadUrl}>Download Excel</a>
    </div>
  );
}
