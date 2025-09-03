// src/components/InfoPanel.js

import React, { useState, useEffect } from 'react';
// highlight-start
// Added 'CalendarDays' for the new component's icon
import { Video, Clock, CalendarDays } from 'lucide-react';
// highlight-end

// --- LiveClock Component (dynamic) ---
const LiveClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const [currentTime, ampm] = timeString.split(' ');
    const formattedDate = time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    return (
        <div className="relative bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-slate-800/60 p-6 rounded-2xl border border-slate-700/50 text-center shadow-xl backdrop-blur-sm overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />
            
            {/* Animated background elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl animate-pulse-glow" />
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-purple-500/10 rounded-full blur-xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
            
            <div className="relative z-10">
                <p className="text-5xl font-bold text-transparent bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text tracking-wider mb-2">
                    {currentTime}
                    <span className="text-2xl text-slate-400 ml-3 align-baseline">{ampm}</span>
                </p>
                <p className="text-sm text-slate-400 font-medium">{formattedDate}</p>
                
                {/* Live indicator */}
                <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-500 font-medium">LIVE</span>
                </div>
            </div>
        </div>
    );
};

// highlight-start
// --- Link to view all scheduled meetings ---
const ViewMeetingsLink = ({ onView }) => {
    const handleViewAll = () => { if (typeof onView === 'function') onView(); };

    return (
        <div className="space-y-4 flex flex-col">
            <h3 className="text-lg font-semibold text-transparent bg-gradient-to-r from-white to-slate-200 bg-clip-text px-2">My Schedule</h3>
            <div className="relative group">
                <button
                    onClick={handleViewAll}
                    className="w-full flex items-center gap-4 p-5 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 text-left transition-all duration-300 hover:bg-slate-800/70 hover:border-slate-600/70 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                    <div className="relative p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
                        <CalendarDays size={22} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                        <div className="absolute inset-0 rounded-xl bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse-glow" />
                    </div>
                    <div className="flex-grow">
                        <p className="font-semibold text-white group-hover:text-blue-100 transition-colors">View All Scheduled Meetings</p>
                        <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Review, edit, or join your meetings.</p>
                    </div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
                
                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
        </div>
    );
};
// highlight-end

// --- Link to view all past meetings ---
const ViewPastMeetingsLink = ({ onView }) => {
    const handleViewAll = () => { if (typeof onView === 'function') onView(); };
    
    return (
        <div className="space-y-4 flex flex-col">
            <div className="relative group">
                <button
                    onClick={handleViewAll}
                    className="w-full flex items-center gap-4 p-5 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 text-left transition-all duration-300 hover:bg-slate-800/70 hover:border-slate-600/70 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                    <div className="relative p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-300">
                        <CalendarDays size={22} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
                        <div className="absolute inset-0 rounded-xl bg-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse-glow" />
                    </div>
                    <div className="flex-grow">
                        <p className="font-semibold text-white group-hover:text-purple-100 transition-colors">View All Past Meetings</p>
                        <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Browse your recent calls and re-open details.</p>
                    </div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
                
                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
        </div>
    );
};

export const InfoPanel = ({ onQuickStart, onSchedule, onViewScheduled, onViewPast }) => {
    return (
        <div className="flex flex-col space-y-8 h-full p-2">
            {/* Dashboard Section */}
            <div className="space-y-5">
                <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text px-2">Dashboard</h3>
                <LiveClock />
            </div>
            
            {/* Quick Actions Section */}
            <div className="space-y-5">
                <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text px-2">Quick Actions</h3>
                
                <div className="space-y-4">
                    {/* Start Instant Meeting - Primary Action */}
                    <div className="relative group">
                        <button
                            onClick={onQuickStart}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/40 active:scale-[0.98] shadow-xl border border-blue-500/20"
                        >
                            <Video size={22} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                            <span className="text-lg">Start Instant Meeting</span>
                            <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse" />
                        </button>
                        
                        {/* Animated background effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10" />
                    </div>

                    {/* Schedule Meeting - Secondary Action */}
                    <div className="relative group">
                        <button
                            onClick={onSchedule}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 text-slate-100 font-semibold transition-all duration-300 hover:bg-slate-800/80 hover:border-slate-600/70 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                        >
                            <Clock size={20} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                            <span>Schedule Meeting</span>
                        </button>
                        
                        {/* Hover effect overlay */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                </div>
            </div>
            
            {/* Meeting Management Section */}
            <ViewMeetingsLink onView={onViewScheduled} />
            <ViewPastMeetingsLink onView={onViewPast} />
        </div>
    );
};