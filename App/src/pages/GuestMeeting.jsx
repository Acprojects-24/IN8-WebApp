import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// CORRECTED IMPORTS: Prefixed Feather icons and imported from Font Awesome
import { FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi';
import { FaUser, FaArrowRight } from 'react-icons/fa';
import backgroundImg from '../assets/background.jpg';


export default function GuestMeeting() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);

  // Core logic remains the same
  const canJoin = useMemo(() => name.trim().length > 0, [name]);

  const handleJoin = () => {
    if (!canJoin) return;
    localStorage.setItem('userName', name.trim());
    localStorage.setItem('guestJoinAudio', String(micOn));
    localStorage.setItem('guestJoinVideo', String(camOn));
    localStorage.setItem('joinAsGuest', 'true');
    navigate(`/meeting/${meetingId}`, { state: { guest: true } });
  };

  // UI Component for the toggle buttons (updated to use correct icon names)
  const ToggleButton = ({ IconOn, IconOff, isOn, onToggle, label }) => (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`p-4 rounded-full transition-colors duration-300 ${
          isOn ? 'bg-cyan-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
        }`}
      >
        {isOn ? <IconOn size={24} /> : <IconOff size={24} />}
      </button>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white">
      {/* Background image layer */}
      <div
  className="absolute inset-0 -z-10 bg-cover bg-center opacity-20"
  style={{ backgroundImage: `url(${backgroundImg})` }}
/>

      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* Left: Intro/Brand panel */}
        <div className="relative flex items-center justify-center p-8 md:p-12 bg-gradient-to-br from-slate-900/80 to-slate-800/" >
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <img src="/assets/logo.png" alt="IN8 Meetings" className="h-8 w-auto" onError={(e)=>{e.currentTarget.style.display='none'}} />
            <span className="text-xl font-bold tracking-wide">IN8 Meetings</span>
          </div>
          <div className="max-w-lg text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Welcome to IN8 Meetings</h1>
            <p className="mt-4 text-slate-300 text-base md:text-lg">
              Join secure, high-quality video meetings instantly. No signup required for guests. Set your name and AV preferences and you’re in.
            </p>
            <ul className="mt-6 space-y-2 text-slate-300 text-sm md:text-base">
              <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-500"/>Crystal-clear audio & HD video</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-500"/>One-click guest joining</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-500"/>Host-level controls and recordings</li>
            </ul>
          </div>
        </div>

        {/* Right: Join card */}
        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl" >
            <h2 className="text-2xl font-bold mb-2">Join Meeting</h2>
            <p className="text-slate-400 text-sm mb-6">Set up your audio and video before entering.</p>

            <div className="space-y-6">
              <div className="relative">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-center gap-6 py-2">
                <ToggleButton
                  IconOn={FiMic}
                  IconOff={FiMicOff}
                  isOn={micOn}
                  onToggle={() => setMicOn((v) => !v)}
                  label="Microphone"
                />
                <ToggleButton
                  IconOn={FiVideo}
                  IconOff={FiVideoOff}
                  isOn={camOn}
                  onToggle={() => setCamOn((v) => !v)}
                  label="Camera"
                />
              </div>

              <button
                disabled={!canJoin}
                onClick={handleJoin}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-lg transition-all duration-300 group ${
                  canJoin
                    ? 'bg-cyan-600 hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                Join Now
                <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" size={20} />
              </button>

              <p className="text-xs text-slate-500 text-center pt-1">
                Joining meeting: <span className="font-mono text-slate-400">{meetingId}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}