import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// --- ICONS ---
const SuccessIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const ErrorIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const WarningIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>);
const InfoIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);


// --- RESPONSIVE TOAST COMPONENT ---
const Toast = ({ toast, onClose }) => {
  // This state holds the last valid toast data to ensure
  // the component can render correctly during its exit animation.
  const [latestToast, setLatestToast] = useState(toast);

  useEffect(() => {
    if (toast) {
      setLatestToast(toast);
    }
  }, [toast]);

  // If there's no toast data, render nothing.
  if (!latestToast) {
    return null;
  }
  
  const { id, message, type = 'info', title, duration = 5000 } = latestToast;
  
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef(Date.now());
  const progressControls = useAnimation();

  // Configuration for different toast types
  const toastConfig = {
    success: { icon: <SuccessIcon />, text: 'text-emerald-400', progress: 'bg-emerald-400' },
    error: { icon: <ErrorIcon />, text: 'text-red-400', progress: 'bg-red-400' },
    warning: { icon: <WarningIcon />, text: 'text-amber-400', progress: 'bg-amber-400' },
    info: { icon: <InfoIcon />, text: 'text-sky-400', progress: 'bg-sky-400' },
  };
  const config = toastConfig[type] || toastConfig.info;

  const handleClose = useCallback(() => {
      onClose();
  }, [onClose]);

  // Reset timer logic when a new toast appears
  useEffect(() => {
    remainingTimeRef.current = duration;
    startTimeRef.current = Date.now();
    setIsPaused(false);
  }, [id, duration]);

  // Effect to handle the auto-close timer and progress bar
  useEffect(() => {
    if (isPaused) {
      clearTimeout(timerRef.current);
      progressControls.stop();
    } else {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(handleClose, remainingTimeRef.current);
      progressControls.start({
        width: '0%',
        transition: { duration: remainingTimeRef.current / 1000, ease: 'linear' },
      });
    }
    return () => clearTimeout(timerRef.current);
  }, [isPaused, handleClose, progressControls]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const timeElapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current -= timeElapsed;
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <motion.div
      layout
      // CHANGE: Animation is now vertical (from the top) which works better for both
      // centered mobile views and corner desktop views.
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // CHANGE: Adjusted padding for different screen sizes for a better look.
      className="relative flex w-full max-w-sm p-3 sm:p-4 rounded-lg shadow-lg bg-slate-900 border border-slate-700/80 overflow-hidden"
      role="alert"
    >
      <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${config.text}`}>
        {config.icon}
      </div>
      <div className="ml-3 flex-1">
        <p className={`text-sm font-semibold ${config.text}`}>{title}</p>
        <p className="mt-1 text-sm text-slate-400">{message}</p>
      </div>
      <button type="button" onClick={handleClose} className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors">
        <CloseIcon />
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-700/50">
        <motion.div className={`h-full ${config.progress}`} initial={{ width: '100%' }} animate={progressControls} />
      </div>
    </motion.div>
  );
};

export default Toast;
