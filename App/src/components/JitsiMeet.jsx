import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

// Keep a lightweight pool of Jitsi API instances keyed by roomName so brief unmounts
// (e.g., tab switches, fast refresh) don't tear down the meeting.
const jitsiInstancePool = new Map(); // roomName -> { api }
function getParkingLot() {
    let lot = document.getElementById('jitsi-parking-lot');
    if (!lot) {
        lot = document.createElement('div');
        lot.id = 'jitsi-parking-lot';
        lot.style.position = 'fixed';
        lot.style.left = '-99999px';
        lot.style.top = '0';
        lot.style.width = '1px';
        lot.style.height = '1px';
        lot.style.overflow = 'hidden';
        document.body.appendChild(lot);
    }
    return lot;
}

const JitsiMeet = React.memo(({
    roomName,
    displayName,
    password,
    domain,
    onMeetingEnd,
    onApiReady,
    onRecordingStatusChanged, 
    startWithVideoMuted,
    startWithAudioMuted,
    prejoinPageEnabled,
    noiseSuppressionEnabled,
    jwt,
    showToast,
    webinarMode,
    isHost,
    onMeetingTerminated,
}) => {
    const jitsiContainerRef = useRef(null);
    const apiRef = useRef(null);
    const joinedRef = useRef(false);
    const retriedRef = useRef(false);
    const [currentUserIsModerator, setCurrentUserIsModerator] = useState(isHost);

    // Update moderator status when isHost prop changes
    useEffect(() => {
        setCurrentUserIsModerator(isHost);
    }, [isHost]);

    useEffect(() => {
        if (!jitsiContainerRef.current) return;
        
        const effectiveDomain = domain;

        let script = null;
        const needToLoadScript = typeof window.JitsiMeetExternalAPI === 'undefined';
        if (needToLoadScript) {
            script = document.createElement('script');
            script.src = `https://${effectiveDomain}/external_api.js`;
            script.async = true;
            script.onerror = () => console.error(`Failed to load Jitsi script from: https://${effectiveDomain}/external_api.js`);
            document.head.appendChild(script);
        }

        const failTimer = setTimeout(() => {
            showToast && showToast({
                title: 'Failed to load meeting',
                message: 'The meeting could not be embedded. Check frame-ancestors/X-Frame-Options on the Jitsi domain.',
                type: 'error',
            });
        }, 15000);

        const onReady = () => {
            if (!window.JitsiMeetExternalAPI) {
                console.error("Jitsi API script not loaded.");
                clearTimeout(failTimer);
                showToast && showToast({ title: 'Load error', message: 'external_api.js did not initialize.', type: 'error' });
                return;
            }

            // Configure toolbar buttons based on webinar mode and user role
            const getToolbarButtons = () => {
                if (webinarMode && !isHost) {
                    // In webinar mode, participants don't see mic/camera controls at all
                    return [
                        'closedcaptions', 'fullscreen', 'hangup', 'chat', 'raisehand', 
                        'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts', 
                        'tileview', 'download', 'help'
                    ];
                }
                // Default toolbar for moderators or normal meetings
                return [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting',
                    'fullscreen', 'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'e2ee', 'security', 'participants-pane', 'whiteboard'
                ];
            };

            console.log('[Jitsi] Initializing with options:', { 
                webinarMode, 
                isHost, 
                displayName, 
                roomName,
                hasJWT: !!jwt 
            });

            const options = {
                roomName,
                width: '100%',
                height: '100%',
                parentNode: jitsiContainerRef.current,
                userInfo: { displayName },
                password: password || undefined,
                configOverwrite: {
                    startWithVideoMuted,
                    startWithAudioMuted,
                    prejoinPageEnabled,
                    prejoinConfig: { enabled: false },
                    enableWelcomePage: false,
                    enableClosePage: false,
                    disableInitialGUM: false,
                    requireDisplayName: false,
                    // Webinar mode restrictions for participants - simplified to prevent initialization issues
                    ...(webinarMode && !isHost && {
                        // Force participants to start muted in webinar mode
                        startWithAudioMuted: true,
                        startWithVideoMuted: true,
                        // Basic restrictions
                        disableInviteFunctions: true,
                        disableRemoteMute: true,
                        // Enable chat and hand raise for participants
                        disableRaiseHand: false,
                        disableChat: false,
                    }),
                    noiseSuppression: {
                        enabled: noiseSuppressionEnabled,
                    },
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    DISPLAY_WELCOME_PAGE_CONTENT: false,
                    DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
                    SHOW_CHROME_EXTENSION_BANNER: false,
                    TOOLBAR_BUTTONS: getToolbarButtons(),
                    // Additional webinar mode restrictions for participants - simplified
                    ...(webinarMode && !isHost && {
                        HIDE_INVITE_MORE_HEADER: true,
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                    }),
                },
            };
            if (jwt) {
                options.jwt = jwt;
            }
            
            const createApi = () => {
                // Reuse existing API instance for this room if available
                const pooled = jitsiInstancePool.get(roomName);
                if (pooled && pooled.api) {
                    try {
                        apiRef.current = pooled.api;
                        const iframe = apiRef.current.getIFrame && apiRef.current.getIFrame();
                        if (iframe) {
                            const lot = getParkingLot();
                            if (iframe.parentElement === lot || iframe.parentElement !== jitsiContainerRef.current) {
                                try { jitsiContainerRef.current.appendChild(iframe); } catch (_) {}
                            }
                        }
                        console.info('[Jitsi] Reusing pooled API instance', { roomName });
                        return true;
                    } catch (e) {
                        // fallthrough to fresh create
                        console.warn('[Jitsi] Failed to reuse pooled instance, creating new', e);
                    }
                }
                try {
                    console.info('[Jitsi] Creating External API instance', { 
                        roomName, 
                        webinarMode,
                        isHost,
                        domain: effectiveDomain 
                    });
                    apiRef.current = new window.JitsiMeetExternalAPI(effectiveDomain, options);
                    jitsiInstancePool.set(roomName, { api: apiRef.current });
                    console.info('[Jitsi] API instance created successfully');
                } catch (e) {
                    console.error('Failed to create JitsiMeetExternalAPI:', e, { options });
                    showToast && showToast({ title: 'Embed blocked', message: 'The Jitsi server refused to be embedded. Check X-Frame-Options / CSP (frame-ancestors).', type: 'error' });
                    clearTimeout(failTimer);
                    return false;
                }
                return true;
            };

            if (!createApi()) return;

            joinedRef.current = false;
            retriedRef.current = false;

            const wireListeners = () => {
                if (!apiRef.current) return;
                // Ensure we signal readiness exactly once, even if multiple events fire
                let readySignalled = false;
                const signalReady = () => {
                    if (readySignalled) return;
                    readySignalled = true;
                    clearTimeout(failTimer);
                    if (onApiReady && typeof onApiReady === 'function') {
                        onApiReady(apiRef.current);
                    }
                };

                // Call immediately after successful API creation so the app can remove loaders
                setTimeout(() => signalReady(), 100); // Small delay to ensure DOM is ready

                // Also listen to events in case immediate signal is too early in some environments
                apiRef.current.addEventListener('iframeReady', () => {
                    console.info('[Jitsi] iframeReady');
                    signalReady();
                });

                apiRef.current.addEventListener('videoConferenceJoined', () => {
                    joinedRef.current = true;
                    console.info('[Jitsi] videoConferenceJoined');
                    signalReady();
                });

                // Listen for chat messages coming through the embedded conference
                // and capture system messages posted by "Fellow Jitster" (e.g., recording folder info)
                const chatHandler = (payload) => {
                    try {
                        const sender = (payload && (payload.nick || (payload.from && (payload.from.formattedDisplayName || payload.from.name)) || payload.from || payload.displayName || '')).toString();
                        const messageText = (payload && (payload.message || payload.text || payload.body || ''));
                        if (/fellow\s+jitster/i.test(sender)) {
                            // Log to console for downstream automation/inspection
                            // Example message: "The current recording folder is: <id>"
                            console.log('[Jitsi][Fellow Jitster] System chat:', messageText);
                        }
                    } catch (e) {
                        // noop
                    }
                };
                try { apiRef.current.addEventListener('incomingMessage', chatHandler); } catch (_) {}

                apiRef.current.addEventListener('videoConferenceLeft', () => {
                    if (onMeetingEnd && typeof onMeetingEnd === 'function') {
                        onMeetingEnd();
                    }
                });

                // Listen for meeting termination by admin/host
                apiRef.current.addEventListener('videoConferenceTerminated', () => {
                    if (onMeetingTerminated && typeof onMeetingTerminated === 'function') {
                        onMeetingTerminated();
                    } else if (onMeetingEnd && typeof onMeetingEnd === 'function') {
                        onMeetingEnd();
                    }
                });
                try {
                    apiRef.current.addEventListener('readyToClose', () => {
                        if (onMeetingEnd && typeof onMeetingEnd === 'function') {
                            onMeetingEnd();
                        }
                    });
                } catch (_) {}
                try {
                    apiRef.current.addEventListener('participantKickedOut', () => {
                        if (onMeetingEnd && typeof onMeetingEnd === 'function') {
                            onMeetingEnd();
                        }
                    });
                } catch (_) {}

                apiRef.current.addEventListener('recordingStatusChanged', (status) => {
                    if (onRecordingStatusChanged && typeof onRecordingStatusChanged === 'function') {
                        onRecordingStatusChanged(status);
                    }
                });

                // Listen for moderator role changes in webinar mode
                if (webinarMode) {
                    const handleParticipantRoleChanged = (event) => {
                        try {
                            const { id, role } = event;
                            const myId = apiRef.current.myUserId && apiRef.current.myUserId();
                            
                            // Check if the role change is for the current user
                            if (id === myId) {
                                const isModerator = role === 'moderator';
                                setCurrentUserIsModerator(isModerator || isHost);
                                
                                if (isModerator && !isHost) {
                                    // User was promoted to moderator - update toolbar dynamically
                                    const newToolbarButtons = [
                                        'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting',
                                        'fullscreen', 'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                                        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                                        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                                        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                                        'e2ee', 'security', 'participants-pane', 'whiteboard'
                                    ];
                                    
                                    try {
                                        apiRef.current.executeCommand('overwriteConfig', {
                                            interfaceConfigOverwrite: {
                                                TOOLBAR_BUTTONS: newToolbarButtons,
                                                // Remove webinar restrictions for new moderator
                                                DISABLE_FOCUS_INDICATOR: false,
                                                DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
                                                DISABLE_TRANSCRIPTION_SUBTITLES: false,
                                                DISABLE_RINGING: false,
                                                HIDE_INVITE_MORE_HEADER: false,
                                                DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
                                                DISABLE_PRESENCE_STATUS: false,
                                                HIDE_DEEP_LINKING_LOGO: false,
                                                SHOW_POWERED_BY: false,
                                                DISABLE_VIDEO_BACKGROUND: false,
                                                DISABLE_LOCAL_VIDEO_FLIP: false,
                                            }
                                        });
                                        console.info('[Jitsi] User promoted to moderator in webinar mode - controls enabled');
                                    } catch (configError) {
                                        console.warn('[Jitsi] Could not update config after promotion:', configError);
                                    }
                                }
                            }
                        } catch (error) {
                            console.warn('[Jitsi] Error handling participant role change:', error);
                        }
                    };

                    try {
                        apiRef.current.addEventListener('participantRoleChanged', handleParticipantRoleChanged);
                    } catch (error) {
                        console.warn('[Jitsi] Could not add participantRoleChanged listener:', error);
                    }
                }

                // Provide a basic cleanup hook by removing listeners when the iframe is parked/disposed
                try {
                    apiRef.current.addEventListener('readyToClose', () => {
                        console.log('[Jitsi] Ready to close event received');
                    });
                } catch (e) {
                    console.warn('[Jitsi] Could not add readyToClose listener:', e);
                }
            };

            // Fail timer to catch cases where the API never loads
            const failTimer = setTimeout(() => {
                if (!joinedRef.current && !retriedRef.current) {
                    console.warn('[Jitsi] API load timeout, retrying once');
                    retriedRef.current = true;
                    try { apiRef.current && apiRef.current.dispose(); } catch (_) {}
                    if (createApi()) {
                        wireListeners();
                    }
                } else if (!joinedRef.current) {
                    // Even if we retried, signal ready to clear loading state
                    console.warn('[Jitsi] Final timeout, signaling ready to clear loading');
                    if (onApiReady && typeof onApiReady === 'function') {
                        onApiReady(apiRef.current);
                    }
                }
            }, 12000); // Increased timeout

            wireListeners();
        };

        if (needToLoadScript && script) {
            script.onload = onReady;
        } else {
            onReady();
        }

        return () => {
            clearTimeout(failTimer);
            if (apiRef.current) {
                try {
                    // For guest users or when explicitly ending, dispose immediately
                    const isGuest = localStorage.getItem('joinAsGuest') === 'true';
                    if (isGuest || window.location.pathname.includes('/guest/')) {
                        console.log('[Jitsi] Disposing API for guest user');
                        apiRef.current.dispose();
                        jitsiInstancePool.delete(roomName);
                    } else {
                        // Park the iframe for regular users
                        const iframe = apiRef.current.getIFrame && apiRef.current.getIFrame();
                        if (iframe) {
                            const lot = getParkingLot();
                            try { lot.appendChild(iframe); } catch (_) {}
                        }
                    }
                } catch (e) {
                    console.warn('[Jitsi] Failed to handle cleanup on unmount', e);
                }
            }
        };
    }, [domain, roomName]);

    // Update mutable props without remounting the iframe
    useEffect(() => {
        if (!apiRef.current) return;
        try { apiRef.current.executeCommand('displayName', displayName); } catch (_) {}
    }, [displayName]);

    return (
        <div
            ref={jitsiContainerRef}
            className="w-full h-full overflow-hidden"
            style={{ position: 'relative' }}
        />
    );
});

JitsiMeet.propTypes = {
    domain: PropTypes.string,
    roomName: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    password: PropTypes.string,
    onMeetingEnd: PropTypes.func.isRequired,
    onApiReady: PropTypes.func.isRequired,
    onRecordingStatusChanged: PropTypes.func,
    startWithVideoMuted: PropTypes.bool,
    startWithAudioMuted: PropTypes.bool,
    prejoinPageEnabled: PropTypes.bool,
    noiseSuppressionEnabled: PropTypes.bool,
    jwt: PropTypes.string,
    showToast: PropTypes.func,
    webinarMode: PropTypes.bool,
    isHost: PropTypes.bool,
};

JitsiMeet.defaultProps = {
    domain: 'meet.in8.com',
    password: '',
    onRecordingStatusChanged: () => {},
    startWithVideoMuted: false,
    startWithAudioMuted: false,
    prejoinPageEnabled: false,
    noiseSuppressionEnabled: true,
    jwt: undefined,
    webinarMode: false,
    isHost: false,
};

export default JitsiMeet;