// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node App/scripts/firestore_to_supabase_migration.js path/to/firestore-export.json
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const [,, exportPath] = process.argv;
if (!exportPath) {
	console.error('Provide Firestore export JSON path.');
	process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
if (!supabaseUrl || !supabaseServiceRole) {
	console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE env vars.');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

function toIso(d) {
	if (!d) return null;
	try { return new Date(d).toISOString(); } catch { return null; }
}

async function upsertRoles(dump) {
	const adminEmail = dump?.config?.roles?.adminEmail || null;
	if (adminEmail === undefined) return;
	await supabase.from('config_roles').upsert({ id: 'roles', admin_email: adminEmail });
}

async function upsertUsers(dump) {
	for (const u of dump.users || []) {
		await supabase.from('users').upsert({
			uid: u.uid,
			email: u.email,
			first_name: u.firstName || null,
			last_name: u.lastName || null,
			created_at: toIso(u.createdAt) || undefined,
			auth_provider: u.authProvider || null,
		});
	}
}

async function insertMeetings(dump) {
	for (const m of dump.meetings || []) {
		const { error } = await supabase.from('meetings').insert([{
			id: m.id,
			name: m.name,
			purpose: m.purpose || null,
			password: m.password || null,
			is_scheduled: !!m.isScheduled,
			scheduled_for: toIso(m.scheduledFor),
			host_name: m.hostName || null,
			start_with_audio_muted: !!m.startWithAudioMuted,
			start_with_video_muted: !!m.startWithVideoMuted,
			prejoin_page_enabled: !!m.prejoinPageEnabled,
			created_by: m.createdBy,
			created_at: toIso(m.createdAt) || undefined,
			host_token: m.hostToken || null,
			host_participant_id: m.hostParticipantId || null,
			whiteboard_open: !!m.whiteboardOpen,
			admin_ids: m.adminIds || [],
			admin_display_names: (m.adminDisplayNames || []).map(String),
			banned_display_names: (m.bannedDisplayNames || []).map(String),
		}]);
		if (error) console.error('meeting insert failed', m.id, error.message);
		for (const a of (m.actions || [])) {
			await supabase.from('meeting_actions').insert([{
				meeting_id: m.id,
				type: a.type,
				status: a.status || 'pending',
				created_at: toIso(a.createdAt) || undefined,
				processed_at: toIso(a.processedAt),
				requested_by: a.requestedBy || null,
				target_participant_id: a.targetParticipantId || null,
				platform: a.platform || null,
				stream_key: a.streamKey || null,
				rtmp_url: a.rtmpUrl || null,
				error: a.error || null,
			}]);
		}
	}
}

async function run() {
	const raw = fs.readFileSync(exportPath, 'utf8');
	const dump = JSON.parse(raw);
	await upsertRoles(dump);
	await upsertUsers(dump);
	await insertMeetings(dump);
	console.log('Migration completed');
}

run().catch((e) => { console.error(e); process.exit(1); });


