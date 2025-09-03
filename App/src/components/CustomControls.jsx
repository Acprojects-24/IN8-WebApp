import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Hand, Radio, CircleDot,
    MoreVertical,
    Youtube, Waves, Paintbrush, BarChart3, LayoutGrid, X
} from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

// Assuming these are in the same directory or a sub-directory
import LiveStreamModal from './LiveStreamModal';

const ShareVideoModal = ({ onShare, onClose }) => {
    const [videoUrl, setVideoUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (videoUrl.trim()) {
            onShare(videoUrl.trim());
        }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 p-6 rounded-xl shadow-xl w-full max-w-lg"
                initial={{ scale: 0.95, y: -20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Share a YouTube Video</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700">
                        <X size={24} />
                    </button>
                </div>
                <p className="text-slate-400 mb-6">Enter the URL of the YouTube video you want to share with everyone in the meeting.</p>
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-6">
                        <Youtube size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="e.g., https://www.youtube.com/watch?v=..."
                            autoFocus
                            className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-slate-300 bg-slate-700/70 hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!videoUrl.trim()}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Share Video
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};


const ControlButtonWithTooltip = ({ onClick, tooltip, className = '', children }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative flex flex-col items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full mb-3 px-3 py-1.5 text-sm font-semibold text-white bg-gray-900/90 rounded-md shadow-lg pointer-events-none whitespace-nowrap"
                    >
                        {tooltip}
                    </motion.div>
                )}
            </AnimatePresence>
            <button
                onClick={onClick}
                className={`p-4 rounded-full transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 ${className}`}
            >
                {children}
            </button>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-4 py-2.5 text-sm text-slate-200 text-left rounded-md hover:bg-slate-700/80 transition-colors"
    >
        <Icon size={18} className="text-slate-400" />
        <span>{label}</span>
    </button>
);

