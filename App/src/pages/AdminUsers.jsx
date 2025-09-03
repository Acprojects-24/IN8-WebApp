import React, { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { gsap } from 'gsap';
import { FiPlus, FiSave, FiEdit2, FiX, FiChevronDown, FiRefreshCcw, FiLock, FiUserX, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import Toast from '../components/Toast';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [editingUid, setEditingUid] = useState(null);
  const [editingOriginalRole, setEditingOriginalRole] = useState('user');
  const [form, setForm] = useState({ first_name: '', last_name: '', role: 'user' });
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', confirmLabel: 'Confirm', onConfirm: null });
  const [toasts, setToasts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ultimateAdminEmail, setUltimateAdminEmail] = useState('');
  const [currentUid, setCurrentUid] = useState('');
  const [currentEmailLower, setCurrentEmailLower] = useState('');
  const [hasIsActive, setHasIsActive] = useState(true);
  const CREATE_FUNCTION_NAME = 'clever-processor';
  const LIST_FUNCTION_NAME = 'list-users';
  const DELETE_FUNCTION_URL = import.meta?.env?.VITE_DELETE_FUNCTION_URL || 'https://jxseoamokdxeasuptmth.supabase.co/functions/v1/delete-user';
  const LIST_FUNCTION_URL = 'https://jxseoamokdxeasuptmth.supabase.co/functions/v1/list-users';
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createErrors, setCreateErrors] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [cardHeight, setCardHeight] = useState(null);

  // Refs for animations
  const pageRef = useRef(null);
  const headerRef = useRef(null);
  const tableRef = useRef(null);
  const modalOverlayRef = useRef(null);
  const modalPanelRef = useRef(null);
  const confirmOverlayRef = useRef(null);
  const confirmPanelRef = useRef(null);
  const headerStickyRef = useRef(null);
  const editOverlayRef = useRef(null);
  const editPanelRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = (session?.user?.email || '').toLowerCase();
        if (!session) { navigate('/'); return; }
        setCurrentUid(session.user.id);
        setCurrentEmailLower(email);
        // Authorize: allow if user's profile role is admin OR matches ultimate admin email
        let isAllowed = false;
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('uid', session.user.id)
            .maybeSingle();
          if ((profile?.role || '').toLowerCase() === 'admin') {
            isAllowed = true;
          }
        } catch (_) {}
        // Fallback/also support ultimate admin via config table
        const { data: cfg } = await supabase
          .from('config_roles')
          .select('admin_email')
          .maybeSingle();
        const cfgEmail = (cfg?.admin_email || '').toLowerCase();
        setUltimateAdminEmail(cfgEmail);
        if (!isAllowed && (!cfgEmail || cfgEmail !== email)) { navigate('/home'); return; }
        await fetchUsers();
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    bootstrap();
    return () => { isMounted = false; };
  }, [navigate]);

  const fetchUsers = async () => {
    // Try Express API first
    try {
      const API_BASE_URL = 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/users`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.users) {
          setUsers(result.data.users);
          return;
        }
      }
    } catch (_) {}

    // Fallback to direct Supabase query
    // Try with is_active; if column missing, fallback without it
    const sel = 'uid,email,first_name,last_name,role,is_active,created_at';
    let { data, error } = await supabase.from('users').select(sel).order('created_at', { ascending: false });
    if (error && /is_active/.test(String(error.message || ''))) {
      setHasIsActive(false);
      const res = await supabase
      .from('users')
      .select('uid,email,first_name,last_name,role,created_at')
      .order('created_at', { ascending: false });
      if (res.error) { setError(res.error.message); return; }
      const rows = res.data || [];
      setUsers(rows);
      return;
    }
    setHasIsActive(true);
    if (error) { setError(error.message); return; }
    const rows = data || [];
    setUsers(rows);
  };

  const startEdit = (u) => {
    setEditingUid(u.uid);
    setEditingOriginalRole((u.role || 'user'));
    setForm({ first_name: u.first_name || '', last_name: u.last_name || '', role: u.role || 'user' });
    setIsEditOpen(true);
  };
  const cancelEdit = () => { setEditingUid(null); setEditingOriginalRole('user'); setForm({ first_name: '', last_name: '', role: 'user' }); setIsEditOpen(false); };
  const performSaveEdit = async () => {
    setError('');
    // Try Express API first
    let ok = false;
    try {
      const API_BASE_URL = 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/users/${editingUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          // Note: role updates might need special handling
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) ok = true;
      }
    } catch (_) {}
    
    if (!ok) {
      // Fallback to direct Supabase update
      const { error } = await supabase
        .from('users')
        .update({ first_name: form.first_name, last_name: form.last_name, role: form.role })
        .eq('uid', editingUid);
      if (error) { setError(error.message); return; }
    }
    cancelEdit();
    await fetchUsers();
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (
      (u.email || '').toLowerCase().includes(q) ||
      (u.first_name || '').toLowerCase().includes(q) ||
      (u.last_name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    ));
  }, [users, filter]);


// this function is need a change for create user function for create user in supabase



  const handleCreate = async () => {
    setError('');
    const fn = {
      first_name: (createForm.first_name || '').trim(),
      last_name: (createForm.last_name || '').trim(),
      email: (createForm.email || '').trim(),
      password: createForm.password || '',
    };

    const errors = { first_name: '', last_name: '', email: '', password: '' };
    const nameRegex = /^[A-Za-z][A-Za-z\s'-]{1,}$/; // min 2 chars, letters/spaces/'-
    if (!fn.first_name || !nameRegex.test(fn.first_name)) errors.first_name = 'Enter a valid first name (min 2 letters).';
    if (!fn.last_name || !nameRegex.test(fn.last_name)) errors.last_name = 'Enter a valid last name (min 2 letters).';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!fn.email || !emailRegex.test(fn.email)) errors.email = 'Enter a valid email address.';
    if (!fn.password || fn.password.length < 6) errors.password = 'Password must be at least 6 characters.';
    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) { setCreateErrors(errors); return; } else { setCreateErrors({ first_name: '', last_name: '', email: '', password: '' }); }
    setCreating(true);
    try {
      // Call Express API instead of Edge Function
      const API_BASE_URL = 'http://localhost:4000';
      console.log('Calling API:', `${API_BASE_URL}/users`);
      console.log('Request body:', {
        email: fn.email,
        password: fn.password,
        first_name: fn.first_name,
        last_name: fn.last_name,
      });
      
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: fn.email,
          password: fn.password,
          first_name: fn.first_name,
          last_name: fn.last_name,
        }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const result = await response.json();
      console.log('Response data:', result);
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create user');
      }
      // Clear form and refresh list
      setCreateForm({ first_name: '', last_name: '', email: '', password: '' });
      await fetchUsers();
      // Close modal after successful creation
      animateModalOut();
      pushToast({ type: 'success', title: 'Success', message: 'New user created successfully' });
    } catch (e) {
              let msg = e?.message || 'Failed to create user. Make sure the API server is running on port 4000.';
      try {
        const res = e?.context?.response;
        if (res && typeof res.json === 'function') {
          const j = await res.json();
          if (j?.error) msg = j.error;
        }
      } catch (_) {}
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Page entrance animation
  useLayoutEffect(() => {
    if (!pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(pageRef.current, { opacity: 0, y: 24, duration: 0.6, ease: 'power2.out' });
      if (headerRef.current) {
        gsap.from(headerRef.current, { opacity: 0, y: 12, duration: 0.5, delay: 0.15, ease: 'power2.out' });
      }
      if (tableRef.current) {
        gsopSafeFrom(tableRef.current, { opacity: 0, y: 12, duration: 0.6, delay: 0.2, ease: 'power2.out' });
      }
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Animate table rows when data changes
  useEffect(() => {
    if (!tableRef.current) return;
    const rows = tableRef.current.querySelectorAll('[data-animate="row"]');
    gsap.fromTo(rows, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.035 });
  }, [filtered.length]);

  // Animate sticky header background when scrolling starts
  useEffect(() => {
    const scroller = document.getElementById('users-scroll');
    if (!scroller) return;
    const onScroll = () => {
      const y = scroller.scrollTop;
      if (!headerStickyRef.current) return;
      gsap.to(headerStickyRef.current, { backdropFilter: y > 2 ? 'blur(6px)' : 'blur(0px)', backgroundColor: y > 2 ? 'rgba(2,6,23,0.8)' : 'rgba(2,6,23,0.6)', duration: 0.2, ease: 'power1.out' });
    };
    scroller.addEventListener('scroll', onScroll);
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  // Calculate card height to enable inside scrolling according to screen size
  useLayoutEffect(() => {
    const compute = () => {
      if (!tableRef.current) return;
      const rect = tableRef.current.getBoundingClientRect();
      // Leave a small bottom gap
      const bottomPadding = 16;
      const h = Math.max(320, Math.floor(window.innerHeight - rect.top - bottomPadding));
      setCardHeight(h);
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, [isLoading]);

  // Helpers for safer gsap.from
  const gsopSafeFrom = (el, vars) => {
    if (!el) return;
    try { gsap.from(el, vars); } catch (_) {}
  };

  // Hover glow helper
  const applyGlow = (el, color) => {
    if (!el) return;
    gsap.to(el, { boxShadow: `0 0 0 0 ${color}, 0 0 18px 2px ${color}`, y: -1, scale: 1.02, duration: 0.22, ease: 'power2.out' });
  };
  const removeGlow = (el) => {
    if (!el) return;
    gsap.to(el, { boxShadow: 'none', y: 0, scale: 1, duration: 0.22, ease: 'power2.out' });
  };

  // Modal animations
  const animateModalIn = () => {
    if (!modalOverlayRef.current || !modalPanelRef.current) return;
    gsap.set(modalOverlayRef.current, { opacity: 0, pointerEvents: 'auto' });
    gsap.set(modalPanelRef.current, { opacity: 0, y: 24 });
    const tl = gsap.timeline();
    tl.to(modalOverlayRef.current, { opacity: 1, duration: 0.2, ease: 'power2.out' })
      .to(modalPanelRef.current, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, '<');
  };

  const animateModalOut = () => {
    if (!modalOverlayRef.current || !modalPanelRef.current) { setIsModalOpen(false); return; }
    const tl = gsap.timeline({ onComplete: () => setIsModalOpen(false) });
    tl.to(modalPanelRef.current, { opacity: 0, y: 20, duration: 0.25, ease: 'power2.in' })
      .to(modalOverlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, '<');
  };

  useEffect(() => {
    if (isModalOpen) {
      document.documentElement.classList.add('overflow-hidden');
      // Enter animation
      requestAnimationFrame(() => animateModalIn());
    } else {
      document.documentElement.classList.remove('overflow-hidden');
    }
  }, [isModalOpen]);

  // Edit modal animations
  const animateEditIn = () => {
    if (!editOverlayRef.current || !editPanelRef.current) return;
    gsap.set(editOverlayRef.current, { opacity: 0, pointerEvents: 'auto' });
    gsap.set(editPanelRef.current, { opacity: 0, y: 24 });
    const tl = gsap.timeline();
    tl.to(editOverlayRef.current, { opacity: 1, duration: 0.2, ease: 'power2.out' })
      .to(editPanelRef.current, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, '<');
  };
  const animateEditOut = () => {
    if (!editOverlayRef.current || !editPanelRef.current) { setIsEditOpen(false); return; }
    const tl = gsap.timeline({ onComplete: () => setIsEditOpen(false) });
    tl.to(editPanelRef.current, { opacity: 0, y: 20, duration: 0.25, ease: 'power2.in' })
      .to(editOverlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, '<');
  };
  useEffect(() => {
    if (isEditOpen) {
      document.documentElement.classList.add('overflow-hidden');
      requestAnimationFrame(() => animateEditIn());
    } else {
      document.documentElement.classList.remove('overflow-hidden');
    }
  }, [isEditOpen]);

  // Confirm dialog animations
  const animateConfirmIn = () => {
    if (!confirmOverlayRef.current || !confirmPanelRef.current) return;
    gsap.set(confirmOverlayRef.current, { opacity: 0, pointerEvents: 'auto' });
    gsap.set(confirmPanelRef.current, { opacity: 0, y: 20 });
    const tl = gsap.timeline();
    tl.to(confirmOverlayRef.current, { opacity: 1, duration: 0.2, ease: 'power2.out' })
      .to(confirmPanelRef.current, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, '<');
  };
  const animateConfirmOut = () => {
    if (!confirmOverlayRef.current || !confirmPanelRef.current) { setConfirmState((s)=>({ ...s, open: false })); return; }
    const tl = gsap.timeline({ onComplete: () => setConfirmState((s)=>({ ...s, open: false })) });
    tl.to(confirmPanelRef.current, { opacity: 0, y: 16, duration: 0.2, ease: 'power2.in' })
      .to(confirmOverlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, '<');
  };
  useEffect(() => {
    if (confirmState.open) {
      requestAnimationFrame(() => animateConfirmIn());
    }
  }, [confirmState.open]);

  // Animate edit fields when entering edit mode
  useEffect(() => {
    if (!editingUid || !tableRef.current) return;
    const row = tableRef.current.querySelector(`[data-row-id="${editingUid}"]`);
    if (!row) return;
    const editFields = row.querySelectorAll('[data-animate="edit-field"]');
    gsap.fromTo(editFields, { opacity: 0, y: 6, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out', stagger: 0.04 });
  }, [editingUid]);

  // Counts for total/admin/user
  const counts = useMemo(() => {
    const total = users.length;
    let admin = 0;
    for (const u of users) {
      if ((u.role || '').toLowerCase() === 'admin') admin += 1;
    }
    const regular = Math.max(0, total - admin);
    return { total, admin, user: regular };
  }, [users]);

  // Custom role dropdown to avoid default browser menu styles
  const RoleSelect = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 160 });
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    // Close on outside click (works with portal)
    useEffect(() => {
      const onDocClick = (e) => {
        if (!open) return;
        const btn = buttonRef.current;
        const menu = menuRef.current;
        if (btn && btn.contains(e.target)) return;
        if (menu && menu.contains(e.target)) return;
        setOpen(false);
      };
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    // Close on Escape
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    // Position portal near button and update on scroll/resize
    useEffect(() => {
      if (!open) return;
      const update = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const top = Math.min(window.innerHeight - 12, rect.bottom + 8);
        const left = Math.min(window.innerWidth - 12, rect.left);
        setPos({ top, left, width: Math.max(160, rect.width) });
      };
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }, [open]);

    useEffect(() => {
      if (open && menuRef.current) {
        gsap.fromTo(menuRef.current, { opacity: 0, y: 6, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power2.out' });
      }
    }, [open]);

    const handleSelect = (roleValue) => {
      onChange(roleValue);
      setOpen(false);
    };

    return (
      <>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="bg-slate-850 border border-slate-700 rounded-md px-2.5 py-1.5 flex items-center gap-2 text-left min-w-[7rem]"
        >
          <span className="capitalize text-slate-200">{value || 'user'}</span>
          <FiChevronDown className="text-slate-400 ml-auto" />
        </button>
        {open && createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 1000 }}
            className="rounded-md border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-xl overflow-hidden"
          >
            {['user', 'admin'].map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2 text-sm ${opt === value ? 'bg-slate-800 text-slate-100' : 'text-slate-200 hover:bg-slate-800/70'}`}
              >
                {opt}
              </button>
            ))}
          </div>,
          document.body
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  // Toast helpers
  const pushToast = ({ type = 'success', title = 'Success', message = '', duration = 3500 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Refresh handler with animation + toast
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      if (tableRef.current) {
        gsap.to('#refresh-overlay', { opacity: 1, duration: 0.2, ease: 'power1.out' });
      }
      // Re-fetch config to respect dynamic changes to ultimate admin
      try {
        const { data: cfg } = await supabase
          .from('config_roles')
          .select('admin_email')
          .maybeSingle();
        setUltimateAdminEmail((cfg?.admin_email || '').toLowerCase());
      } catch (_) {}
      await fetchUsers();
      if (tableRef.current) {
        const rows = tableRef.current.querySelectorAll('[data-animate="row"]');
        gsap.fromTo(rows, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.03 });
        gsap.to('#refresh-overlay', { opacity: 0, duration: 0.25, ease: 'power1.inOut' });
      }
      pushToast({ type: 'success', title: 'Refreshed', message: 'User list refreshed' });
    } catch (_) {}
    finally {
      setIsRefreshing(false);
    }
  };

  // Save confirmation wrapper
  const saveEdit = async () => {
    const wasAdmin = (editingOriginalRole || '').toLowerCase() === 'admin';
    const willBeAdmin = (form.role || '').toLowerCase() === 'admin';
    if (!wasAdmin && willBeAdmin) {
      const email = (users.find(x => x.uid === editingUid)?.email || '').toLowerCase();
      // Close the edit modal before showing the grant-admin confirmation
      try { animateEditOut(); } catch (_) {}
      setConfirmState({
        open: true,
        title: 'Grant admin privileges?',
        message: `This will grant ${(email || 'this user')} full administrator rights, including editing users, disabling accounts, and deleting users. Proceed?`,
        confirmLabel: 'Yes, make admin',
        onConfirm: async () => {
          await performSaveEdit();
          afterSavedToast();
        }
      });
      return;
    }
    await performSaveEdit();
    afterSavedToast();
    animateEditOut();
  };

  const afterSavedToast = () => {
    pushToast({ type: 'success', title: 'Updated', message: 'User updated successfully' });
  };

  // Disable and Delete actions (confirm then perform)
  const handleDisable = (u) => {
    if (!hasIsActive) {
      pushToast({ type: 'error', title: 'Missing column', message: 'Add users.is_active (boolean, default true) in DB, then try again.' });
      return;
    }
    setConfirmState({
      open: true,
      title: 'Disable account',
      message: `Disable ${u.email}? The user will be prevented from logging in until re-enabled.`,
      confirmLabel: 'Confirm & Disable',
      onConfirm: async () => {
        try {
          let ok = false;
          // Try Express API first
          try {
            const API_BASE_URL = 'http://localhost:4000';
            const response = await fetch(`${API_BASE_URL}/users/${u.uid}/disable`, {
              method: 'PATCH',
            });
            if (response.ok) {
              const result = await response.json();
              if (result.success) ok = true;
            }
          } catch (_) {}
          
          if (!ok) {
            // Fallback to direct Supabase update
            await supabase.from('users').update({ is_active: false }).eq('uid', u.uid);
          }
          setUsers(prev => prev.map(x => x.uid === u.uid ? { ...x, is_active: false } : x));
          pushToast({ type: 'success', title: 'Disabled', message: 'User disabled successfully' });
        } catch (_) {}
      }
    });
  };

  const handleDelete = (u) => {
    setConfirmState({
      open: true,
      title: 'Delete account',
      message: `Permanently delete ${u.email}? This will remove the auth account and database profile using the backend function. This cannot be undone.`,
      confirmLabel: 'Confirm & Delete',
      onConfirm: async () => {
        try {
          let ok = false;
          // Try Express API first
          try {
            const API_BASE_URL = 'http://localhost:4000';
            const response = await fetch(`${API_BASE_URL}/users/${u.uid}`, {
              method: 'DELETE',
            });
            if (response.ok) {
              const result = await response.json();
              if (result.success) ok = true;
            }
          } catch (_) {}
          
          if (!ok) {
            // Fallback to direct Supabase delete
            const { error: delErr } = await supabase.from('users').delete().eq('uid', u.uid);
            if (delErr) throw delErr;
          }
          // Animate row removal
          const row = tableRef.current?.querySelector(`[data-row-id="${u.uid}"]`);
          if (row) {
            await gsap.to(row, { opacity: 0, y: -8, duration: 0.25, ease: 'power2.in' });
          }
          setUsers(prev => prev.filter(x => x.uid !== u.uid));
          pushToast({ type: 'success', title: 'Deleted', message: 'User deleted successfully' });
        } catch (_) {}
      }
    });
  };

  const handleEnable = (u) => {
    if (!hasIsActive) {
      pushToast({ type: 'error', title: 'Missing column', message: 'Add users.is_active (boolean, default true) in DB, then try again.' });
      return;
    }
    setConfirmState({
      open: true,
      title: 'Enable account',
      message: `Enable ${u.email}? The user will be able to log in again.`,
      confirmLabel: 'Confirm & Enable',
      onConfirm: async () => {
        try {
          let ok = false;
          // Try Express API first
          try {
            const API_BASE_URL = 'http://localhost:4000';
            const response = await fetch(`${API_BASE_URL}/users/${u.uid}/enable`, {
              method: 'PATCH',
            });
            if (response.ok) {
              const result = await response.json();
              if (result.success) ok = true;
            }
          } catch (_) {}
          if (!ok) {
            await supabase.from('users').update({ is_active: true }).eq('uid', u.uid);
          }
          setUsers(prev => prev.map(x => x.uid === u.uid ? { ...x, is_active: true } : x));
          pushToast({ type: 'success', title: 'Enabled', message: 'User enabled successfully' });
        } catch (e) {
          pushToast({ type: 'error', title: 'Error', message: e?.message || 'Failed to enable user' });
        }
      }
    });
  };

  return (
    <div ref={pageRef} className="min-h-full bg-gradient-to-b from-slate-950 via-slate-930 to-slate-900 text-white">
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 p-6 md:p-8 flex flex-col min-h-0">
          {/* Header */}
          <div ref={headerRef} className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin • Users</h1>
              <p className="text-slate-400 text-sm mt-1">Manage accounts, roles and access</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by name, email, role..."
                  className="bg-slate-850/60 border border-slate-800 focus:border-blue-500/50 outline-none rounded-lg px-3.5 py-2.5 text-sm w-64 placeholder:text-slate-500 shadow-inner"
                />
              </div>
              <button
                onClick={handleRefresh}
                onMouseEnter={(e) => applyGlow(e.currentTarget, 'rgba(148,163,184,0.45)')}
                onMouseLeave={(e) => removeGlow(e.currentTarget)}
                className="px-3.5 py-2.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-750 border border-slate-700/80 shadow-sm flex items-center gap-2"
              >
                <FiRefreshCcw className="text-slate-300" />
                Refresh
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                onMouseEnter={(e) => applyGlow(e.currentTarget, 'rgba(59,130,246,0.55)')}
                onMouseLeave={(e) => removeGlow(e.currentTarget)}
                className="px-4 py-2.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 shadow-sm border border-blue-500/30 flex items-center gap-2"
              >
                <FiPlus className="text-white" />
                New User
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
          )}

          {/* Users Table Card with fixed header & scrollable body */}
          <div ref={tableRef} style={{ height: cardHeight ? `${cardHeight}px` : undefined }} className="relative rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col">
            <div ref={headerStickyRef} className="px-4 md:px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-[2px] sticky top-0 z-20">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-medium text-slate-200">Users</h2>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">Total: {counts.total}</span>
                  <span className="px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">Admin: {counts.admin}</span>
                  <span className="px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">User: {counts.user}</span>
                </div>
              </div>
            </div>
            <div id="users-scroll" className="overflow-x-auto flex-1 overflow-y-auto thin-scrollbar">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                  <tr className="text-left">
                    <th className="px-4 md:px-6 py-3 border-b border-slate-800">Name</th>
                    <th className="px-4 md:px-6 py-3 border-b border-slate-800">Email</th>
                    <th className="px-4 md:px-6 py-3 border-b border-slate-800">Role</th>
                    <th className="px-4 md:px-6 py-3 border-b border-slate-800">Created</th>
                    <th className="px-4 md:px-6 py-3 border-b border-slate-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.uid} data-row-id={u.uid} data-animate="row" className="odd:bg-slate-950/40 even:bg-slate-900/30">
                      <td className="px-4 md:px-6 py-3 align-middle">
                        <span className="text-slate-200">{[u.first_name, u.last_name].filter(Boolean).join(' ') || '-'}</span>
                      </td>
                      <td className="px-4 md:px-6 py-3 align-middle">
                        <span className="text-slate-300">{u.email || '-'}</span>
                      </td>
                      <td className="px-4 md:px-6 py-3 align-middle">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-600/30' : 'bg-slate-800/60 text-slate-300 border-slate-700/50'}`}>{u.role || 'user'}</span>
                      </td>
                      <td className="px-4 md:px-6 py-3 align-middle">
                        <span className="text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</span>
                      </td>
                      <td className="px-4 md:px-6 py-3 align-middle">
                        {
                          // Lock actions for ultimate admin or for the currently logged-in admin's own account
                          (u.email && u.email.toLowerCase() === ultimateAdminEmail) || (u.uid === currentUid || (u.email && u.email.toLowerCase() === currentEmailLower)) ? (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                              <FiLock />
                              Locked
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => startEdit(u)} onMouseEnter={(e) => applyGlow(e.currentTarget, 'rgba(148,163,184,0.35)')} onMouseLeave={(e) => removeGlow(e.currentTarget)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 rounded-md border border-slate-700 flex items-center gap-2">
                                <FiEdit2 />
                                Edit
                              </button>
                              {u.is_active === false ? (
                                <button onClick={() => handleEnable(u)} onMouseEnter={(e) => applyGlow(e.currentTarget, 'rgba(34,197,94,0.35)')} onMouseLeave={(e) => removeGlow(e.currentTarget)} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-md border border-emerald-600/50 text-emerald-300 flex items-center gap-2">
                                  <FiUserX />
                                  Enable
                                </button>
                              ) : (
                                <button onClick={() => handleDisable(u)} onMouseEnter={(e) => applyGlow(e.currentTarget, 'rgba(234,179,8,0.35)')} onMouseLeave={(e) => removeGlow(e.currentTarget)} className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 rounded-md border border-amber-600/50 text-amber-300 flex items-center gap-2">
                                  <FiUserX />
                                  Disable
                                </button>
                              )}
                              <button onClick={() => handleDelete(u)} onMouseEnter={(e) => applyGlow(e.currentTarget, 'rgba(239,68,68,0.45)')} onMouseLeave={(e) => removeGlow(e.currentTarget)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 rounded-md border border-red-600/50 text-red-300 flex items-center gap-2">
                                <FiTrash2 />
                                Delete
                              </button>
                            </div>
                          )
                        }
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="px-4 md:px-6 py-10 text-slate-400 text-center" colSpan={5}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Refresh overlay */}
            <div id="refresh-overlay" className="pointer-events-none absolute inset-0 bg-slate-950/40 opacity-0 flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-300">
                <div className="h-5 w-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm">Refreshing…</span>
              </div>
            </div>
          </div>
          </div>
        </div>

      {/* Create User Modal */
      }
      {isModalOpen && (
        <div ref={modalOverlayRef} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={(e) => { if (e.target === e.currentTarget) animateModalOut(); }}>
          <div ref={modalPanelRef} role="dialog" aria-modal="true" className="w-full md:max-w-xl md:rounded-2xl rounded-t-2xl bg-slate-925 border border-slate-800 shadow-2xl p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium leading-tight">Create new user</h3>
                <p className="text-xs text-slate-400 mt-1">Creates an auth user and profile with role 'user'.</p>
              </div>
              <button aria-label="Close" onClick={animateModalOut} className="h-8 w-8 rounded-full border border-slate-700 hover:bg-slate-800 flex items-center justify-center" onMouseEnter={(e) => gsap.to(e.currentTarget, { rotate: 90, duration: 0.25 })} onMouseLeave={(e) => gsap.to(e.currentTarget, { rotate: 0, duration: 0.25 })}>
                <span className="text-slate-300">×</span>
              </button>
            </div>
            {error && (
              <div className="mt-3 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
            )}
            <div className="mt-5 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">First Name</label>
                  <input
                    value={createForm.first_name}
                    onChange={(e)=>setCreateForm(f=>({...f, first_name:e.target.value}))}
                    placeholder="First name"
                    className={`bg-slate-850 border ${createErrors.first_name ? 'border-red-500/60' : 'border-slate-700'} rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 ${createErrors.first_name ? 'focus:ring-red-500/40' : 'focus:ring-blue-500/40'}`}
                  />
                  {createErrors.first_name && <p className="mt-1 text-xs text-red-400">{createErrors.first_name}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Last Name</label>
                  <input
                    value={createForm.last_name}
                    onChange={(e)=>setCreateForm(f=>({...f, last_name:e.target.value}))}
                    placeholder="Last name"
                    className={`bg-slate-850 border ${createErrors.last_name ? 'border-red-500/60' : 'border-slate-700'} rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 ${createErrors.last_name ? 'focus:ring-red-500/40' : 'focus:ring-blue-500/40'}`}
                  />
                  {createErrors.last_name && <p className="mt-1 text-xs text-red-400">{createErrors.last_name}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e)=>setCreateForm(f=>({...f, email:e.target.value}))}
                  placeholder="Email"
                  className={`w-full bg-slate-850 border ${createErrors.email ? 'border-red-500/60' : 'border-slate-700'} rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 ${createErrors.email ? 'focus:ring-red-500/40' : 'focus:ring-blue-500/40'}`}
                />
                {createErrors.email && <p className="mt-1 text-xs text-red-400">{createErrors.email}</p>}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e)=>setCreateForm(f=>({...f, password:e.target.value}))}
                    placeholder="Password"
                    className={`w-full bg-slate-850 border ${createErrors.password ? 'border-red-500/60' : 'border-slate-700'} rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 ${createErrors.password ? 'focus:ring-red-500/40' : 'focus:ring-blue-500/40'}`}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-200">
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {createErrors.password && <p className="mt-1 text-xs text-red-400">{createErrors.password}</p>}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={animateModalOut} onMouseEnter={(e) => applyGlow(e.currentTarget, 'rgba(148,163,184,0.35)')} onMouseLeave={(e) => removeGlow(e.currentTarget)} className="px-4 py-2.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-2">
                <FiX />
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating} onMouseEnter={(e) => applyGlow(e.currentTarget, 'rgba(59,130,246,0.55)')} onMouseLeave={(e) => removeGlow(e.currentTarget)} className="px-4 py-2.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 shadow-sm border border-blue-500/30 disabled:opacity-60 flex items-center gap-2">
                <FiPlus />
                {creating ? 'Creating...' : 'Create user'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Save Modal */}
      {confirmState.open && (
        <div ref={confirmOverlayRef} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) animateConfirmOut(); }}>
          <div ref={confirmPanelRef} className="w-full max-w-md rounded-2xl bg-slate-925 border border-slate-800 shadow-2xl p-6">
            <h3 className="text-lg font-medium">{confirmState.title}</h3>
            <p className="text-sm text-slate-400 mt-2">{confirmState.message}</p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={animateConfirmOut} className="px-4 py-2.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-2">
                <FiX />
                Cancel
              </button>
              <button onClick={async () => { animateConfirmOut(); try { if (typeof confirmState.onConfirm === 'function') { await confirmState.onConfirm(); } } catch (_) {} }} className="px-4 py-2.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 shadow-sm border border-blue-500/30 flex items-center gap-2">
                <FiSave />
                {confirmState.confirmLabel || 'Confirm'}
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && (
        <div ref={editOverlayRef} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={(e) => { if (e.target === e.currentTarget) animateEditOut(); }}>
          <div ref={editPanelRef} role="dialog" aria-modal="true" className="w-full md:max-w-xl md:rounded-2xl rounded-t-2xl bg-slate-925 border border-slate-800 shadow-2xl p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium leading-tight">Edit user</h3>
                <p className="text-xs text-slate-400 mt-1">Update name and role, then confirm to save.</p>
              </div>
              <button aria-label="Close" onClick={animateEditOut} className="h-8 w-8 rounded-full border border-slate-700 hover:bg-slate-800 flex items-center justify-center" onMouseEnter={(e) => gsap.to(e.currentTarget, { rotate: 90, duration: 0.25 })} onMouseLeave={(e) => gsap.to(e.currentTarget, { rotate: 0, duration: 0.25 })}>
                <span className="text-slate-300">×</span>
              </button>
        </div>
        {error && (
              <div className="mt-3 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
            )}
            <div className="mt-5 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">First Name</label>
                  <input
                    value={form.first_name}
                    onChange={(e)=>setForm(f=>({...f, first_name:e.target.value}))}
                    placeholder="First name"
                    className="bg-slate-850 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Last Name</label>
                  <input
                    value={form.last_name}
                    onChange={(e)=>setForm(f=>({...f, last_name:e.target.value}))}
                    placeholder="Last name"
                    className="bg-slate-850 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Role</label>
                <div>
                  <RoleSelect value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} />
                </div>
                      </div>
                      </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={animateEditOut} className="px-4 py-2.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-2">
                <span>Cancel</span>
              </button>
              <button onClick={saveEdit} className="px-4 py-2.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 shadow-sm border border-blue-500/30 flex items-center gap-2">
                <span>Save</span>
              </button>
        </div>
        </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[2000] space-y-2 max-w-sm w-full">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;


