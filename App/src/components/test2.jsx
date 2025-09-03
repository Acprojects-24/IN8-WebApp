// src/components/CustomControls.jsx

import React, { useState, useEffect, useRef } from 'react';
import { 
    Mic, 
    MicOff, 
    Video, 
    VideoOff, 
    PhoneOff, 
    MonitorUp, 
    Hand, 
    Radio,
    CircleDot
} from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

// Make sure you have this modal component in the same folder or imported correctly
import StreamKeyModal from './StreamKeyModal'; 

// Helper component for buttons with tooltips
const ControlButtonWithTooltip = ({ onClick, tooltip, className = '', children }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className="relative flex flex-col items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div 
                className={`absolute bottom-full mb-3 px-3 py-1.5 text-sm font-semibold text-white bg-gray-900/90 rounded-md shadow-lg transition-all duration-200 ease-in-out pointer-events-none 
                whitespace-nowrap  // <--- YEH CLASS ADD KAREIN
                ${
                    isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
            >
                {tooltip}
            </div>
            <button
                onClick={onClick}
                className={`p-4 rounded-full transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 ${className}`}
            >
                {children}
            </button>
        </div>
    );
};

// Main CustomControls component
const CustomControls = ({ jitsiApi, onHangup }) => {
    // State management
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const containerRef = useRef(null);

    // GSAP animations for entrance and indicators
    useGSAP(() => {
        gsap.from(containerRef.current, { 
            y: '100%', 
            opacity: 0, 
            duration: 0.7, 
            ease: 'power3.out' 
        });

        if (isStreaming) {
            gsap.to('.live-indicator', {
                boxShadow: '0 0 15px 5px rgba(34, 197, 94, 0.7)',
                scale: 1.05,
                repeat: -1,
                yoyo: true,
                duration: 1.5,
                ease: 'power1.inOut',
            });
        } else {
            gsap.killTweensOf('.live-indicator');
        }
        
        if (isRecording) {
            gsap.to('.recording-indicator', {
                boxShadow: '0 0 15px 5px rgba(239, 68, 68, 0.7)',
                scale: 1.05,
                repeat: -1,
                yoyo: true,
                duration: 1.5,
                ease: 'power1.inOut',
            });
        } else {
            gsap.killTweensOf('.recording-indicator');
        }

    }, { scope: containerRef, dependencies: [isStreaming, isRecording] }); 

    // Effect to set up Jitsi event listeners
    useEffect(() => {
        if (!jitsiApi) return;

        jitsiApi.isAudioMuted().then(muted => setIsAudioMuted(muted));
        jitsiApi.isVideoMuted().then(muted => setIsVideoMuted(muted));
        
        const handleAudioMute = ({ muted }) => setIsAudioMuted(muted);
        const handleVideoMute = ({ muted }) => setIsVideoMuted(muted);
        const handleStreamingStatus = ({ on }) => setIsStreaming(on);
        const handleRecordingStatus = ({ on }) => setIsRecording(on);

        jitsiApi.addEventListener('audioMuteStatusChanged', handleAudioMute);
        jitsiApi.addEventListener('videoMuteStatusChanged', handleVideoMute);
        jitsiApi.addEventListener('streamStatusChanged', handleStreamingStatus);
        jitsiApi.addEventListener('recordingStatusChanged', handleRecordingStatus);
        
        return () => {
            jitsiApi.removeEventListener('audioMuteStatusChanged', handleAudioMute);
            jitsiApi.removeEventListener('videoMuteStatusChanged', handleVideoMute);
            jitsiApi.removeEventListener('streamStatusChanged', handleStreamingStatus);
            jitsiApi.removeEventListener('recordingStatusChanged', handleRecordingStatus);
        };
    }, [jitsiApi]);

    // Handler functions for Jitsi commands
    const toggleAudio = () => jitsiApi?.executeCommand('toggleAudio');
    const toggleVideo = () => jitsiApi?.executeCommand('toggleVideo');
    const toggleScreenShare = () => jitsiApi?.executeCommand('toggleShareScreen');
    const raiseHand = () => jitsiApi?.executeCommand('toggleRaiseHand');
    
    const toggleRecording = () => {
        if (isRecording) {
            jitsiApi?.executeCommand('stopRecording', { mode: 'file' });
        } else {
            jitsiApi?.executeCommand('startRecording', { mode: 'file' });
        }
    };

    const handleStartStream = (streamKey) => {
        if (!jitsiApi) return;
        jitsiApi.executeCommand('startRecording', {
            mode: 'stream',
            youtubeStreamKey: streamKey,
        });
        setIsStreamModalOpen(false);
    };
    
    const handleStopStream = () => {
        if (!jitsiApi) return;
        jitsiApi.executeCommand('stopRecording', { mode: 'stream' });
    };

    return (
        <>
            {isStreamModalOpen && (
                <StreamKeyModal 
                    onStart={handleStartStream}
                    onClose={() => setIsStreamModalOpen(false)}
                    isLoading={false}
                />
            )}
            
            <div ref={containerRef} className="absolute bottom-5 left-1/2 -translate-x-1/2 w-auto z-20"> {/* Changed w-full to w-auto */}
    {/* highlight-start */}
    {/* We are changing the structure inside this div */}
    <div className="bg-gray-950/80 backdrop-blur-xl border border-gray-700/50 rounded-full shadow-2xl p-3 flex justify-center items-center gap-3"> {/* Changed justify-between to justify-center and added gap-3 */}
        
        {/* All buttons are now direct children of this single flex container */}
        
        {/* Mic Button */}
        <ControlButtonWithTooltip 
            onClick={toggleAudio} 
            tooltip={isAudioMuted ? 'Unmute' : 'Mute'}
            className={isAudioMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}
        >
            {isAudioMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </ControlButtonWithTooltip>

        {/* Video Button */}
        <ControlButtonWithTooltip 
            onClick={toggleVideo} 
            tooltip={isVideoMuted ? 'Start Video' : 'Stop Video'}
            className={isVideoMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}
        >
            {isVideoMuted ? <VideoOff size={22} /> : <Video size={22} />}
        </ControlButtonWithTooltip>

        {/* Go Live Button */}
        <ControlButtonWithTooltip 
            onClick={() => isStreaming ? handleStopStream() : setIsStreamModalOpen(true)}
            tooltip={isStreaming ? "Stop Live Stream" : "Go Live"}
            className={isStreaming 
                ? 'bg-green-500 text-white live-indicator'
                : 'bg-cyan-600 text-white hover:bg-cyan-500'
            }
        >
            <Radio size={22} />
        </ControlButtonWithTooltip>

        {/* Recording Button */}
        <ControlButtonWithTooltip 
            onClick={toggleRecording} 
            tooltip={isRecording ? "Stop Recording" : "Start Recording"}
            className={isRecording
                ? 'bg-red-600 text-white recording-indicator'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }
        >
            <CircleDot size={22} />
        </ControlButtonWithTooltip>

        {/* Screen Share Button */}
        <ControlButtonWithTooltip onClick={toggleScreenShare} tooltip="Share Screen" className="bg-gray-700 text-gray-200 hover:bg-gray-600">
            <MonitorUp size={22} />
        </ControlButtonWithTooltip>

        {/* Raise Hand Button */}
        <ControlButtonWithTooltip onClick={raiseHand} tooltip="Raise Hand" className="bg-gray-700 text-gray-200 hover:bg-gray-600">
            <Hand size={22} />
        </ControlButtonWithTooltip>

        {/* Hang Up Button */}
        <ControlButtonWithTooltip onClick={onHangup} tooltip="Leave Meeting" className="bg-red-600 text-white hover:bg-red-500">
            <PhoneOff size={22} />
        </ControlButtonWithTooltip>
        
    </div>
    {/* highlight-end */}
</div>
        </>
    );
};

export default CustomControls;
