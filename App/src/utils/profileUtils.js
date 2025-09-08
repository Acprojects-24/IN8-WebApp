import defaultProfileImage from '../assets/default-profile.svg';
import { supabase } from '../supabase';

/**
 * Profile image utilities for managing user profile pictures
 */

// File size limit (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates if an uploaded file is a valid image
 * @param {File} file - The uploaded file
 * @returns {Object} - Validation result with success boolean and message
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { success: false, message: 'No file selected' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      success: false, 
      message: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' 
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      success: false, 
      message: 'File size too large. Please upload an image smaller than 5MB.' 
    };
  }

  return { success: true, message: 'File is valid' };
};

/**
 * Converts file to Base64 string for storage
 * @param {File} file - The image file
 * @returns {Promise<string>} - Base64 encoded string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Compresses and resizes image to optimize storage
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width for the image
 * @param {number} maxHeight - Maximum height for the image
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<string>} - Compressed Base64 string
 */
export const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Saves profile image to localStorage
 * @param {string} userId - User ID
 * @param {string} imageData - Base64 image data
 */
export const saveProfileImage = (userId, imageData) => {
  try {
    localStorage.setItem(`profile_image_${userId}`, imageData);
    
    // Dispatch custom event to notify components about profile image update
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profileImage: imageData } }));
    
    return { success: true, message: 'Profile image saved successfully' };
  } catch (error) {
    console.error('Error saving profile image:', error);
    return { success: false, message: 'Failed to save profile image' };
  }
};

/**
 * Gets profile image from localStorage
 * @param {string} userId - User ID
 * @returns {string} - Image data URL or default image
 */
export const getProfileImage = (userId) => {
  try {
    if (!userId) return defaultProfileImage;
    
    const savedImage = localStorage.getItem(`profile_image_${userId}`);
    return savedImage || defaultProfileImage;
  } catch (error) {
    console.error('Error getting profile image:', error);
    return defaultProfileImage;
  }
};


/**
 * Removes profile image from localStorage
 * @param {string} userId - User ID
 */
export const removeProfileImage = (userId) => {
  try {
    localStorage.removeItem(`profile_image_${userId}`);
    return { success: true, message: 'Profile image removed successfully' };
  } catch (error) {
    console.error('Error removing profile image:', error);
    return { success: false, message: 'Failed to remove profile image' };
  }
};

/**
 * User profile data utilities
 */

/**
 * Saves user profile data to localStorage
 * @param {Object} profileData - User profile data
 */
export const saveUserProfile = (profileData) => {
  try {
    const existingData = getUserProfile() || {};
    const updatedData = { ...existingData, ...profileData, updatedAt: new Date().toISOString() };
    
    localStorage.setItem('userProfile', JSON.stringify(updatedData));
    
    // Update individual fields for backward compatibility
    if (profileData.name) localStorage.setItem('userName', profileData.name);
    if (profileData.email) localStorage.setItem('userEmail', profileData.email);
    
    // Dispatch custom event to notify components about profile update
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedData }));
    
    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error saving user profile:', error);
    return { success: false, message: 'Failed to save profile' };
  }
};

/**
 * Gets user profile data from localStorage
 * @returns {Object} - User profile data
 */
export const getUserProfile = () => {
  try {
    const profileData = localStorage.getItem('userProfile');
    if (profileData) {
      return JSON.parse(profileData);
    }
    
    // Fallback to individual fields for backward compatibility
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    
    if (name || email) {
      return { name: name || '', email: email || '' };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Gets user ID for profile management
 * @returns {string} - User ID (email-based)
 */
export const getUserId = () => {
  const profile = getUserProfile();
  return profile?.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'default_user';
};

/**
 * Profile context utilities for React components
 */
/**
 * Uploads profile image to Supabase Storage and updates users.pfp_path
 * @param {File} file - image file to upload
 * @returns {Promise<{success:boolean, path?:string, message?:string}>}
 */
export const uploadProfileImageToCloud = async (file) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Not authenticated' };
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const objectPath = `${user.id}/profile.${ext}`;

    // Upload to pfp bucket
    const { error: uploadError } = await supabase.storage
      .from('pfp')
      .upload(objectPath, file, { upsert: true, cacheControl: '3600' });
    
    if (uploadError) {
      return { success: false, message: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('pfp').getPublicUrl(objectPath);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      return { success: false, message: 'Failed to generate public URL' };
    }

    // Upsert users.pfp_path in database (ensures row exists)
    const { error: updateError } = await supabase
      .from('users')
      .upsert({ uid: user.id, email: user.email, pfp_path: publicUrl }, { onConflict: 'uid' });
    
    if (updateError) {
      return { success: false, message: updateError.message };
    }

    // Also store locally for instant UI update
    localStorage.setItem(`profile_image_${user.id}`, publicUrl);
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profileImage: publicUrl } }));

    return { success: true, path: publicUrl };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, message: 'Upload failed' };
  }
};

/**
 * Load profile image from Supabase (prefers cloud, falls back to local)
 * @returns {Promise<string>} - image URL or default
 */
export const loadCloudProfileImage = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return defaultProfileImage;

    // Try to get pfp_path from database
    const { data, error } = await supabase
      .from('users')
      .select('pfp_path')
      .eq('uid', user.id)
      .maybeSingle();
    
    // If row does not exist yet, create it for this user (idempotent)
    if (error && error.code === 'PGRST116') {
      await supabase.from('users').upsert({ uid: user.id, email: user.email }, { onConflict: 'uid' });
    }
    
    if (!error && data?.pfp_path) {
      // Store in localStorage for faster subsequent loads
      localStorage.setItem(`profile_image_${user.id}`, data.pfp_path);
      return data.pfp_path;
    }

    // Fallback to localStorage
    const localImage = localStorage.getItem(`profile_image_${user.id}`);
    return localImage || defaultProfileImage;
  } catch (error) {
    console.error('Load cloud image error:', error);
    return defaultProfileImage;
  }
};

/**
 * Remove profile image from cloud and database
 * @returns {Promise<{success:boolean, message?:string}>}
 */
export const removeCloudProfileImage = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    // Ensure row exists; then get current pfp_path to know what to delete from storage
    await supabase.from('users').upsert({ uid: user.id, email: user.email }, { onConflict: 'uid' });
    const { data } = await supabase
      .from('users')
      .select('pfp_path')
      .eq('uid', user.id)
      .maybeSingle();

    // Delete from storage if path exists
    if (data?.pfp_path) {
      const pathParts = data.pfp_path.split('/pfp/');
      if (pathParts.length > 1) {
        const objectPath = pathParts[1];
        await supabase.storage.from('pfp').remove([objectPath]);
      }
    }

    // Clear pfp_path in database
    await supabase
      .from('users')
      .update({ pfp_path: null })
      .eq('uid', user.id);

    // Clear localStorage
    localStorage.removeItem(`profile_image_${user.id}`);
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profileImage: defaultProfileImage } }));

    return { success: true };
  } catch (error) {
    console.error('Remove cloud image error:', error);
    return { success: false, message: 'Remove failed' };
  }
};

export const createProfileContext = () => {
  const profile = getUserProfile();
  const userId = getUserId();
  const profileImage = getProfileImage(userId);
  
  return {
    profile,
    userId,
    profileImage,
    updateProfile: saveUserProfile,
    updateProfileImage: (imageData) => saveProfileImage(userId, imageData),
    removeProfileImage: () => removeProfileImage(userId),
    getProfileImage: () => getProfileImage(userId)
  };
};
