import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend, 
  RadialBarChart, RadialBar, PolarAngleAxis, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence, useInView, animate } from 'framer-motion';
import {
    Bell, Video, MessageSquare, UserPlus, FileText, ChevronLeft, ChevronRight, Search, ArrowRight, PlusCircle, Send,
    LayoutDashboard, Briefcase, Calendar as CalendarIcon, Settings, LifeBuoy, LogOut, Users, Menu, X,
    Activity, TrendingUp, Clock, Database, Zap, Globe, Shield, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import Sidebar from '../components/Sidebar.jsx';
import { supabase } from '../supabase';
import { useJicofoMetrics } from '../components/metrics/useJicofoMetrics.ts';
import MetricsCards from '../components/metrics/MetricsCards.jsx';
import BridgesTable from '../components/metrics/BridgesTable.jsx';
import { getUserProfile, getProfileImage, getUserId } from '../utils/profileUtils';
import { createProfileTransition } from '../utils/profileTransition';

// GSAP Plugin Registration
gsap.registerPlugin(DrawSVGPlugin);

// --- COLORS AND CONSTANTS ---
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#f59e0b', '#06b6d4', '#84cc16'];

// --- UTILITY FUNCTIONS ---
const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMs = now - time;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return time.toLocaleDateString();
};

const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
};


// --- Custom Hooks ---
const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: undefined,
    });
    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
            });
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return windowSize;
};

