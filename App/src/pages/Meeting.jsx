import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    VideoIcon, Mail, Calendar, Clock, Video, X, Share2, Copy, Check,
    Users, Film, MessageSquare, ArrowLeft, User as UserIcon, KeyRound, ChevronLeft, ChevronRight,
    Mic, MicOff, VideoOff, Settings as SettingsIcon, Hand, MonitorUp, PhoneOff,
    Presentation, Timer, HardDriveDownload, CalendarClock, MoreHorizontal, FileText, CalendarDays
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';


import { InfoPanel } from '../components/InfoPanel';
import Toast from "../components/Toast";
import JitsiMeet from '../components/JitsiMeet';
import { createAdminJwt } from '../utils/jwt';
import { supabase } from '../supabase';

// Debug mode for testing (set to true for detailed logging)
const DEBUG_MODE = false;

// Utility function to validate and parse meeting URLs
const validateMeetingAccess = (meetingId, currentPath) => {
    // Basic meetingId validation
    if (!meetingId || typeof meetingId !== 'string') {
        return { isValid: false, error: 'Invalid meeting ID' };
    }
    
    // Remove any extra whitespace or special characters
    const cleanMeetingId = meetingId.trim();
    
    if (cleanMeetingId.length < 1) {
        return { isValid: false, error: 'Meeting ID cannot be empty' };
    }
    
    // Check if it's a valid UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanMeetingId)) {
        console.warn('[Meeting] Non-UUID meeting ID detected:', cleanMeetingId);
        // Allow non-UUID IDs but log warning
    }
    
    // Validate current path structure
    const isWebinarPath = currentPath.includes('/meeting/webinar/');
    const isRegularPath = currentPath.includes('/meeting/') && !isWebinarPath;
    
    if (!isWebinarPath && !isRegularPath) {
        return { isValid: false, error: 'Invalid meeting URL structure' };
    }
    
    return { 
        isValid: true, 
        cleanMeetingId, 
        isWebinar: isWebinarPath,
        urlType: isWebinarPath ? 'webinar' : 'regular'
    };
};


