export async function fullClientLogout(signOut?: () => Promise<unknown>): Promise<void> {
    try {
        if (typeof signOut === 'function') {
            try { await signOut(); } catch { /* ignore */ }
        }
        try { localStorage.clear(); } catch { /* ignore */ }
        try { sessionStorage.clear(); } catch { /* ignore */ }
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        } catch { /* ignore */ }
        try {
            const registrations = await navigator.serviceWorker?.getRegistrations?.();
            if (registrations && Array.isArray(registrations)) {
                await Promise.all(registrations.map((r) => r.unregister()));
            }
        } catch { /* ignore */ }
        try {
            if (indexedDB && typeof indexedDB.databases === 'function') {
                const dbs: any = await (indexedDB as any).databases();
                await Promise.all(
                    (dbs || []).map((db: any) => {
                        if (db && db.name) {
                            try { indexedDB.deleteDatabase(db.name); } catch { /* ignore */ }
                        }
                    })
                );
            }
        } catch { /* ignore */ }
    } catch { /* ignore */ }
}


