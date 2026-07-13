import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import TagSelector from '@/components/content/TagSelector';
import BackgroundSelector from '@/components/content/BackgroundSelector';

export default function ContentFormDialog({ open, onOpenChange, editing, contentType, therapists, brainRegions, skills, diagnoses, onSaved }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const isVideo = contentType === 'video';
  const typeLabel = isVideo ? 'Video' : 'Game';

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : {
        title: '', description: '', type: contentType, link_type: 'external', url: '',
        thumbnail_url: '', background_id: '', background_url: '', background_name: '',
        therapist_ids: [], brain_region_ids: [], functional_skill_ids: [],
        diagnosis_ids: [], level: 'beginner', duration_minutes: 5, usage_setting: 'both',
        status: 'active'
      });
    }
  }, [open, editing, contentType]);

  const toggleArrayItem = (field, id) => {
    const current = form[field] || [];
    setForm({ ...form, [field]: current.includes(id) ? current.filter(x => x !== id) : [...current, id] });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, url: file_url }));
      toast({ title: 'File uploaded to CDN successfully' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.title?.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const selectedTherapists = therapists.filter(t => form.therapist_ids?.includes(t.id));
      const payload = { ...form, therapist_names: selectedTherapists.map(t => t.full_name) };
      if (editing) {
        await base44.entities.ContentItem.update(editing.id, payload);
        toast({ title: `${typeLabel} updated successfully` });
      } else {
        await base44.entities.ContentItem.create(payload);
        toast({ title: `${typeLabel} created successfully` });
      }
      onOpenChange(false);
      onSaved();
    } catch {
      toast({ title: `Error saving ${typeLabel.toLowerCase()}`, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${typeLabel}` : `Add New ${typeLabel}`}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>{typeLabel} Name *</Label>
            <Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} />
          </div>

          <div className="col-span-2">
            <Label>Content Source</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button type="button" onClick={() => setForm({ ...form, link_type: 'external', url: '' })}
                className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
                  form.link_type === 'external' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30')}>
                <Link2 className="w-4 h-4" /> External Link
              </button>
              <button type="button" onClick={() => setForm({ ...form, link_type: 'cdn_upload', url: '' })}
                className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
                  form.link_type === 'cdn_upload' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30')}>
                <Upload className="w-4 h-4" /> Upload to CDN
              </button>
            </div>
          </div>
          <div className="col-span-2">
            {form.link_type === 'external' ? (
              <div>
                <Label>{typeLabel} Link URL</Label>
                <Input value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })} className="mt-1" placeholder="https://..." />
              </div>
            ) : (
              <div>
                <Label>Upload File to CDN</Label>
                <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileUpload(e.target.files?.[0])} />
                <div onClick={() => fileInputRef.current?.click()}
                  className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : form.url ? (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-6 h-6 text-primary" />
                      <p className="text-sm text-primary font-medium">File uploaded</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{form.url}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload {typeLabel.toLowerCase()} file</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {isVideo && (
            <div className="col-span-2">
              <Label>Thumbnail URL (Video Snapshot)</Label>
              <Input value={form.thumbnail_url || ''} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} className="mt-1" placeholder="https://..." />
            </div>
          )}

          {!isVideo && (
            <div className="col-span-2">
              <Label>Game Background</Label>
              <BackgroundSelector
                selectedId={form.background_id || ''}
                selectedUrl={form.background_url || ''}
                onSelect={(bg) => setForm({ ...form, background_id: bg.id, background_url: bg.image_url, background_name: bg.name })}
              />
            </div>
          )}

          <div>
            <Label>Difficulty Level</Label>
            <Select value={form.level} onValueChange={v => setForm({ ...form, level: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input type="number" value={form.duration_minutes || 0} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} className="mt-1" />
          </div>
          <div>
            <Label>Usage Setting</Label>
            <Select value={form.usage_setting} onValueChange={v => setForm({ ...form, usage_setting: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="in_clinic">In-Clinic Only</SelectItem>
                <SelectItem value="at_home">At-Home Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Available</SelectItem>
                <SelectItem value="inactive">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <TagSelector label="Connected Therapists" items={therapists.filter(t => t.status === 'active')}
              selectedIds={form.therapist_ids || []} onToggle={id => toggleArrayItem('therapist_ids', id)}
              colorScheme="blue" emptyText="No therapists available." />
          </div>
          <div className="col-span-2">
            <TagSelector label="Brain Regions" items={brainRegions.filter(r => r.status === 'active')}
              selectedIds={form.brain_region_ids || []} onToggle={id => toggleArrayItem('brain_region_ids', id)}
              colorScheme="primary" emptyText="No regions defined. Add them in Taxonomy." />
          </div>
          <div className="col-span-2">
            <TagSelector label="Functional Skills" items={skills.filter(s => s.status === 'active')}
              selectedIds={form.functional_skill_ids || []} onToggle={id => toggleArrayItem('functional_skill_ids', id)}
              colorScheme="accent" emptyText="No skills defined." />
          </div>
          <div className="col-span-2">
            <TagSelector label="Diagnoses" items={diagnoses.filter(d => d.status === 'active')}
              selectedIds={form.diagnosis_ids || []} onToggle={id => toggleArrayItem('diagnosis_ids', id)}
              colorScheme="purple" emptyText="No diagnoses defined." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? 'Saving...' : editing ? 'Save Changes' : `Create ${typeLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}