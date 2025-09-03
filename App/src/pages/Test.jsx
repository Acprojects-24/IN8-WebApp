import React from 'react';

// A simple SVG icon for the construction theme, updated with the new theme color.
const ConstructionIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 w-16 text-blue-500 animate-bounce"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

// Main component for the "Under Development" page.
export default function App() {

  return (
    // Main container with the new dark blue gradient background.
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col justify-center items-center text-white font-sans p-4">
      
      {/* Animated content container with updated colors */}
      <div className="text-center p-8 md:p-12 bg-slate-800 bg-opacity-50 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700 max-w-md w-full animate-fadeInUp">
        
        <div className="mb-6">
          <ConstructionIcon />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
          Coming Soon
        </h1>
        
        <p className="text-slate-300 text-lg mb-8">
          We're working hard to bring you something amazing.
          This page is currently under development.
        </p>
      </div>

      {/* A simple footer with updated text color */}
      <footer className="absolute bottom-5 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Your Company. All rights reserved.</p>
      </footer>

      {/* We need to define the animations used in the component */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