// Custom hook for real-time dashboard metrics
const useDashboardMetrics = () => {
    const [metrics, setMetrics] = useState({
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        totalMeetings: 0,
        scheduledMeetings: 0,
        completedMeetings: 0,
        totalMeetingActions: 0,
        isLoading: true,
        error: null
    });

    const fetchMetrics = useCallback(async () => {
        try {
            setMetrics(prev => ({ ...prev, isLoading: true, error: null }));

            // Fetch all metrics in parallel
            const [usersResponse, meetingsResponse, actionsResponse, todayUsersResponse] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact' }),
                supabase.from('meetings').select('*', { count: 'exact' }),
                supabase.from('meeting_actions').select('*', { count: 'exact' }),
                supabase.from('users').select('*', { count: 'exact' }).gte('created_at', new Date().toISOString().split('T')[0])
            ]);

            // Get scheduled meetings
            const { count: scheduledCount } = await supabase
                .from('meetings')
                .select('*', { count: 'exact' })
                .eq('is_scheduled', true)
                .gt('scheduled_for', new Date().toISOString())
                ;

            // Get active users (users who created meetings in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: activeMeetings } = await supabase
                .from('meetings')
                .select('created_by')
                .gt('created_at', thirtyDaysAgo.toISOString());

            const activeUserIds = [...new Set(activeMeetings?.map(m => m.created_by) || [])];

            setMetrics({
                totalUsers: usersResponse.count || 0,
                activeUsers: activeUserIds.length,
                newUsersToday: todayUsersResponse.count || 0,
                totalMeetings: meetingsResponse.count || 0,
                scheduledMeetings: scheduledCount || 0,
                completedMeetings: (meetingsResponse.count || 0) - (scheduledCount || 0),
                totalMeetingActions: actionsResponse.count || 0,
                isLoading: false,
                error: null
            });
        } catch (error) {
            console.error('Error fetching metrics:', error);
            setMetrics(prev => ({ ...prev, isLoading: false, error: error.message }));
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    return { metrics, refetch: fetchMetrics };
};

// Custom hook for real-time activity feed
const useRealtimeActivity = () => {
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            try {
                // Get recent users (last 10)
                const { data: recentUsers } = await supabase
                    .from('users')
                    .select('first_name, last_name, created_at, email')
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Get recent meetings (last 10)
                const { data: recentMeetings } = await supabase
                    .from('meetings')
                    .select('name, created_at, host_name')
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Get recent meeting actions
                const { data: recentActions } = await supabase
                    .from('meeting_actions')
                    .select('type, created_at, platform')
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Combine and format activities
                const formattedActivities = [];

                recentUsers?.forEach(user => {
                    formattedActivities.push({
                        id: `user-${user.email}`,
                        icon: UserPlus,
                        text: `New user '${user.first_name || user.email}' signed up.`,
                        time: formatTimeAgo(user.created_at),
                        timestamp: user.created_at,
                        color: "text-blue-400"
                    });
                });

                recentMeetings?.forEach(meeting => {
                    formattedActivities.push({
                        id: `meeting-${meeting.created_at}`,
                        icon: Video,
                        text: `Meeting '${meeting.name}' was created by ${meeting.host_name || 'a user'}.`,
                        time: formatTimeAgo(meeting.created_at),
                        timestamp: meeting.created_at,
                        color: "text-green-400"
                    });
                });

                recentActions?.forEach(action => {
                    formattedActivities.push({
                        id: `action-${action.created_at}`,
                        icon: action.type === 'start_streaming' ? Globe : Activity,
                        text: `${action.type.replace('_', ' ')} action${action.platform ? ` on ${action.platform}` : ''}.`,
                        time: formatTimeAgo(action.created_at),
                        timestamp: action.created_at,
                        color: action.type === 'start_streaming' ? "text-purple-400" : "text-orange-400"
                    });
                });

                // Sort by timestamp and take most recent 8
                formattedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setActivities(formattedActivities.slice(0, 8));
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching activity:', error);
                setIsLoading(false);
            }
        };

        fetchRecentActivity();

        // Set up real-time subscriptions
        const usersSubscription = supabase
            .channel('dashboard-users')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, 
                (payload) => {
                    const newUser = payload.new;
                    const newActivity = {
                        id: `user-${newUser.email}-${Date.now()}`,
                        icon: UserPlus,
                        text: `New user '${newUser.first_name || newUser.email}' signed up.`,
                        time: 'Just now',
                        timestamp: newUser.created_at,
                        color: "text-blue-400"
                    };
                    setActivities(prev => [newActivity, ...prev.slice(0, 7)]);
                })
            .subscribe();

        const meetingsSubscription = supabase
            .channel('dashboard-meetings')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meetings' },
                (payload) => {
                    const newMeeting = payload.new;
                    const newActivity = {
                        id: `meeting-${newMeeting.id}-${Date.now()}`,
                        icon: Video,
                        text: `Meeting '${newMeeting.name}' was created.`,
                        time: 'Just now',
                        timestamp: newMeeting.created_at,
                        color: "text-green-400"
                    };
                    setActivities(prev => [newActivity, ...prev.slice(0, 7)]);
                })
            .subscribe();

        const actionsSubscription = supabase
            .channel('dashboard-actions')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_actions' },
                (payload) => {
                    const newAction = payload.new;
                    const newActivity = {
                        id: `action-${newAction.id}-${Date.now()}`,
                        icon: newAction.type === 'start_streaming' ? Globe : Activity,
                        text: `${newAction.type.replace('_', ' ')} action initiated.`,
                        time: 'Just now',
                        timestamp: newAction.created_at,
                        color: newAction.type === 'start_streaming' ? "text-purple-400" : "text-orange-400"
                    };
                    setActivities(prev => [newActivity, ...prev.slice(0, 7)]);
                })
            .subscribe();

        return () => {
            usersSubscription.unsubscribe();
            meetingsSubscription.unsubscribe();
            actionsSubscription.unsubscribe();
        };
    }, []);

    return { activities, isLoading };
};