const LoadingScreen = () => {
    return (
        <motion.div 
            className="absolute inset-0 bg-slate-900/95 flex justify-center items-center z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="flex flex-col items-center gap-6">
                {/* Enhanced loading spinner */}
                <div className="relative">
                <motion.div
                    animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 rounded-full border-4 border-slate-700/30"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-2 w-12 h-12 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-sm"
                    />
            </div>
                
                {/* Animated loading text */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                >
                    <motion.p 
                        className="text-lg text-slate-300 font-medium mb-2"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        Loading meeting...
                    </motion.p>
                    <p className="text-sm text-slate-500">Preparing your conference room</p>
                </motion.div>
                
                {/* Progress dots */}
                <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 bg-blue-500 rounded-full"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 1, 0.3],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
        </div>
            </div>
        </motion.div>
    );
};

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

const AnimatedBackground = () => {
    const numDots = 50;
    const dots = Array.from({ length: numDots }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
        scale: 0.3 + Math.random() * 0.7,
    }));

    return (
        <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden">
            {/* Animated Dots */}
            {dots.map((dot) => (
                <motion.div
                    key={dot.id}
                    className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
                    style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                    animate={{
                        opacity: [0.1, 0.8, 0.1],
                        scale: [dot.scale * 0.5, dot.scale, dot.scale * 0.5],
                    }}
                    transition={{
                        duration: dot.duration,
                        delay: dot.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
            
            {/* Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1"/>
                    </pattern>
                    <radialGradient id="fadeGrid" cx="50%" cy="50%" r="70%">
                        <stop offset="0%" style={{ stopColor: "white", stopOpacity: 0.1 }} />
                        <stop offset="100%" style={{ stopColor: "white", stopOpacity: 0 }} />
                    </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" mask="url(#fadeGrid)" />
            </svg>

            {/* Floating Orbs */}
            <motion.div 
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-purple-500/15 to-cyan-500/10 rounded-full filter blur-3xl" 
                animate={{ 
                    x: [0, 100, -50, 0], 
                    y: [0, -80, 60, 0],
                    scale: [1, 1.2, 0.8, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
                className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-purple-500/10 via-pink-500/15 to-blue-500/10 rounded-full filter blur-3xl" 
                animate={{ 
                    x: [0, -120, 80, 0], 
                    y: [0, 70, -90, 0],
                    scale: [0.8, 1.1, 0.9, 0.8],
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
            
            {/* Scanning Line Effect */}
            <motion.div
                className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
                animate={{ y: ["-100vh", "100vh"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
};

const ShareModal = ({ meetingLink, onClose, onStart }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(meetingLink).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
        });
    };
    
    return (
        <motion.div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
        >
            <motion.div 
                className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center overflow-hidden"
                initial={{ scale: 0.8, y: -50, opacity: 0 }} 
                animate={{ scale: 1, y: 0, opacity: 1 }} 
                exit={{ scale: 0.8, y: 50, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
                {/* Decorative Elements removed for cleaner look */}
                
                <div className="flex justify-end mb-4">
                    <motion.button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700/50"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <X size={20} />
                    </motion.button>
                </div>
                
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", damping: 15 }}
                >
                    <div className="relative">
                        <Share2 className="mx-auto text-blue-400 mb-4" size={48} />
                        <motion.div
                            className="absolute -inset-4 rounded-full bg-blue-400/20"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                </div>
                </motion.div>
                
                <motion.h2 
                    className="text-2xl font-bold text-white mb-2"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    🎉 Meeting Ready!
                </motion.h2>
                <motion.p 
                    className="text-slate-400 mb-6"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    Share this link with your invitees to get started.
                </motion.p>
                
                <motion.div 
                    className="flex items-center bg-slate-800/50 border border-slate-600/50 rounded-xl p-3 mb-6 group hover:border-slate-500/70 transition-colors"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <input 
                        type="text" 
                        readOnly 
                        value={meetingLink} 
                        className="flex-grow bg-transparent text-slate-200 text-sm outline-none px-2 select-all" 
                    />
                    <motion.button 
                        onClick={handleCopy} 
                        className={`
                            flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                            ${isCopied 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-lg'
                            }
                        `}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isCopied ? (
                            <><Check size={16}/> Copied!</>
                        ) : (
                            <><Copy size={16}/> Copy</>
                        )}
                    </motion.button>
                </motion.div>
                
                <motion.div 
                    className="flex items-center justify-center gap-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <ShineButton onClick={onStart} className="px-6 py-3">
                        <Video size={18} />
                        Start Now
                    </ShineButton>
                    <motion.a 
                        href={`mailto:?subject=Invitation to join meeting&body=Join my meeting with this link: ${meetingLink}`} 
                        className="flex items-center gap-2 text-sm text-slate-300 bg-slate-700/50 hover:bg-slate-700 transition-all duration-300 px-4 py-3 rounded-xl border border-slate-600/50 hover:border-slate-500/70"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Mail size={16} />
                        Email
                    </motion.a>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

const CustomCalendar = ({ selectedDate, setSelectedDate, close }) => {
    const [date, setDate] = useState(selectedDate || new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
    const handlePrevMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
    const handleNextMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    const handleSelectDate = (day) => {
        const newDate = new Date(date.getFullYear(), date.getMonth(), day);
        if (newDate < today) return;
        setSelectedDate(newDate);
        close();
    };

    const month = date.getMonth();
    const year = date.getFullYear();
    const numDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);

    return (
        <motion.div
            className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-sm overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: -20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
        >
            {/* Header gradient removed for consistency */}
            {/* Calendar Header */}
            <motion.div 
                className="flex justify-between items-center mb-6"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <motion.button 
                    onClick={handlePrevMonth} 
                    className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <ChevronLeft size={20} />
                </motion.button>
                
                <div className="text-center">
                    <h3 className="text-xl font-bold text-white">
                        {date.toLocaleString('default', { month: 'long' })}
                    </h3>
                    <p className="text-sm text-slate-400">{year}</p>
            </div>
                
                <motion.button 
                    onClick={handleNextMonth} 
                    className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <ChevronRight size={20} />
                </motion.button>
            </motion.div>
            {/* Day labels */}
            <motion.div 
                className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-slate-400 mb-4"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-2">{d}</div>
                ))}
            </motion.div>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month start */}
                {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10"></div>
                ))}
                
                {/* Days of the month */}
                {Array.from({ length: numDays }).map((_, i) => {
                    const day = i + 1;
                    const currentDate = new Date(year, month, day);
                    const isPast = currentDate < today;
                    const isToday = today.getTime() === currentDate.getTime();
                    const isSelected = selectedDate && selectedDate.getTime() === currentDate.getTime();
                    
                    return (
                        <motion.button
                            key={day}
                            onClick={() => handleSelectDate(day)}
                            disabled={isPast}
                            className={`
                                relative h-10 w-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200
                                ${isSelected 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                    : ''
                                }
                                ${!isSelected && isToday 
                                    ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300' 
                                    : ''
                                }
                                ${!isSelected && !isToday && !isPast 
                                    ? 'text-slate-200 hover:bg-slate-700/50 hover:text-white' 
                                    : ''
                                }
                                ${isPast 
                                    ? 'text-slate-600 cursor-not-allowed opacity-50' 
                                    : ''
                                }
                            `}
                            whileHover={!isPast ? { scale: 1.05 } : {}}
                            whileTap={!isPast ? { scale: 0.95 } : {}}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.03 * day, type: "spring", damping: 20 }}
                        >
                            {day}
                            
                            {/* Selected indicator */}
                            {isSelected && (
                                <motion.div
                                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/30 to-purple-400/30"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 15 }}
                                />
                            )}
                            
                            {/* Today indicator */}
                            {isToday && !isSelected && (
                                <motion.div
                                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Footer */}
            <motion.div 
                className="mt-6 pt-4 border-t border-slate-700/50"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Select a date</span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        Today
                    </span>
                </div>
            </motion.div>
        </motion.div>
    );
};

const CustomTimePicker = ({ selectedTime, setSelectedTime, close }) => {
    const [hour, setHour] = useState(selectedTime ? selectedTime.getHours() % 12 === 0 ? 12 : selectedTime.getHours() % 12 : 12);
    const [minute, setMinute] = useState(selectedTime ? selectedTime.getMinutes() : 0);
    const [period, setPeriod] = useState(selectedTime ? (selectedTime.getHours() >= 12 ? 'PM' : 'AM') : 'PM');

    const handleSave = () => {
        let finalHour = hour;
        if (period === 'PM' && hour < 12) finalHour += 12;
        if (period === 'AM' && hour === 12) finalHour = 0;

        const newTime = new Date();
        newTime.setHours(finalHour, minute);
        setSelectedTime(newTime);
        close();
    };

    return (
        <motion.div
            className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-sm overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: -20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
        >
            {/* Header gradient removed for consistency */}
            
            {/* Header */}
            <motion.div 
                className="text-center mb-6"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className="text-2xl font-bold text-white mb-1">Select Time</h3>
                <p className="text-sm text-slate-400">Choose your preferred meeting time</p>
            </motion.div>

            {/* Time Display */}
            <motion.div 
                className="flex items-center justify-center gap-3 mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 15 }}
            >
                {/* Hour Input */}
                <div className="relative group">
                    <input 
                        type="number" 
                        min="1" 
                        max="12" 
                        value={hour} 
                        onChange={e => setHour(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))} 
                        className="w-20 h-16 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 text-center rounded-2xl text-3xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:bg-slate-800/70" 
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>

                {/* Separator */}
                <motion.span 
                    className="text-4xl font-bold text-slate-400"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    :
                </motion.span>

                {/* Minute Input */}
                <div className="relative group">
                    <input 
                        type="number" 
                        min="0" 
                        max="59" 
                        step="1" 
                        value={String(minute).padStart(2, '0')} 
                        onChange={e => setMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} 
                        className="w-20 h-16 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 text-center rounded-2xl text-3xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:bg-slate-800/70" 
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>

                {/* AM/PM Toggle */}
                <div className="flex flex-col gap-2 ml-2">
                    <motion.button 
                        onClick={() => setPeriod('AM')} 
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                            period === 'AM' 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        AM
                    </motion.button>
                    <motion.button 
                        onClick={() => setPeriod('PM')} 
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                            period === 'PM' 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        PM
                    </motion.button>
                </div>
            </motion.div>

            {/* Footer */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <ShineButton onClick={handleSave} className="w-full">
                    <Clock size={18} />
                    Set Time
                </ShineButton>
            </motion.div>
        </motion.div>
    );
};

const SettingsModal = ({ formValues, handleInputChange, close }) => (
    <motion.div
        className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-sm border border-slate-700"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
    >
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Advanced Settings</h3>
            <button onClick={close} className="p-1 rounded-full hover:bg-slate-700"><X size={20} /></button>
        </div>
        <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                    <Users className="text-slate-400" size={18} />
                    <span className="text-slate-300 text-sm font-medium">Enable waiting room</span>
                </div>
                <button onClick={() => handleInputChange({ target: { name: 'waitingRoomEnabled', value: !formValues.waitingRoomEnabled } })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formValues.waitingRoomEnabled ? 'bg-blue-500' : 'bg-slate-600'}`}>
                    <motion.span animate={{ x: formValues.waitingRoomEnabled ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }} className="inline-block h-5 w-5 transform rounded-full bg-white" />
                </button>
            </div>
        </div>
    </motion.div>
);

const MeetingDetailsForm = ({
    isScheduling, onSubmit, setView, formValues,
    handleInputChange, handleDateChange, isLoading
}) => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
        <motion.form
            key={isScheduling ? "schedule-form" : "start-form"}
            onSubmit={onSubmit}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-col h-full"
        >
            <motion.div 
                className="relative flex justify-between items-center mb-4 shrink-0 p-3 sm:p-4 bg-gradient-to-r from-slate-800/80 via-slate-700/80 to-slate-800/80 backdrop-blur-xl rounded-xl border border-slate-700/50"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                {/* Header gradient removed for consistency */}
                
                <div className="flex items-center gap-4">
                    <motion.button 
                        type="button" 
                        onClick={() => setView('initial')} 
                        className="p-3 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200 border border-slate-600/50 hover:border-slate-500/50"
                        whileHover={{ scale: 1.05, x: -2 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ArrowLeft size={20}/>
                    </motion.button>
                    <div className="flex items-center gap-4">
                        <motion.div
                            className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", damping: 15 }}
                        >
                            {isScheduling ? (
                                <Calendar className="text-blue-400" size={24} />
                            ) : (
                                <Video className="text-blue-400" size={24} />
                            )}
                        </motion.div>
                    <div>
                            <motion.h2 
                                className="text-xl sm:text-2xl font-bold text-transparent bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {isScheduling ? 'Schedule a Meeting' : 'Start an Instant Meeting'}
                            </motion.h2>
                            <motion.p 
                                className="text-slate-400 text-xs sm:text-sm font-medium"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                {isScheduling 
                                    ? 'Set up your meeting for later and invite participants' 
                                    : 'Create and start your meeting right now'
                                }
                            </motion.p>
                    </div>
                </div>
            </div>
            
                {/* Status indicator */}
                <motion.div 
                    className="flex items-center gap-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-500 font-medium">READY</span>
                </motion.div>
            </motion.div>
            
            <div className="space-y-3 sm:space-y-4 flex-grow overflow-y-auto pr-2 px-1 thin-scrollbar">
                <motion.div 
                    className="relative group"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" size={18} />
                    <input 
                        type="text" 
                        name="userName" 
                        placeholder="Your Name*" 
                        value={formValues.userName} 
                        onChange={handleInputChange} 
                        required 
                        className="w-full bg-slate-800/30 backdrop-blur-sm border border-slate-600/50 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:bg-slate-800/50" 
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </motion.div>
                
                <motion.div 
                    className="relative group"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <VideoIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" size={18} />
                    <input 
                        type="text" 
                        name="meetingTitle" 
                        placeholder="Meeting Title*" 
                        value={formValues.meetingTitle} 
                        onChange={handleInputChange} 
                        required 
                        className="w-full bg-slate-800/30 backdrop-blur-sm border border-slate-600/50 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:bg-slate-800/50" 
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </motion.div>
                
                <motion.div 
                    className="relative group"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <MessageSquare className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" size={18} />
                    <textarea 
                        name="meetingPurpose" 
                        placeholder="Meeting Purpose (Optional)" 
                        value={formValues.meetingPurpose} 
                        onChange={handleInputChange} 
                        rows="2" 
                        className="w-full bg-slate-800/30 backdrop-blur-sm border border-slate-600/50 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none transition-all duration-300 hover:bg-slate-800/50" 
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </motion.div>
                
                <motion.div 
                    className="relative group"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex items-center justify-between p-4 bg-slate-800/30 backdrop-blur-sm border border-slate-600/50 rounded-xl hover:bg-slate-800/50 transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <Presentation className="text-slate-400 group-hover:text-blue-400 transition-colors" size={18} />
                            <div>
                                <span className="text-white text-sm font-medium">Webinar Mode</span>
                                <p className="text-slate-400 text-xs">Only moderators can use meeting controls</p>
                            </div>
                        </div>
                        <motion.button 
                            type="button"
                            onClick={() => handleInputChange({ target: { name: 'webinarMode', value: !formValues.webinarMode } })} 
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formValues.webinarMode ? 'bg-blue-500' : 'bg-slate-600'}`}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.span 
                                animate={{ x: formValues.webinarMode ? 22 : 2 }} 
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }} 
                                className="inline-block h-5 w-5 transform rounded-full bg-white shadow-lg" 
                            />
                        </motion.button>
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </motion.div>
                {isScheduling && (
                    <motion.div 
                        className="grid sm:grid-cols-2 gap-3 sm:gap-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <motion.div className="relative group">
                            <motion.button 
                                type="button" 
                                onClick={() => setIsCalendarOpen(true)} 
                                className="w-full flex items-center justify-between bg-slate-800/30 backdrop-blur-sm border border-slate-600/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:border-blue-500/50 transition-all duration-300 hover:bg-slate-800/50 group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-slate-400 group-hover:text-blue-400 transition-colors" size={18} />
                                    <span className="font-medium text-left">
                                        {formValues.scheduleDate ? formValues.scheduleDate.toLocaleDateString() : 'Select Date'}
                                    </span>
                                </div>
                                <ChevronRight className="text-slate-500 group-hover:text-blue-400 transition-colors" size={16} />
                            </motion.button>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </motion.div>
                        
                        <motion.div className="relative group">
                            <motion.button 
                                type="button" 
                                onClick={() => setIsTimePickerOpen(true)} 
                                className="w-full flex items-center justify-between bg-slate-800/30 backdrop-blur-sm border border-slate-600/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:border-blue-500/50 transition-all duration-300 hover:bg-slate-800/50 group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center gap-3">
                                    <Clock className="text-slate-400 group-hover:text-blue-400 transition-colors" size={18} />
                                    <span className="font-medium text-left">
                                        {formValues.scheduleTime ? formValues.scheduleTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Select Time'}
                                    </span>
                                </div>
                                <ChevronRight className="text-slate-500 group-hover:text-blue-400 transition-colors" size={16} />
                            </motion.button>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </motion.div>
                    </motion.div>
                )}
            </div>
            <motion.div 
                className="pt-3 mt-auto shrink-0"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                {/* Meeting Options */}
                <div className="bg-gradient-to-r from-slate-800/40 via-slate-700/40 to-slate-800/40 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-slate-700/50 mb-4 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <motion.div 
                                className="p-2 bg-slate-700/50 rounded-lg"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.7, type: "spring", damping: 15 }}
                            >
                                <SettingsIcon className="text-blue-400" size={16} />
                            </motion.div>
                            <div>
                                <span className="text-sm font-semibold text-slate-100">Meeting Options</span>
                                <p className="text-xs text-slate-400 hidden sm:block">Configure audio, video and settings</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Microphone Toggle */}
                            <motion.div className="flex flex-col items-center gap-1">
                                <motion.button 
                                    type="button" 
                                    onClick={() => handleInputChange({ target: { name: 'micEnabled', value: !formValues.micEnabled } })} 
                                    className={`
                                        relative p-2.5 rounded-lg transition-all duration-300 border backdrop-blur-sm
                                        ${formValues.micEnabled 
                                            ? 'bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30 shadow-md shadow-green-500/20' 
                                            : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 shadow-md shadow-red-500/20'
                                        }
                                    `}
                                    title={formValues.micEnabled ? 'Microphone On' : 'Microphone Off'}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    {formValues.micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                                    <motion.div 
                                        className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${formValues.micEnabled ? 'bg-green-400' : 'bg-red-400'}`}
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                </motion.button>
                                <span className="text-xs text-slate-500 font-medium">
                                    {formValues.micEnabled ? 'ON' : 'OFF'}
                                </span>
                            </motion.div>
                            
                            {/* Camera Toggle */}
                            <motion.div className="flex flex-col items-center gap-1">
                                <motion.button 
                                    type="button" 
                                    onClick={() => handleInputChange({ target: { name: 'cameraEnabled', value: !formValues.cameraEnabled } })} 
                                    className={`
                                        relative p-2.5 rounded-lg transition-all duration-300 border backdrop-blur-sm
                                        ${formValues.cameraEnabled 
                                            ? 'bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30 shadow-md shadow-green-500/20' 
                                            : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 shadow-md shadow-red-500/20'
                                        }
                                    `}
                                    title={formValues.cameraEnabled ? 'Camera On' : 'Camera Off'}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.9 }}
                                >
                                    {formValues.cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                                    <motion.div 
                                        className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${formValues.cameraEnabled ? 'bg-green-400' : 'bg-red-400'}`}
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                    />
                                </motion.button>
                                <span className="text-xs text-slate-500 font-medium">
                                    {formValues.cameraEnabled ? 'ON' : 'OFF'}
                                </span>
                            </motion.div>
                        </div>
                    </div>
                </div>
                
                {/* Submit Button */}
                <motion.div 
                    className="flex justify-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.1 }}
                >
                    <ShineButton 
                        type="submit" 
                        disabled={isLoading}
                        className="px-6 sm:px-10 py-3 text-sm sm:text-base font-bold min-w-[180px] shadow-xl"
                    >
                        {isLoading ? (
                            <motion.div 
                                className="flex items-center gap-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <motion.div 
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                <span>Processing...</span>
                                <motion.div
                                    className="flex gap-1"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <motion.div className="w-1 h-1 bg-white/50 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                                    <motion.div className="w-1 h-1 bg-white/50 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                                    <motion.div className="w-1 h-1 bg-white/50 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                className="flex items-center gap-3"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                >
                                    {isScheduling ? <Calendar size={20} /> : <Video size={20} />}
                                </motion.div>
                                <span>{isScheduling ? 'Schedule Meeting' : 'Create & Start'}</span>
                                <motion.div 
                                    className="w-2 h-2 bg-white/70 rounded-full"
                                    animate={{ 
                                        scale: [1, 1.3, 1],
                                        opacity: [0.7, 1, 0.7]
                                    }}
                                    transition={{ 
                                        duration: 2, 
                                        repeat: Infinity, 
                                        ease: "easeInOut"
                                    }}
                                />
                            </motion.div>
                        )}
                    </ShineButton>
                </motion.div>
            </motion.div>
        </motion.form>

        {/* Move modals outside form to prevent form submission issues */}
        <AnimatePresence>
            {(isCalendarOpen || isTimePickerOpen || isSettingsOpen) && (
                <motion.div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-center p-4" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => { setIsCalendarOpen(false); setIsTimePickerOpen(false); setIsSettingsOpen(false); }}
                >
                    {isCalendarOpen && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <CustomCalendar 
                                selectedDate={formValues.scheduleDate} 
                                setSelectedDate={(date) => handleDateChange({target: {name: 'scheduleDate', value: date}})} 
                                close={() => setIsCalendarOpen(false)} 
                            />
                        </div>
                    )}
                    {isTimePickerOpen && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <CustomTimePicker 
                                selectedTime={formValues.scheduleTime} 
                                setSelectedTime={(time) => handleDateChange({target: {name: 'scheduleTime', value: time}})} 
                                close={() => setIsTimePickerOpen(false)} 
                            />
                        </div>
                    )}
                    {isSettingsOpen && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <SettingsModal 
                                formValues={formValues} 
                                handleInputChange={handleInputChange} 
                                close={() => setIsSettingsOpen(false)} 
                            />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    </>
    );
};

const CreateMeeting = ({ onSubmit, isLoading, initialUserName, navigate }) => {
    const [view, setView] = useState('initial');
    const [formValues, setFormValues] = useState({
        userName: initialUserName || '', meetingTitle: '', meetingPurpose: '', 
        scheduleDate: null, scheduleTime: null, micEnabled: true, cameraEnabled: true,
        // --- FIXED: Default waiting room is now false ---
        waitingRoomEnabled: false, 
        webinarMode: false,
    });
    const [joinCode, setJoinCode] = useState('');

    const handleInputChange = (e) => setFormValues(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleDateChange = (e) => setFormValues(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const isScheduling = view === 'schedule';
        const finalDateTime = (isScheduling && formValues.scheduleDate && formValues.scheduleTime) ? new Date( formValues.scheduleDate.getFullYear(), formValues.scheduleDate.getMonth(), formValues.scheduleDate.getDate(), formValues.scheduleTime.getHours(), formValues.scheduleTime.getMinutes() ) : null;
        const formData = {
            name: formValues.meetingTitle || (isScheduling ? 'Scheduled Meeting' : 'Instant Meeting'), purpose: formValues.meetingPurpose,
            webinarMode: formValues.webinarMode, isScheduled: isScheduling, scheduledFor: finalDateTime, hostName: formValues.userName,
            startWithAudioMuted: !formValues.micEnabled, startWithVideoMuted: !formValues.cameraEnabled, 
            prejoinPageEnabled: formValues.waitingRoomEnabled,
        };
        onSubmit(formData, isScheduling ? 'later' : 'now');
    };
    
    const handleJoinWithCode = () => {
        if (!joinCode.trim()) return;
        navigate(`/meeting/${joinCode.trim()}`);
    }

    return (
        <div
            className="p-4 sm:p-6 lg:p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-700/40 h-full flex flex-col justify-center rounded-2xl shadow-2xl relative overflow-hidden"
            style={{ backgroundImage: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.1), transparent 60%)' }}
        >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-cyan-500/50" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
            <AnimatePresence mode="wait">
                {view === 'initial' && (
                    <motion.div
                        key="initial-view"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-full text-center"
                    >
                        <motion.h2 
                            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2"
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            Start or Join a Meeting
                        </motion.h2>
                        <motion.p 
                            className="text-slate-400 text-sm sm:text-base mt-2 mb-6 sm:mb-8 max-w-xs sm:max-w-md lg:max-w-lg mx-auto px-2"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            Create a new meeting instantly, schedule one for later, or join using a code.
                        </motion.p>

                        <motion.div 
                            className="w-full max-w-xs sm:max-w-sm lg:max-w-md px-4 sm:px-0"
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <motion.div
                                className="group relative p-[2px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <button
                                    onClick={() => setView('startNow')}
                                    className="relative flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 lg:p-8 rounded-2xl bg-slate-900 text-white font-semibold transition-all duration-300 hover:bg-slate-800/80 w-full"
                                >
                                    <motion.div
                                        className="relative"
                                        whileHover={{ scale: 1.1 }}
                                        transition={{ type: "spring", damping: 15 }}
                                    >
                                        <Video size={24} className="text-blue-400 sm:w-8 sm:h-8 lg:w-8 lg:h-8" />
                                        <motion.div
                                            className="absolute -inset-2 rounded-full bg-blue-400/20"
                                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    </motion.div>
                                    <span className="text-base sm:text-lg lg:text-xl font-semibold">New Meeting</span>
                                    <span className="text-xs sm:text-sm text-slate-400">Start an instant meeting now</span>
                                </button>
                            </motion.div>
                        </motion.div>
                        
                        <motion.div 
                            className="w-full max-w-xs sm:max-w-sm lg:max-w-md my-6 sm:my-8 px-4 sm:px-0"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: "spring", damping: 20 }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-slate-600"></div>
                                <span className="text-slate-500 text-sm font-medium">OR</span>
                                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-600 to-slate-600"></div>
                        </div>
                        </motion.div>

                        <motion.div 
                            className="w-full max-w-xs sm:max-w-sm lg:max-w-md mx-auto px-4 sm:px-0"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <label className="text-xs sm:text-sm font-medium text-slate-300 block text-left mb-2 sm:mb-3">Join with a meeting code</label>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <div className="relative flex-grow group">
                                    <KeyRound size={16} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors sm:w-[18px] sm:h-[18px]"/>
                                    <motion.input 
                                        type="text" 
                                        value={joinCode} 
                                        onChange={(e) => setJoinCode(e.target.value)} 
                                        placeholder="Enter meeting code"
                                        className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl py-3 sm:py-4 pl-10 sm:pl-12 pr-3 sm:pr-4 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                                        whileFocus={{ scale: 1.02 }}
                                        transition={{ type: "spring", damping: 25 }}
                                    />
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                </div>
                                <motion.button 
                                    onClick={handleJoinWithCode} 
                                    disabled={!joinCode.trim()}
                                    className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 disabled:from-slate-800 disabled:to-slate-700 text-white text-sm sm:text-base font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-500/20"
                                    whileHover={{ scale: joinCode.trim() ? 1.05 : 1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Join
                                </motion.button>
                            </div>
                        </motion.div>

                    </motion.div>
                )}
                {(view === 'startNow' || view === 'schedule') && (
                    <MeetingDetailsForm
                        isScheduling={view === 'schedule'} onSubmit={handleFormSubmit} setView={setView}
                        formValues={formValues} handleInputChange={handleInputChange} handleDateChange={handleDateChange}
                        isLoading={isLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};


const MeetingPage = () => {
    const { meetingId } = useParams();
    const navigate = useNavigate();
    const role = (localStorage.getItem('role') || '').toLowerCase();
    
    // Detect webinar mode from URL path
    const isWebinarMode = window.location.pathname.includes('/meeting/webinar/');

    const [isPageLoading, setIsPageLoading] = useState(!!meetingId);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeToast, setActiveToast] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [newMeetingLink, setNewMeetingLink] = useState('');
    const [activeMeeting, setActiveMeeting] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [userName, setUserName] = useState('');
    const [jitsiApi, setJitsiApi] = useState(null);
    const dashboardContainerRef = useRef(null);
    const [isJitsiLoading, setIsJitsiLoading] = useState(false);
    const [canJoinMeeting, setCanJoinMeeting] = useState(false);
    const [isWaitingForHost, setIsWaitingForHost] = useState(false);
    const [whiteboardOpen, setWhiteboardOpen] = useState(false);
    const [adminIds, setAdminIds] = useState([]);
    const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
    const [adminDisplayNames, setAdminDisplayNames] = useState([]);
    const [isCurrentAdmin, setIsCurrentAdmin] = useState(false);
    const prevIsAdminRef = useRef(false);
    const [adminJwt, setAdminJwt] = useState(undefined);
    const [roleEventTick, setRoleEventTick] = useState(0);
    const [localAdminOverride, setLocalAdminOverride] = useState(null); // null = no override, true/false = force UI
    const [upcomingMeetings, setUpcomingMeetings] = useState([]);
    const [pastMeetings, setPastMeetings] = useState([]);
    const [viewScheduleModal, setViewScheduleModal] = useState(false);
    const [viewPastModal, setViewPastModal] = useState(false);
    const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
    const [scheduleFormValues, setScheduleFormValues] = useState({
        userName: '',
        meetingTitle: '',
        meetingPurpose: '',
        meetingPassword: '',
        scheduleDate: null,
        scheduleTime: null,
        micEnabled: true,
        cameraEnabled: true,
        waitingRoomEnabled: false,
    });

    // Details modal state for viewing full meeting information
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsMeeting, setDetailsMeeting] = useState(null);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState(null);

    const [areControlsVisible, setAreControlsVisible] = useState(true);
    const inactivityTimer = useRef(null);
    const [hostParticipantId, setHostParticipantId] = useState(null);
    

    const showToast = useCallback((toastData) => {
        setActiveToast({ id: Date.now(), ...toastData });
    }, []);

    useGSAP(() => {
        if (!activeMeeting && dashboardContainerRef.current) {
            gsap.from(dashboardContainerRef.current.children, {
                y: 20, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.1,
            });
        }
    }, { dependencies: [activeMeeting] });

    useEffect(() => {
        let mounted = true;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;
            const user = session?.user || null;
            setCurrentUser(user);
            const storedUserName = localStorage.getItem('userName');
            const joinAsGuest = localStorage.getItem('joinAsGuest') === 'true';
            
            if (user) { 
                setUserName(storedUserName || user.user_metadata?.full_name || 'User'); 
            } else if (joinAsGuest && storedUserName) {
                // For guests, use the stored name from guest page
                setUserName(storedUserName);
            } else { 
                setUserName('Guest'); 
            }
        })();
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (!mounted) return;
            const user = session?.user || null;
            setCurrentUser(user);
            const storedUserName = localStorage.getItem('userName');
            const joinAsGuest = localStorage.getItem('joinAsGuest') === 'true';
            
            if (user) { 
                setUserName(storedUserName || user.user_metadata?.full_name || 'User'); 
            } else if (joinAsGuest && storedUserName) {
                // For guests, use the stored name from guest page
                setUserName(storedUserName);
            } else { 
                setUserName('Guest'); 
            }
        });
        return () => { mounted = false; sub.subscription.unsubscribe(); };
    }, []);

    // Simplified and reliable meeting initialization
    useEffect(() => {
        const initializeMeeting = async () => {
            if (!meetingId) return;
            
            console.log('[Meeting] Starting initialization for meetingId:', meetingId);
            if (DEBUG_MODE) console.log('[DEBUG] Current user state:', { currentUser: !!currentUser, userName, role, isWebinarMode });
            
            // Step 0: Validate meeting URL and ID
            const validation = validateMeetingAccess(meetingId, window.location.pathname);
            if (!validation.isValid) {
                console.error('[Meeting] URL validation failed:', validation.error);
                showToast({ 
                    title: 'Invalid Meeting Link', 
                    message: validation.error, 
                    type: 'error' 
                });
                navigate(role === 'admin' ? '/meeting' : '/home');
                return;
            }
            
            console.log('[Meeting] URL validation passed:', validation);
            
            // Prevent duplicate initialization
            if (activeMeeting?.id === validation.cleanMeetingId && jitsiApi) {
                console.log('[Meeting] Already initialized for this meeting');
                setIsPageLoading(false);
                return;
            }

            setIsPageLoading(true);
            setIsJitsiLoading(false);
            setCanJoinMeeting(false);
            setIsWaitingForHost(false);

            try {
                // Step 1: Determine user identity and access method
                const joinAsGuest = localStorage.getItem('joinAsGuest') === 'true';
                const storedGuestName = localStorage.getItem('userName') || 'Guest';
                
                let userIdentity = {
                    isGuest: joinAsGuest,
                    displayName: joinAsGuest ? storedGuestName : (userName || 'User'),
                    currentUser: currentUser
                };

                // Step 2: Handle authentication requirements with timeout
                if (!currentUser && !joinAsGuest) {
                    console.log('[Meeting] No authentication found, checking with brief delay...');
                    
                    // Wait a short time for auth state to settle
                    await new Promise(resolve => setTimeout(resolve, 150));
                    
                    // Recheck authentication after delay
                    const finalJoinAsGuest = localStorage.getItem('joinAsGuest') === 'true';
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (!session?.user && !finalJoinAsGuest) {
                        console.log('[Meeting] Redirecting to guest page for meeting access');
                        const guestPath = isWebinarMode ? `/guest/webinar/${meetingId}` : `/guest/${meetingId}`;
                        navigate(guestPath, { replace: true });
                        return;
                    } else if (session?.user) {
                        console.log('[Meeting] Found session after delay, updating user state');
                        userIdentity.currentUser = session.user;
                        userIdentity.isGuest = false;
                        if (!userIdentity.displayName || userIdentity.displayName === 'User') {
                            userIdentity.displayName = session.user.user_metadata?.full_name || 'User';
                        }
                    }
                }

                // Step 3: Fetch meeting data using validated ID
                console.log('[Meeting] Fetching meeting data for validated ID:', validation.cleanMeetingId);
                const { data: meetingData, error } = await supabase
                    .from('meetings')
                    .select('*')
                    .eq('id', validation.cleanMeetingId)
                    .single();

                if (error || !meetingData) {
                    console.error('[Meeting] Failed to fetch meeting:', error);
                    if (!currentUser && !joinAsGuest) {
                        const guestPath = isWebinarMode ? `/guest/webinar/${meetingId}` : `/guest/${meetingId}`;
                        navigate(guestPath, { replace: true });
                    } else {
                        showToast({ title: 'Error', message: 'Meeting not found or access denied.', type: 'error' });
                        navigate(role === 'admin' ? '/meeting' : '/home');
                    }
                    return;
                }

                console.log('[Meeting] Meeting data loaded successfully');

                // Step 4: Check for bans
                const banned = Array.isArray(meetingData.banned_display_names) ? meetingData.banned_display_names : [];
                const normalizedName = userIdentity.displayName.trim().toLowerCase();
                const isBanned = banned.some(name => (name || '').trim().toLowerCase() === normalizedName);
                
                if (isBanned) {
                    showToast({ title: 'Access Denied', message: 'You have been removed from this meeting.', type: 'error' });
                    navigate(role === 'admin' ? '/meeting' : '/home');
                    return;
                }

                // Step 5: Determine user role (host vs participant)
                const localHostToken = localStorage.getItem(`hostToken_${validation.cleanMeetingId}`);
                const isHost = !!(localHostToken && localHostToken === meetingData.host_token);
                
                console.log('[Meeting] Role determined:', { isHost, hasLocalToken: !!localHostToken, meetingId: validation.cleanMeetingId });

                // Step 6: Set up meeting object
                const meetingConfig = {
                    id: validation.cleanMeetingId,
                    displayName: userIdentity.displayName,
                    isHost: isHost,
                    ...meetingData
                };

                setActiveMeeting(meetingConfig);

                // Step 7: Handle joining logic based on role
                if (isHost) {
                    console.log('[Meeting] Host detected - preparing admin access');
                    await handleHostJoin(meetingConfig, userIdentity);
                } else {
                    console.log('[Meeting] Participant detected - preparing participant access');
                    await handleParticipantJoin(meetingConfig, meetingData);
                }

            } catch (error) {
                console.error('[Meeting] Initialization failed:', error);
                showToast({ 
                    title: 'Connection Error', 
                    message: 'Unable to connect to meeting. Please try again.', 
                    type: 'error' 
                });
                navigate(role === 'admin' ? '/meeting' : '/home');
            } finally {
                setIsPageLoading(false);
            }
        };

        // Helper function for host joining with comprehensive error handling
        const handleHostJoin = async (meetingConfig, userIdentity) => {
            try {
                console.log('[Meeting] Generating admin JWT for host...');
                
                // Add timeout for JWT creation
                const jwtPromise = createAdminJwt({ 
                    name: userIdentity.displayName, 
                    email: userIdentity.currentUser?.email, 
                    avatar: userIdentity.currentUser?.user_metadata?.avatar_url 
                });
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('JWT creation timeout')), 5000)
                );
                
                const token = await Promise.race([jwtPromise, timeoutPromise]);
                
                setAdminJwt(token);
                setCanJoinMeeting(true);
                setIsWaitingForHost(false);
                setIsJitsiLoading(true);
                
                console.log('[Meeting] Host setup complete - ready to join');
                
                // Host success timeout
                setTimeout(() => {
                    if (canJoinMeeting && isJitsiLoading) {
                        console.log('[Meeting] Host join timeout - force clearing loading state');
                        setIsJitsiLoading(false);
                    }
                }, 3000);
                
            } catch (error) {
                console.error('[Meeting] Failed to setup host access:', error);
                
                const errorMessage = error.message.includes('timeout') 
                    ? 'Host setup taking too long. Joining as participant.'
                    : 'Failed to initialize host privileges. Joining as participant.';
                
                showToast({ 
                    title: 'Host Setup Error', 
                    message: errorMessage, 
                    type: 'warning' 
                });
                
                // Fallback to participant mode with retry mechanism
                console.log('[Meeting] Falling back to participant mode');
                setAdminJwt(undefined);
                setCanJoinMeeting(true);
                setIsWaitingForHost(false);
                setIsJitsiLoading(true);
                
                // Participant fallback timeout
                setTimeout(() => {
                    if (canJoinMeeting && isJitsiLoading) {
                        console.log('[Meeting] Fallback participant join timeout - force clearing loading state');
                        setIsJitsiLoading(false);
                    }
                }, 4000);
            }
        };

        // Helper function for participant joining with enhanced error handling
        const handleParticipantJoin = async (meetingConfig, meetingData) => {
            try {
                setAdminJwt(undefined);
                
                // Always allow participants to join - remove the host waiting requirement
                console.log('[Meeting] Allowing participant to join immediately');
                setCanJoinMeeting(true);
                setIsWaitingForHost(false);
                setIsJitsiLoading(true);
                
                // Optional: You can still track if host is present for UI purposes
                if (meetingData.host_participant_id) {
                    console.log('[Meeting] Host is already present in meeting');
                } else {
                    console.log('[Meeting] Host not yet present, but allowing participant to join');
                }
                
                // Set up success timeout to ensure we don't get stuck
                setTimeout(() => {
                    if (canJoinMeeting && isJitsiLoading) {
                        console.log('[Meeting] Participant join timeout - force clearing loading state');
                        setIsJitsiLoading(false);
                    }
                }, 4000);
                
            } catch (error) {
                console.error('[Meeting] Participant join setup failed:', error);
                showToast({
                    title: 'Join Error',
                    message: 'Unable to prepare meeting access. Retrying...',
                    type: 'warning'
                });
                
                // Retry after brief delay
                setTimeout(() => {
                    setCanJoinMeeting(true);
                    setIsWaitingForHost(false);
                    setIsJitsiLoading(true);
                }, 1000);
            }
        };

        initializeMeeting();
    }, [meetingId, currentUser, userName, navigate, role, isWebinarMode, showToast]);

    // Load user's meetings for dashboard lists
    const fetchUserMeetings = useCallback(async () => {
        if (!currentUser) return;
        try {
            const { data, error } = await supabase
                .from('meetings')
                .select('id,name,is_scheduled,scheduled_for,created_at')
                .eq('created_by', currentUser.id)
                .order('scheduled_for', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            const rows = Array.isArray(data) ? data : [];
            const now = new Date();
            const upcoming = rows
                .filter(m => m.is_scheduled && m.scheduled_for && new Date(m.scheduled_for) > now)
                .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for));
            const past = rows
                .filter(m => (m.is_scheduled && m.scheduled_for && new Date(m.scheduled_for) <= now) || !m.is_scheduled)
                .sort((a, b) => new Date(b.scheduled_for || b.created_at) - new Date(a.scheduled_for || a.created_at));
            setUpcomingMeetings(upcoming);
            setPastMeetings(past);
        } catch (_) {
            setUpcomingMeetings([]);
            setPastMeetings([]);
        }
    }, [currentUser]);

    useEffect(() => {
        if (activeMeeting || !currentUser) return;
        let cancelled = false;
        (async () => {
            await fetchUserMeetings();
        })();
        return () => { cancelled = true; };
    }, [activeMeeting, currentUser, fetchUserMeetings]);

    // Improved fallback timeout to prevent loading screen freeze
    useEffect(() => {
        if (!isJitsiLoading) return;
        
        console.info('[Meeting] Starting enhanced fallback timer for Jitsi loading');
        
        // Check periodically if Jitsi iframe exists and is loaded
        const checkJitsiReady = () => {
            const jitsiIframe = document.querySelector('iframe[name*="jitsi"]') || 
                               document.querySelector('iframe[src*="meet.in8.com"]') ||
                               document.querySelector('.jitsi-meet iframe');
            
            if (jitsiIframe) {
                try {
                    // If iframe is loaded and accessible, clear loading state
                    if (jitsiIframe.contentWindow) {
                        console.info('[Meeting] Jitsi iframe detected and accessible, clearing loading state');
                        setIsJitsiLoading(false);
                        return true;
                    }
                } catch (e) {
                    // Cross-origin iframe exists, likely loaded
                    console.info('[Meeting] Jitsi iframe exists (cross-origin), clearing loading state');
                    setIsJitsiLoading(false);
                    return true;
                }
            }
            return false;
        };

        // Immediate check
        if (checkJitsiReady()) return;

        // Periodic checks with decreasing frequency
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            checkCount++;
            
            if (checkJitsiReady()) {
                clearInterval(checkInterval);
                return;
            }
            
            // Log progress every few checks
            if (checkCount % 3 === 0) {
                console.log(`[Meeting] Waiting for Jitsi to load... (${checkCount}s)`);
            }
        }, 1000);

        // Progressive fallback timeouts
        const quickFallback = setTimeout(() => {
            console.log('[Meeting] Quick fallback check - attempting to clear loading state');
            if (canJoinMeeting) {
                setIsJitsiLoading(false);
            }
        }, 3000); // 3 seconds quick check

        const finalFallback = setTimeout(() => {
            console.warn('[Meeting] Final fallback timeout reached, force clearing loading state');
            setIsJitsiLoading(false);
            setIsPageLoading(false);
            clearInterval(checkInterval);
            
            // Show helpful message if still having issues
            showToast({
                title: 'Meeting Loaded',
                message: 'If you cannot see the meeting, please refresh the page.',
                type: 'info'
            });
        }, 6000); // 6 seconds final fallback (reduced from 8)
        
        return () => {
            clearTimeout(quickFallback);
            clearTimeout(finalFallback);
            clearInterval(checkInterval);
        };
    }, [isJitsiLoading, canJoinMeeting, showToast]);

    const openMeetingDetails = useCallback(async (id) => {
        setIsDetailsOpen(true);
        setIsDetailsLoading(true);
        setDetailsError(null);
        setDetailsMeeting(null);
        try {
            const { data, error } = await supabase
                .from('meetings')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            setDetailsMeeting(data || null);
        } catch (e) {
            console.error('Failed to load meeting details', e);
            setDetailsError('Failed to load meeting details.');
        } finally {
            setIsDetailsLoading(false);
        }
    }, []);

