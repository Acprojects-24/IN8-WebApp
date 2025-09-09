import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { 
    Bell, Video, Calendar, KeyRound, Settings, Plus,
    User, LogOut, ChevronDown, Users, Clock, Loader2, RefreshCw, Mail,
    MapPin, Shield, Play, Archive, CalendarPlus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { fullClientLogout } from '../utils/logout';
import { getUserProfile, getProfileImage, getUserId } from '../utils/profileUtils';
import { createProfileTransition } from '../utils/profileTransition';

// --- Lightweight Custom Pickers (Calendar + Time) ---
// Calendar picker with month navigation and day grid
const CalendarPopover = ({ initialDate, onSelect, onClose }) => {
    const [viewDate, setViewDate] = useState(initialDate ? new Date(initialDate) : new Date());
    const today = new Date();

    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const goMonth = (delta) => setViewDate(new Date(year, month + delta, 1));

    const handlePick = (day) => {
        const picked = new Date(year, month, day, 0, 0, 0, 0);
        if (picked < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;
        onSelect(picked);
        onClose();
    };

    const monthName = viewDate.toLocaleString('default', { month: 'long' });
    const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const selected = initialDate ? new Date(initialDate) : null;

    return (
        <motion.div 
            className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-4 w-full max-w-sm shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
        >
            <div className="flex items-center justify-between mb-3">
                <button onClick={() => goMonth(-1)} className="p-2 rounded-lg hover:bg-slate-800/60">‹</button>
                <div className="font-semibold">{monthName} {year}</div>
                <button onClick={() => goMonth(1)} className="p-2 rounded-lg hover:bg-slate-800/60">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">
                {['S','M','T','W','T','F','S'].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(year, month, day);
                    const past = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const selectedDay = selected && isSameDay(date, selected);
                    const isToday = isSameDay(date, today);
                    return (
                        <button
                            key={day}
                            onClick={() => handlePick(day)}
                            disabled={past}
                            className={`h-9 w-9 rounded-full text-sm flex items-center justify-center transition-colors 
                                ${selectedDay ? 'bg-blue-600 text-white' : isToday ? 'border border-blue-500 text-blue-400' : 'hover:bg-slate-800/60'}
                                ${past ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
};

// Time picker with hour/minute steppers and AM/PM toggle
const TimePopover = ({ initialTime, onSelect, onClose }) => {
    const base = initialTime ? new Date(`1970-01-01T${initialTime}:00`) : new Date();
    const initialHour12 = (() => { const h = base.getHours() % 12; return h === 0 ? 12 : h; })();
    const initialMinute = base.getMinutes();
    const initialPeriod = base.getHours() >= 12 ? 'PM' : 'AM';

    const [hour, setHour] = useState(initialHour12);
    const [minute, setMinute] = useState(initialMinute);
    const [period, setPeriod] = useState(initialPeriod);

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    const commit = () => {
        let h24 = hour % 12;
        if (period === 'PM') h24 += 12;
        const hh = String(h24).padStart(2, '0');
        const mm = String(clamp(minute, 0, 59)).padStart(2, '0');
        onSelect(`${hh}:${mm}`);
        onClose();
    };

    return (
        <motion.div 
            className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
        >
            <h3 className="text-sm font-semibold text-white mb-3">Select time</h3>
            <div className="flex items-center justify-center gap-3 mb-4">
                <input
                    type="number"
                    min={1}
                    max={12}
                    value={hour}
                    onChange={(e) => setHour(clamp(parseInt(e.target.value || '1', 10), 1, 12))}
                    className="w-20 bg-slate-800/70 border border-slate-700/70 rounded-lg py-2 px-3 text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <span className="text-xl">:</span>
                <input
                    type="number"
                    min={0}
                    max={59}
                    value={String(minute).padStart(2, '0')}
                    onChange={(e) => setMinute(clamp(parseInt(e.target.value || '0', 10), 0, 59))}
                    className="w-20 bg-slate-800/70 border border-slate-700/70 rounded-lg py-2 px-3 text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <div className="flex flex-col gap-2">
                    <button onClick={() => setPeriod('AM')} className={`px-3 py-1 rounded-md text-sm ${period === 'AM' ? 'bg-blue-600 text-white' : 'bg-slate-800/70 text-slate-300 border border-slate-700/60'}`}>AM</button>
                    <button onClick={() => setPeriod('PM')} className={`px-3 py-1 rounded-md text-sm ${period === 'PM' ? 'bg-blue-600 text-white' : 'bg-slate-800/70 text-slate-300 border border-slate-700/60'}`}>PM</button>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-slate-800/70 text-slate-200 border border-slate-700/60">Cancel</button>
                <button onClick={commit} className="px-4 py-1.5 rounded-md bg-blue-600 text-white">Set</button>
            </div>
        </motion.div>
    );
};

// --- MOCK DATA for Member View ---
const upcomingMeetingsData = [
    { time: '10:00 AM', title: 'Q3 Strategy Review', id: 'STRAT-Q3-REVIEW', attendees: 8 },
    { time: '1:00 PM', title: 'Project Phoenix Kick-off', id: 'PROJ-PHNX-KICK', attendees: 12 },
    { time: '3:30 PM', title: '1-on-1 with Alex', id: 'ONE-ALEX-330', attendees: 2 },
];

const recentRecordingsData = [
    { title: "Sales Weekly Sync", date: "July 27, 2025", duration: "45 min" },
    { title: "Project Phoenix - Standup", date: "July 26, 2025", duration: "15 min" },
    { title: "Marketing Brainstorm", date: "July 25, 2025", duration: "1 hr 20 min" },
];

// --- Counter Component for Animated Numbers ---
function Counter({ from, to, label }) {
    const nodeRef = useRef();
    const [displayValue, setDisplayValue] = useState(from);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return;
        
        const startValue = from;
        const endValue = to;
        const duration = 1500; // 1.5 seconds
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);
            
            setDisplayValue(currentValue);
            node.textContent = currentValue + (label || '');
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }, [from, to, label]);

    return <h3 ref={nodeRef} className="text-xl sm:text-2xl font-bold text-white tracking-tight" />;
}

// --- ShineButton Component ---
const ShineButton = ({ children, className = "", ...props }) => {
    const buttonRef = useRef(null);
    const shineRef = useRef(null);
    const timeline = useRef(null);

    useGSAP(() => {
        timeline.current = gsap.timeline({ paused: true })
            .fromTo(shineRef.current, 
                { x: '-120%', skewX: -25, opacity: 0 }, 
                { x: '120%', skewX: -25, opacity: 1, duration: 0.8, ease: 'power2.inOut' }
            );
    }, { scope: buttonRef });

    const handleMouseEnter = () => {
        timeline.current.restart();
    };

    return (
        <motion.button
            ref={buttonRef}
            onMouseEnter={handleMouseEnter}
            whileTap={{ scale: 0.96 }}
            whileHover={{ 
                scale: 1.02,
                boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.04)"
            }}
            className={`
                relative w-auto flex items-center justify-center gap-2 py-3 px-8 rounded-xl
                bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 
                font-semibold text-white transition-all duration-300 
                hover:from-blue-500 hover:via-blue-600 hover:to-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden
                border border-blue-500/20 shadow-lg
                before:absolute before:inset-0 before:rounded-xl
                before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
                before:translate-x-[-100%] before:skew-x-12 before:transition-transform before:duration-700
                hover:before:translate-x-[100%]
                ${className}
            `}
            {...props}
        >
            <span
                ref={shineRef}
                className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent blur-sm"
            />
            <span className="relative z-10 drop-shadow-sm">{children}</span>
        </motion.button>
    );
};

// --- MetricCard Component ---
const MetricCard = ({ title, value, change, isPositive, label = "", icon: Icon, gradient = "from-blue-500 to-purple-600", loading = false, error = null, onClick = null }) => {
    if (loading) {
        return (
            <motion.div 
                className="relative overflow-hidden bg-slate-800/40 backdrop-blur-lg rounded-2xl border border-slate-700/50 h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
                <div className="relative p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} p-2.5 shadow-lg animate-pulse`}>
                            {Icon && <Icon className="w-full h-full text-white" />}
                        </div>
                        <div className="w-16 h-6 bg-slate-700 rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="w-24 h-4 bg-slate-700 rounded mb-2 animate-pulse"></div>
                        <div className="w-16 h-8 bg-slate-700 rounded animate-pulse"></div>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <motion.div 
                className="relative overflow-hidden bg-red-900/20 backdrop-blur-lg rounded-2xl border border-red-500/30 h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 opacity-5" />
                <div className="relative p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-2.5 shadow-lg">
                            {Icon && <Icon className="w-full h-full text-white" />}
                        </div>
                        <div className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                            Error
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <p className="text-sm text-red-400 mb-2 font-medium">{title}</p>
                        <p className="text-sm text-red-300">Failed to load</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            className={`relative overflow-hidden bg-slate-800/40 backdrop-blur-lg rounded-2xl border border-slate-700/50 h-full group hover:border-slate-600/50 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
            whileHover={{ y: -4, scale: 1.02 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={onClick}
        >
            {/* Gradient background overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="relative p-4 h-full flex flex-col">
                {/* Header with icon */}
                <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} p-2 shadow-lg`}>
                        {Icon && <Icon className="w-full h-full text-white" />}
                    </div>
                    <div className={`text-xs px-3 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                        {change}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col justify-center">
                    <p className="text-xs text-slate-400 mb-1 font-medium">{title}</p>
                    <div className="flex items-baseline gap-2">
                        {typeof value === 'number' ? 
                            <Counter from={0} to={value} label={label} /> : 
                            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{value}</h3>
                        }
                    </div>
                </div>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
            </div>
        </motion.div>
    );
};







// --- Custom Hook for User Meeting Stats ---
const useMeetingStats = (userId) => {
    const [stats, setStats] = useState({
        meetingsJoinedThisMonth: 0,
        pastMeetings: 0,
        scheduledMeetings: 0,
        recordingsAvailable: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchStats = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            // Fetch meetings created by user
            const { data: userMeetings, error: meetingsError } = await supabase
                .from('meetings')
                .select('id, created_at, scheduled_for, is_scheduled, completed_at')
                .eq('created_by', userId);

            if (meetingsError) throw meetingsError;

            const meetings = Array.isArray(userMeetings) ? userMeetings : [];
            console.log('[Home] Raw meetings data:', meetings);

            // Meetings joined this month (meetings created this month)
            const meetingsThisMonth = meetings.filter(meeting => {
                const createdAt = new Date(meeting.created_at);
                return createdAt >= startOfMonth && createdAt <= endOfMonth;
            });

            // Past meetings: non-scheduled (instant) meetings + completed scheduled meetings
            const pastMeetings = meetings.filter(meeting => 
                !meeting.is_scheduled || // Instant meetings (originally created as not scheduled)
                meeting.completed_at    // Any meeting that has been completed (originally scheduled but now done)
            );

            // Scheduled meetings: ONLY meetings that are still scheduled (not yet started/completed)
            const scheduledMeetings = meetings.filter(meeting => 
                meeting.is_scheduled === true && !meeting.completed_at
            );

            console.log('[Home] Filtered meetings:', { 
                total: meetings.length, 
                past: pastMeetings.length, 
                scheduled: scheduledMeetings.length,
                thisMonth: meetingsThisMonth.length
            });

            // Recordings available (from meeting_actions table with type 'recording-start')
            const { data: recordingActions, error: recordingsError } = await supabase
                .from('meeting_actions')
                .select('meeting_id')
                .eq('type', 'recording-start')
                .eq('status', 'done')
                .in('meeting_id', meetings.map(m => m.id));

            if (recordingsError) {
                console.warn('Error fetching recordings:', recordingsError);
            }

            const uniqueRecordedMeetings = [...new Set((recordingActions || []).map(action => action.meeting_id))];

            setStats({
                meetingsJoinedThisMonth: meetingsThisMonth.length,
                pastMeetings: pastMeetings.length,
                scheduledMeetings: scheduledMeetings.length,
                recordingsAvailable: uniqueRecordedMeetings.length
            });

            setLastUpdated(new Date());

        } catch (err) {
            console.error('Error fetching meeting stats:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [userId]);

    const refreshStats = () => {
        fetchStats();
    };

    return { stats, loading, error, lastUpdated, refreshStats };
};

// --- Reusable Components ---
const InfoCard = ({ children, className }) => (
    <div className={`group relative overflow-hidden rounded-2xl bg-slate-900/60 p-6 sm:p-8 border border-slate-700/70 backdrop-blur-xl shadow-xl shadow-black/20 ${className}`}>
        {/* subtle gradient glow on hover */}
        <div className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute -inset-16 bg-gradient-to-br from-blue-500/10 via-fuchsia-500/10 to-purple-500/10 blur-2xl" />
        </div>
        {children}
    </div>
);

// --- Enhanced Header with Profile Dropdown ---
const AppHeader = ({ userName, onStartInstant, onLogout }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
         <motion.header 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} 
            className="flex justify-between items-center w-full h-20 px-4 md:px-8 bg-black/10 backdrop-blur-lg border-b border-slate-800 flex-shrink-0 z-20"
        >
            <div className="flex items-center gap-8">
                <h2 className="text-2xl font-bold text-white">IN8</h2>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                    <a href="#" className="text-white font-semibold">Home</a>
                    <a href="#" className="hover:text-white transition-colors">Recordings</a>
                </nav>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={onStartInstant}
                    className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm border border-blue-500/30"
                >
                    <Video size={16} /> Start instant
                </button>
                <button className="p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors">
                    <Bell size={20} className="text-slate-300" />
                </button>
                <div className="relative" ref={profileRef}>
                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2">
                        <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="w-10 h-10 rounded-full border-2 border-slate-700 object-cover cursor-pointer hover:border-slate-500 transition-colors" 
                            onClick={(e) => {
                                e.stopPropagation();
                                profileTransition(e.target);
                            }}
                        />
                        <ChevronDown size={16} className={`text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {isProfileOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute top-full right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 origin-top-right z-50"
                            >
                                <div className="p-2">
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIsProfileOpen(false);
                                            // Use the profile image as source for transition
                                            const profileImg = profileRef.current?.querySelector('img');
                                            if (profileImg) {
                                                profileTransition(profileImg);
                                            } else {
                                                navigate('/profile');
                                            }
                                        }}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 rounded-md hover:bg-slate-700 w-full text-left"
                                    >
                                        <User size={16} /> Profile
                                    </button>
                                    <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 rounded-md hover:bg-slate-700"><Settings size={16} /> Settings</a>
                                    <div className="h-px bg-slate-700 my-1"></div>
                                    <button 
                                        onClick={onLogout}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 rounded-md hover:bg-red-500/10 w-full text-left"
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.header>
    );
};




const HomePage = () => {
    const [userName, setUserName] = useState('Member');
    const [meetingId, setMeetingId] = useState('');
    const [activeTab, setActiveTab] = useState('upcoming');
    const [currentUser, setCurrentUser] = useState(null);
    const [profileImage, setProfileImage] = useState('');
    const navigate = useNavigate();

    const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
    const [globalToast, setGlobalToast] = useState(null);
    const [newMeetingForm, setNewMeetingForm] = useState({
        meetingTitle: '',
        meetingPurpose: '',
        webinarMode: false,
        micEnabled: true,
        cameraEnabled: true,
        waitingRoomEnabled: false,
    });
    const [isMeetingDetailsOpen, setIsMeetingDetailsOpen] = useState(false);
    const [selectedMeetingType, setSelectedMeetingType] = useState('');
    const [meetingsList, setMeetingsList] = useState([]);
    const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        meetingTitle: '',
        meetingPurpose: '',
        webinarMode: false,
        scheduleDate: '',
        scheduleTime: '',
        micEnabled: true,
        cameraEnabled: true,
        waitingRoomEnabled: false,
    });
    const [showScheduleCalendar, setShowScheduleCalendar] = useState(false);
    const [showScheduleTime, setShowScheduleTime] = useState(false);

    // Create profile transition function
    const profileTransition = createProfileTransition(navigate);

    // Use the meeting stats hook
    const { stats, loading: statsLoading, error: statsError, lastUpdated, refreshStats } = useMeetingStats(currentUser?.id);

    useEffect(() => {
        const loadUserData = () => {
            // Load user profile data with new utilities
            const profile = getUserProfile();
            if (profile?.name) {
                setUserName(profile.name);
            } else {
                // Fallback to legacy storage
                const storedUserName = localStorage.getItem('userName');
                if (storedUserName) {
                    setUserName(storedUserName);
                }
            }
            
            // Load profile image
            const userId = getUserId();
            const userImage = getProfileImage(userId);
            setProfileImage(userImage);
        };
        
        loadUserData();
        
        let mounted = true;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) setCurrentUser(session?.user || null);
        })();
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (!mounted) return;
            setCurrentUser(session?.user || null);
        });
        
        // Listen for profile updates
        const handleProfileUpdate = () => {
            loadUserData();
        };
        
        window.addEventListener('storage', handleProfileUpdate);
        window.addEventListener('profileUpdated', handleProfileUpdate);
        
        return () => { 
            mounted = false; 
            sub.subscription.unsubscribe();
            window.removeEventListener('storage', handleProfileUpdate);
            window.removeEventListener('profileUpdated', handleProfileUpdate);
        };
    }, []);



    const createInstantMeeting = async () => {
        if (!currentUser) { alert('You must be logged in to start a meeting.'); return; }
        try {
            const hostToken = uuidv4();
            // Prepare meeting data with fallback for webinar_mode
            const meetingData = {
                name: newMeetingForm.meetingTitle || `Instant Meeting - ${new Date().toLocaleDateString()}`,
                purpose: newMeetingForm.meetingPurpose || 'Quick call',
                is_scheduled: false,
                scheduled_for: null,
                host_name: userName,
                start_with_audio_muted: !newMeetingForm.micEnabled,
                start_with_video_muted: !newMeetingForm.cameraEnabled,
                prejoin_page_enabled: newMeetingForm.waitingRoomEnabled || false,
                created_by: currentUser.id,
                host_token: hostToken,
            };

            // Add webinar_mode if it's enabled (graceful fallback)
            if (newMeetingForm.webinarMode) {
                meetingData.webinar_mode = true;
            }

            const { data, error } = await supabase.from('meetings')
                .insert([meetingData])
                .select('id')
                .single();
            if (error) throw error;
            localStorage.setItem(`hostToken_${data.id}`, hostToken);
            
            // Refresh stats after creating a meeting (reduced delay)
            setTimeout(() => {
                refreshStats();
            }, 200);
            
            // Reset form and close modal
            setNewMeetingForm({
                meetingTitle: '',
                meetingPurpose: '',
                webinarMode: false,
                micEnabled: true,
                cameraEnabled: true,
                waitingRoomEnabled: false,
            });
            setIsNewMeetingOpen(false);
            
            navigate(`/meeting/${data.id}`);
        } catch (e) {
            console.error('Failed to create meeting:', e);
            console.error('Meeting data attempted:', {
                title: newMeetingForm.meetingTitle,
                purpose: newMeetingForm.meetingPurpose,
                webinarMode: newMeetingForm.webinarMode,
                micEnabled: newMeetingForm.micEnabled,
                cameraEnabled: newMeetingForm.cameraEnabled,
                waitingRoomEnabled: newMeetingForm.waitingRoomEnabled
            });
            alert(`Failed to create meeting: ${e.message || 'Unknown error'}`);
        }
    };

    const handleStatsClick = async (type) => {
        if (!currentUser?.id) return;
        
        try {
            let meetings = [];
            const now = new Date();
            
            if (type === 'past') {
                const { data, error } = await supabase
                    .from('meetings')
                    .select('*')
                    .eq('created_by', currentUser.id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                // Filter for past meetings: non-scheduled (instant) + completed scheduled meetings
                meetings = (data || []).filter(meeting => 
                    !meeting.is_scheduled || meeting.completed_at
                );
            } else if (type === 'upcoming') {
                const { data, error } = await supabase
                    .from('meetings')
                    .select('*')
                    .eq('created_by', currentUser.id)
                    .eq('is_scheduled', true)
                    .is('completed_at', null) // Only meetings that haven't been completed yet
                    .order('scheduled_for', { ascending: true, nulls: 'last' });
                if (error) throw error;
                meetings = data || [];
            }
            
            setMeetingsList(meetings);
            setSelectedMeetingType(type);
            setIsMeetingDetailsOpen(true);
        } catch (error) {
            console.error('Error fetching meetings:', error);
            alert('Failed to load meetings');
        }
    };

    const cardAnimation = {
        initial: { opacity: 0, y: 50, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white font-sans">
            <div className="flex flex-col h-screen overflow-y-auto scrollbar-hide">
                {/* Global toast container for Home page */}
                <div className="fixed top-5 right-5 z-50 w-full max-w-sm">
                    <AnimatePresence>
                        {globalToast && (
                            <Toast
                                key={globalToast.id}
                                toast={globalToast}
                                onClose={() => setGlobalToast(null)}
                            />
                        )}
                    </AnimatePresence>
                </div>

                <AppHeader 
                    userName={userName} 
                    onStartInstant={createInstantMeeting}
                    onLogout={async () => {
                        await fullClientLogout(() => supabase.auth.signOut());
                        setGlobalToast({ id: Date.now(), title: 'Logged out', message: 'You have been signed out.', type: 'success', duration: 1500 });
                        setTimeout(() => navigate('/'), 500);
                    }}
                />

                <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-6 md:py-8 bg-gradient-to-b from-slate-950/50 to-transparent overflow-y-auto scrollbar-hide">
                    <div className="max-w-7xl mx-auto space-y-10 md:space-y-12">
                        {/* Welcome Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-8"
                        >
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                                Welcome back, <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">{userName}</span>
                            </h1>
                            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                                Ready to connect? Start a new meeting or join an existing one.
                            </p>
                        </motion.div>

                        {/* Meeting Stats Section */}
                        <motion.section 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
                        >
                            <div className="col-span-2 lg:col-span-4 flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Your Meeting Activity</h3>
                                    {lastUpdated && !statsError && (
                                        <p className="text-sm text-slate-400 mt-1">
                                            Last updated: {lastUpdated.toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={refreshStats}
                                    disabled={statsLoading}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 transition-colors disabled:opacity-50 min-w-[110px] justify-center"
                                >
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        <RefreshCw size={16} className={`text-slate-300 transition-transform ${statsLoading ? 'animate-spin' : ''}`} />
                                    </div>
                                    <span className="text-sm text-slate-300 whitespace-nowrap">{statsLoading ? 'Loading...' : 'Refresh'}</span>
                                </button>
                            </div>
                            
                            <MetricCard 
                                title="Meetings This Month" 
                                value={stats.meetingsJoinedThisMonth} 
                                change={`${new Date().toLocaleString('default', { month: 'long' })}`} 
                                isPositive={true}
                                icon={Users}
                                gradient="from-blue-500 to-blue-600"
                                loading={statsLoading} 
                                error={statsError}
                            />
                            <MetricCard 
                                title="Past Meetings" 
                                value={stats.pastMeetings} 
                                change="All time" 
                                isPositive={true}
                                icon={Clock}
                                gradient="from-purple-500 to-purple-600"
                                loading={statsLoading} 
                                error={statsError}
                                onClick={() => handleStatsClick('past')}
                            />
                            <MetricCard 
                                title="Scheduled Meetings" 
                                value={stats.scheduledMeetings} 
                                change="Scheduled" 
                                isPositive={true}
                                icon={Calendar}
                                gradient="from-emerald-500 to-emerald-600"
                                loading={statsLoading} 
                                error={statsError}
                                onClick={() => handleStatsClick('upcoming')}
                            />
                            <MetricCard 
                                title="Recordings Available" 
                                value={stats.recordingsAvailable} 
                                change="Saved" 
                                isPositive={true}
                                icon={Video}
                                gradient="from-orange-500 to-orange-600"
                                loading={statsLoading} 
                                error={statsError}
                            />
                        </motion.section>

                        {/* Enhanced Start/Join Meeting Section */}
                        <motion.div 
                            className="w-full"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                        >
                            {/* Section Header */}
                            <div className="text-center mb-10 md:mb-12">
                                <motion.h2 
                                    className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3"
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Start or Join a Meeting
                                </motion.h2>
                                <motion.p 
                                    className="text-slate-400 text-base md:text-lg max-w-xl mx-auto"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    Choose how you'd like to connect with your team
                                </motion.p>
                            </div>

                            {/* Three Column Layout */}
                            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
                                {/* First Column - New Meeting */}
                                <motion.div 
                                    className="space-y-4"
                                    initial={{ x: -30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <h3 className="text-lg font-semibold text-white mb-4">Start New Meeting</h3>
                                    <motion.div
                                        className="group relative p-[2px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <button
                                            onClick={() => setIsNewMeetingOpen(true)}
                                            className="relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-900 text-white font-semibold transition-all duration-300 hover:bg-slate-800/80 w-full"
                                        >
                                            <motion.div
                                                className="relative"
                                                whileHover={{ scale: 1.1 }}
                                                transition={{ type: "spring", damping: 15 }}
                                            >
                                                <Video size={32} className="text-blue-400" />
                                                <motion.div
                                                    className="absolute -inset-2 rounded-full bg-blue-400/20"
                                                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                />
                                            </motion.div>
                                            <span className="text-lg font-semibold">New Meeting</span>
                                            <span className="text-sm text-slate-400">Set up meeting details</span>
                                        </button>
                                    </motion.div>
                                </motion.div>

                                {/* Second Column - Join Meeting */}
                                <motion.div 
                                    className="space-y-6"
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    {/* Join Meeting */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-4">Join with Code</h3>
                                        <div className="space-y-3">
                                            <div className="relative group">
                                                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors"/>
                                                <motion.input 
                                                    type="text" 
                                                    value={meetingId} 
                                                    onChange={(e) => setMeetingId(e.target.value)} 
                                                    placeholder="Enter meeting code or link"
                                                    className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                                                    whileFocus={{ scale: 1.01 }}
                                                />
                                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                            </div>
                                            <motion.button 
                                                onClick={async () => {
                                                    const raw = meetingId.trim();
                                                    if (!raw) return;
                                                    let code = raw;
                                                    try {
                                                        const maybeUrl = new URL(raw);
                                                        const match = maybeUrl.pathname.match(/\/meeting\/([^\/?#]+)/i);
                                                        if (match && match[1]) code = match[1];
                                                    } catch (_) {
                                                        const m = raw.match(/(?:^|\/)meeting\/([^\/?#]+)/i);
                                                        if (m && m[1]) code = m[1];
                                                    }
                                                    code = code.replace(/\s+/g, '');
                                                    if (!code) { setGlobalToast({ id: Date.now(), title: 'Invalid code', message: 'Please enter a valid meeting code or link.', type: 'warning', duration: 2000 }); return; }
                                                    try {
                                                        const { data, error } = await supabase.from('meetings').select('id').eq('id', code).single();
                                                        if (!error && data) {
                                                            navigate(`/meeting/${code}`);
                                                            setMeetingId('');
                                                            setGlobalToast({ id: Date.now(), title: 'Joining meeting', message: `Meeting ID: ${code}`, type: 'success', duration: 1500 });
                                                        } else {
                                                            setGlobalToast({ id: Date.now(), title: 'Not found', message: 'Meeting not found. Check the code.', type: 'error', duration: 2000 });
                                                        }
                                                    } catch (e) {
                                                        console.error('Join failed', e);
                                                        setGlobalToast({ id: Date.now(), title: 'Join failed', message: 'Please check your input and try again.', type: 'error', duration: 2000 });
                                                    }
                                                }}
                                                disabled={!meetingId.trim()}
                                                className="w-full px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 disabled:from-slate-800 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                whileHover={{ scale: meetingId.trim() ? 1.02 : 1 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                Join Meeting
                                            </motion.button>
                                        </div>
                                    </div>
                                    
                                </motion.div>
                                
                                {/* Third Column - Schedule Meeting */}
                                <motion.div 
                                    className="space-y-4"
                                    initial={{ x: 30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                >
                                    <h3 className="text-lg font-semibold text-white mb-4">Schedule for Later</h3>
                                    <motion.div
                                        className="group relative p-[2px] rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <button
                                            onClick={() => setIsScheduleMeetingOpen(true)}
                                            className="relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-900 text-white font-semibold transition-all duration-300 hover:bg-slate-800/80 w-full"
                                        >
                                            <motion.div
                                                className="relative"
                                                whileHover={{ scale: 1.1 }}
                                                transition={{ type: "spring", damping: 15 }}
                                            >
                                                <CalendarPlus size={32} className="text-emerald-400" />
                                                <motion.div
                                                    className="absolute -inset-2 rounded-full bg-emerald-400/20"
                                                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                />
                                            </motion.div>
                                            <span className="text-lg font-semibold">Schedule Meeting</span>
                                            <span className="text-sm text-slate-400">Plan for the future</span>
                                        </button>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </main>


                {/* New Meeting Modal */}
                <AnimatePresence>
                    {isNewMeetingOpen && (
                        <motion.div 
                            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                        >
                            <motion.div 
                                className="relative bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" 
                                initial={{ scale: 0.95, y: -20 }} 
                                animate={{ scale: 1, y: 0 }} 
                                exit={{ scale: 0.95, y: 20 }}
                            >
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-600/20 via-purple-500/20 to-cyan-400/20 blur-3xl"></div>
                                    <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-gradient-to-tr from-indigo-600/10 via-fuchsia-500/10 to-blue-400/10 blur-3xl"></div>
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-white">New Meeting Details</h2>
                                    <button 
                                        onClick={() => setIsNewMeetingOpen(false)} 
                                        className="text-slate-400 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <p className="text-slate-400 text-sm mb-4">Set up your meeting before starting</p>
                                
                                <div className="space-y-4">
                                    <input 
                                        value={newMeetingForm.meetingTitle} 
                                        onChange={(e) => setNewMeetingForm(v => ({...v, meetingTitle: e.target.value}))} 
                                        className="w-full bg-slate-900/60 border border-slate-700/70 rounded-lg py-2.5 px-3.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition" 
                                        placeholder="Meeting title (optional)" 
                                    />
                                    <input 
                                        value={newMeetingForm.meetingPurpose} 
                                        onChange={(e) => setNewMeetingForm(v => ({...v, meetingPurpose: e.target.value}))} 
                                        className="w-full bg-slate-900/60 border border-slate-700/70 rounded-lg py-2.5 px-3.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition" 
                                        placeholder="Purpose (optional)" 
                                    />
                                    <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-700/70 rounded-lg px-3 py-2.5">
                                        <div className="flex items-center gap-3">
                                            <Presentation className="text-slate-400" size={18} />
                                            <div>
                                                <span className="text-white text-sm font-medium">Webinar Mode</span>
                                                <p className="text-slate-400 text-xs">Only moderators can use meeting controls</p>
                                            </div>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={newMeetingForm.webinarMode || false} 
                                            onChange={(e) => setNewMeetingForm(v => ({...v, webinarMode: e.target.checked}))} 
                                            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2" 
                                        />
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-white">Meeting Options</h3>
                                        <div className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/60 rounded-lg px-3 py-2">
                                            <label className="text-slate-300 text-sm">Start with microphone on</label>
                                                                                            <input 
                                                    type="checkbox" 
                                                    checked={newMeetingForm.micEnabled} 
                                                    onChange={(e) => setNewMeetingForm(v => ({...v, micEnabled: e.target.checked}))} 
                                                    className="custom-checkbox"
                                                />
                                        </div>
                                        <div className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/60 rounded-lg px-3 py-2">
                                            <label className="text-slate-300 text-sm">Start with camera on</label>
                                                                                            <input 
                                                    type="checkbox" 
                                                    checked={newMeetingForm.cameraEnabled} 
                                                    onChange={(e) => setNewMeetingForm(v => ({...v, cameraEnabled: e.target.checked}))} 
                                                    className="custom-checkbox"
                                                />
                                        </div>
                                        <div className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/60 rounded-lg px-3 py-2">
                                            <label className="text-slate-300 text-sm">Enable waiting room</label>
                                                                                            <input 
                                                    type="checkbox" 
                                                    checked={newMeetingForm.waitingRoomEnabled} 
                                                    onChange={(e) => setNewMeetingForm(v => ({...v, waitingRoomEnabled: e.target.checked}))} 
                                                    className="custom-checkbox"
                                                />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button 
                                            onClick={() => setIsNewMeetingOpen(false)} 
                                            className="px-4 py-2 rounded-lg bg-slate-800/60 text-slate-200 border border-slate-700/60 hover:bg-slate-700/60"
                                        >
                                            Cancel
                                        </button>
                                        <ShineButton onClick={createInstantMeeting} className="px-6 py-2">
                                            <Video size={16} />
                                            Start Meeting
                                        </ShineButton>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Meeting Details Modal */}
                <AnimatePresence>
                    {isMeetingDetailsOpen && (
                        <motion.div 
                            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                        >
                            <motion.div 
                                className="relative bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-hide" 
                                initial={{ scale: 0.95, y: -20 }} 
                                animate={{ scale: 1, y: 0 }} 
                                exit={{ scale: 0.95, y: 20 }}
                            >
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-600/20 via-purple-500/20 to-cyan-400/20 blur-3xl"></div>
                                    <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-gradient-to-tr from-indigo-600/10 via-fuchsia-500/10 to-blue-400/10 blur-3xl"></div>
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                </div>
                                <div className="relative mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            {selectedMeetingType === 'past' ? (
                                                <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                                                    <Archive size={20} className="text-purple-400" />
                                                </div>
                                            ) : (
                                                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                                                    <CalendarPlus size={20} className="text-emerald-400" />
                                                </div>
                                            )}
                                            <div>
                                                <h2 className="text-xl font-bold text-white">
                                                    {selectedMeetingType === 'past' ? 'Past Meetings' : 'Scheduled Meetings'}
                                                </h2>
                                                <p className="text-sm text-slate-400">
                                                    {selectedMeetingType === 'past' ? 'Your meeting history' : 'Upcoming scheduled meetings'}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setIsMeetingDetailsOpen(false)} 
                                            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
                                </div>
                                
                                <div className="space-y-4 scrollbar-hide">
                                    {meetingsList.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="mx-auto w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center mb-4">
                                                {selectedMeetingType === 'past' ? (
                                                    <Archive size={24} className="text-slate-500" />
                                                ) : (
                                                    <Calendar size={24} className="text-slate-500" />
                                                )}
                                            </div>
                                            <h3 className="text-white font-medium mb-2">
                                                {selectedMeetingType === 'past' ? 'No past meetings' : 'No scheduled meetings'}
                                            </h3>
                                            <p className="text-slate-400 text-sm">
                                                {selectedMeetingType === 'past' 
                                                    ? 'Your completed meetings will appear here' 
                                                    : 'Schedule a meeting to see it here'
                                                }
                                            </p>
                                        </div>
                                    ) : (
                                        meetingsList.map((meeting, index) => (
                                            <motion.div 
                                                key={meeting.id} 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="group relative bg-slate-900/60 border border-slate-700/60 rounded-xl p-5 hover:bg-slate-800/70 hover:border-slate-600/60 transition-all duration-300"
                                            >
                                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                
                                                <div className="relative flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-start gap-3 mb-3">
                                                            <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                                                                <Video size={16} className="text-blue-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-white font-semibold text-lg leading-tight">{meeting.name}</h3>
                                                                {meeting.purpose && (
                                                                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{meeting.purpose}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/60 text-slate-300">
                                                                <Clock size={12} />
                                                                <span>Created: {new Date(meeting.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            {meeting.scheduled_for && (
                                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400">
                                                                    <Calendar size={12} />
                                                                    <span>Scheduled: {new Date(meeting.scheduled_for).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            {meeting.password && (
                                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/20 text-amber-400">
                                                                    <Shield size={12} />
                                                                    <span>Protected</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {selectedMeetingType === 'upcoming' && (
                                                        <motion.button
                                                            onClick={() => {
                                                                setIsMeetingDetailsOpen(false); // Auto-close meeting details modal
                                                                navigate(`/meeting/${meeting.id}`);
                                                            }}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className="ml-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg transition-all duration-300"
                                                        >
                                                            <Play size={14} />
                                                            Join
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Schedule Meeting Modal */}
                <AnimatePresence>
                    {isScheduleMeetingOpen && (
                        <motion.div 
                            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                        >
                            <motion.div 
                                className="relative bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" 
                                initial={{ scale: 0.95, y: -20 }} 
                                animate={{ scale: 1, y: 0 }} 
                                exit={{ scale: 0.95, y: 20 }}
                            >
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-600/20 via-cyan-500/20 to-blue-400/20 blur-3xl"></div>
                                    <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-600/10 via-emerald-500/10 to-cyan-400/10 blur-3xl"></div>
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                </div>
                                
                                <div className="relative mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                                                <CalendarPlus size={20} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Schedule Meeting</h2>
                                                <p className="text-sm text-slate-400">Plan your meeting for later</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setIsScheduleMeetingOpen(false)} 
                                            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Meeting Title</label>
                                            <input 
                                                value={scheduleForm.meetingTitle} 
                                                onChange={(e) => setScheduleForm(v => ({...v, meetingTitle: e.target.value}))} 
                                                className="w-full bg-slate-900/60 border border-slate-700/70 rounded-lg py-2.5 px-3.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition" 
                                                placeholder="Enter meeting title" 
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Purpose (Optional)</label>
                                            <input 
                                                value={scheduleForm.meetingPurpose} 
                                                onChange={(e) => setScheduleForm(v => ({...v, meetingPurpose: e.target.value}))} 
                                                className="w-full bg-slate-900/60 border border-slate-700/70 rounded-lg py-2.5 px-3.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition" 
                                                placeholder="What's this meeting about?" 
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                                                <button 
                                                    onClick={() => setShowScheduleCalendar(true)}
                                                    className="w-full text-left bg-slate-900/60 border border-slate-700/70 rounded-lg py-2.5 px-3.5 text-white hover:bg-slate-800/60"
                                                >
                                                    {scheduleForm.scheduleDate ? new Date(scheduleForm.scheduleDate).toLocaleDateString() : 'Pick a date'}
                                                </button>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Time</label>
                                                <button 
                                                    onClick={() => setShowScheduleTime(true)}
                                                    className="w-full text-left bg-slate-900/60 border border-slate-700/70 rounded-lg py-2.5 px-3.5 text-white hover:bg-slate-800/60"
                                                >
                                                    {scheduleForm.scheduleTime ? scheduleForm.scheduleTime : 'Pick a time'}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-700/70 rounded-lg px-3 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <Presentation className="text-slate-400" size={18} />
                                                <div>
                                                    <span className="text-white text-sm font-medium">Webinar Mode</span>
                                                    <p className="text-slate-400 text-xs">Only moderators can use meeting controls</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={scheduleForm.webinarMode || false} 
                                                onChange={(e) => setScheduleForm(v => ({...v, webinarMode: e.target.checked}))} 
                                                className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2" 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-white">Meeting Options</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/60 rounded-lg px-3 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 rounded-md bg-blue-500/20">
                                                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-slate-300 text-sm">Start with microphone on</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={scheduleForm.micEnabled} 
                                                    onChange={(e) => setScheduleForm(v => ({...v, micEnabled: e.target.checked}))} 
                                                    className="custom-checkbox custom-checkbox-emerald"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/60 rounded-lg px-3 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 rounded-md bg-purple-500/20">
                                                        <Video size={16} className="text-purple-400" />
                                                    </div>
                                                    <span className="text-slate-300 text-sm">Start with camera on</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={scheduleForm.cameraEnabled} 
                                                    onChange={(e) => setScheduleForm(v => ({...v, cameraEnabled: e.target.checked}))} 
                                                    className="custom-checkbox custom-checkbox-emerald"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/60 rounded-lg px-3 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 rounded-md bg-amber-500/20">
                                                        <Shield size={16} className="text-amber-400" />
                                                    </div>
                                                    <span className="text-slate-300 text-sm">Enable waiting room</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={scheduleForm.waitingRoomEnabled} 
                                                    onChange={(e) => setScheduleForm(v => ({...v, waitingRoomEnabled: e.target.checked}))} 
                                                    className="custom-checkbox custom-checkbox-emerald"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button 
                                            onClick={() => setIsScheduleMeetingOpen(false)} 
                                            className="px-4 py-2 rounded-lg bg-slate-800/60 text-slate-200 border border-slate-700/60 hover:bg-slate-700/60 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <motion.button
                                            onClick={async () => {
                                                if (!currentUser) { alert('You must be logged in.'); return; }
                                                if (!scheduleForm.meetingTitle || !scheduleForm.scheduleDate || !scheduleForm.scheduleTime) {
                                                    alert('Please complete all required fields.');
                                                    return;
                                                }
                                                try {
                                                    const scheduledDate = new Date(`${scheduleForm.scheduleDate}T${scheduleForm.scheduleTime}`);
                                                    const hostToken = uuidv4();
                                                    
                                                    // Prepare scheduled meeting data with fallback
                                                    const scheduledMeetingData = {
                                                        name: scheduleForm.meetingTitle,
                                                        purpose: scheduleForm.meetingPurpose || null,
                                                        is_scheduled: true,
                                                        scheduled_for: scheduledDate.toISOString(),
                                                        host_name: userName,
                                                        start_with_audio_muted: !scheduleForm.micEnabled,
                                                        start_with_video_muted: !scheduleForm.cameraEnabled,
                                                        prejoin_page_enabled: scheduleForm.waitingRoomEnabled || false,
                                                        created_by: currentUser.id,
                                                        host_token: hostToken,
                                                    };

                                                    // Add webinar_mode if enabled (graceful fallback)
                                                    if (scheduleForm.webinarMode) {
                                                        scheduledMeetingData.webinar_mode = true;
                                                    }

                                                    const { data, error } = await supabase.from('meetings')
                                                        .insert([scheduledMeetingData])
                                                        .select('id')
                                                        .single();
                                                    
                                                    if (error) throw error;
                                                    localStorage.setItem(`hostToken_${data.id}`, hostToken);
                                                    
                                                    // Reset form and close modal
                                                    setScheduleForm({
                                                        meetingTitle: '',
                                                        meetingPurpose: '',
                                                        meetingPassword: '',
                                                        scheduleDate: '',
                                                        scheduleTime: '',
                                                        micEnabled: true,
                                                        cameraEnabled: true,
                                                        waitingRoomEnabled: false,
                                                    });
                                                    setIsScheduleMeetingOpen(false);
                                                    
                                                    // Refresh stats
                                                    setTimeout(() => {
                                                        refreshStats();
                                                    }, 1000);
                                                    // Toast success
                                                    setGlobalToast({ id: Date.now(), title: 'Meeting scheduled', message: `Meeting ID: ${data.id}`, type: 'success', duration: 2000 });
                                                } catch (e) {
                                                    console.error('Failed to schedule meeting', e);
                                                    setGlobalToast({ id: Date.now(), title: 'Failed to schedule', message: 'Please try again.', type: 'error', duration: 2000 });
                                                }
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium shadow-lg transition-all duration-300"
                                        >
                                            <CalendarPlus size={16} />
                                            Schedule Meeting
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Schedule Calendar Popover */}
                <AnimatePresence>
                    {isScheduleMeetingOpen && showScheduleCalendar && (
                        <motion.div 
                            className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setShowScheduleCalendar(false)}
                        >
                            <div onClick={(e) => e.stopPropagation()}>
                                <CalendarPopover
                                    initialDate={scheduleForm.scheduleDate ? new Date(scheduleForm.scheduleDate) : null}
                                    onSelect={(d) => setScheduleForm(v => ({ ...v, scheduleDate: d.toISOString().split('T')[0] }))}
                                    onClose={() => setShowScheduleCalendar(false)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Schedule Time Popover */}
                <AnimatePresence>
                    {isScheduleMeetingOpen && showScheduleTime && (
                        <motion.div 
                            className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setShowScheduleTime(false)}
                        >
                            <div onClick={(e) => e.stopPropagation()}>
                                <TimePopover
                                    initialTime={scheduleForm.scheduleTime || null}
                                    onSelect={(t) => setScheduleForm(v => ({ ...v, scheduleTime: t }))}
                                    onClose={() => setShowScheduleTime(false)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default HomePage;
 