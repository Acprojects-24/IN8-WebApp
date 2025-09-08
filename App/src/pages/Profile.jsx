import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { 
    User, Mail, Lock, Camera, Save, ArrowLeft, 
    Eye, EyeOff, Upload, Edit3,
    Shield,
    ImageIcon, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import defaultProfileImage from '../assets/default-profile.svg';
import {
    validateImageFile,
    compressImage,
    saveProfileImage,
    getProfileImage,
    removeProfileImage,
    saveUserProfile,
    getUserProfile,
    getUserId,
    uploadProfileImageToCloud,
    loadCloudProfileImage,
    removeCloudProfileImage
} from '../utils/profileUtils';
import Toast from '../components/Toast';

const ProfilePage = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const profileImageRef = useRef(null);
    const pageRef = useRef(null);
    
    // State management
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        bio: ''
    });
    
    const [profileImage, setProfileImage] = useState(defaultProfileImage);
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeToast, setActiveToast] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'security'

    // Load profile data on component mount with smooth entry animation
    useEffect(() => {
        const loadProfile = async () => {
            // Load profile data from localStorage
            const userData = getUserProfile();
            if (userData) {
                setProfile(prev => ({ ...prev, ...userData }));
            }
            
            // Load profile image from Supabase (with localStorage fallback)
            const cloudImage = await loadCloudProfileImage();
            setProfileImage(cloudImage);
        };
        
        loadProfile();

        // Entry animation
        gsap.fromTo(pageRef.current, 
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
        );
        
        // Force-disable global scrollbars while on Profile page
        const prevHtmlOverflow = document.documentElement.style.overflowY;
        const prevBodyOverflow = document.body.style.overflowY;
        document.documentElement.style.overflowY = 'hidden';
        document.body.style.overflowY = 'hidden';
        document.documentElement.classList.add('scrollbar-hide');
        document.body.classList.add('scrollbar-hide');

        return () => {
            document.documentElement.style.overflowY = prevHtmlOverflow;
            document.body.style.overflowY = prevBodyOverflow;
            document.documentElement.classList.remove('scrollbar-hide');
            document.body.classList.remove('scrollbar-hide');
        };
    }, []);

    // Toast utility
    const showToast = (toastData) => {
        setActiveToast({ id: Date.now(), ...toastData });
    };

    // Handle profile image upload with enhanced animations
    const handleImageUpload = async (file) => {
        if (!file) return;
        
        setIsLoading(true);
        
        // Animate image container during upload
        gsap.to(profileImageRef.current, {
            scale: 0.95,
            duration: 0.2,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1
        });
        
        try {
            const validation = validateImageFile(file);
            if (!validation.success) {
                showToast({
                    title: 'Invalid File',
                    message: validation.message,
                    type: 'error'
                });
                return;
            }

            // Create preview
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);

            // Upload to Supabase Storage
            const uploadResult = await uploadProfileImageToCloud(file);
            if (uploadResult.success) {
                setProfileImage(uploadResult.path);
                setImagePreview(null);
                
                // Success animation
                gsap.to(profileImageRef.current, {
                    scale: 1.05,
                    duration: 0.1,
                    ease: 'power2.out',
                    yoyo: true,
                    repeat: 1
                });
                
                showToast({
                    title: 'Success',
                    message: 'Profile picture uploaded successfully!',
                    type: 'success'
                });
            } else {
                throw new Error(uploadResult.message);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            setImagePreview(null);
            showToast({
                title: 'Upload Failed',
                message: 'Failed to upload profile picture. Please try again.',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Enhanced drag and drop
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    };

    // Remove profile image with animation
    const handleRemoveImage = () => {
        gsap.to(profileImageRef.current, {
            scale: 0,
            rotation: 180,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: async () => {
                const result = await removeCloudProfileImage();
                
                // Reset to default image
                const defaultImg = await loadCloudProfileImage();
                setProfileImage(defaultImg);
                
                gsap.fromTo(profileImageRef.current, 
                    { scale: 0, rotation: 180 },
                    { scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(1.7)' }
                );
                
                if (result.success) {
                    showToast({
                        title: 'Removed',
                        message: 'Profile picture removed successfully!',
                        type: 'success'
                    });
                } else {
                    showToast({
                        title: 'Remove Failed',
                        message: result.message || 'Failed to remove profile picture.',
                        type: 'error'
                    });
                }
            }
        });
    };

    // Handle profile save with loading animation
    const handleSaveProfile = async () => {
        setIsSaving(true);
        
        try {
            // Validate required fields
            if (!profile.name.trim() || !profile.email.trim()) {
                showToast({
                    title: 'Validation Error',
                    message: 'Name and email are required fields.',
                    type: 'error'
                });
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(profile.email)) {
                showToast({
                    title: 'Invalid Email',
                    message: 'Please enter a valid email address.',
                    type: 'error'
                });
                return;
            }

            const result = saveUserProfile(profile);
            
            if (result.success) {
                setIsEditing(false);
                
                // Success animation
                gsap.to('.save-button', {
                    scale: 1.05,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.out'
                });
                
                showToast({
                    title: 'Profile Updated',
                    message: 'Your profile has been saved successfully!',
                    type: 'success'
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            showToast({
                title: 'Save Failed',
                message: 'Failed to save profile. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle password change
    const handlePasswordChange = () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            showToast({
                title: 'Missing Fields',
                message: 'Please fill in all password fields.',
                type: 'error'
            });
            return;
        }

        if (passwords.new !== passwords.confirm) {
            showToast({
                title: 'Password Mismatch',
                message: 'New passwords do not match.',
                type: 'error'
            });
            return;
        }

        if (passwords.new.length < 8) {
            showToast({
                title: 'Weak Password',
                message: 'Password must be at least 8 characters long.',
                type: 'error'
            });
            return;
        }

        showToast({
            title: 'Password Changed',
            message: 'Your password has been updated successfully!',
            type: 'success'
        });
        
        setPasswords({ current: '', new: '', confirm: '' });
    };

    // Input focus animations
    const handleInputFocus = (e) => {
        gsap.to(e.target, {
            scale: 1.01,
            duration: 0.2,
            ease: 'power2.out'
        });
    };

    const handleInputBlur = (e) => {
        gsap.to(e.target, {
            scale: 1,
            duration: 0.2,
            ease: 'power2.out'
        });
    };

    return (
        <div ref={pageRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden scrollbar-hide">
            {/* Toast Container */}
            <div className="fixed top-5 right-5 z-50 w-full max-w-sm">
                <AnimatePresence>
                    {activeToast && (
                        <Toast
                            key={activeToast.id}
                            toast={activeToast}
                            onClose={() => setActiveToast(null)}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Header */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative border-b border-slate-800/30 bg-slate-900/10 backdrop-blur-xl"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5" />
                
                <div className="relative max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <motion.button
                                onClick={() => navigate(-1)}
                                className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-all duration-300 backdrop-blur-sm group"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <ArrowLeft size={20} className="text-slate-300 group-hover:text-white transition-colors" />
                            </motion.button>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                    Profile Settings
                                </h1>
                                <p className="text-slate-400 mt-1">Manage your account and personalize your experience</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {!isEditing ? (
                                <motion.button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/20"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Edit3 size={18} />
                                    <span className="font-medium">Edit Profile</span>
                                </motion.button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <motion.button
                                        onClick={() => setIsEditing(false)}
                                        className="px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-slate-600/50"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="save-button flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 rounded-2xl transition-all duration-300 shadow-lg shadow-green-500/20"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        <span className="font-medium">Save Changes</span>
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-4 overflow-hidden scrollbar-hide">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Profile Picture Section */}
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="lg:col-span-4"
                    >
                        <div className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-2xl h-fit">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Camera className="text-blue-400" size={20} />
                                Profile Picture
                            </h2>
                            
                            <div className="text-center">
                                {/* Profile Image Display */}
                                <div ref={profileImageRef} className="relative mx-auto w-40 h-40 mb-6 group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-1">
                                        <div className="w-full h-full bg-slate-900 rounded-full p-1">
                                            <img
                                                src={imagePreview || profileImage || defaultProfileImage}
                                                alt="Profile"
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Loading Overlay */}
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                        <div className="text-center">
                                            <Camera className="text-white mx-auto mb-2" size={32} />
                                            <p className="text-white text-sm font-medium">Change Photo</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Upload Area */}
                                <div
                                    className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 mb-4 ${
                                        dragActive 
                                            ? 'border-blue-400 bg-blue-500/10 scale-105' 
                                            : 'border-slate-600/50 hover:border-slate-500/70 hover:bg-slate-800/20'
                                    }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e.target.files[0])}
                                        className="hidden"
                                    />
                                    
                                    <div className="text-center">
                                        <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                            <ImageIcon className="text-white" size={24} />
                                        </div>
                                        <h3 className="text-base font-semibold text-white mb-1">
                                            {dragActive ? 'Drop your image here' : 'Upload Profile Picture'}
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-2">
                                            Drag & drop or click to browse
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            PNG, JPG, WebP up to 5MB
                                        </p>
                                    </div>
                                    
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 w-full h-full"
                                    />
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <motion.button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/20 text-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Upload size={16} />
                                        <span className="font-medium">Upload</span>
                                    </motion.button>
                                    <motion.button
                                        onClick={handleRemoveImage}
                                        className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl transition-all duration-300 shadow-lg shadow-red-500/20 text-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Trash2 size={16} />
                                        <span className="font-medium">Remove</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column - Tabs */}
                    <motion.div 
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="lg:col-span-8 space-y-4"
                    >
                        {/* Tabs */}
                        <div className="bg-slate-900/30 border border-slate-700/40 rounded-2xl p-1 w-full flex items-center gap-1">
                            <button
                                onClick={() => setActiveTab('personal')}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab==='personal' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/50'}`}
                            >
                                Personal Information
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab==='security' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/50'}`}
                            >
                                Security Settings
                            </button>
                        </div>
                        {/* Personal Information */}
                        {activeTab === 'personal' && (
                        <div className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <User className="text-blue-400" size={20} />
                                Personal Information
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                                        Full Name *
                                    </label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={profile.name}
                                            onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                            disabled={!isEditing}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-700/30 border border-slate-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 text-white placeholder-slate-400"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>
                                
                                {/* Email Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                                        Email Address *
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={18} />
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                            disabled={!isEditing}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-700/30 border border-slate-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 text-white placeholder-slate-400"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>
                                
                                {/* Removed Phone, Date of Birth, Location, Website fields as requested */}
                            </div>
                            
                            {/* Bio Field - Full Width */}
                            <div className="mt-6">
                                <label className="block text-sm font-semibold text-slate-300 mb-3">
                                    Bio
                                </label>
                                <div className="relative group">
                                    <textarea
                                        value={profile.bio}
                                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                                        onFocus={handleInputFocus}
                                        onBlur={handleInputBlur}
                                        disabled={!isEditing}
                                        rows={4}
                                        className="w-full px-4 py-4 bg-slate-700/30 border border-slate-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 resize-none text-white placeholder-slate-400"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>
                            </div>
                        </div>
                        )}

                        {/* Security Section - As Tab */}
                        {activeTab === 'security' && (
                        <div className="bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Shield className="text-red-400" size={20} />
                                Security Settings
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Current Password */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                                        Current Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-red-400 transition-colors" size={18} />
                                        <input
                                            type={showPasswords.current ? 'text' : 'password'}
                                            value={passwords.current}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                            className="w-full pl-12 pr-14 py-4 bg-slate-700/30 border border-slate-600/50 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-white placeholder-slate-400"
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                                        New Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-red-400 transition-colors" size={18} />
                                        <input
                                            type={showPasswords.new ? 'text' : 'password'}
                                            value={passwords.new}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                            className="w-full pl-12 pr-14 py-4 bg-slate-700/30 border border-slate-600/50 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-white placeholder-slate-400"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                                        Confirm New Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-red-400 transition-colors" size={18} />
                                        <input
                                            type={showPasswords.confirm ? 'text' : 'password'}
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                            className="w-full pl-12 pr-14 py-4 bg-slate-700/30 border border-slate-600/50 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300 text-white placeholder-slate-400"
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Update Password Button */}
                                <div className="md:col-span-2 mt-2">
                                    <motion.button
                                        onClick={handlePasswordChange}
                                        className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-red-500/20"
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                    >
                                        Update Password
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;