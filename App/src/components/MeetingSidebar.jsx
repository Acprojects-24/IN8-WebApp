// NEW_MeetingSidebar.js

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, Share2, PanelLeftClose, Radio, Copy, Check, Mail, Award, MicOff, UserX, Mic, ShieldPlus, ShieldMinus } from 'lucide-react';

// --- Helper: Sidebar Navigation Button ---
const SidebarButton = ({ icon: Icon, label, onClick, isActive }) => (
    <button 
        onClick={onClick}
        className={`relative w-full flex items-center gap-4 p-3 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'bg-slate-700/60' : 'hover:bg-slate-800/50'}`}
    >
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-0 w-1 bg-cyan-400 rounded-r-full transition-all duration-300 ease-in-out ${isActive ? 'h-full' : 'group-hover:h-3/5'}`}></span>
        <Icon 
            size={18} 
            className={`ml-2 transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} 
        />
        <span className={`transition-colors duration-200 ${isActive ? 'text-white font-semibold' : 'text-slate-300 group-hover:text-white'}`}>
            {label}
        </span>
    </button>
);

// ❗️ REWRITE: participants use isAdmin flag only for badge and actions ❗️
const ParticipantsPanel = ({ participants, isHost, isAdmin, onKick, onMuteAll, onAskToUnmute, onRequestMute, onPromote, onDemote, adminIdsSet }) => {
    const avatarColors = [
        'from-cyan-500 to-blue-600', 'from-emerald-500 to-green-600',
        'from-purple-500 to-indigo-600', 'from-amber-500 to-orange-600',
        'from-pink-500 to-rose-600',
    ];
    
    const getAvatarColor = (name = '') => {
        const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return avatarColors[charCodeSum % avatarColors.length];
    };

    return (
        <motion.div
            key="participants-panel"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="p-1"
        >
            <div className="flex justify-between items-center px-2 mb-2">
                <h3 className="text-white font-semibold text-sm">
                    In Meeting ({participants.length})
                </h3>
                {(isHost || isAdmin) && (
                    <button 
                        onClick={onMuteAll} 
                        title="Mute Everyone"
                        className="px-2 py-1 text-xs font-semibold text-slate-300 bg-slate-700/70 rounded-md hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        Mute All
                    </button>
                )}
            </div>
            
            <div className="space-y-1 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 scrollbar-thumb-rounded-full">
                {participants.map(p => (
                    <div key={p.participantId} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(p.formattedDisplayName)} flex-shrink-0 flex items-center justify-center font-bold text-white text-xs`}>
                            {p.formattedDisplayName?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-slate-200 text-sm truncate flex-grow">{p.formattedDisplayName}</span>
                        <div className="ml-auto flex items-center gap-1">
                            {(isHost || isAdmin) && !p.isLocal && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {!p.isAdmin && (
                                        <>
                                            {p.isAudioMuted ? (
                                                <button onClick={() => onAskToUnmute(p.participantId)} title="Ask to Unmute" className="p-1.5 text-cyan-400 hover:text-white hover:bg-slate-600 rounded-full">
                                                    <Mic size={14} />
                                                </button>
                                            ) : (
                                                <button onClick={() => onRequestMute && onRequestMute(p.participantId)} title="Mute Participant" className="p-1.5 text-amber-500 hover:text-white hover:bg-amber-500 rounded-full">
                                                    <MicOff size={14} />
                                                </button>
                                            )}
                                            <button onClick={() => onKick(p)} title="Remove Participant" className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-full">
                                                <UserX size={14} />
                                            </button>
                                        </>
                                    )}
                                    {p.isAdmin && !p.isLocal ? (
                                        <>
                                            <button onClick={() => onDemote && onDemote(p.participantId)} title="Remove Admin" className="p-1.5 text-violet-400 hover:text-white hover:bg-violet-500 rounded-full">
                                                <ShieldMinus size={14} />
                                            </button>
                                        </>
                                    ) : null}
                                    {!p.isAdmin ? (
                                        <button onClick={() => onPromote && onPromote(p.participantId)} title="Make Admin" className="p-1.5 text-violet-400 hover:text-white hover:bg-violet-500 rounded-full">
                                            <ShieldPlus size={14} />
                                        </button>
                                    ) : null}
                                </div>
                            )}
                            {p.isAdmin && (
                                <Award size={16} title={p.isLocal ? 'You are the host' : 'Admin'} className="text-amber-400 flex-shrink-0" />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const SharePanel = ({ meetingLink, handleCopy, copiedItem }) => {
    const meetingCode = meetingLink ? meetingLink.substring(meetingLink.lastIndexOf('/') + 1) : '';

    return (
    <motion.div 
        key="share-panel"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="p-3 space-y-4"
    >
        <h3 className="text-white font-semibold">Share Invite</h3>
        <div>
            <label className="text-xs text-slate-400 font-medium">Meeting Link</label>
            <div className="flex items-center bg-slate-900/50 border border-slate-700 rounded-lg p-1 mt-1">
                <p className="flex-grow bg-transparent text-slate-300 text-sm outline-none px-2 truncate">{meetingLink}</p>
                <button 
                    onClick={() => handleCopy(meetingLink, 'link')} 
                    className={`flex items-center justify-center gap-2 w-28 px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${copiedItem === 'link' ? 'bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}
                >{copiedItem === 'link' ? <><Check size={16}/> Copied</> : <><Copy size={16}/> Copy</>}</button>
            </div>
        </div>
        <div>
            <label className="text-xs text-slate-400 font-medium">Meeting Code</label>
            <div className="flex items-center bg-slate-900/50 border border-slate-700 rounded-lg p-1 mt-1">
                <p className="flex-grow bg-transparent text-slate-300 text-sm font-bold tracking-wider outline-none px-2 truncate">{meetingCode}</p>
                <button 
                    onClick={() => handleCopy(meetingCode, 'code')}
                    className={`flex items-center justify-center gap-2 w-28 px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${copiedItem === 'code' ? 'bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}
                >{copiedItem === 'code' ? <><Check size={16}/> Copied</> : <><Copy size={16}/> Copy</>}</button>
            </div>
        </div>
        <div className="pt-2">
            <a 
                href={`mailto:?subject=Invitation to join meeting&body=Join my meeting with this link: ${meetingLink}`}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            ><Mail size={16} /><span>Share via Email</span></a>
        </div>
    </motion.div>
    )
};

const NEW_MeetingSidebar = ({ isOpen, setIsOpen, jitsiApi, meetingLink, isHost, isAdmin: isAdminProp, localDisplayName, hostName, hostParticipantId, meetingId, adminIds = [], adminDisplayNames = [], showToast }) => {
    const [activePanel, setActivePanel] = useState('participants');
    const [copiedItem, setCopiedItem] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [localParticipantId, setLocalParticipantId] = useState(null);
    const [moderatorIds, setModeratorIds] = useState(new Set());
    const adminIdsSet = useMemo(() => new Set(adminIds), [adminIds]);
    const normalizeName = useCallback((s) => {
        let v = (s || '').toString();
        v = v.replace(/\s*\([^)]*\)\s*$/g, '');
        try { v = v.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
        v = v.replace(/\s+/g, ' ').trim().toLowerCase();
        return v;
    }, []);
    const adminNamesSet = useMemo(() => new Set((adminDisplayNames || []).map(n => normalizeName(n))), [adminDisplayNames, normalizeName]);
    // Local optimistic admin caches to reflect UI instantly while DB/Jitsi catch up
    const [localAdminIds, setLocalAdminIds] = useState(new Set());
    const [localAdminNames, setLocalAdminNames] = useState(new Set());
    const effectiveAdminIdsSet = useMemo(() => {
        const set = new Set([...adminIdsSet]);
        localAdminIds.forEach(v => set.add(v));
        return set;
    }, [adminIdsSet, localAdminIds]);
    const effectiveAdminNamesSet = useMemo(() => {
        const set = new Set([...adminNamesSet]);
        localAdminNames.forEach(v => set.add(v));
        return set;
    }, [adminNamesSet, localAdminNames]);
    const [confirmKick, setConfirmKick] = useState(null);
    const [confirmMute, setConfirmMute] = useState(null);
    const updateTimerRef = useRef(null);
    const pollRef = useRef(null);
    
    const sidebarRef = useRef(null);
    const tl = useRef();

    useGSAP(() => {
        gsap.set(sidebarRef.current, { width: isOpen ? '18rem' : 0, padding: isOpen ? '0 1rem' : 0 });
        if(isOpen) {
             gsap.fromTo(sidebarRef.current.children, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.2 });
        }
    }, { dependencies: [isOpen] });
    
    const updateParticipantList = useCallback(() => {
        if (!jitsiApi) return;

        const list = Array.isArray(jitsiApi.getParticipantsInfo()) ? jitsiApi.getParticipantsInfo() : [];
        const localIdApi = (jitsiApi?.myUserId && jitsiApi.myUserId()) || null;
        const localId = localParticipantId || localIdApi;
        if (localIdApi && localParticipantId !== localIdApi) {
            try { setLocalParticipantId(localIdApi); } catch (_) {}
        }

        const bestByName = new Map();
        for (const p of list) {
            const display = p.formattedDisplayName || p.displayName || 'User';
            const norm = normalizeName(display);
            const curr = bestByName.get(norm);
            const prefer = (hostParticipantId && p.participantId === hostParticipantId) || (localId && p.participantId === localId);
            if (!curr || prefer) {
                bestByName.set(norm, {
                    participantId: p.participantId,
                    formattedDisplayName: display,
                    isAudioMuted: !!p.isAudioMuted,
                    role: p.role,
                    isModeratorFlag: !!p.isModerator,
                });
            }
        }

        // Ensure local participant is present with up-to-date moderator status
        if (localId && !Array.from(bestByName.values()).some(p => p.participantId === localId)) {
            const localName = localDisplayName || hostName || 'You';
            bestByName.set(normalizeName(localName), {
                participantId: localId,
                formattedDisplayName: localName,
                isAudioMuted: false,
                role: moderatorIds.has(localId) ? 'moderator' : 'participant',
                isModeratorFlag: moderatorIds.has(localId),
            });
        }

        const mapped = Array.from(bestByName.values()).map(p => {
            const norm = normalizeName(p.formattedDisplayName);
            const computedIsAdmin = (
                effectiveAdminIdsSet.has(p.participantId) ||
                effectiveAdminNamesSet.has(norm) ||
                (hostParticipantId && p.participantId === hostParticipantId) ||
                (hostName && normalizeName(hostName) === norm) ||
                p.isModeratorFlag ||
                p.role === 'moderator' ||
                moderatorIds.has(p.participantId)
            );
            return {
                ...p,
                isLocal: p.participantId === localId,
                isAdmin: (p.participantId === localId ? (computedIsAdmin || !!(isHost || isAdminProp)) : computedIsAdmin),
            };
        });

        mapped.sort((a, b) => {
            if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
            if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
            return a.formattedDisplayName.localeCompare(b.formattedDisplayName);
        });

        setParticipants(mapped);
    }, [jitsiApi, localParticipantId, hostParticipantId, hostName, effectiveAdminIdsSet, effectiveAdminNamesSet, moderatorIds, normalizeName]);

    // Force refresh participant list when admin sets or host id change so badges update immediately
    useEffect(() => {
        updateParticipantList();
    }, [effectiveAdminIdsSet, effectiveAdminNamesSet, hostParticipantId, moderatorIds, updateParticipantList]);

    const scheduleUpdate = useCallback(() => {
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        updateTimerRef.current = setTimeout(() => {
            updateParticipantList();
        }, 150);
    }, [updateParticipantList]);

    useEffect(() => {
        if (!jitsiApi) {
            return;
        }

        updateParticipantList();

        const handleConferenceJoined = (e) => {
            if (e && e.id) setLocalParticipantId(e.id);
            scheduleUpdate();
        };
        const handleChanged = () => scheduleUpdate();
        const handleRoleChanged = ({ id, role }) => {
            setModeratorIds(prev => {
                const next = new Set(prev);
                if (role === 'moderator') next.add(id); else next.delete(id);
                return next;
            });
            scheduleUpdate();
        };
        jitsiApi.addEventListener('participantJoined', handleChanged);
        jitsiApi.addEventListener('participantLeft', handleChanged);
        jitsiApi.addEventListener('displayNameChange', handleChanged);
        jitsiApi.addEventListener('participantMuteStatusChanged', handleChanged);
        jitsiApi.addEventListener('videoConferenceJoined', handleConferenceJoined);
        jitsiApi.addEventListener('videoConferenceLeft', handleChanged);
        jitsiApi.addEventListener('participantRoleChanged', handleRoleChanged);

        return () => {
            jitsiApi.removeEventListener('participantJoined', handleChanged);
            jitsiApi.removeEventListener('participantLeft', handleChanged);
            jitsiApi.removeEventListener('displayNameChange', handleChanged);
            jitsiApi.removeEventListener('participantMuteStatusChanged', handleChanged);
            jitsiApi.removeEventListener('videoConferenceJoined', handleConferenceJoined);
            jitsiApi.removeEventListener('videoConferenceLeft', handleChanged);
            jitsiApi.removeEventListener('participantRoleChanged', handleRoleChanged);
            if (updateTimerRef.current) clearTimeout(updateTimerRef.current);

        };
    }, [jitsiApi, isHost, updateParticipantList]); 

    useEffect(() => {
        if (!jitsiApi) return;
        pollRef.current = setInterval(() => {
            updateParticipantList();
        }, 3000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
   }, [jitsiApi, updateParticipantList]);

    const handleKickParticipant = (participantOrId) => {
        let id = null;
        let name = null;
        if (typeof participantOrId === 'string') {
            id = participantOrId;
            const p = participants.find(x => x.participantId === id);
            name = p?.formattedDisplayName || p?.displayName || null;
        } else if (participantOrId && typeof participantOrId === 'object') {
            id = participantOrId.participantId;
            name = participantOrId.formattedDisplayName || participantOrId.displayName || null;
        }
        if (!id) return;
        setConfirmKick({ participantId: id, displayName: name });
    };
    const handleMuteAll = async () => {
        try {
            const hasModeratorPowers = isHost || moderatorIds.has(localParticipantId);
            if (hasModeratorPowers) {
                jitsiApi?.executeCommand('muteEveryone');
            } else if (isAdminProp && meetingId) {
                await supabase.from('meeting_actions').insert([
                    {
                        meeting_id: meetingId,
                        type: 'mute-everyone',
                        status: 'pending',
                        requested_by: jitsiApi?.myUserId && jitsiApi.myUserId()
                    }
                ]);
                showToast && showToast({ title: 'Requested', message: 'Mute all request sent to host.', type: 'info' });
            }
        } catch (_) {}
    };

    const handleAskToUnmute = (participantId) => {
        jitsiApi?.executeCommand('askToUnmute', participantId);
    };

    // Force mute using askToUnmute command (works as a mute request)
    const handleForceMute = async (participantId) => {
        if (!(isHost || isAdminProp || moderatorIds.has(localParticipantId))) return;
        try {
            const hasModeratorPowers = isHost || moderatorIds.has(localParticipantId);
            if (hasModeratorPowers) {
                jitsiApi?.executeCommand('askToUnmute', participantId);
            } else if (meetingId) {
                await supabase.from('meeting_actions').insert([
                    {
                        meeting_id: meetingId,
                        type: 'mute',
                        target_participant_id: participantId,
                        status: 'pending',
                        requested_by: jitsiApi?.myUserId && jitsiApi.myUserId()
                    }
                ]);
            }
        } catch (_) {}
    };
    
    const handleTogglePanel = (panelName) => {
        if (panelName === 'chat') jitsiApi?.executeCommand('toggleChat');
        setActivePanel(panelName);
    };

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedItem(type);
            setTimeout(() => setCopiedItem(null), 2500);
        });
    };

    const promoteToAdmin = async (participantId) => {
        if (!meetingId) return;
        try {
            const participant = (jitsiApi?.getParticipantsInfo?.() || []).find(p => p.participantId === participantId);
            const rawName = (participant?.formattedDisplayName || participant?.displayName || '');
            const display = normalizeName(rawName);
            try {
                const hasModeratorPowers = isHost || moderatorIds.has(localParticipantId);
                if (hasModeratorPowers) {
                    jitsiApi?.executeCommand && jitsiApi.executeCommand('grantModerator', participantId);
                } else if (isAdminProp) {
                    await supabase.from('meeting_actions').insert([
                        { meeting_id: meetingId, type: 'grant-moderator', target_participant_id: participantId, target_display_name_normalized: display, status: 'pending', requested_by: jitsiApi?.myUserId && jitsiApi.myUserId() }
                    ]);
                }
            } catch (_) {}
            const { data: row } = await supabase.from('meetings').select('admin_ids, admin_display_names').eq('id', meetingId).single();
            const ids = new Set(row?.admin_ids || []); ids.add(participantId);
            const names = new Set(row?.admin_display_names || []); names.add(display);
            await supabase.from('meetings').update({ admin_ids: Array.from(ids), admin_display_names: Array.from(names) }).eq('id', meetingId);
            // Optimistically reflect in UI/local cache
            setLocalAdminIds(prev => { const next = new Set(prev); next.add(participantId); return next; });
            setLocalAdminNames(prev => { const next = new Set(prev); next.add(display); return next; });
            setParticipants(prev => {
                const next = prev.map(p => p.participantId === participantId ? { ...p, isAdmin: true, isModeratorFlag: true, role: 'moderator' } : p);
                next.sort((a, b) => {
                    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
                    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
                    return a.formattedDisplayName.localeCompare(b.formattedDisplayName);
                });
                return next;
            });
            // Notify the target participant immediately
            try { jitsiApi?.executeCommand && jitsiApi.executeCommand('sendEndpointTextMessage', participantId, JSON.stringify({ type: 'admin-granted' })); } catch (_) {}
            try { await supabase.from('meeting_actions').insert([{ meeting_id: meetingId, type: 'notify-admin-granted', target_participant_id: participantId, target_display_name_normalized: display, status: 'info', requested_by: jitsiApi?.myUserId && jitsiApi.myUserId() }]); } catch (_) {}
            showToast && showToast({ title: 'Promoted', message: `${participant?.displayName || 'Participant'} is now an admin.`, type: 'success' });
        } catch (e) {}
    };

    const demoteAdmin = async (participantId) => {
        if (!meetingId) return;
        try {
            const participant = (jitsiApi?.getParticipantsInfo?.() || []).find(p => p.participantId === participantId);
            const rawName = (participant?.formattedDisplayName || participant?.displayName || '');
            const display = normalizeName(rawName);
            const { data: row } = await supabase.from('meetings').select('admin_ids, admin_display_names').eq('id', meetingId).single();
            const ids = new Set(row?.admin_ids || []); ids.delete(participantId);
            const names = new Set(row?.admin_display_names || []); names.delete(display);
            await supabase.from('meetings').update({ admin_ids: Array.from(ids), admin_display_names: Array.from(names) }).eq('id', meetingId);
            try {
                const hasModeratorPowers = isHost || moderatorIds.has(localParticipantId);
                if (hasModeratorPowers) {
                    jitsiApi?.executeCommand && jitsiApi.executeCommand('revokeModerator', participantId);
                } else if (isAdminProp) {
                    await supabase.from('meeting_actions').insert([
                        { meeting_id: meetingId, type: 'revoke-moderator', target_participant_id: participantId, target_display_name_normalized: display, status: 'pending', requested_by: jitsiApi?.myUserId && jitsiApi.myUserId() }
                    ]);
                }
            } catch (_) {}
            // Optimistic update
            setLocalAdminIds(prev => { const next = new Set(prev); next.delete(participantId); return next; });
            setLocalAdminNames(prev => { const next = new Set(prev); next.delete(display); return next; });
            setParticipants(prev => {
                const next = prev.map(p => p.participantId === participantId ? { ...p, isAdmin: false } : p);
                next.sort((a, b) => {
                    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
                    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
                    return a.formattedDisplayName.localeCompare(b.formattedDisplayName);
                });
                return next;
            });
            // Notify the target participant immediately
            try { jitsiApi?.executeCommand && jitsiApi.executeCommand('sendEndpointTextMessage', participantId, JSON.stringify({ type: 'admin-revoked' })); } catch (_) {}
            try { await supabase.from('meeting_actions').insert([{ meeting_id: meetingId, type: 'notify-admin-revoked', target_participant_id: participantId, target_display_name_normalized: display, status: 'info', requested_by: jitsiApi?.myUserId && jitsiApi.myUserId() }]); } catch (_) {}
            showToast && showToast({ title: 'Demoted', message: `${participant?.displayName || 'Participant'} admin rights removed.`, type: 'info' });
        } catch (e) {}
    };

    return (
        <motion.aside
            ref={sidebarRef}
            className="h-screen bg-slate-900 border-r border-slate-800/70 overflow-hidden flex flex-col shadow-2xl"
            initial={{ width: 0, padding: 0 }}
            animate={{ width: isOpen ? '18rem' : 0, padding: isOpen ? '0 1rem' : 0 }}
            transition={{ duration: 0.5, ease: 'circOut' }}
        >
            <div className="flex items-center justify-between py-4 mb-2 border-b border-slate-800 flex-shrink-0">
                <h2 className="text-lg font-bold text-white tracking-wide">IN8 Meetings</h2>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                    <PanelLeftClose size={20} />
                </button>
            </div>

            <nav className="flex-shrink-0 space-y-1">
                <SidebarButton icon={Users} label="Participants" onClick={() => handleTogglePanel('participants')} isActive={activePanel === 'participants'} />
                <SidebarButton icon={MessageSquare} label="Chat" onClick={() => handleTogglePanel('chat')} isActive={activePanel === 'chat'}/>
                <SidebarButton icon={Share2} label="Share" onClick={() => handleTogglePanel('share')} isActive={activePanel === 'share'}/>
            </nav>
            
            <hr className="border-slate-800 my-3" />

            <div className="flex-grow overflow-hidden">
                <AnimatePresence mode="wait">
                    {activePanel === 'participants' && (
                         <ParticipantsPanel 
                            participants={participants}
                            isHost={isHost}
                            isAdmin={isAdminProp}
                            onKick={handleKickParticipant}
                            onMuteAll={handleMuteAll} 
                            onAskToUnmute={handleAskToUnmute}
                            onRequestMute={(participantId)=> setConfirmMute({ participantId })}
                            onPromote={promoteToAdmin}
                            onDemote={demoteAdmin}
                            adminIdsSet={adminIdsSet}
                        />
                    )}
                    {activePanel === 'share' && (
                        <SharePanel 
                            meetingLink={meetingLink} 
                            handleCopy={handleCopy} 
                            copiedItem={copiedItem} 
                        />
                    )}
                    {activePanel === 'chat' && (
                        <motion.div key="chat-placeholder" className="p-4 text-center text-slate-400 text-sm" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                            <p>Chat panel is managed by Jitsi.</p>
                            <p className="mt-2">Clicking the button again will close it.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-800 flex-shrink-0">
                 <div className="flex items-center justify-center gap-2.5 text-xs font-semibold rounded-lg p-2 bg-green-500/10 text-green-400">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span><span>Connected & Secure</span>
                </div>
            </div>
            {/* Custom Kick Confirmation */}
            <AnimatePresence>
                {confirmKick && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
                        onClick={() => setConfirmKick(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: -10, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h4 className="text-lg font-semibold text-white mb-1">Remove participant?</h4>
                            <p className="text-sm text-slate-300 mb-4">This participant will be disconnected from the meeting.</p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setConfirmKick(null)} className="px-4 py-2 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600">Cancel</button>
                                <button onClick={async () => { 
                                    try {
                                        if (isHost) {
                                            jitsiApi?.executeCommand('kickParticipant', confirmKick.participantId);
                                        } else if (meetingId) {
                                            await supabase.from('meeting_actions').insert([
                                                {
                                                    meeting_id: meetingId,
                                                    type: 'kick',
                                                    target_participant_id: confirmKick.participantId,
                                                    status: 'pending',
                                                    requested_by: jitsiApi?.myUserId && jitsiApi.myUserId()
                                                }
                                            ]);
                                        }
                                        if ((isHost || isAdmin) && meetingId && confirmKick.displayName) {
                                            const { data: row } = await supabase.from('meetings').select('banned_display_names').eq('id', meetingId).single();
                                            const banned = new Set(row?.banned_display_names || []);
                                            banned.add(confirmKick.displayName);
                                            await supabase.from('meetings').update({ banned_display_names: Array.from(banned) }).eq('id', meetingId);
                                        }
                                    } catch (e) {
                                    } finally {
                                        setConfirmKick(null);
                                    }
                                }} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500">Remove</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Custom Mute Confirmation */}
            <AnimatePresence>
                {confirmMute && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
                        onClick={() => setConfirmMute(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: -10, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h4 className="text-lg font-semibold text-white mb-1">Mute participant?</h4>
                            <p className="text-sm text-slate-300 mb-4">They will be muted immediately.</p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setConfirmMute(null)} className="px-4 py-2 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600">Cancel</button>
                                <button onClick={() => { handleForceMute(confirmMute.participantId); setConfirmMute(null); }} className="px-4 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-400">Mute</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.aside>
    );
};

export default NEW_MeetingSidebar;