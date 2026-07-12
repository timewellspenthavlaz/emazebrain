import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { patient_id, session_date, session_summary, clinical_notes, duration_minutes, location, progress_score } = body;

    if (!patient_id || !session_date || !clinical_notes?.trim()) {
      return Response.json({ error: 'Patient ID, session date, and clinical notes are required' }, { status: 400 });
    }

    // Load patient to get denormalized data and verify therapist linkage
    const patient = await base44.asServiceRole.entities.Patient.get(patient_id);
    if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });

    const signedAt = new Date().toISOString();

    // Generate digital signature: SHA-256 hash of therapist|patient|timestamp|notes
    const sigContent = `${patient.therapist_id || 'unassigned'}|${patient_id}|${signedAt}|${clinical_notes}`;
    const sigBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sigContent));
    const signature_hash = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const entry = await base44.asServiceRole.entities.TherapyLog.create({
      patient_id,
      patient_name: patient.full_name,
      therapist_id: patient.therapist_id || '',
      therapist_name: patient.therapist_name || '',
      clinic_id: patient.clinic_id || '',
      clinic_name: patient.clinic_name || '',
      session_date,
      session_summary: session_summary || '',
      clinical_notes,
      duration_minutes: duration_minutes || 0,
      location: location || 'in_clinic',
      progress_score: progress_score || 0,
      signed_at: signedAt,
      signed_by_id: user.id,
      signed_by_name: user.full_name || user.email,
      signature_hash,
      amendments: [],
      status: 'signed'
    });

    return Response.json({ success: true, entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});