// Custom hook for chart data
const useChartData = () => {
    const [chartData, setChartData] = useState({
        userGrowth: [],
        meetingTrends: [],
        meetingTypes: [],
        isLoading: true
    });

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                // Get user growth data (last 7 days)
                const userGrowthData = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
                    const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();

                    const { count } = await supabase
                        .from('users')
                        .select('*', { count: 'exact' })
                        .gte('created_at', startOfDay)
                        .lte('created_at', endOfDay);

                    userGrowthData.push({
                        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                        users: count || 0,
                        date: startOfDay
                    });
                }

                // Get meeting trends (last 7 days)
                const meetingTrendsData = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
                    const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();

                    const { count } = await supabase
                        .from('meetings')
                        .select('*', { count: 'exact' })
                        .gte('created_at', startOfDay)
                        .lte('created_at', endOfDay);

                    meetingTrendsData.push({
                        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                        meetings: count || 0,
                        date: startOfDay
                    });
                }

                // Get meeting types distribution
                const { data: meetings } = await supabase
                    .from('meetings')
                    .select('purpose');

                const typeCounts = {};
                meetings?.forEach(meeting => {
                    const type = meeting.purpose || 'General';
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                });

                const meetingTypesData = Object.entries(typeCounts).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value
                }));

                setChartData({
                    userGrowth: userGrowthData,
                    meetingTrends: meetingTrendsData,
                    meetingTypes: meetingTypesData,
                    isLoading: false
                });
            } catch (error) {
                console.error('Error fetching chart data:', error);
                setChartData(prev => ({ ...prev, isLoading: false }));
            }
        };

        fetchChartData();
    }, []);

    return chartData;
};

// Custom hook for upcoming meetings
const useUpcomingMeetings = () => {
    const [upcomingMeetings, setUpcomingMeetings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUpcomingMeetings = async () => {
            try {
                const { data: meetings } = await supabase
                    .from('meetings')
                    .select('name, scheduled_for, host_name, created_by')
                    .eq('is_scheduled', true)
                    .gt('scheduled_for', new Date().toISOString())
                    .order('scheduled_for', { ascending: true })
                    .limit(5);

                const formattedMeetings = meetings?.map(meeting => ({
                    time: formatTime(meeting.scheduled_for),
                    title: meeting.name,
                    host: meeting.host_name || 'Unknown',
                    scheduled_for: meeting.scheduled_for
                })) || [];

                setUpcomingMeetings(formattedMeetings);
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching upcoming meetings:', error);
                setIsLoading(false);
            }
        };

        fetchUpcomingMeetings();

        // Set up real-time subscription for meetings
        const subscription = supabase
            .channel('dashboard-upcoming')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, 
                () => {
                    fetchUpcomingMeetings();
                })
            .subscribe();

        return () => subscription.unsubscribe();
    }, []);

    return { upcomingMeetings, isLoading };
};


// --- REUSABLE & RESPONSIVE COMPONENTS ---

function Counter({ from, to, label }) {
    const nodeRef = useRef();
    useEffect(() => {
        const node = nodeRef.current;
        const controls = animate(from, to, {
            duration: 1.5,
            onUpdate(value) { node.textContent = value.toFixed(0) + label; }
        });
        return () => controls.stop();
    }, [from, to, label]);
    return <h3 ref={nodeRef} className="text-xl sm:text-2xl font-semibold text-white" />;
}

