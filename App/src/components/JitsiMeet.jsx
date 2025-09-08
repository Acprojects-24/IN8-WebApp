import React, { useEffect, useRef } from 'react';
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
}) => {
    const jitsiContainerRef = useRef(null);
    const apiRef = useRef(null);
    const joinedRef = useRef(false);
    const retriedRef = useRef(false);

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
                    noiseSuppression: {
                        enabled: noiseSuppressionEnabled,
                    },
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    DISPLAY_WELCOME_PAGE_CONTENT: false,
                    DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
                    SHOW_CHROME_EXTENSION_BANNER: false,
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
                    console.info('[Jitsi] Creating External API instance', { roomName });
                    apiRef.current = new window.JitsiMeetExternalAPI(effectiveDomain, options);
                    jitsiInstancePool.set(roomName, { api: apiRef.current });
                } catch (e) {
                    console.error('Failed to create JitsiMeetExternalAPI:', e);
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
                signalReady();

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

                // Provide a basic cleanup hook by removing listeners when the iframe is parked/disposed
                try {
                    apiRef.current.addEventListener('readyToClose', () => {
                        try { apiRef.current.removeEventListener('incomingMessage', chatHandler); } catch (_) {}
                    });
                } catch (_) {}
            };

            // Watchdog: if we don't join within 8s, recreate once
            const retryTimer = setTimeout(() => {
                if (!joinedRef.current && !retriedRef.current) {
                    retriedRef.current = true;
                    try { apiRef.current && apiRef.current.dispose(); } catch (_) {}
                    if (createApi()) {
                        wireListeners();
                    }
                }
            }, 8000);

            wireListeners();
        };

        if (needToLoadScript && script) {
            script.onload = onReady;
        } else {
            onReady();
        }

        return () => {
            // Park the iframe so the API instance persists across unmounts
            if (apiRef.current) {
                try {
                    const iframe = apiRef.current.getIFrame && apiRef.current.getIFrame();
                    if (iframe) {
                        const lot = getParkingLot();
                        lot.appendChild(iframe);
                    }
                    if (!jitsiInstancePool.has(roomName)) {
                        jitsiInstancePool.set(roomName, { api: apiRef.current });
                    }
                } catch (_) {}
            }
            apiRef.current = null;
            clearTimeout(failTimer);
            // Do NOT remove the external_api.js script; keep it cached globally
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
};

export default JitsiMeet;