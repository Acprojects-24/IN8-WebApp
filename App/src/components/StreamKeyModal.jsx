// src/components/StreamKeyModal.js

import React, { useState } from 'react';
import { X, Radio } from 'lucide-react';

const StreamKeyModal = ({ onStart, onClose, isLoading }) => {
    const [streamKey, setStreamKey] = useState('');

    const handleStartClick = () => {
        if (streamKey.trim()) {
            onStart(streamKey.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
            <div className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
                <div className="flex justify-end">
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <Radio className="mx-auto text-red-500 mb-3" size={40} />
                <h2 className="text-2xl font-bold text-white mb-2">Go Live</h2>
                <p className="text-slate-400 mb-6">Apne streaming platform (YouTube, Facebook) se stream key paste karein.</p>
                
                <input 
                    type="text" 
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    placeholder="Paste stream key here..."
                    className="w-full bg-slate-700/50 border-2 border-slate-600 rounded-lg py-3 px-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />

                <button 
                    onClick={handleStartClick}
                    disabled={!streamKey.trim() || isLoading}
                    className="w-full mt-4 py-3 px-4 rounded-lg bg-red-600 font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? 'Starting...' : 'Start Live Stream'}
                </button>
            </div>
        </div>
    );
};

export default StreamKeyModal;