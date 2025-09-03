import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radio, Youtube, Facebook, Twitch, Linkedin, Waves, ChevronDown, Check } from 'lucide-react';

const PLATFORM_PRESETS = {
  youtube: {
    label: 'YouTube',
    requiresUrl: false,
    defaultUrl: '',
    placeholderKey: 'Enter YouTube Stream Key',
  },
  facebook: {
    label: 'Facebook Live',
    requiresUrl: true,
    defaultUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    placeholderKey: 'Enter Facebook Stream Key',
  },
  twitch: {
    label: 'Twitch',
    requiresUrl: true,
    defaultUrl: 'rtmp://live.twitch.tv/app/',
    placeholderKey: 'Enter Twitch Stream Key',
  },
  linkedin: {
    label: 'LinkedIn Live',
    requiresUrl: true,
    defaultUrl: 'rtmps://live-video.net/broadcast/',
    placeholderKey: 'Enter LinkedIn Stream Key',
  },
  custom: {
    label: 'Custom RTMP',
    requiresUrl: true,
    defaultUrl: 'rtmp://',
    placeholderKey: 'Enter Stream Key',
  },
};

export default function LiveStreamModal({ onStart, onClose, isLoading }) {
  const [platform, setPlatform] = useState('youtube');
  const [rtmpUrl, setRtmpUrl] = useState(PLATFORM_PRESETS.youtube.defaultUrl);
  const [streamKey, setStreamKey] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const preset = useMemo(() => PLATFORM_PRESETS[platform], [platform]);

  const OPTIONS = useMemo(() => [
    { key: 'youtube', label: PLATFORM_PRESETS.youtube.label, Icon: Youtube },
    { key: 'facebook', label: PLATFORM_PRESETS.facebook.label, Icon: Facebook },
    { key: 'twitch', label: PLATFORM_PRESETS.twitch.label, Icon: Twitch },
    { key: 'linkedin', label: PLATFORM_PRESETS.linkedin.label, Icon: Linkedin },
    { key: 'custom', label: PLATFORM_PRESETS.custom.label, Icon: Waves },
  ], []);

  const canStart = useMemo(() => {
    if (!streamKey.trim()) return false;
    if (preset.requiresUrl && !rtmpUrl.trim()) return false;
    return true;
  }, [preset.requiresUrl, rtmpUrl, streamKey]);

  const handlePlatformChange = (e) => {
    const value = e.target?.value ?? e; // supports custom list selection
    setPlatform(value);
    setRtmpUrl(PLATFORM_PRESETS[value]?.defaultUrl || '');
    setIsMenuOpen(false);
  };

  const handleStart = () => {
    if (!canStart) return;
    onStart({ platform, streamKey: streamKey.trim(), rtmpUrl: rtmpUrl.trim() });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    if (isMenuOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isMenuOpen]);

  // Keyboard navigation for dropdown
  const onComboboxKeyDown = (e) => {
    if (!isMenuOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      setIsMenuOpen(true);
      e.preventDefault();
      return;
    }
    if (!isMenuOpen) return;
    if (e.key === 'ArrowDown') {
      setHighlightIndex((i) => (i + 1) % OPTIONS.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlightIndex((i) => (i - 1 + OPTIONS.length) % OPTIONS.length);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const opt = OPTIONS[highlightIndex];
      if (opt) handlePlatformChange(opt.key);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setIsMenuOpen(false);
      e.preventDefault();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Radio className="text-red-500" size={22} /> Go Live</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">Select a platform and provide the stream key. For RTMP platforms, include the server URL.</p>

        <div className="space-y-3">
          <div className="relative" ref={menuRef}>
            <label className="block text-xs text-slate-400 mb-1">Platform</label>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((v) => !v)}
              onKeyDown={onComboboxKeyDown}
              className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {OPTIONS.find(o => o.key === platform)?.Icon && (
                  React.createElement(OPTIONS.find(o => o.key === platform).Icon, { size: 18, className: 'text-slate-300' })
                )}
                <span className="font-medium">{PLATFORM_PRESETS[platform].label}</span>
              </span>
              <ChevronDown size={18} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 4, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="absolute left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-10"
                  role="listbox"
                >
                  {OPTIONS.map((opt, idx) => (
                    <button
                      key={opt.key}
                      role="option"
                      aria-selected={platform === opt.key}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onClick={() => handlePlatformChange(opt.key)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                        platform === opt.key
                          ? 'bg-cyan-600/20 text-white'
                          : idx === highlightIndex
                          ? 'bg-slate-800/60 text-slate-200'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <opt.Icon size={18} className="text-slate-300" />
                        <span>{opt.label}</span>
                      </span>
                      {platform === opt.key && <Check size={16} className="text-cyan-400" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {preset.requiresUrl && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">RTMP Server URL</label>
              <input
                type="text"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder={preset.defaultUrl || 'rtmp://...'}
                className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-lg py-2.5 px-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Stream Key</label>
            <input
              type="text"
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              placeholder={preset.placeholderKey}
              className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-lg py-2.5 px-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600">Cancel</button>
          <button
            onClick={handleStart}
            disabled={!canStart || isLoading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Starting…' : 'Start Live'}
          </button>
        </div>
      </div>
    </div>
  );
}