// In MeetingPage -> handleApiReady
    const handleApiReady = useCallback((api) => {
    // Avoid reassigning if the same API instance is passed again (tab visibility changes)
    setJitsiApi(prev => (prev === api ? prev : api));
    // +++ STOP the Jitsi loader HERE +++
    console.info('[Meeting] API ready, clearing loading state');
    setIsJitsiLoading(false);
    setIsPageLoading(false); // Also clear page loading
    try {
        const onJoined = async (e) => {
            if (!activeMeeting?.id) return;
            // Persist the host's participant ID so everyone can badge correctly
            const localIsHost = !!activeMeeting?.isHost;
            if (localIsHost && e?.id) {
                setHostParticipantId(e.id);
                try {
                    // Save host participant id
                    await supabase.from('meetings').update({ host_participant_id: e.id }).eq('id', activeMeeting.id);
                    // Ensure admin arrays include the host so all clients badge correctly
                    const { data: row } = await supabase
                      .from('meetings')
                      .select('admin_ids, admin_display_names, host_name')
                      .eq('id', activeMeeting.id)
                      .single();
                    const ids = new Set(Array.isArray(row?.admin_ids) ? row.admin_ids : []);
                    ids.add(e.id);
                    const normalize = (s) => {
                        let v = (s || '').toString();
                        v = v.replace(/\s*\([^)]*\)\s*$/g, '');
                        try { v = v.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
                        v = v.replace(/\s+/g, ' ').trim().toLowerCase();
                        return v;
                    };
                    const names = new Set(Array.isArray(row?.admin_display_names) ? row.admin_display_names : []);
                    names.add(normalize(activeMeeting?.displayName || ''));
                    const nextHostName = row?.host_name || activeMeeting?.displayName || null;
                    await supabase.from('meetings')
                      .update({ admin_ids: Array.from(ids), admin_display_names: Array.from(names), host_name: nextHostName })
                      .eq('id', activeMeeting.id);
                } catch (_) {}
            }
            if (e?.id) {
                // tick so isCurrentAdmin recomputes based on role
                setRoleEventTick(t => t + 1);
            }
        };
        api.addEventListener('videoConferenceJoined', onJoined);
        const onRoleChanged = (e) => {
            setRoleEventTick(t => t + 1);
            // Custom broadcast to everyone about this role change, so all UIs update consistently
            try {
                const payload = { type: 'role-broadcast', id: e?.id, role: e?.role };
                api.executeCommand('sendEndpointTextMessage', '', JSON.stringify(payload));
            } catch (_) {}
            // If our own role changed, show toast and override immediately
            try {
                const myId = api.myUserId && api.myUserId();
                if (e && e.id && myId && e.id === myId) {
                    if (e.role === 'moderator') {
                        showToast && showToast({ title: 'Admin rights granted', message: 'You now have admin controls.', type: 'success' });
                        setLocalAdminOverride(true);
                    } else {
                        showToast && showToast({ title: 'Admin rights removed', message: 'You are no longer an admin.', type: 'info' });
                        setLocalAdminOverride(false);
                    }
                }
            } catch (_) {}
        };
        try { api.addEventListener('participantRoleChanged', onRoleChanged); } catch (_) {}
        // Listen for endpoint text messages to show cross-client toasts
        const onEndpointMessage = (evt) => {
            try {
                const payload = typeof evt?.text === 'string' ? JSON.parse(evt.text) : null;
                if (!payload) return;
                if (payload.type === 'admin-granted') {
                    showToast && showToast({ title: 'Admin rights granted', message: 'You now have admin controls.', type: 'success' });
                    setRoleEventTick(t => t + 1);
                }
                if (payload.type === 'admin-revoked') {
                    showToast && showToast({ title: 'Admin rights removed', message: 'You are no longer an admin.', type: 'info' });
                    setRoleEventTick(t => t + 1);
                }
                if (payload.type === 'role-broadcast') {
                    // Update everyone's UI when any participant's role changes
                    setRoleEventTick(t => t + 1);
                    try {
                        const myId = api.myUserId && api.myUserId();
                        if (payload.id && myId && payload.id === myId) {
                            if (payload.role === 'moderator') {
                                setLocalAdminOverride(true);
                                showToast && showToast({ title: 'Admin rights granted', message: 'You now have admin controls.', type: 'success' });
                            } else {
                                setLocalAdminOverride(false);
                                showToast && showToast({ title: 'Admin rights removed', message: 'You are no longer an admin.', type: 'info' });
                            }
                        }
                    } catch (_) {}
                }
            } catch (_) {}
        };
        try { api.addEventListener('endpointTextMessageReceived', onEndpointMessage); } catch (_) {}
        try { api.addEventListener('endpointTextMessage', onEndpointMessage); } catch (_) {}
        // Also poll Jitsi participants briefly to catch any missed events
        const poll = setInterval(() => setRoleEventTick(t => t + 1), 2000);
        if (activeMeeting?.isHost) {
            try { api.executeCommand('toggleLobby', true); } catch (_) {}
        }
    } catch (_) {}
}, [activeMeeting]);