const CustomControls = ({ jitsiApi, onHangup, areControlsVisible, pauseTimer, resumeTimer, isHost, isAdmin, showToast, isWhiteboardOpen, onToggleWhiteboard }) => {
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
    const [isStartingStream, setIsStartingStream] = useState(false);
    const [isShareVideoModalOpen, setIsShareVideoModalOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingMode, setRecordingMode] = useState(null);
    const [recordingSessionId, setRecordingSessionId] = useState(null);
    const [streamSessionId, setStreamSessionId] = useState(null);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isVideoSharing, setIsVideoSharing] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    // Whiteboard state now comes from parent (Firestore-synced)

    const menuRef = useRef(null);
    const containerRef = useRef(null);
    const isInitialLoad = useRef(true);

    useGSAP(() => {
        gsap.to(containerRef.current, {
            y: areControlsVisible ? '0%' : '150%',
            opacity: areControlsVisible ? 1 : 0,
            duration: 0.5,
            ease: 'power3.out',
        });
    }, [areControlsVisible]);

    useGSAP(() => {
        if (isStreaming) {
            gsap.to('.live-indicator', { boxShadow: '0 0 15px 5px rgba(34, 197, 94, 0.7)', scale: 1.05, repeat: -1, yoyo: true, duration: 1.5, ease: 'power1.inOut' });
        } else {
            gsap.killTweensOf('.live-indicator');
        }
        if (isRecording) {
            gsap.to('.recording-indicator', { boxShadow: '0 0 15px 5px rgba(239, 68, 68, 0.7)', scale: 1.05, repeat: -1, yoyo: true, duration: 1.5, ease: 'power1.inOut' });
        } else {
            gsap.killTweensOf('.recording-indicator');
        }
    }, { scope: containerRef, dependencies: [isStreaming, isRecording] });

    useEffect(() => {
        if (!jitsiApi) return;

        jitsiApi.isAudioMuted().then(muted => setIsAudioMuted(muted));
        jitsiApi.isVideoMuted().then(muted => setIsVideoMuted(muted));

        const handleAudioMute = ({ muted }) => setIsAudioMuted(muted);
        const handleVideoMute = ({ muted }) => setIsVideoMuted(muted);
        // Jitsi event for live streaming
        const handleStreamingStatus = ({ on, sessionID }) => {
            setIsStreaming(on);
            setStreamSessionId(on ? sessionID || null : null);
        };
        // Jitsi event for file recording
        const handleRecordingStatus = ({ on, mode, sessionID }) => {
            setIsRecording(on);
            setRecordingMode(on ? (mode || null) : null);
            setRecordingSessionId(on ? (sessionID || null) : null);
        };

        // Remove endpoint messaging sync; handled by Firestore in parent
        const handleEndpointTextMessage = () => {};

        jitsiApi.addEventListener('audioMuteStatusChanged', handleAudioMute);
        jitsiApi.addEventListener('videoMuteStatusChanged', handleVideoMute);
        // Correct event name for live streaming status
        jitsiApi.addEventListener('liveStreamingStatusChanged', handleStreamingStatus);
        jitsiApi.addEventListener('recordingStatusChanged', handleRecordingStatus);
        jitsiApi.addEventListener('endpointTextMessageReceived', handleEndpointTextMessage);
        // Fallback for deployments using the old event name
        jitsiApi.addEventListener('endpointTextMessage', handleEndpointTextMessage);

        const handleParticipantJoined = () => {};
        jitsiApi.addEventListener('participantJoined', handleParticipantJoined);

        return () => {
            jitsiApi.removeEventListener('audioMuteStatusChanged', handleAudioMute);
            jitsiApi.removeEventListener('videoMuteStatusChanged', handleVideoMute);
            jitsiApi.removeEventListener('liveStreamingStatusChanged', handleStreamingStatus);
            jitsiApi.removeEventListener('recordingStatusChanged', handleRecordingStatus);
            jitsiApi.removeEventListener('endpointTextMessageReceived', handleEndpointTextMessage);
            jitsiApi.removeEventListener('endpointTextMessage', handleEndpointTextMessage);
            jitsiApi.removeEventListener('participantJoined', handleParticipantJoined);
        };
    }, [jitsiApi, showToast, isWhiteboardOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMoreMenuOpen(false);
            }
        };
        if (isMoreMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMoreMenuOpen]);

    // Command functions
    const toggleAudio = () => jitsiApi?.executeCommand('toggleAudio');
    const toggleVideo = () => jitsiApi?.executeCommand('toggleVideo');
    const toggleScreenShare = () => jitsiApi?.executeCommand('toggleShareScreen');
    const raiseHand = () => jitsiApi?.executeCommand('toggleRaiseHand');
    const toggleRecording = async () => {
        if (!jitsiApi) return;
        // Block starting recording if currently live
        if (!isRecording && isStreaming) {
            showToast && showToast({ title: 'Action blocked', message: 'You cannot record while live streaming.', type: 'error' });
            return;
        }
        try {
            if (isRecording) {
                const modeToStop = recordingMode || 'file';
                jitsiApi.executeCommand('stopRecording', modeToStop);
            } else {
                if (isHost) {
                    jitsiApi.executeCommand('startRecording', { mode: 'file' });
                } else {
                    // Proxy request via host
                    const meetingId = window.location.pathname.split('/').pop();
                    const { supabase } = await import('../supabase');
                    await supabase.from('meeting_actions').insert([{
                        meeting_id: meetingId,
                        type: 'recording-start',
                        status: 'pending',
                        requested_by: jitsiApi.myUserId && jitsiApi.myUserId()
                    }]);
                    showToast && showToast({ title: 'Requested', message: 'Recording request sent to host.', type: 'info' });
                }
            }
        } catch (_) {}
    };
    const handleStopStream = async () => {
        if (!jitsiApi) return;
        if (isHost) {
            jitsiApi.executeCommand('stopRecording', 'stream');
        } else {
            const meetingId = window.location.pathname.split('/').pop();
            const { supabase } = await import('../supabase');
            await supabase.from('meeting_actions').insert([{
                meeting_id: meetingId,
                type: 'stream-stop',
                status: 'pending',
                requested_by: jitsiApi.myUserId && jitsiApi.myUserId()
            }]);
            showToast && showToast({ title: 'Requested', message: 'Stop stream request sent to host.', type: 'info' });
        }
    };
    const handleStartStream = async ({ platform, streamKey, rtmpUrl }) => {
        if (!jitsiApi) return;
        // Block starting live if currently recording
        if (isRecording) {
            showToast && showToast({ title: 'Action blocked', message: 'You cannot go live while recording.', type: 'error' });
            return;
        }
        try {
            setIsStartingStream(true);
            // Jitsi External API supports two styles depending on deployment:
            // - YouTube shortcut via youtubeStreamKey
            // - Generic RTMP via rtmpStreamKey and rtmpStreamUrl
            if (isHost) {
                if (platform === 'youtube') {
                    jitsiApi.executeCommand('startRecording', { mode: 'stream', youtubeStreamKey: streamKey });
                } else {
                    jitsiApi.executeCommand('startRecording', { mode: 'stream', rtmpStreamKey: streamKey, rtmpStreamUrl: rtmpUrl });
                }
            } else {
                const meetingId = window.location.pathname.split('/').pop();
                const { supabase } = await import('../supabase');
                await supabase.from('meeting_actions').insert([{
                    meeting_id: meetingId,
                    type: 'stream-start',
                    platform,
                    stream_key: streamKey,
                    rtmp_url: rtmpUrl,
                    status: 'pending',
                    requested_by: jitsiApi.myUserId && jitsiApi.myUserId()
                }]);
                showToast && showToast({ title: 'Requested', message: 'Live stream request sent to host.', type: 'info' });
            }
            setIsStreamModalOpen(false);
        } finally {
            setIsStartingStream(false);
        }
    };

    const handleOpenShareModal = () => {
        setIsMoreMenuOpen(false);
        setIsShareVideoModalOpen(true);
    };

    const handleStartSharing = (url) => {
        jitsiApi?.executeCommand('startShareVideo', url);
        setIsShareVideoModalOpen(false);
        setIsVideoSharing(true);
    };

    const handleStopSharing = () => {
        jitsiApi?.executeCommand('stopShareVideo');
        setIsMoreMenuOpen(false);
        setIsVideoSharing(false);
    };

    const executeCommandAndCloseMenu = (command, ...args) => {
        jitsiApi?.executeCommand(command, ...args);
        setIsMoreMenuOpen(false);
    };
    

    const handleToggleWhiteboard = () => {
        setIsMoreMenuOpen(false);
        onToggleWhiteboard && onToggleWhiteboard();
    };
    const handleToggleWhiteboardLocal = () => {
        if (!jitsiApi) return;
        jitsiApi.executeCommand('toggleWhiteboard');
        setIsMoreMenuOpen(false);
    };
    const handleToggleView = () => executeCommandAndCloseMenu('toggleTileView');

    return (
        <>
            <AnimatePresence>
                {showLeaveModal && (
                    <motion.div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLeaveModal(false)}>
                        <motion.div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-xl p-5" initial={{ scale: 0.96, y: -10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-semibold text-white mb-3">Exit meeting</h3>
                            {(isHost || isAdmin) ? (
                                <div className="space-y-2">
                                    <button onClick={() => { setShowLeaveModal(false); onHangup && onHangup(); }} className="w-full px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">Leave meeting</button>
                                    <button onClick={async () => {
                                        try {
                                            // If host, end directly via Jitsi
                                            if (isHost) {
                                                try {
                                                    const list = Array.isArray(jitsiApi?.getParticipantsInfo?.()) ? jitsiApi.getParticipantsInfo() : [];
                                                    for (const p of list) {
                                                        if (p && p.participantId && p.participantId !== (jitsiApi.myUserId && jitsiApi.myUserId())) {
                                                            try { jitsiApi.executeCommand('kickParticipant', p.participantId); } catch (_) {}
                                                        }
                                                    }
                                                } catch (_) {}
                                                // Also leave locally and route back via parent handler
                                                try { jitsiApi.executeCommand('hangup'); } catch (_) {}
                                                onHangup && onHangup();
                                                showToast && showToast({ title: 'Meeting ended', message: 'Ended for all participants.', type: 'success' });
                                            } else {
                                                // Non-host admin: request host to end
                                                const meetingId = window.location.pathname.split('/').pop();
                                                const { supabase } = await import('../supabase');
                                                await supabase.from('meeting_actions').insert([{ meeting_id: meetingId, type: 'end-meeting', status: 'pending', requested_by: jitsiApi?.myUserId && jitsiApi.myUserId() }]);
                                                showToast && showToast({ title: 'Request sent', message: 'Asked host to end the meeting.', type: 'info' });
                                            }
                                        } catch (_) {
                                            showToast && showToast({ title: 'Error', message: 'Could not end meeting.', type: 'error' });
                                        }
                                        setShowLeaveModal(false);
                                    }} className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white">End meeting for all</button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <button onClick={() => { setShowLeaveModal(false); onHangup && onHangup(); }} className="w-full px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">Leave meeting</button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {isStreamModalOpen && (
                <LiveStreamModal
                    onStart={handleStartStream}
                    onClose={() => setIsStreamModalOpen(false)}
                    isLoading={isStartingStream}
                />
            )}
            <AnimatePresence>
                {isShareVideoModalOpen && (
                    <ShareVideoModal
                        onClose={() => setIsShareVideoModalOpen(false)}
                        onShare={handleStartSharing}
                    />
                )}
            </AnimatePresence>
            <div
                ref={containerRef}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 w-auto z-20"
                onMouseEnter={pauseTimer}
                onMouseLeave={resumeTimer}
            >
                <div className="bg-gray-950/80 backdrop-blur-xl border border-gray-700/50 rounded-full shadow-2xl p-3 flex justify-center items-center gap-3">
                    
                    <ControlButtonWithTooltip onClick={toggleAudio} tooltip={isAudioMuted ? 'Unmute' : 'Mute'} className={isAudioMuted ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}>{isAudioMuted ? <MicOff size={22} /> : <Mic size={22} />}</ControlButtonWithTooltip>
                    <ControlButtonWithTooltip onClick={toggleVideo} tooltip={isVideoMuted ? 'Start Video' : 'Stop Video'} className={isVideoMuted ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}>{isVideoMuted ? <VideoOff size={22} /> : <Video size={22} />}</ControlButtonWithTooltip>
                    <ControlButtonWithTooltip onClick={toggleScreenShare} tooltip="Share Screen" className="bg-gray-700 hover:bg-gray-600"><MonitorUp size={22} /></ControlButtonWithTooltip>
                    <ControlButtonWithTooltip onClick={raiseHand} tooltip="Raise Hand" className="bg-gray-700 hover:bg-gray-600"><Hand size={22} /></ControlButtonWithTooltip>
                    
                    {(isHost || isAdmin) && (
                        <>
                            <ControlButtonWithTooltip
                                onClick={() => {
                                    if (isRecording && !isStreaming) {
                                        // Block open when recording
                                        showToast && showToast({ title: 'Action blocked', message: 'You cannot go live while recording.', type: 'error' });
                                        return;
                                    }
                                    isStreaming ? handleStopStream() : setIsStreamModalOpen(true)
                                }}
                                tooltip={isStreaming ? "Stop Live Stream" : (isRecording ? "Go Live (disabled during recording)" : "Go Live")}
                                className={
                                    isStreaming
                                        ? 'bg-green-500 text-white live-indicator'
                                        : isRecording
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-cyan-600 hover:bg-cyan-500'
                                }
                            >
                                <Radio size={22} />
                            </ControlButtonWithTooltip>
                            
                            <ControlButtonWithTooltip
                                onClick={toggleRecording}
                                tooltip={isRecording ? "Stop Recording" : (isStreaming ? "Start Recording (disabled while live)" : "Start Recording")}
                                className={
                                    isRecording
                                        ? 'bg-red-600 text-white recording-indicator'
                                        : isStreaming
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }
                            >
                                <CircleDot size={22} />
                            </ControlButtonWithTooltip>
                        </>
                    )}
                    
                    <div className="relative" ref={menuRef}>
                        <ControlButtonWithTooltip
                            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                            tooltip="More Options"
                            className="bg-gray-700 text-gray-200 hover:bg-gray-600"
                        >
                            <MoreVertical size={22} />
                        </ControlButtonWithTooltip>
                        <AnimatePresence>
                            {isMoreMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 bg-slate-800/90 backdrop-blur-lg border border-slate-700 rounded-lg shadow-2xl p-2"
                                >
                                    {isVideoSharing ? (
                                        <MenuItem icon={Youtube} label="Stop sharing video" onClick={handleStopSharing} />
                                    ) : (
                                        <MenuItem icon={Youtube} label="Share a video" onClick={handleOpenShareModal} />
                                    )}
                                    
                                    {isHost ? (
                                        <MenuItem
                                            icon={Paintbrush}
                                            label={isWhiteboardOpen ? 'Hide Whiteboard' : 'Show Whiteboard'}
                                            onClick={handleToggleWhiteboard}
                                        />
                                    ) : (
                                        isWhiteboardOpen && (
                                            <MenuItem
                                                icon={Paintbrush}
                                                label={"Hide Whiteboard"}
                                                onClick={handleToggleWhiteboardLocal}
                                            />
                                        )
                                    )}
                                    
                                    <MenuItem icon={LayoutGrid} label="Toggle Tile View" onClick={handleToggleView} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <ControlButtonWithTooltip onClick={() => setShowLeaveModal(true)} tooltip="Leave Meeting" className="bg-red-600 text-white hover:bg-red-500">
                        <PhoneOff size={22} />
                    </ControlButtonWithTooltip >

                </div>
            </div>
        </>
    );
};

export default CustomControls;