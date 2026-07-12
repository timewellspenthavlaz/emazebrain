import React, { useState } from 'react';
import { Lock, Loader2, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';

export default function TherapyLogForm({ patient, onSaved }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    session_date: '',
    duration_minutes: 30,
    location: 'in_clinic',
    progress_score: 50,
    session_summary: '',
    clinical_notes: ''
  });

  const handleSubmit = async () => {
    if (!form.session_date || !form.clinical_notes.trim()) {
      toast({ title: 'Session date and clinical notes are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('createTherapyLog', {
        patient_id: patient.id,
        session_date: new Date(form.session_date).toISOString(),
        session_summary: form.session_summary,
        clinical_notes: form.clinical_notes,
        duration_minutes: Number(form.duration_minutes) || 0,
        location: form.location,
        progress_score: Number(form.progress_score) || 0
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Therapy log signed and locked' });
      setForm({ session_date: '', duration_minutes: 30, location: 'in_clinic', progress_score: 50, session_summary: '', clinical_notes: '' });
      setOpen(false);
      onSaved();
    } catch (err) {
      toast({ title: err.message || 'Error creating log', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90">
        <Stethoscope className="w-4 h-4 mr-1" /> New Therapy Log
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <Lock className="w-4 h-4" />
        <p className="text-sm font-semibold">New Therapy Log Entry</p>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Once signed, this record becomes a permanent, immutable medical record. It cannot be edited or deleted.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Session Date & Time *</Label>
          <Input type="datetime-local" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })} className="mt-1 bg-card" />
        </div>
        <div>
          <Label className="text-xs">Duration (minutes)</Label>
          <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} className="mt-1 bg-card" />
        </div>
        <div>
          <Label className="text-xs">Location</Label>
          <Select value={form.location} onValueChange={v => setForm({ ...form, location: v })}>
            <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in_clinic">In-Clinic</SelectItem>
              <SelectItem value="at_home">At-Home</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Progress Score (0-100)</Label>
          <Input type="number" min={0} max={100} value={form.progress_score} onChange={e => setForm({ ...form, progress_score: e.target.value })} className="mt-1 bg-card" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Session Summary</Label>
        <Input value={form.session_summary} onChange={e => setForm({ ...form, session_summary: e.target.value })} className="mt-1 bg-card" placeholder="Brief summary of the session..." />
      </div>
      <div>
        <Label className="text-xs">Clinical Notes *</Label>
        <Textarea value={form.clinical_notes} onChange={e => setForm({ ...form, clinical_notes: e.target.value })} className="mt-1 bg-card" rows={4} placeholder="Detailed clinical observations and notes..." />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Lock className="w-4 h-4 mr-1" />}
          Sign & Lock
        </Button>
      </div>
    </div>
  );
}