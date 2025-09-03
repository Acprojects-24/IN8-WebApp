import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { gsap } from 'gsap';

const routeToActive = (pathname) => {
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/meeting')) return 'Meetings';
  if (pathname.startsWith('/calendar')) return 'Calendar';
  if (pathname.startsWith('/admin/users')) return 'User Management';
  if (pathname.startsWith('/admin/security')) return 'Security';
  if (pathname.startsWith('/admin/customization')) return 'Customization';
  if (pathname.startsWith('/admin/status')) return 'System Status';
  if (pathname.startsWith('/notifications')) return 'Notifications';
  if (pathname.startsWith('/docs')) return 'Documentation';
  return '';
};

export default function AppLayout() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(routeToActive(location.pathname));
  const contentRef = useRef(null);

  // Keep active link in sync with route
  useEffect(() => {
    setActiveLink(routeToActive(location.pathname));
  }, [location.pathname]);

  // Animate content on route change
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    gsap.fromTo(el, { opacity: 0, y: 10, scale: 0.995 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' });
  }, [location.pathname]);

  // Hide sidebar on: active meeting routes /meeting/<id>, guest pre-join /guest/<id>, and the home page /home
  // Keep it visible for /meeting (dashboard)
  const hideSidebar = (
    /^\/meeting\/[^\/]+/.test(location.pathname) ||
    /^\/guest\/[^\/]+/.test(location.pathname) ||
    /^\/home$/.test(location.pathname)
  );
  const isAdminUsers = location.pathname.startsWith('/admin/users');

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-930 to-slate-900 text-white">
      <div className="flex h-full overflow-hidden">
        <Sidebar hidden={hideSidebar} isOpen={isOpen} setIsOpen={setIsOpen} activeLink={activeLink} setActiveLink={setActiveLink} />
        <main ref={contentRef} className={`flex-1 min-w-0 ${isAdminUsers ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}


