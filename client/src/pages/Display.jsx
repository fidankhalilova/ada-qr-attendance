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
      } catch (err) {}
    }

    async function updateCount() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/stats?adminKey=${adminKey}`);
        if (!res.ok) return;
        const data = await res.json();
        setCount(data.count);
      } catch (err) {}
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
      <div className="min-h-screen bg-ada-blue-dark flex items-center justify-center p-4">
        <p className="text-lg font-semibold text-ada-red">Missing session info</p>
      </div>
    );
  }

  const downloadUrl = `/api/sessions/${sessionId}/export?adminKey=${adminKey}`;

  return (
    <div className="min-h-screen bg-ada-blue-dark text-white flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-8 flex items-center gap-2">
        <span className="text-sm font-medium text-slate-300 tracking-wide">ADA University Attendance</span>
      </div>

      {ended ? (
        <h1 className="text-3xl sm:text-4xl font-semibold text-ada-red">Attendance Closed</h1>
      ) : (
        <>
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Scan to Mark Attendance</h1>
          <p className="text-sm text-slate-400 mb-8 max-w-xs">
            QR code refreshes every 30 seconds <br /> Screenshot won't work after that
          </p>

          <div className="bg-white p-5 rounded-2xl inline-block shadow-lg">
            {qr && (
              <img
                src={qr}
                alt="QR code"
                className="w-64 h-64 sm:w-80 sm:h-80 max-w-[70vw] max-h-[70vw] block"
              />
            )}
          </div>

          <div className="w-64 sm:w-80 max-w-[70vw] h-1.5 bg-white/10 rounded-full mt-5 overflow-hidden">
            <div
              className="h-full bg-ada-red rounded-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${(secondsLeft / 30) * 100}%` }}
            />
          </div>
          <p className="mt-4 text-sm text-slate-300 tabular-nums">New code in {secondsLeft}s</p>
        </>
      )}

      <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5">
        <span className="h-2 w-2 rounded-full bg-ada-red animate-pulse" />
        <span className="text-sm text-slate-200">{count} student(s) checked in</span>
      </div>

      
       <a href={downloadUrl}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white text-ada-blue-dark px-6 py-2.5 text-sm font-semibold hover:bg-slate-100 transition"
      >
        Download Excel
      </a>
    </div>
  );
}