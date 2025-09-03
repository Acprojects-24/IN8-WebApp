import React, { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, Video, Calendar, UserCog, Shield, 
    SlidersHorizontal, HardDrive, BellRing, BookText, 
    ChevronDown, LogOut, CircleUserRound, X
} from 'lucide-react';
import MyLogo from '../assets/logo.png'; 
import Toast from './Toast'; // <-- Yahan Toast component import kiya gaya hai

const SidebarLink = ({ icon: Icon, text, active, onClick, to }) => (
    <Link 
        to={to}
        onClick={onClick} 
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors relative text-sm ${ active ? 'bg-blue-600/30 text-white font-medium' : 'text-slate-300 hover:bg-white/10 hover:text-white' }`}
    >
        {active && <motion.div layoutId="active-pill" className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
        <Icon size={16} />
        <span>{text}</span>
    </Link>
);

const CollapsibleSection = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                {title}
                <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="pl-4 pr-2 pt-1 space-y-1 overflow-hidden">
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Core sidebar content
const SidebarContent = ({ activeLink, setActiveLink, onLogout }) => {
    const Logo = MyLogo;
    const [user, setUser] = useState({ name: '', email: '' });

    useEffect(() => {
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        if (userName && userEmail) {
            setUser({ name: userName, email: userEmail });
        }
    }, []);

    return (
        <>
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <img src={Logo} alt="IN8 Logo" className="w-16 h-16 object-contain" />
                    <h1 className="text-2xl font-bold text-white">IN8</h1>
                </div>
            </div>
            <nav className="flex-1 space-y-2 mt-4 px-2">
                <SidebarLink 
                    to="/dashboard" 
                    icon={LayoutDashboard} 
                    text="Dashboard" 
                    active={activeLink === 'Dashboard'} 
                    onClick={() => setActiveLink('Dashboard')} 
                />
                <CollapsibleSection title="Workspace">
                    <SidebarLink to="/meeting" icon={Video} text="Meetings" active={activeLink === 'Meetings'} onClick={() => setActiveLink('Meetings')} />
                    <SidebarLink to="/calendar" icon={Calendar} text="Calendar" active={activeLink === 'Calendar'} onClick={() => setActiveLink('Calendar')} />
                </CollapsibleSection>
                <CollapsibleSection title="Admin Tools">
                    <SidebarLink to="/admin/users" icon={UserCog} text="User Management" active={activeLink === 'User Management'} onClick={() => setActiveLink('User Management')} />
                    <SidebarLink to="/admin/security" icon={Shield} text="Security" active={activeLink === 'Security'} onClick={() => setActiveLink('Security')} />
                    <SidebarLink to="/admin/customization" icon={SlidersHorizontal} text="Customization" active={activeLink === 'Customization'} onClick={() => setActiveLink('Customization')} />
                    <SidebarLink to="/admin/status" icon={HardDrive} text="System Status" active={activeLink === 'System Status'} onClick={() => setActiveLink('System Status')} />
                </CollapsibleSection>
                <CollapsibleSection title="Resources">
                    <SidebarLink to="/notifications" icon={BellRing} text="Notifications" active={activeLink === 'Notifications'} onClick={() => setActiveLink('Notifications')} />
                    <SidebarLink to="/docs" icon={BookText} text="Documentation" active={activeLink === 'Documentation'} onClick={() => setActiveLink('Documentation')} />
                </CollapsibleSection>
            </nav>
            <div className="mt-auto p-2 border-t border-slate-700/50">
                <div className="flex items-center gap-3 p-2 rounded-lg">
                    <img src={`https://i.pravatar.cc/150?u=${user.email}`} alt="User Avatar" className="w-10 h-10 rounded-full" />
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <button onClick={onLogout} title="Logout">
                        <LogOut size={18} className="text-slate-500 hover:text-red-400 cursor-pointer transition-colors" />
                    </button>
                </div>
            </div>
        </>
    );
}

// Main responsive wrapper
export default function Sidebar({ isOpen, setIsOpen, activeLink, setActiveLink, hidden = false }) {
    const navigate = useNavigate();
    const [activeToast, setActiveToast] = useState(null);

    const showToast = (toastData) => {
        setActiveToast({ id: Date.now(), ...toastData });
    };

    const handleLogout = () => {
        // Local storage se user data clear karein
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');

        // Success toast dikhayein with a specific duration
        const toastDuration = 1500; // 1.5 seconds
        showToast({ 
            title: 'Logout Successful', 
            message: 'You have been successfully logged out.', 
            type: 'success',
            duration: toastDuration 
        });

        // Toast ke duration ke baad hi navigate karein
        setTimeout(() => {
            navigate('/');
        }, toastDuration);
    };

    return (
        <>
            <div className="fixed top-5 right-5 z-50 w-full max-w-sm">
                <AnimatePresence>
                    {activeToast && (
                        <Toast
                            key={activeToast.id}
                            toast={activeToast}
                            onClose={() => setActiveToast(null)}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* --- Desktop Sidebar --- */}
            <aside className={`w-64 min-h-screen ${hidden ? 'hidden' : 'hidden lg:flex'} flex-col bg-black/20 backdrop-blur-lg p-4 border-r border-slate-800`}>
                <SidebarContent 
                    activeLink={activeLink} 
                    setActiveLink={setActiveLink}
                    onLogout={handleLogout}
                />
            </aside>

            {/* --- Mobile Sidebar --- */}
            <AnimatePresence>
                {isOpen && !hidden && (
                    <div className="lg:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 z-40"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed top-0 left-0 h-full w-64 bg-slate-900/90 backdrop-blur-lg p-4 border-r border-slate-800 z-50 flex flex-col"
                        >
                            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                            <SidebarContent 
                                activeLink={activeLink} 
                                setActiveLink={setActiveLink} 
                                onLogout={handleLogout}
                            />
                        </motion.aside>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
