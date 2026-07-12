import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { log_id, note } = body;

    if (!log_id || !note?.trim()) {
      return Response.json({ error: 'Log ID and amendment note are required' }, { status: 400 });
    }

    // Load existing log to append amendment (original notes remain untouched)
    const existing = await base44.asServiceRole.entities.TherapyLog.get(log_id);
    if (!existing) return Response.json({ error: 'Log entry not found' }, { status: 404 });

    const amendedAt = new Date().toISOString();
    const amendment = {
      note: note.trim(),
      amended_at: amendedAt,
      amended_by_id: user.id,
      amended_by_name: user.full_name || user.email
    };

    // Append-only: add amendment to the array, never modify original clinical_notes
    const updated = await base44.asServiceRole.entities.TherapyLog.update(log_id, {
      amendments: [...(existing.amendments || []), amendment],
      status: 'amended'
    });

    return Response.json({ success: true, entry: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});