const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Robust env loading: try several locations
function ensureEnvLoaded() {
  const loadedFiles = [];

  function loadDotenv(filePath) {
    if (!filePath) return;
    if (!fs.existsSync(filePath)) return;
    const result = dotenv.config({ path: filePath });
    if (result && result.parsed) loadedFiles.push(filePath);
  }

  // Default .env in current working directory
  dotenv.config();

  const candidates = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, 'env', 'server.env'),
    path.resolve(__dirname, '../env', 'server.env')
  ];

  // Only try additional files if required vars missing
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    for (const candidate of candidates) {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) break;
      loadDotenv(candidate);
    }
  }

  return loadedFiles;
}

ensureEnvLoaded();

// Environment variables
const PORT = process.env.PORT || 4000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  console.error('Set them in .env or env/server.env.');
  process.exit(1);
}

// Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const app = express();

// JSON body parsing
app.use(express.json());

// CORS configuration - Allow both HTTP and HTTPS localhost
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // For development, allow localhost on any port with HTTP or HTTPS
      if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:'))) {
        return callback(null, true);
      }
      
      // Allow specific origins
      const allowedOrigins = [
        'http://localhost:5173', 
        'https://localhost:5173',
        'http://localhost:5174',
        'https://localhost:5174'
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200 // For legacy browser support
  })
);

// Helpers for uniform JSON responses
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, error: null });
}

function sendError(res, message, statusCode = 400, details) {
  const errorPayload = typeof message === 'string' ? { message } : message || {};
  if (details) errorPayload.details = details;
  return res.status(statusCode).json({ success: false, data: null, error: errorPayload });
}

// Health check
app.get('/health', (req, res) => {
  return sendSuccess(res, { status: 'ok' });
});

// GET /dashboard/stats → get dashboard statistics
app.get('/dashboard/stats', async (req, res) => {
  try {
    // Get total users count
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (totalUsersError) {
      return sendError(res, 'Failed to fetch total users', 500, totalUsersError.message);
    }

    // Get active users count (is_active = true)
    const { count: activeUsers, error: activeUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeUsersError) {
      return sendError(res, 'Failed to fetch active users', 500, activeUsersError.message);
    }

    // Get total meetings count
    const { count: totalMeetings, error: totalMeetingsError } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true });

    if (totalMeetingsError) {
      return sendError(res, 'Failed to fetch total meetings', 500, totalMeetingsError.message);
    }

    // Get recent users (last 30 days) - assuming you have created_at column
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentUsers, error: recentUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Don't fail if recent users query fails (column might not exist)
    const recentUsersCount = recentUsersError ? null : recentUsers;

    return sendSuccess(res, {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalMeetings: totalMeetings || 0,
      recentUsers: recentUsersCount,
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    return sendError(res, 'Unexpected error fetching dashboard stats', 500, err?.message);
  }
});

// GET /users → get all users with pagination
app.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, active } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('users')
      .select('uid, email, first_name, last_name, role, is_active, created_at')
      .range(from, to)
      .order('created_at', { ascending: false });

    // Filter by active status if provided
    if (active !== undefined) {
      query = query.eq('is_active', active === 'true');
    }

    const { data: users, error, count } = await query;

    if (error) {
      return sendError(res, 'Failed to fetch users', 500, error.message);
    }

    return sendSuccess(res, {
      users: users || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    return sendError(res, 'Unexpected error fetching users', 500, err?.message);
  }
});

// GET /meetings → get all meetings with pagination
app.get('/meetings', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: meetings, error, count } = await supabase
      .from('meetings')
      .select('*')
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      return sendError(res, 'Failed to fetch meetings', 500, error.message);
    }

    return sendSuccess(res, {
      meetings: meetings || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    return sendError(res, 'Unexpected error fetching meetings', 500, err?.message);
  }
});

