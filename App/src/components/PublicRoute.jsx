import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// PublicRoute: Blocks access for authenticated users.
// If authToken exists, redirect based on role to /home (user) or /admin (admin).
// Otherwise, render the public children (e.g., Auth page).
const PublicRoute = ({ children }) => {
  const location = useLocation();
  const authToken = localStorage.getItem('authToken');
  const role = (localStorage.getItem('role') || '').toLowerCase();

  if (authToken) {
    const target = role === 'admin' ? '/admin' : '/home';
    // Prevent loop if user already on the correct landing
    if (location.pathname !== target) {
      return <Navigate to={target} replace />;
    }
  }

  return children;
};

export default PublicRoute;


