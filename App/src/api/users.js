// Simple API wrapper for creating a Supabase auth user and profile row
// Usage:
//   import { createUser } from '../api/users';
//   await createUser({ name: 'Jane Doe', email: 'jane@example.com', password: 'Strong#Pass123' });

import { supabase } from '../supabase';

/**
 * Create a new user in Supabase Auth and insert a profile row in `users` table.
 * @param {{ name: string, email: string, password: string }} payload
 * @returns {Promise<{ id: string, email: string }>} Newly created auth user id and email
 */
export async function createUser(payload) {
    const name = (payload?.name || '').trim();
    const email = (payload?.email || '').trim();
    const password = payload?.password || '';

    if (!name || !email || !password) {
        throw new Error('Missing required fields: name, email, password');
    }

    // 1) Create auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
    });
    if (signUpError) throw signUpError;

    const userId = signUpData?.user?.id;

    // 2) Insert/Upsert profile row into `users` table
    if (userId) {
        const { error: insertError } = await supabase
            .from('users')
            .upsert(
                {
                    uid: userId,
                    first_name: name,
                    email,
                    role: 'user',
                },
                { onConflict: 'uid' }
            );
        if (insertError) throw insertError;
    }

    return { id: userId, email };
}

/**
 * Optional: a minimal HTTP handler shape you can wire to any serverless platform.
 * Example (Express-like): app.post('/api/users', createUserHandler)
 */
export async function createUserHandler(req, res) {
    try {
        const body = req?.body || (await (req?.json?.() ?? Promise.resolve({})));
        const result = await createUser(body);
        if (res) return res.status(201).json({ success: true, data: result });
        return new Response(JSON.stringify({ success: true, data: result }), { status: 201 });
    } catch (error) {
        const message = error?.message || 'Failed to create user';
        if (res) return res.status(400).json({ success: false, error: message });
        return new Response(JSON.stringify({ success: false, error: message }), { status: 400 });
    }
}