// Safety timeout for loader - if Jitsi doesn't initialize within 15 seconds, clear the loader
useEffect(() => {
    if (!activeMeeting?.id) return;

    // Only trigger the loader when the meeting ID changes, not when other
    // fields on the activeMeeting object are updated.
    setIsJitsiLoading(true);
    const timeout = setTimeout(() => {
        if (isJitsiLoading) {
            setIsJitsiLoading(false);
            showToast({
                title: 'Connection Issue',
                message: 'Meeting is taking longer than usual to load. Please check your internet connection.',
                type: 'warning'
            });
        }
    }, 15000);

    return () => clearTimeout(timeout);
}, [activeMeeting?.id]);

useEffect(() => {
    if (!jitsiApi) return;
    if (whiteboardOpen) {
        try { jitsiApi.executeCommand('toggleWhiteboard'); } catch (_) {}
    }
}, [jitsiApi]);


    const showControlsAndResetTimer = useCallback(() => {
        setAreControlsVisible(true);
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(() => {
            setAreControlsVisible(false);
        }, 5000);
    }, []);

    useEffect(() => {
        if (activeMeeting) {
            showControlsAndResetTimer();
            window.addEventListener('mousemove', showControlsAndResetTimer);
            window.addEventListener('keydown', showControlsAndResetTimer);
        }
        return () => {
            window.removeEventListener('mousemove', showControlsAndResetTimer);
            window.removeEventListener('keydown', showControlsAndResetTimer);
            clearTimeout(inactivityTimer.current);
        };
    }, [activeMeeting, showControlsAndResetTimer]);

    // Synchronize whiteboard via Supabase realtime: when the row's whiteboard_open changes,
    // toggle the Jitsi whiteboard to match on every client
    useEffect(() => {
        if (!activeMeeting?.id) return;
        const channel = supabase
            .channel(`meeting-${activeMeeting.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings', filter: `id=eq.${activeMeeting.id}` }, (payload) => {
            const data = payload.new || payload.old || {};
            // Share host participant id with all clients so sidebar can badge
            if (data.host_participant_id) {
                setHostParticipantId(data.host_participant_id);
            }
            // Roles: we continue to respect admin arrays in DB for universal badging
            const admins = Array.isArray(data.admin_ids) ? data.admin_ids : [];
            const normalize = (s) => {
                let v = (s || '').toString();
                v = v.replace(/\s*\([^)]*\)\s*$/g, '');
                try { v = v.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
                v = v.replace(/\s+/g, ' ').trim().toLowerCase();
                return v;
            };
            const adminNames = Array.isArray(data.admin_display_names) ? data.admin_display_names.map(n => normalize(n)) : [];
            setAdminIds(admins);
            setAdminDisplayNames(adminNames);
            // Recompute current admin status when DB admin arrays change
            setRoleEventTick(t => t + 1);
            // Ban enforcement: if my displayName is banned, end locally and block
            const banned = Array.isArray(data.banned_display_names) ? data.banned_display_names : [];
            const myName = (activeMeeting?.displayName || userName || 'Guest').trim().toLowerCase();
            const isBanned = banned.some(n => (n || '').trim().toLowerCase() === myName);
            if (isBanned) {
                try { jitsiApi?.dispose(); } catch (_) {}
                showToast({ title: 'Removed by host', message: 'You cannot rejoin this meeting.', type: 'error' });
                setActiveMeeting(null);
                setJitsiApi(null);
                navigate(role === 'admin' ? '/meeting' : '/home');
                return;
            }

            // Enhanced participant handling when host joins
            if (!activeMeeting?.isHost) {
                const hostJoined = !!data.host_participant_id;
                if (hostJoined && !canJoinMeeting) {
                    console.log('[Meeting] Host joined, enabling participant access');
                    setCanJoinMeeting(true);
                    setIsWaitingForHost(false);
                    setIsJitsiLoading(true);
                } else if (hostJoined) {
                    console.log('[Meeting] Host presence confirmed for participant');
                }
            }

            // Whiteboard sync
            const targetOpen = !!data.whiteboard_open;
            setWhiteboardOpen((prev) => {
                if (prev !== targetOpen) {
                    if (jitsiApi) {
                        jitsiApi.executeCommand('toggleWhiteboard');
                    }
                }
                return targetOpen;
            });
        })
        .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeMeeting?.id, jitsiApi, navigate, showToast, userName, activeMeeting?.isHost, canJoinMeeting]);

    // Socket.IO removed: roles derive from Supabase-only to prevent websocket errors when no socket server is running

    // Host handler to flip the Firestore flag; all clients react via onSnapshot
    const handleToggleWhiteboard = useCallback(async () => {
        if (!activeMeeting?.id) return;
        try {
            await supabase.from('meetings').update({ whiteboard_open: !whiteboardOpen }).eq('id', activeMeeting.id);
        } catch (e) {
            console.error('Failed to toggle whiteboard flag:', e);
        }
    }, [activeMeeting?.id, whiteboardOpen]);

    // Compute current user's admin status from DB arrays and Jitsi role; re-run when role or DB arrays change
    useEffect(() => {
        if (!jitsiApi) return;
        const normalize = (s) => {
            let v = (s || '').toString();
            v = v.replace(/\s*\([^)]*\)\s*$/g, '');
            try { v = v.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
            v = v.replace(/\s+/g, ' ').trim().toLowerCase();
            return v;
        };
        const myId = jitsiApi.myUserId && jitsiApi.myUserId();
        let myNameNorm = normalize(activeMeeting?.displayName || '');
        const isModerator = (() => {
            try {
                const list = Array.isArray(jitsiApi.getParticipantsInfo?.()) ? jitsiApi.getParticipantsInfo() : [];
                const me = list.find(p => p.participantId === myId);
                if (me && (me.displayName || me.formattedDisplayName)) {
                    myNameNorm = normalize(me.formattedDisplayName || me.displayName);
                }
                return !!(me && (me.isModerator || me.role === 'moderator'));
            } catch (_) { return false; }
        })();
        const dbAdminById = (() => {
            if (!myId) return false;
            return (Array.isArray(adminIds) && adminIds.includes(myId));
        })();
        const dbAdminByName = (() => {
            if (!myNameNorm) return false;
            const arr = Array.isArray(adminDisplayNames) ? adminDisplayNames : [];
            return arr.some(n => n === myNameNorm);
        })();
        let next;
        if (localAdminOverride === true) next = true;
        else if (localAdminOverride === false) next = false;
        else next = !!(isModerator || dbAdminById || dbAdminByName || activeMeeting?.isHost);
        setIsCurrentAdmin(next);
    }, [jitsiApi, adminIds, adminDisplayNames, activeMeeting?.isHost, roleEventTick, activeMeeting?.displayName, localAdminOverride]);

    // Toast the local user when their admin status changes (excluding host bootstrapping)
    useEffect(() => {
        const prev = prevIsAdminRef.current;
        if (prev !== isCurrentAdmin) {
            if (!activeMeeting?.isHost) {
                if (isCurrentAdmin) {
                    showToast && showToast({ title: 'Admin rights granted', message: 'You now have admin controls.', type: 'success' });
                } else {
                    showToast && showToast({ title: 'Admin rights removed', message: 'You are no longer an admin.', type: 'info' });
                }
            }
            prevIsAdminRef.current = isCurrentAdmin;
        }
    }, [isCurrentAdmin, activeMeeting?.isHost, showToast]);

    // Host: process queued admin actions via Supabase realtime, and mirror to DB admin arrays
    useEffect(() => {
        if (!activeMeeting?.id || !jitsiApi || !activeMeeting?.isHost) return;
        const chan = supabase
            .channel(`actions-${activeMeeting.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_actions', filter: `meeting_id=eq.${activeMeeting.id}` }, async ({ new: action }) => {
                if (!action || action.status !== 'pending') return;
                try {
                    switch (action.type) {
                        case 'kick':
                            if (action.target_participant_id) {
                                jitsiApi.executeCommand('kickParticipant', action.target_participant_id);
                            }
                            break;
                        case 'mute':
                            if (action.target_participant_id) {
                                try { jitsiApi.executeCommand('muteParticipant', action.target_participant_id); } catch (_) {}
                            }
                            break;
                        case 'mute-everyone':
                            try { jitsiApi.executeCommand('muteEveryone'); } catch (_) {}
                            break;
                        case 'grant-moderator':
                            if (action.target_participant_id) {
                                try { jitsiApi.executeCommand('grantModerator', action.target_participant_id); } catch (_) {}
                                // Mirror to DB admin arrays
                                try {
                                  const { data: row } = await supabase.from('meetings').select('admin_ids, admin_display_names').eq('id', activeMeeting.id).single();
                                  const ids = new Set(Array.isArray(row?.admin_ids) ? row.admin_ids : []);
                                  ids.add(action.target_participant_id);
                                  const normalize = (s) => { let v = (s||'').toString(); v=v.replace(/\s*\([^)]*\)\s*$/g,''); try{v=v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');}catch(_){} v=v.replace(/\s+/g,' ').trim().toLowerCase(); return v; };
                                  const names = new Set(Array.isArray(row?.admin_display_names) ? row.admin_display_names : []);
                                  if (action.target_display_name_normalized) names.add(action.target_display_name_normalized);
                                  await supabase.from('meetings').update({ admin_ids: Array.from(ids), admin_display_names: Array.from(names) }).eq('id', activeMeeting.id);
                                } catch (_) {}
                            }
                            break;
                        case 'revoke-moderator':
                            if (action.target_participant_id) {
                                try { jitsiApi.executeCommand('revokeModerator', action.target_participant_id); } catch (_) {}
                                // Mirror to DB admin arrays
                                try {
                                  const { data: row } = await supabase.from('meetings').select('admin_ids, admin_display_names').eq('id', activeMeeting.id).single();
                                  const ids = new Set(Array.isArray(row?.admin_ids) ? row.admin_ids : []);
                                  ids.delete(action.target_participant_id);
                                  const names = new Set(Array.isArray(row?.admin_display_names) ? row.admin_display_names : []);
                                  if (action.target_display_name_normalized) names.delete(action.target_display_name_normalized);
                                  await supabase.from('meetings').update({ admin_ids: Array.from(ids), admin_display_names: Array.from(names) }).eq('id', activeMeeting.id);
                                } catch (_) {}
                            }
                            break;
                        case 'recording-start':
                            jitsiApi.executeCommand('startRecording', { mode: 'file' });
                            break;
                        case 'recording-stop':
                            jitsiApi.executeCommand('stopRecording', 'file');
                            break;
                        case 'stream-start':
                            if (action.platform === 'youtube' && action.stream_key) {
                                jitsiApi.executeCommand('startRecording', { mode: 'stream', youtubeStreamKey: action.stream_key });
                            } else if (action.stream_key && action.rtmp_url) {
                                jitsiApi.executeCommand('startRecording', { mode: 'stream', rtmpStreamKey: action.stream_key, rtmpStreamUrl: action.rtmp_url });
                            }
                            break;
                        case 'stream-stop':
                            jitsiApi.executeCommand('stopRecording', 'stream');
                            break;
                        case 'end-meeting': {
                            try {
                                const list = Array.isArray(jitsiApi.getParticipantsInfo?.()) ? jitsiApi.getParticipantsInfo() : [];
                                for (const p of list) {
                                    if (p && p.participantId && p.participantId !== (jitsiApi.myUserId && jitsiApi.myUserId())) {
                                        try { jitsiApi.executeCommand('kickParticipant', p.participantId); } catch (_) {}
                                    }
                                }
                            } catch (_) {}
                            // Finally hang up host
                            try { jitsiApi.executeCommand('hangup'); } catch (_) {}
                            break;
                        }
                        default:
                            break;
                    }
                    await supabase.from('meeting_actions').update({ status: 'done', processed_at: new Date().toISOString(), requested_by: jitsiApi.myUserId && jitsiApi.myUserId() }).eq('id', action.id);
                } catch (err) {
                    await supabase.from('meeting_actions').update({ status: 'error', error: String(err), processed_at: new Date().toISOString(), requested_by: jitsiApi.myUserId && jitsiApi.myUserId() }).eq('id', action.id);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(chan); };
    }, [activeMeeting?.id, activeMeeting?.isHost, jitsiApi]);

    // All participants: react to meeting actions for targeted notifications and end-meeting
    useEffect(() => {
        if (!activeMeeting?.id || !jitsiApi) return;
        const chanAll = supabase
            .channel(`actions-all-${activeMeeting.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_actions', filter: `meeting_id=eq.${activeMeeting.id}` }, async ({ new: action }) => {
                if (!action) return;
                if (action.type === 'end-meeting') {
                    try { jitsiApi.executeCommand('hangup'); } catch (_) {}
                    setActiveMeeting(null);
                    setJitsiApi(null);
                    navigate(role === 'admin' ? '/meeting' : '/home');
                    return;
                }
                const myId = jitsiApi.myUserId && jitsiApi.myUserId();
                const normalize = (s) => {
                    let v = (s || '').toString();
                    v = v.replace(/\s*\([^)]*\)\s*$/g, '');
                    try { v = v.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
                    v = v.replace(/\s+/g, ' ').trim().toLowerCase();
                    return v;
                };
                const myName = normalize(activeMeeting?.displayName || '');
                if (!myId && !myName) return;
                const targetedById = action.target_participant_id && myId && action.target_participant_id === myId;
                const targetedByName = action.target_display_name_normalized && myName && action.target_display_name_normalized === myName;
                if (targetedById || targetedByName) {
                    if (action.type === 'grant-moderator' || action.type === 'notify-admin-granted') {
                        showToast && showToast({ title: 'Admin rights granted', message: 'You now have admin controls.', type: 'success' });
                        setRoleEventTick(t => t + 1);
                        setLocalAdminOverride(true);
                    }
                    if (action.type === 'revoke-moderator' || action.type === 'notify-admin-revoked') {
                        showToast && showToast({ title: 'Admin rights removed', message: 'You are no longer an admin.', type: 'info' });
                        setRoleEventTick(t => t + 1);
                        setLocalAdminOverride(false);
                    }
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(chanAll); };
    }, [activeMeeting?.id, jitsiApi, navigate]);

    // Jitsi-side fallback: when conference closes or user is kicked, leave page
    useEffect(() => {
        if (!jitsiApi || !activeMeeting?.id) return;
        const leaveNow = () => {
            try { jitsiApi.executeCommand('hangup'); } catch (_) {}
            setActiveMeeting(null);
            setJitsiApi(null);
            navigate('/meeting');
        };
        const onReadyToClose = () => leaveNow();
        const onLeft = () => leaveNow();
        const onKicked = () => leaveNow();
        try { jitsiApi.addEventListener('readyToClose', onReadyToClose); } catch (_) {}
        try { jitsiApi.addEventListener('videoConferenceLeft', onLeft); } catch (_) {}
        try { jitsiApi.addEventListener('participantKickedOut', onKicked); } catch (_) {}
        return () => {
            try { jitsiApi.removeEventListener('readyToClose', onReadyToClose); } catch (_) {}
            try { jitsiApi.removeEventListener('videoConferenceLeft', onLeft); } catch (_) {}
            try { jitsiApi.removeEventListener('participantKickedOut', onKicked); } catch (_) {}
        };
    }, [jitsiApi, activeMeeting?.id, navigate]);


   const handleCreateMeeting = async (formData, scheduleOption = 'now') => {
        setIsLoading(true);
        if (!currentUser) {
            showToast({ title: 'Auth Error', message: 'You must be logged in.', type: 'error' });
            setIsLoading(false); return;
        }
        if (formData.hostName) localStorage.setItem('userName', formData.hostName);
        
        try {
            const hostToken = uuidv4();

            // Prepare meeting data with robust error handling
            const meetingData = {
                name: formData.name,
                purpose: formData.purpose || null,
                is_scheduled: !!formData.isScheduled,
                scheduled_for: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : null,
                host_name: formData.hostName || null,
                start_with_audio_muted: !!formData.startWithAudioMuted,
                start_with_video_muted: !!formData.startWithVideoMuted,
                prejoin_page_enabled: !!formData.prejoinPageEnabled,
                created_by: currentUser.id,
                host_token: hostToken,
            };

            // Add webinar_mode only if explicitly enabled (graceful fallback)
            if (formData.webinarMode) {
                meetingData.webinar_mode = true;
            }

            const { data, error } = await supabase.from('meetings')
                .insert([meetingData])
                .select('id')
                .single();
            if (error || !data?.id) throw error || new Error('Meeting creation failed');
            const link = formData.webinarMode 
                ? `${window.location.origin}/meeting/webinar/${data.id}`
                : `${window.location.origin}/meeting/${data.id}`;
            
            // ADDED: 3. Save the token in localStorage, associated with the new meeting ID
            localStorage.setItem(`hostToken_${data.id}`, hostToken);
            
            setNewMeetingLink(link);
            showToast({ title: 'Success!', message: `Meeting ${scheduleOption === 'now' ? 'created' : 'scheduled'}!`, type: 'success' });
            
            // Always show share modal first; user explicitly starts when ready
            setIsShareModalOpen(true);
        } catch (error) {
            console.error("Error creating meeting:", error);
            console.error("Form data attempted:", formData);
            console.error("Meeting data prepared:", meetingData);
            const errorMessage = error.message || error.details || 'Unknown database error';
            showToast({ title: 'Error', message: `Failed to create meeting: ${errorMessage}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleQuickStart = () => {
        if (!currentUser) {
             showToast({ title: 'Auth Error', message: 'You must be logged in to start a meeting.', type: 'error' });
             return;
        }
        const quickStartData = {
            name: `Instant Meeting - ${new Date().toLocaleDateString()}`, purpose: 'Quick call', password: '',
            isScheduled: false, scheduledFor: null, hostName: userName, startWithAudioMuted: false,
            startWithVideoMuted: false, 
            prejoinPageEnabled: false,
        };
        handleCreateMeeting(quickStartData, 'now');
    };

    // Handlers for Quick Action: Schedule Meeting modal
    const handleScheduleInputChange = (e) => {
        const { name, value } = e.target;
        setScheduleFormValues(prev => ({ ...prev, [name]: value }));
    };
    const handleScheduleDateChange = (e) => {
        const { name, value } = e.target;
        setScheduleFormValues(prev => ({ ...prev, [name]: value }));
    };
    const handleScheduleFormSubmit = (e) => {
        e.preventDefault();
        const v = scheduleFormValues;
        if (!(v.scheduleDate && v.scheduleTime)) {
            showToast({ title: 'Missing time', message: 'Please select both date and time.', type: 'warning' });
            return;
        }
        const finalDateTime = new Date(
            v.scheduleDate.getFullYear(),
            v.scheduleDate.getMonth(),
            v.scheduleDate.getDate(),
            v.scheduleTime.getHours(),
            v.scheduleTime.getMinutes()
        );
        const formData = {
            name: v.meetingTitle || 'Scheduled Meeting',
            purpose: v.meetingPurpose,
            password: v.meetingPassword,
            isScheduled: true,
            scheduledFor: finalDateTime,
            hostName: v.userName || userName,
            startWithAudioMuted: !v.micEnabled,
            startWithVideoMuted: !v.cameraEnabled,
            prejoinPageEnabled: v.waitingRoomEnabled,
        };
        handleCreateMeeting(formData, 'later');
        setIsScheduleFormOpen(false);
        // refresh lists so "View All Scheduled Meetings" shows the new entry immediately
        fetchUserMeetings();
    };

    const handleEndMeeting = useCallback(() => {
        console.log('[Meeting] handleEndMeeting called');
        
        // Prevent multiple calls
        if (!activeMeeting) {
            console.log('[Meeting] Already ended, skipping');
            return;
        }
        
        showToast({ title: 'Meeting Ended', message: 'You have left the meeting.', type: 'info' });
        
        // Determine redirect path based on user type
        const isGuest = localStorage.getItem('joinAsGuest') === 'true';
        const isAdmin = role === 'admin';
        
        // Clean up Jitsi API first to prevent stuck state
        try {
            if (jitsiApi) {
                console.log('[Meeting] Disposing Jitsi API');
                jitsiApi.dispose();
            }
        } catch (error) {
            console.warn('[Meeting] Error disposing Jitsi API:', error);
        }
        
        // Clear state immediately
        setActiveMeeting(null);
        setJitsiApi(null);
        setIsJitsiLoading(false);
        setCanJoinMeeting(false);
        setIsWaitingForHost(false);
        
        // Clean up guest-related localStorage
        if (isGuest) {
            localStorage.removeItem('joinAsGuest');
            localStorage.removeItem('guestJoinAudio');
            localStorage.removeItem('guestJoinVideo');
        }
        
        // Use setTimeout to prevent navigation conflicts
        setTimeout(() => {
            // Redirect based on user type
            if (isGuest) {
                // Guest users go back to guest join page
                const guestPath = isWebinarMode ? `/guest/webinar/${meetingId}` : `/guest/${meetingId}`;
                navigate(guestPath, { replace: true });
            } else if (isAdmin) {
                // Admin users go to meeting page
                navigate('/meeting', { replace: true });
            } else {
                // Logged-in users go to home page
                navigate('/home', { replace: true });
            }
        }, 100);
    }, [navigate, role, isWebinarMode, meetingId, activeMeeting, jitsiApi]);

    const handleMeetingTerminated = useCallback(() => {
        console.log('[Meeting] handleMeetingTerminated called');
        
        // Prevent multiple calls
        if (!activeMeeting) {
            console.log('[Meeting] Already terminated, skipping');
            return;
        }
        
        showToast({ title: 'Meeting Terminated', message: 'The meeting has been ended by the host.', type: 'warning' });
        
        // Determine redirect path based on user type
        const isGuest = localStorage.getItem('joinAsGuest') === 'true';
        const isAdmin = role === 'admin';
        
        // Clean up Jitsi API first to prevent stuck state
        try {
            if (jitsiApi) {
                console.log('[Meeting] Disposing Jitsi API on termination');
                jitsiApi.dispose();
            }
        } catch (error) {
            console.warn('[Meeting] Error disposing Jitsi API on termination:', error);
        }
        
        // Clear state immediately
        setActiveMeeting(null);
        setJitsiApi(null);
        setIsJitsiLoading(false);
        setCanJoinMeeting(false);
        setIsWaitingForHost(false);
        
        // Clean up guest-related localStorage
        if (isGuest) {
            localStorage.removeItem('joinAsGuest');
            localStorage.removeItem('guestJoinAudio');
            localStorage.removeItem('guestJoinVideo');
        }
        
        // Use setTimeout to prevent navigation conflicts
        setTimeout(() => {
            // Redirect based on user type - same logic as handleEndMeeting
            if (isGuest) {
                // Guest users go back to guest join page
                const guestPath = isWebinarMode ? `/guest/webinar/${meetingId}` : `/guest/${meetingId}`;
                navigate(guestPath, { replace: true });
            } else if (isAdmin) {
                // Admin users go to meeting page
                navigate('/meeting', { replace: true });
            } else {
                // Logged-in users go to home page
                navigate('/home', { replace: true });
            }
        }, 100);
    }, [navigate, role, isWebinarMode, meetingId, activeMeeting, jitsiApi]);

    if (isPageLoading) {
        return <LoadingScreen />;
    }

    return (

        <div className="flex h-screen relative z-10 overflow-hidden bg-slate-950">
            <div className="fixed top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 w-full max-w-sm px-4 sm:px-0 z-[60]"><AnimatePresence>{activeToast && <Toast key={activeToast.id} toast={activeToast} onClose={() => setActiveToast(null)} />}</AnimatePresence></div>
            <AnimatePresence>{isShareModalOpen && <ShareModal meetingLink={newMeetingLink} onClose={() => setIsShareModalOpen(false)} onStart={() => { setIsShareModalOpen(false); if (newMeetingLink) { const urlPath = new URL(newMeetingLink).pathname; navigate(urlPath); } }} />}</AnimatePresence>

            <AnimatePresence>
              {viewScheduleModal && (
                <motion.div 
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setViewScheduleModal(false)}
                >
                  <motion.div 
                    className="relative w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl mx-auto"
                    initial={{ scale: 0.9, y: -30, opacity: 0 }} 
                    animate={{ scale: 1, y: 0, opacity: 1 }} 
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e)=>e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-slate-800/80 via-slate-700/80 to-slate-800/80 p-4 sm:p-6 border-b border-slate-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="p-2 bg-blue-500/20 rounded-xl"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", damping: 15 }}
                          >
                            <Calendar className="text-blue-400" size={24} />
                          </motion.div>
                          <div>
                            <motion.h3 
                              className="text-2xl font-bold text-white"
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              Scheduled Meetings
                            </motion.h3>
                            <motion.p 
                              className="text-slate-400 text-sm"
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.4 }}
                            >
                              View and join your upcoming meetings
                            </motion.p>
                          </div>
                        </div>
                        <motion.button 
                          onClick={() => setViewScheduleModal(false)} 
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <X size={22} />
                        </motion.button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6">
                      <div className="max-h-[65vh] overflow-y-auto pr-2 thin-scrollbar">
                        {upcomingMeetings.length === 0 ? (
                          <motion.div 
                            className="flex flex-col items-center justify-center py-16 text-center"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            <div className="p-4 bg-slate-700/30 rounded-full mb-4">
                              <Calendar className="text-slate-400" size={32} />
                            </div>
                            <h4 className="text-lg font-medium text-slate-300 mb-2">No Scheduled Meetings</h4>
                            <p className="text-slate-500 text-sm max-w-sm">
                              Your upcoming meetings will appear here. Schedule a meeting to get started.
                            </p>
                          </motion.div>
                        ) : (
                          <div className="space-y-3">
                            {upcomingMeetings.map((m, index) => (
                              <motion.div 
                                key={m.id} 
                                className="group relative p-4 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-300"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 * index }}
                                whileHover={{ scale: 1.01 }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-700/50 rounded-xl group-hover:bg-slate-700 transition-colors">
                                      <Calendar className="text-green-400" size={20} />
                                    </div>
                                    <div className="flex-grow">
                                      <h5 className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                                        {m.name || 'Untitled Meeting'}
                                      </h5>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm text-slate-400">
                                          {new Date(m.scheduled_for).toLocaleDateString()}
                                        </span>
                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                        <span className="text-sm text-slate-400">
                                          {new Date(m.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {m.purpose && (
                                          <>
                                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                            <span className="text-sm text-slate-500 max-w-xs truncate">
                                              {m.purpose}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <motion.button 
                                      onClick={() => openMeetingDetails(m.id)} 
                                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all duration-200" 
                                      title="View details"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <MoreHorizontal size={18} />
                                    </motion.button>
                                    <motion.button 
                                      onClick={() => {
                                        setViewScheduleModal(false); // Auto-close the scheduled meetings modal
                                        navigate(`/meeting/${m.id}`);
                                      }} 
                                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-sm font-medium rounded-xl transition-all duration-300 border border-green-500/50 hover:border-green-400/50"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Calendar size={14} />
                                        Join
                                      </div>
                                    </motion.button>
                                  </div>
                                </div>
                                
                                {/* Hover effect overlay */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isScheduleFormOpen && (
                <motion.div
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsScheduleFormOpen(false)}
                >
                  <motion.div
                    className="relative w-full max-w-lg sm:max-w-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl max-h-[70vh] overflow-y-auto mb-4 thin-scrollbar"
                    initial={{ scale: 0.9, y: -30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MeetingDetailsForm
                      isScheduling={true}
                      onSubmit={handleScheduleFormSubmit}
                      setView={() => setIsScheduleFormOpen(false)}
                      formValues={scheduleFormValues}
                      handleInputChange={handleScheduleInputChange}
                      handleDateChange={handleScheduleDateChange}
                      isLoading={isLoading}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {viewPastModal && (
                <motion.div 
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setViewPastModal(false)}
                >
                  <motion.div 
                    className="relative w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl mx-auto"
                    initial={{ scale: 0.9, y: -30, opacity: 0 }} 
                    animate={{ scale: 1, y: 0, opacity: 1 }} 
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e)=>e.stopPropagation()}
                  >
                    {/* Header with gradient removed for consistency */}
                    <div className="relative bg-gradient-to-r from-slate-800/80 via-slate-700/80 to-slate-800/80 p-4 sm:p-6 border-b border-slate-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="p-2 bg-blue-500/20 rounded-xl"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", damping: 15 }}
                          >
                            <CalendarDays className="text-blue-400" size={24} />
                          </motion.div>
                          <div>
                            <motion.h3 
                              className="text-2xl font-bold text-white"
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              Past Meetings
                            </motion.h3>
                            <motion.p 
                              className="text-slate-400 text-sm"
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.4 }}
                            >
                              Browse your meeting history and access recordings
                            </motion.p>
                    </div>
                        </div>
                        <motion.button 
                          onClick={() => setViewPastModal(false)} 
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <X size={22} />
                        </motion.button>
                      </div>
                                        </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6">
                      <div className="max-h-[65vh] overflow-y-auto pr-2 thin-scrollbar">
                        {pastMeetings.length === 0 ? (
                          <motion.div 
                            className="flex flex-col items-center justify-center py-16 text-center"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            <div className="p-4 bg-slate-700/30 rounded-full mb-4">
                              <CalendarDays className="text-slate-400" size={32} />
                            </div>
                            <h4 className="text-lg font-medium text-slate-300 mb-2">No Past Meetings</h4>
                            <p className="text-slate-500 text-sm max-w-sm">
                              Your completed meetings will appear here. Start hosting meetings to build your history.
                            </p>
                          </motion.div>
                        ) : (
                          <div className="space-y-3">
                            {pastMeetings.map((m, index) => (
                              <motion.div 
                                key={m.id} 
                                className="group relative p-4 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-300"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 * index }}
                                whileHover={{ scale: 1.01 }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-700/50 rounded-xl group-hover:bg-slate-700 transition-colors">
                                      <Video className="text-blue-400" size={20} />
                            </div>
                                    <div className="flex-grow">
                                      <h5 className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                                        {m.name || 'Untitled Meeting'}
                                      </h5>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm text-slate-400">
                                          {new Date(m.scheduled_for || m.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                        <span className="text-sm text-slate-400">
                                          {new Date(m.scheduled_for || m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {m.purpose && (
                                          <>
                                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                            <span className="text-sm text-slate-500 max-w-xs truncate">
                                              {m.purpose}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <motion.button 
                                      onClick={() => openMeetingDetails(m.id)} 
                                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all duration-200" 
                                      title="View details"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <MoreHorizontal size={18} />
                                    </motion.button>
                          </div>
                                </div>
                                
                                {/* Hover effect overlay */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Meeting Details Modal (page-level) */}
            <AnimatePresence>
              {isDetailsOpen && (
                <motion.div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailsOpen(false)}>
                  <motion.div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl p-5" initial={{ scale: 0.96, y: -10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} onClick={(e)=>e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-400" />
                        <h3 className="text-lg font-semibold">Meeting Details</h3>
                      </div>
                      <button onClick={()=>setIsDetailsOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                    </div>
                    {isDetailsLoading ? (
                      <p className="text-slate-400 text-sm">Loading…</p>
                    ) : detailsError ? (
                      <p className="text-red-400 text-sm">{detailsError}</p>
                    ) : detailsMeeting ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-400">Title</p>
                          <p className="text-slate-200 font-medium">{detailsMeeting.name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Purpose</p>
                          <p className="text-slate-300 whitespace-pre-wrap">{detailsMeeting.purpose || '—'}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">Meeting ID</p>
                            <p className="text-slate-300 font-mono text-sm break-all">{detailsMeeting.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Host</p>
                            <p className="text-slate-300">{detailsMeeting.host_name || '—'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">Scheduled For</p>
                            <p className="text-slate-300">{detailsMeeting.scheduled_for ? new Date(detailsMeeting.scheduled_for).toLocaleString() : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Created At</p>
                            <p className="text-slate-300">{detailsMeeting.created_at ? new Date(detailsMeeting.created_at).toLocaleString() : '—'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">Audio Starts Muted</p>
                            <p className="text-slate-300">{detailsMeeting.start_with_audio_muted ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Video Starts Muted</p>
                            <p className="text-slate-300">{detailsMeeting.start_with_video_muted ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">Prejoin Page</p>
                            <p className="text-slate-300">{detailsMeeting.prejoin_page_enabled ? 'Enabled' : 'Disabled'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Whiteboard Open</p>
                            <p className="text-slate-300">{detailsMeeting.whiteboard_open ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No details available.</p>
                    )}
                    <div className="flex justify-end gap-2 mt-5">
                      <button onClick={()=>setIsDetailsOpen(false)} className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-sm">Close</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex-1 flex flex-col h-screen relative">
                <main className={`flex-1 flex flex-col h-full transition-all duration-300 ${activeMeeting ? 'p-0' : 'p-4 sm:p-6 overflow-y-auto thin-scrollbar'}`}>
                    <AnimatePresence mode="wait">
                        {activeMeeting ? (
        <motion.div key="meeting-view" className="w-full h-full flex flex-col bg-slate-950 relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration: 0.4}}>
            
            {isJitsiLoading && <LoadingScreen />}

            {activeMeeting && (
                <motion.div 
                    className="absolute top-6 left-6 z-50"
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <div className="relative">
                        {/* Floating Share Button with Unique Design */}
                        <motion.button
                            onClick={() => setIsSharePopoverOpen(v => !v)}
                            className="relative group"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ 
                                scale: 0.9,
                                rotate: [0, -5, 5, 0],
                                transition: { duration: 0.3 }
                            }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Static Background Gradient */}
                            <motion.div 
                                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300"
                            />
                            
                             {/* Main Button */}
                             <div className="relative w-14 h-14 rounded-2xl bg-slate-900/90 backdrop-blur-xl shadow-2xl flex items-center justify-center transition-all duration-300">
                                {/* Inner Glow Effect */}
                                <motion.div 
                                    className="absolute inset-1 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                />
                                
                                {/* Icon with Click Animation */}
                                <motion.div
                                    animate={{ 
                                        rotate: isSharePopoverOpen ? 180 : 0,
                                    }}
                                    transition={{ 
                                        rotate: { duration: 0.3 },
                                    }}
                                    className="text-slate-200 group-hover:text-white transition-colors duration-300"
                                >
                                    <Share2 size={20} strokeWidth={2.5} />
                                </motion.div>
                                
                            </div>
                        </motion.button>
                        
                        {/* Enhanced Popover with Unique Layout */}
                        <AnimatePresence>
                            {isSharePopoverOpen && (
                                <motion.div 
                                    className="absolute top-16 left-0 w-[380px]"
                                    initial={{ opacity: 0, scale: 0.8, y: -20, rotateX: -15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: -20, rotateX: -15 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    style={{ perspective: 1000 }}
                                >
                                    {/* Card with Gradient Border */}
                                    <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl">
                                            {/* Header with Icon */}
                                            <motion.div 
                                                className="flex items-center gap-3 mb-4"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                                    <Share2 size={16} className="text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-white">Share Meeting</h3>
                                                    <p className="text-xs text-slate-400">Copy link to invite others</p>
                                                </div>
                                            </motion.div>
                                            
                                            {/* Link Display with Copy Action */}
                                            <motion.div 
                                                className="space-y-3"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                {/* URL Preview */}
                                                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                                                    <div className="text-xs text-slate-400 mb-2">Meeting URL</div>
                                                    <div className="text-sm text-slate-200 font-mono break-all">
                                                        {newMeetingLink || `${window.location.origin}/meeting/${activeMeeting.id}`}
                                                    </div>
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex gap-2">
                                                    <motion.button
                                                        onClick={() => {
                                                            const value = newMeetingLink || `${window.location.origin}/meeting/${activeMeeting.id}`;
                                                            navigator.clipboard.writeText(value);
                                                            showToast && showToast({ title: 'Copied!', message: 'Meeting link copied to clipboard', type: 'success' });
                                                            setIsSharePopoverOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm"
                                                        whileHover={{ 
                                                            scale: 1.02,
                                                            boxShadow: "0 8px 25px -8px rgba(99, 102, 241, 0.4)"
                                                        }}
                                                        whileTap={{ scale: 0.98 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        <Copy size={16} />
                                                        Copy Link
                                                    </motion.button>
                                                    
                                                    <motion.button
                                                        onClick={() => setIsSharePopoverOpen(false)}
                                                        className="px-4 py-3 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors duration-200"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <X size={16} />
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
                                    
                                    {/* Floating Particles Effect */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {[...Array(3)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute w-1 h-1 bg-indigo-400 rounded-full"
                                                style={{
                                                    left: `${20 + i * 30}%`,
                                                    top: `${10 + i * 20}%`,
                                                }}
                                                animate={{
                                                    y: [-10, -30, -10],
                                                    opacity: [0, 1, 0],
                                                    scale: [0, 1, 0]
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    delay: i * 0.5
                                                }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}

            {isWaitingForHost && !canJoinMeeting && (
                <div className="absolute inset-0 bg-slate-900/95 z-[100] flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-xl font-semibold text-white">Waiting for host to start the meeting…</p>
                        <p className="text-slate-400 mt-2">You will join automatically once the host joins.</p>
                    </div>
                </div>
            )}

            {((activeMeeting.isHost && !!adminJwt) || (!activeMeeting.isHost && canJoinMeeting)) && (
            <div className="flex-grow w-full min-h-[400px]" style={{ visibility: isJitsiLoading ? 'hidden' : 'visible' }}>
    <JitsiMeet
        domain="meet.in8.com"
        roomName={activeMeeting.id} 
        displayName={activeMeeting.displayName || userName}
        password={activeMeeting.password} 
        onMeetingEnd={handleEndMeeting} 
        onMeetingTerminated={handleMeetingTerminated}
        onApiReady={handleApiReady}
        startWithVideoMuted={(() => { const g = localStorage.getItem('joinAsGuest') === 'true'; if (!g) return activeMeeting.startWithVideoMuted; const videoOn = localStorage.getItem('guestJoinVideo') === 'true'; return !videoOn; })()}
        startWithAudioMuted={(() => { const g = localStorage.getItem('joinAsGuest') === 'true'; if (!g) return activeMeeting.startWithAudioMuted; const audioOn = localStorage.getItem('guestJoinAudio') === 'true'; return !audioOn; })()}
        prejoinPageEnabled={false}
        showToast={showToast}
        noiseSuppressionEnabled={true} 
        jwt={adminJwt}
        webinarMode={activeMeeting.webinar_mode || false}
        isHost={activeMeeting.isHost || false}
/>
</div>
            )}
                                <div 
                                    className={`absolute top-0 left-0 w-full h-full z-10 
                                        ${areControlsVisible ? 'pointer-events-none' : 'pointer-events-auto'}`
                                    }
                                />
                                

                            </motion.div>
                        ) : (
                            <div key="dashboard-view" ref={dashboardContainerRef} className="min-h-full flex flex-col gap-6">
                                <motion.div 
                                    className="flex items-baseline justify-between mb-4 sm:mb-6"
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <motion.h1 
                                                className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent break-words"
                                                initial={{ x: -30, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: 0.3, type: "spring", damping: 25 }}
                                            >
                                                Welcome, {userName}!
                                            </motion.h1>
                                            <motion.div
                                                className="absolute -right-8 -top-2"
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ delay: 0.8, type: "spring", damping: 10 }}
                                            >
                                                <motion.span 
                                                    className="text-4xl"
                                                    animate={{ rotate: [0, 20, -20, 0] }}
                                                    transition={{ delay: 1.5, duration: 0.6, ease: "easeInOut" }}
                                                >
                                                    👋
                                                </motion.span>
                                            </motion.div>
                                        </div>
                                        {((Array.isArray(currentUser?.app_metadata?.roles) && currentUser.app_metadata.roles.includes('admin')) || currentUser?.user_metadata?.role === 'admin') && (
                                            <motion.span 
                                                className="px-3 py-1.5 rounded-full text-sm bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-200 border border-amber-400/40 backdrop-blur-sm"
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.5, type: "spring", damping: 15 }}
                                            >
                                                ✨ Admin
                                            </motion.span>
                                        )}
                                    </div>
                                </motion.div>
                                <div className="flex flex-col xl:grid xl:grid-cols-3 gap-4 md:gap-6 h-full">
                                    <div className="xl:col-span-2 flex-1 min-h-0">
                                        <CreateMeeting onSubmit={handleCreateMeeting} isLoading={isLoading} initialUserName={userName} navigate={navigate} />
                                    </div>
                                    <div className="xl:col-span-1 flex-shrink-0 h-auto xl:h-full">
                                        <div className="h-full max-h-[50vh] xl:max-h-full overflow-hidden">
                                            <InfoPanel 
                                                onQuickStart={handleQuickStart}
                                                onSchedule={() => {
                                                    setScheduleFormValues({
                                                        userName: userName || '',
                                                        meetingTitle: '',
                                                        meetingPurpose: '',
                                                        meetingPassword: '',
                                                        scheduleDate: null,
                                                        scheduleTime: null,
                                                        micEnabled: true,
                                                        cameraEnabled: true,
                                                        waitingRoomEnabled: false,
                                                    });
                                                    setIsScheduleFormOpen(true);
                                                }}
                                                onViewScheduled={() => setViewScheduleModal(true)}
                                                onViewPast={() => setViewPastModal(true)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Removed Upcoming/Past lists in favor of modals */}
                            </div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default function MeetingPageContainer() {
    return (
        <div className="relative min-h-screen bg-slate-950 text-white font-sans">
            <AnimatedBackground />
            <MeetingPage />
        </div>
    );
}