import React, { useState } from 'react';
import { Lock, FileText, Clock, User, Plus, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import moment from 'moment';

function AmendmentForm({ logId, onAmended }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('amendTherapyLog', { log_id: logId, note });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Amendment added' });
      setNote('');
      setOpen(false);
      onAmended();
    } catch (err) {
      toast({ title: err.message || 'Error adding amendment', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setOpen(true)}>
        <Plus className="w-3 h-3 mr-1" /> Add Amendment
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground mb-1">Add an addendum (original notes remain unchanged):</p>
      <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="bg-card text-sm" placeholder="Amendment note..." />
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" className="text-xs bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={saving || !note.trim()}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Sign Amendment
        </Button>
      </div>
    </div>
  );
}

export default function TherapyLogEntry({ log, onAmended }) {
  const amendments = log.amendments || [];

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden",
      log.status === 'amended' ? "border-amber-200" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{moment(log.session_date).format('MMM DD, YYYY · h:mm A')}</span>
          {log.status === 'amended' && (
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-medium">Amended</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{log.duration_minutes || 0} min</span>
          <span className="capitalize">{log.location === 'in_clinic' ? 'In-Clinic' : 'At-Home'}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {log.session_summary && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
            <p className="text-sm">{log.session_summary}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clinical Notes</p>
          <p className="text-sm whitespace-pre-wrap">{log.clinical_notes}</p>
        </div>
        {log.progress_score != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Progress:</span>
            <span className="text-sm font-semibold text-primary">{log.progress_score}%</span>
          </div>
        )}

        {/* Amendments */}
        {amendments.length > 0 && (
          <div className="pt-2 border-t border-dashed border-border space-y-2">
            {amendments.map((amd, i) => (
              <div key={i} className="rounded-lg bg-amber-50/50 border border-amber-100 p-2">
                <div className="flex items-center gap-1 text-[10px] text-amber-700 mb-0.5">
                  <FileText className="w-3 h-3" />
                  <span className="font-semibold">Amendment {i + 1}</span>
                  <span>· {moment(amd.amended_at).format('MMM DD, YYYY h:mm A')}</span>
                  <span>· {amd.amended_by_name}</span>
                </div>
                <p className="text-sm">{amd.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signature footer */}
      <div className="px-4 py-2.5 border-t border-border bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-primary" />
            Signed by {log.signed_by_name}
          </span>
          <span>· {moment(log.signed_at).format('MMM DD, YYYY h:mm A')}</span>
        </div>
        <AmendmentForm logId={log.id} onAmended={onAmended} />
      </div>
      <div className="px-4 py-1.5 bg-muted/20 text-[10px] text-muted-foreground/70 font-mono truncate">
        Hash: {log.signature_hash?.substring(0, 24)}...
      </div>
    </div>
  );
}