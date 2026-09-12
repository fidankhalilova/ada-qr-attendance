import { Routes, Route } from 'react-router-dom';
import CreateSession from './pages/CreateSession.jsx';
import Display from './pages/Display.jsx';
import Scan from './pages/Scan.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateSession />} />
      <Route path="/instructor" element={<CreateSession />} />
      <Route path="/display" element={<Display />} />
      <Route path="/s/:token" element={<Scan />} />
      <Route path="*" element={<CreateSession />} />
    </Routes>
  );
}
