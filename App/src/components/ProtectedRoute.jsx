import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

// Usage:
// <ProtectedRoute>               -> requires auth only
// <ProtectedRoute requiredRole="admin" fallbackTo="/home"> -> requires admin role
const ProtectedRoute = ({ children, requiredRole, fallbackTo = '/home' }) => {
  const authToken = localStorage.getItem('authToken');
  const initialRole = localStorage.getItem('role');
  const [resolvedRole, setResolvedRole] = useState(initialRole);
  const [checkingRole, setCheckingRole] = useState(false);
  const location = useLocation();

  if (!authToken) {
    // Special handling: if user tried to open a meeting link directly, send them to guest join page
    const meetingMatch = location.pathname.match(/^\/meeting\/([^\/?#]+)/i);
    if (meetingMatch && meetingMatch[1]) {
      // If guest flow initiated, allow access directly
      const joinAsGuest = localStorage.getItem('joinAsGuest') === 'true';
      const guestState = location.state && (location.state.guest === true);
      if (joinAsGuest || guestState) {
        return children;
      }
      return <Navigate to={`/guest/${meetingMatch[1]}`} replace />;
    }
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location, message: 'You must login to access this page.' }}
      />
    );
  }

  // Live-check profile.role to avoid stale local role after admin grant
  useEffect(() => {
    const run = async () => {
      if (!requiredRole || resolvedRole === requiredRole) return;
      try {
        setCheckingRole(true);
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) return;
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('uid', uid)
          .maybeSingle();
        const liveRole = (profile?.role || '').toLowerCase();
        if (liveRole) {
          localStorage.setItem('role', liveRole);
          setResolvedRole(liveRole);
        }
      } catch (_) {
        // noop
      } finally {
        setCheckingRole(false);
      }
    };
    run();
  }, [requiredRole, resolvedRole]);

  if (checkingRole) {
    return null;
  }

  if (requiredRole && resolvedRole !== requiredRole) {
    return (
      <Navigate
        to={fallbackTo}
        replace
        state={{ from: location, message: 'You do not have permission to access this page.' }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