// POST /users → create a new user
// Body: { email, password, first_name, last_name }
app.post('/users', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body || {};

    if (!email || !password) {
      return sendError(res, 'email and password are required', 400);
    }

    const user_metadata = {
      first_name: first_name || null,
      last_name: last_name || null
    };

    // Create auth user
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata
    });

    if (createError) {
      return sendError(res, createError.message || 'Failed to create auth user', 400);
    }

    const authUser = created?.user;
    if (!authUser?.id) {
      return sendError(res, 'Auth user created but user id missing', 500);
    }

    // Insert into public.users table
    const insertPayload = {
      uid: authUser.id,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      role: 'user',
      is_active: true
    };

    const { data: profile, error: insertError } = await supabase
      .from('users')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      try { await supabase.auth.admin.deleteUser(authUser.id); } catch (_) {}
      return sendError(res, 'Failed to insert user profile', 500, insertError.message);
    }

    return sendSuccess(res, { authUser, profile }, 201);
  } catch (err) {
    return sendError(res, 'Unexpected error creating user', 500, err?.message);
  }
});

// PUT /users/:id → update email/password/metadata in auth and sync in users table
// Body can include any subset of: { email, password, first_name, last_name }
app.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, first_name, last_name } = req.body || {};

    if (!email && !password && first_name === undefined && last_name === undefined) {
      return sendError(res, 'No fields to update', 400);
    }

    let authUser = null;

    // Update auth user if needed
    const adminUpdatePayload = {};
    if (email) adminUpdatePayload.email = email;
    if (password) adminUpdatePayload.password = password;
    const user_metadata = {};
    if (first_name !== undefined) user_metadata.first_name = first_name;
    if (last_name !== undefined) user_metadata.last_name = last_name;
    if (Object.keys(user_metadata).length > 0) adminUpdatePayload.user_metadata = user_metadata;

    if (Object.keys(adminUpdatePayload).length > 0) {
      const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(id, adminUpdatePayload);
      if (updateError) {
        return sendError(res, updateError.message || 'Failed to update auth user', 400);
      }
      authUser = updated?.user || null;
    } else {
      const { data: fetched, error: getError } = await supabase.auth.admin.getUserById(id);
      if (getError) {
        return sendError(res, getError.message || 'Failed to fetch auth user', 400);
      }
      authUser = fetched?.user || null;
    }

    // Update users table
    const profileUpdate = {};
    if (email !== undefined) profileUpdate.email = email;
    if (first_name !== undefined) profileUpdate.first_name = first_name;
    if (last_name !== undefined) profileUpdate.last_name = last_name;

    let profile = null;
    if (Object.keys(profileUpdate).length > 0) {
      const { data, error: tableError } = await supabase
        .from('users')
        .update(profileUpdate)
        .eq('uid', id)
        .select()
        .maybeSingle();

      if (tableError) {
        return sendError(res, tableError.message || 'Failed to update user profile', 400);
      }
      profile = data || null;
    } else {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('uid', id)
        .maybeSingle();
      profile = data || null;
    }

    return sendSuccess(res, { authUser, profile });
  } catch (err) {
    return sendError(res, 'Unexpected error updating user', 500, err?.message);
  }
});

// PATCH /users/:id/enable → set is_active=true in users table
app.patch('/users/:id/enable', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('uid', id)
      .select()
      .maybeSingle();

    if (error) {
      return sendError(res, error.message || 'Failed to enable user', 400);
    }

    if (!data) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, 'Unexpected error enabling user', 500, err?.message);
  }
});

// PATCH /users/:id/disable → set is_active=false in users table
app.patch('/users/:id/disable', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('uid', id)
      .select()
      .maybeSingle();

    if (error) {
      return sendError(res, error.message || 'Failed to disable user', 400);
    }

    if (!data) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, 'Unexpected error disabling user', 500, err?.message);
  }
});

// DELETE /users/:id → delete user from both auth and users table
app.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from auth first
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
    if (authDeleteError) {
      return sendError(res, authDeleteError.message || 'Failed to delete auth user', 400);
    }

    // Then delete from users table
    const { data, error: tableDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('uid', id)
      .select()
      .maybeSingle();

    if (tableDeleteError) {
      return sendError(res, tableDeleteError.message || 'Failed to delete user profile', 400);
    }

    return sendSuccess(res, { deletedAuthUserId: id, deletedProfile: data });
  } catch (err) {
    return sendError(res, 'Unexpected error deleting user', 500, err?.message);
  }
});

// Global error handler for unexpected errors (JSON shape)
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return sendError(res, 'CORS: Origin not allowed', 403);
  }
  return sendError(res, 'Internal server error', 500, err?.message);
});

app.listen(PORT, () => {
  console.log(`User management server listening on http://localhost:${PORT}`);
});