const MetricCard = ({ title, value, change, isPositive, label = "", icon: Icon, gradient = "from-blue-500 to-purple-600" }) => (
    <motion.div 
        className="relative overflow-hidden bg-slate-800/40 backdrop-blur-lg rounded-2xl border border-slate-700/50 h-full group hover:border-slate-600/50 transition-all duration-300"
        whileHover={{ y: -4, scale: 1.02 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        {/* Gradient background overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
        
        <div className="relative p-6 h-full flex flex-col">
            {/* Header with icon */}
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} p-2.5 shadow-lg`}>
                    {Icon && <Icon className="w-full h-full text-white" />}
                </div>
                <div className={`text-xs px-3 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {change}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col justify-center">
                <p className="text-sm text-slate-400 mb-2 font-medium">{title}</p>
                <div className="flex items-baseline gap-2">
                    {typeof value === 'number' ? 
                        <Counter from={0} to={value} label={label} /> : 
                        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                    }
                </div>
            </div>

            {/* Bottom accent line */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
        </div>
    </motion.div>
);

const InfoCard = ({ title, description, children, className, gradient = "from-slate-600 to-slate-700" }) => (
    <motion.div 
        className={`relative overflow-hidden bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -2 }}
    >
        {/* Subtle gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-3`} />
        
        <div className="relative p-6 flex flex-col h-full">
            {/* Header */}
            <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-1">{title}</h4>
                {description && <p className="text-sm text-slate-400 leading-relaxed">{description}</p>}
            </div>
            
            {/* Content */}
            <div className="flex-1 flex flex-col">
                {children}
            </div>
        </div>
    </motion.div>
);

const StatsCard = ({ title, stats, icon: Icon, gradient = "from-blue-500 to-cyan-500" }) => (
    <motion.div 
        className="relative overflow-hidden bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 group"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -4 }}
    >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
        
        <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} p-2 shadow-lg`}>
                    {Icon && <Icon className="w-full h-full text-white" />}
                </div>
            </div>
            
            <div className="space-y-4">
                {stats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradient}`} />
                            <span className="text-sm text-slate-300">{stat.label}</span>
                        </div>
                        <span className="text-lg font-bold text-white">{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    </motion.div>
);

