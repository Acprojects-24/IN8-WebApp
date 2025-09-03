// --- LiveStreamingPanel Component ---
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Rss, Youtube, Facebook, Twitch, KeyRound, PlayCircle, StopCircle } from 'lucide-react';

const LiveStreamingPanel = () => {
    const [isStreaming, setIsStreaming] = useState(false);
    const [platform, setPlatform] = useState('youtube');
    const [streamKey, setStreamKey] = useState('');

    const platformIcons = {
        youtube: <Youtube className="text-red-500" size={20} />,
        facebook: <Facebook className="text-blue-500" size={20} />,
        twitch: <Twitch className="text-purple-500" size={20} />,
    };

    const handleStartStream = () => {
        if (!streamKey) {
            alert('Please enter a stream key.'); // In a real app, use a toast notification
            return;
        }
        console.log(`Starting stream to ${platform} with key: ${streamKey}`);
        setIsStreaming(true);
    };

    const handleStopStream = () => {
        console.log('Stopping stream...');
        setIsStreaming(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col space-y-6"
        >
            <div>
                <h3 className="flex items-center gap-3 text-xl font-semibold text-white mb-4">
                    <Rss className="text-blue-400" />
                    <span>Live Streaming</span>
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-400 mb-2 block">Platform</label>
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-700/50 p-1">
                            {Object.keys(platformIcons).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPlatform(p)}
                                    className={`flex justify-center items-center gap-2 py-2 rounded-md text-sm font-semibold transition-colors capitalize ${platform === p ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-600/50'}`}
                                >
                                    {platformIcons[p]}
                                    <span>{p}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="stream-key" className="text-sm font-medium text-slate-400 mb-2 block">Stream Key</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                id="stream-key"
                                type="password"
                                placeholder="Enter your stream key"
                                value={streamKey}
                                onChange={(e) => setStreamKey(e.target.value)}
                                className="w-full bg-slate-700/50 border-2 border-slate-600 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-auto">
                {isStreaming ? (
                    <motion.button
                        onClick={handleStopStream}
                        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-red-600 font-semibold text-white transition-all hover:bg-red-500"
                        whileTap={{ scale: 0.95 }}
                    >
                        <StopCircle size={20} /> Stop Stream
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={handleStartStream}
                        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-blue-600 font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        whileTap={{ scale: 0.95 }}
                        disabled={!streamKey}
                    >
                        <PlayCircle size={20} /> Go Live
                    </motion.button>
                )}
                 <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    {isStreaming ? (
                        <>
                            <motion.div initial={{scale:0}} animate={{scale:1}} className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]"></motion.div>
                            <span className="text-green-400">Stream is Live</span>
                        </>
                    ) : (
                        <>
                            <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                            <span className="text-slate-400">Stream is Offline</span>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
export default LiveStreamingPanel;