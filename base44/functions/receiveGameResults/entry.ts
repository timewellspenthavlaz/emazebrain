import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.patient_id) {
      return Response.json({ error: 'Missing required field: patient_id' }, { status: 400 });
    }
    if (!body.game_id) {
      return Response.json({ error: 'Missing required field: game_id' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Look up patient name if patient_id is provided
    let patientName = body.patient_name || '';
    if (!patientName && body.patient_id) {
      try {
        const patient = await base44.asServiceRole.entities.Patient.get(body.patient_id);
        if (patient) patientName = patient.full_name || '';
      } catch (e) {
        // Patient may not exist; continue without name
      }
    }

    // Build the GameSession record from the flexible payload
    const sessionData = {
      game_id: body.game_id,
      patient_id: body.patient_id,
      patient_name: patientName,
      session_id: body.session_id || crypto.randomUUID(),
      session_date: body.metadata?.timestamp || new Date().toISOString(),
      version: body.version || body.metadata?.version || '1.0',
      score: body.metrics?.score ?? body.score ?? 0,
      duration_seconds: body.metrics?.duration_seconds ?? body.duration ?? 0,
      levels_completed: body.metrics?.levels_completed ?? body.metrics?.levelsCompleted ?? 0,
      highest_level: body.metrics?.highest_level ?? body.metrics?.highestLevel ?? 0,
      lives_remaining: body.metrics?.lives_remaining ?? body.metrics?.livesRemaining ?? 0,
      input_method: body.metrics?.input_method ?? body.metrics?.inputMethod ?? '',
      status: body.status || 'completed',
      metrics: body.metrics || {},
      level_history: body.level_history || body.levelHistory || [],
    };

    const record = await base44.asServiceRole.entities.GameSession.create(sessionData);

    return Response.json({
      status: 'success',
      session_id: sessionData.session_id,
      record_id: record.id,
    }, {
      status: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});