const CalendarView = () => {
    const [date, setDate] = useState(new Date(2025, 6, 17));
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

    const changeMonth = (offset) => {
        setDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + offset, 1));};

    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
                <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-slate-700"><ChevronLeft size={18} /></button>
                <h5 className="font-bold text-sm sm:text-base">{monthNames[date.getMonth()]} {date.getFullYear()}</h5>
                <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-slate-700"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-x-2 gap-y-2 text-center text-xs text-slate-400 flex-grow">
                {daysOfWeek.map((day, index) => <div key={`day-${index}`} className="font-semibold text-xs">{day}</div>)}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: daysInMonth }).map((_, day) => {
                    const dayNumber = day + 1;
                    const isToday = dayNumber === 17;
                    return (
                        <div key={dayNumber} className={`w-full aspect-square flex items-center justify-center rounded-full cursor-pointer text-xs sm:text-sm ${isToday ? 'bg-blue-500 text-white font-bold' : 'hover:bg-slate-700'}`}>
                            {dayNumber}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ResourceStatCard = ({ title, value, color, data }) => {
    return (
        <InfoCard title={title} className="h-full">
            <div className="flex-grow flex flex-col justify-between text-center sm:text-left">
                <p className="text-lg sm:text-xl font-bold" style={{ color }}>{value.toFixed(1)}%</p>
                <p className="text-xs text-slate-400 mb-2 hidden sm:block">Live Usage</p>
                <ResponsiveContainer width="100%" height={40}>
                    <BarChart data={data}>
                        <Bar dataKey="v" fill={color} radius={2}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </InfoCard>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
export default function App() {
  const lineChartRef = useRef(null);
  const isInView = useInView(lineChartRef, { once: true, margin: "-100px" });
  const [userName, setUserName] = useState('User');
  const [profileImage, setProfileImage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Create profile transition function
  const navigate = useNavigate();
  const profileTransition = createProfileTransition(navigate);
  const { width } = useWindowSize();
  const isMobile = width < 640;

  // Use custom hooks for real-time data
  const { metrics, refetch: refetchMetrics } = useDashboardMetrics();
  const { activities, isLoading: activitiesLoading } = useRealtimeActivity();
  const { userGrowth, meetingTrends, meetingTypes, isLoading: chartLoading } = useChartData();
  const { upcomingMeetings, isLoading: upcomingLoading } = useUpcomingMeetings();
  const { data: jicofoMetrics, loading: jicofoLoading, error: jicofoError, lastUpdated: jicofoLastUpdated } = useJicofoMetrics();

  // Simulated system metrics (can be replaced with real system monitoring)
  const generateResourceData = () => Array.from({ length: 20 }, () => ({ v: Math.random() * 100 }));
  const [cpuData, setCpuData] = useState(generateResourceData());
  const [memoryData, setMemoryData] = useState(generateResourceData());
  const [diskData, setDiskData] = useState(generateResourceData());

  useEffect(() => {
    const loadUserData = () => {
      const profile = getUserProfile();
      if (profile?.name) setUserName(profile.name);
      else {
        const storedUserName = localStorage.getItem('userName');
        if (storedUserName) setUserName(storedUserName);
      }

      const userId = getUserId();
      setProfileImage(getProfileImage(userId));
    };

    loadUserData();

    const handleProfileUpdate = () => loadUserData();
    window.addEventListener('storage', handleProfileUpdate);
    window.addEventListener('profileUpdated', handleProfileUpdate);

    // System metrics simulation - can be replaced with real monitoring
    const interval = setInterval(() => {
        setCpuData(d => [...d.slice(1), { v: Math.random() * 100 }]);
        setMemoryData(d => [...d.slice(1), { v: Math.random() * 100 }]);
        setDiskData(d => [...d.slice(1), { v: Math.random() * 100 }]);
    }, 2000);

    // Refresh all data every 5 minutes
    const refreshInterval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
        refetchMetrics();
    }, 5 * 60 * 1000);

    return () => {
        clearInterval(interval);
        clearInterval(refreshInterval);
        window.removeEventListener('storage', handleProfileUpdate);
        window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [refetchMetrics]);

  // Manual refresh function
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchMetrics();
  };

  useEffect(() => {
    if (isInView && lineChartRef.current) {
        const linePath = lineChartRef.current.querySelector('.recharts-line-path');
        if (linePath) {
            gsap.fromTo(linePath, { drawSVG: 0 }, { drawSVG: "100%", duration: 2, ease: "power2.inOut" });
        }
    }
  }, [isInView]);

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };
  
  const cardAnimation = {
      initial: { opacity: 0, y: 30 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.3 },
      transition: { type: 'spring', stiffness: 100, damping: 15, duration: 0.5 },
      whileHover: { scale: 1.02, transition: { type: 'spring', stiffness: 300 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col h-screen">
            {/* Enhanced Header */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6 }} 
                className="relative border-b border-slate-800/50 bg-slate-900/20 backdrop-blur-xl z-20"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5" />
                
                <div className="relative flex justify-between items-center px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-slate-700/50 transition-colors">
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                Welcome back, {userName.split(' ')[0]}! 👋
                            </h1>
                            <p className="text-slate-400 mt-1 hidden md:block">Your real-time analytics overview</p>
                            {metrics.isLoading && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    <p className="text-blue-400 text-sm">Syncing live data...</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <input 
                                type="text" 
                                placeholder="Search metrics..." 
                                className="bg-slate-800/50 border border-slate-600/50 rounded-2xl py-3 pl-12 pr-4 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all"
                            />
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                        
                        <button 
                            onClick={handleRefresh}
                            className="p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 hover:bg-slate-700/50 transition-all duration-300 backdrop-blur-sm group"
                            title="Refresh dashboard data"
                        >
                            <Activity size={20} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                        </button>
                        
                        <button className="p-3 rounded-xl bg-slate-800/50 border border-slate-600/50 hover:bg-slate-700/50 transition-all duration-300 backdrop-blur-sm relative">
                            <Bell size={20} className="text-slate-300" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        </button>
                        
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                profileTransition(e.target.closest('img'));
                            }}
                            className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-600/50 hover:border-blue-500/50 transition-colors"
                            title="Profile"
                        >
                            <img 
                                src={profileImage}
                                alt="Profile" 
                                className="w-full h-full object-cover" 
                            />
                        </button>
                    </div>
                </div>
            </motion.header>

            {/* Main Dashboard Content */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto thin-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">
                    
                    {/* Key Metrics - Enhanced Grid */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        <MetricCard 
                            title="Total Users" 
                            value={metrics.isLoading ? "..." : metrics.totalUsers} 
                            change={`+${metrics.newUsersToday} today`} 
                            isPositive={true}
                            icon={Users}
                            gradient="from-blue-500 to-blue-600"
                        />
                        <MetricCard 
                            title="Active Users" 
                            value={metrics.isLoading ? "..." : metrics.activeUsers} 
                            change="Last 30 days" 
                            isPositive={true}
                            icon={TrendingUp}
                            gradient="from-emerald-500 to-emerald-600"
                        />
                        <MetricCard 
                            title="Total Meetings" 
                            value={metrics.isLoading ? "..." : metrics.totalMeetings} 
                            change={`${metrics.scheduledMeetings} scheduled`} 
                            isPositive={true}
                            icon={Video}
                            gradient="from-purple-500 to-purple-600"
                        />
                        <MetricCard 
                            title="System Actions" 
                            value={metrics.isLoading ? "..." : metrics.totalMeetingActions} 
                            change="All time" 
                            isPositive={true}
                            icon={Zap}
                            gradient="from-orange-500 to-orange-600"
                        />
                    </motion.section>

                    {/* Jicofo Metrics Section */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="space-y-6"
                    >
                        {/* Section Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">🎯 Jitsi Metrics</h2>
                                <p className="text-slate-400">Real-time Jicofo server metrics and bridge status</p>
                            </div>
                            {jicofoLastUpdated && (
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                    <Clock size={14} />
                                    Updated: {jicofoLastUpdated.toLocaleTimeString()}
                                </div>
                            )}
                        </div>

                        {/* Metrics Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            <MetricsCards 
                                data={jicofoMetrics}
                                loading={jicofoLoading}
                                error={jicofoError}
                                lastUpdated={jicofoLastUpdated}
                            />
                        </div>

                        {/* Bridges Table */}
                        {jicofoMetrics?.bridges?.items?.length > 0 && (
                            <BridgesTable 
                                bridges={jicofoMetrics.bridges.items}
                                loading={jicofoLoading}
                            />
                        )}
                    </motion.section>

                    {/* Analytics Grid - Redesigned */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                    >
                        {/* Meeting Types Chart */}
                        <InfoCard 
                            title="Meeting Distribution" 
                            description="Types of meetings created"
                            gradient="from-purple-600 to-pink-600"
                            className="xl:col-span-1"
                        >
                            <div className="flex flex-col h-full min-h-[320px]">
                                {chartLoading ? (
                                    <div className="flex items-center justify-center flex-1">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                                    </div>
                                ) : meetingTypes.length > 0 ? (
                                    <>
                                        <div className="relative flex items-center justify-center flex-1">
                                            <ResponsiveContainer width="100%" height={240}>
                                                <PieChart>
                                                    <Pie 
                                                        data={meetingTypes} 
                                                        dataKey="value" 
                                                        nameKey="name" 
                                                        cx="50%" 
                                                        cy="50%" 
                                                        innerRadius={60} 
                                                        outerRadius={100} 
                                                        paddingAngle={2}
                                                        label={false}
                                                    >
                                                        {meetingTypes.map((entry, index) => 
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        )}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{
                                                            backgroundColor: '#1e293b', 
                                                            border: '1px solid #334155', 
                                                            borderRadius: '12px',
                                                            color: '#e2e8f0',
                                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <p className="text-3xl font-bold text-white">
                                                        {meetingTypes.reduce((acc, entry) => acc + entry.value, 0)}
                                                    </p>
                                                    <p className="text-sm text-slate-400">Total</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 space-y-3">
                                            {meetingTypes.slice(0, 4).map((entry, index) => (
                                                <div key={entry.name} className="flex items-center gap-3">
                                                    <div 
                                                        className="w-4 h-4 rounded-lg flex-shrink-0 shadow-sm" 
                                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                    />
                                                    <span className="text-slate-300 text-sm flex-1 truncate">
                                                        {entry.name}
                                                    </span>
                                                    <span className="text-white font-semibold">{entry.value}</span>
                                                </div>
                                            ))}
                                            {meetingTypes.length > 4 && (
                                                <div className="text-center pt-2">
                                                    <span className="text-xs text-slate-500">+{meetingTypes.length - 4} more categories</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center flex-1">
                                        <div className="text-center">
                                            <div className="w-20 h-20 mx-auto mb-4 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                                                <PieChartIcon size={32} className="text-purple-400" />
                                            </div>
                                            <p className="text-slate-400 font-medium">No meeting data</p>
                                            <p className="text-xs text-slate-500 mt-1">Create meetings to see analytics</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </InfoCard>

                        {/* User Growth Trend */}
                        <InfoCard 
                            title="User Growth Trend" 
                            description="Daily user registrations over the past week"
                            gradient="from-blue-600 to-cyan-600"
                            className="xl:col-span-1"
                        >
                            <div className="h-80">
                                {chartLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : userGrowth.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={userGrowth} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                                            <defs>
                                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="#94a3b8" 
                                                fontSize={12} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis 
                                                stroke="#94a3b8" 
                                                fontSize={12} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dx={-10}
                                            />
                                            <Tooltip 
                                                contentStyle={{
                                                    backgroundColor: '#1e293b', 
                                                    border: '1px solid #334155', 
                                                    borderRadius: '12px',
                                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                                }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="users" 
                                                stroke="#3b82f6" 
                                                fillOpacity={1} 
                                                fill="url(#colorUsers)" 
                                                strokeWidth={3}
                                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                                                activeDot={{ r: 8, fill: '#3b82f6', strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <div className="w-20 h-20 mx-auto mb-4 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                                <TrendingUp size={32} className="text-blue-400" />
                                            </div>
                                            <p className="text-slate-400 font-medium">No growth data</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </InfoCard>

                        {/* Calendar Widget */}
                        <InfoCard 
                            title="Calendar Overview" 
                            description="Current month view"
                            gradient="from-emerald-600 to-green-600"
                            className="xl:col-span-1"
                        >
                            <CalendarView />
                        </InfoCard>
                    </motion.section>
                    
                    {/* Activity & Insights - Final Section */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* Real-time Activity Feed - Enhanced */}
                        <InfoCard 
                            title="Live Activity Stream" 
                            description="Real-time updates from your platform"
                            gradient="from-violet-600 to-purple-600"
                            className="lg:col-span-2"
                        >
                            <div className="h-96 overflow-hidden">
                                {activitiesLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                                    </div>
                                ) : activities.length > 0 ? (
                                    <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
                                        {activities.map((item, index) => (
                                            <motion.div 
                                                key={item.id} 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="flex items-center gap-4 p-3 rounded-xl bg-slate-700/20 hover:bg-slate-700/30 transition-all duration-300 border border-slate-600/20"
                                            >
                                                <div className={`p-3 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg ${item.color}`}>
                                                    <item.icon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-200 leading-relaxed">{item.text}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <div className="w-20 h-20 mx-auto mb-4 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                                                <Activity size={32} className="text-purple-400" />
                                            </div>
                                            <p className="text-slate-400 font-medium">No recent activity</p>
                                            <p className="text-xs text-slate-500 mt-1">Activity will appear here as it happens</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </InfoCard>

                        {/* Meeting Insights & Quick Actions */}
                        <div className="space-y-6">
                            {/* Meeting Trends Chart */}
                            <InfoCard 
                                title="Meeting Analytics" 
                                description="Weekly meeting patterns"
                                gradient="from-pink-600 to-rose-600"
                                className="h-64"
                            >
                                {chartLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                    </div>
                                ) : meetingTrends.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={meetingTrends} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="#94a3b8" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dy={5}
                                            />
                                            <YAxis hide />
                                            <Tooltip 
                                                cursor={{fill: 'rgba(219, 39, 119, 0.1)'}} 
                                                contentStyle={{
                                                    backgroundColor: '#1e293b', 
                                                    border: '1px solid #334155', 
                                                    color: '#e2e8f0', 
                                                    borderRadius: '12px',
                                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                                }}
                                            />
                                            <Bar 
                                                dataKey="meetings" 
                                                fill="url(#meetingGradient)" 
                                                radius={[6, 6, 0, 0]}
                                            />
                                            <defs>
                                                <linearGradient id="meetingGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.9}/>
                                                    <stop offset="95%" stopColor="#be185d" stopOpacity={0.7}/>
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <BarChart3 size={24} className="mx-auto text-pink-400 mb-2" />
                                            <p className="text-slate-400 text-sm">No trend data</p>
                                        </div>
                                    </div>
                                )}
                            </InfoCard>

                            {/* Quick Actions Card */}
                            <InfoCard 
                                title="Quick Actions" 
                                description="Common tasks & shortcuts"
                                gradient="from-amber-600 to-orange-600"
                            >
                                <div className="space-y-3">
                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-500/30 transition-all duration-300 group"
                                    >
                                        <div className="p-2 rounded-lg bg-blue-500 group-hover:bg-blue-600 transition-colors">
                                            <PlusCircle size={18} className="text-white" />
                                        </div>
                                        <span className="text-slate-200 font-medium">Create Meeting</span>
                                        <ArrowRight size={16} className="text-slate-400 ml-auto group-hover:text-blue-400 transition-colors" />
                                    </motion.button>

                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-500/30 transition-all duration-300 group"
                                    >
                                        <div className="p-2 rounded-lg bg-purple-500 group-hover:bg-purple-600 transition-colors">
                                            <UserPlus size={18} className="text-white" />
                                        </div>
                                        <span className="text-slate-200 font-medium">Invite User</span>
                                        <ArrowRight size={16} className="text-slate-400 ml-auto group-hover:text-purple-400 transition-colors" />
                                    </motion.button>

                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300 group"
                                    >
                                        <div className="p-2 rounded-lg bg-emerald-500 group-hover:bg-emerald-600 transition-colors">
                                            <BarChart3 size={18} className="text-white" />
                                        </div>
                                        <span className="text-slate-200 font-medium">View Reports</span>
                                        <ArrowRight size={16} className="text-slate-400 ml-auto group-hover:text-emerald-400 transition-colors" />
                                    </motion.button>
                                </div>
                            </InfoCard>
                        </div>
                    </motion.section>

                    {/* Upcoming Meetings - Final Row */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.0 }}
                    >
                        <InfoCard 
                            title="Upcoming Scheduled Meetings" 
                            description="Your next meetings and appointments"
                            gradient="from-teal-600 to-cyan-600"
                        >
                            {upcomingLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                                </div>
                            ) : upcomingMeetings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {upcomingMeetings.map((meeting, index) => (
                                        <motion.div 
                                            key={`${meeting.title}-${index}`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="p-4 rounded-xl bg-slate-700/20 hover:bg-slate-700/30 transition-all duration-300 border border-slate-600/20"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                                                    <Video size={18} className="text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-white truncate">{meeting.title}</p>
                                                    <p className="text-xs text-slate-400">by {meeting.host}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-teal-400" />
                                                <span className="text-sm font-medium text-teal-400">{meeting.time}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-40">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-teal-500/10 rounded-2xl flex items-center justify-center">
                                            <CalendarIcon size={24} className="text-teal-400" />
                                        </div>
                                        <p className="text-slate-400 font-medium">No upcoming meetings</p>
                                        <p className="text-xs text-slate-500 mt-1">Schedule a meeting to get started</p>
                                    </div>
                                </div>
                            )}
                        </InfoCard>
                    </motion.section>

                </div>
            </main>
        </div>
      </div>
    </div>
  );
}
