import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, Film, Gamepad2, Pencil, Power, ExternalLink, Upload, Link2, Search,
  Play, Grid3x3, List
} from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function ContentLibrary() {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [brainRegions, setBrainRegions] = useState([]);
  const [skills, setSkills] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', type: 'video', link_type: 'external', url: '',
    thumbnail_url: '', brain_region_ids: [], functional_skill_ids: [], diagnosis_ids: [],
    age_groups: [], level: 'beginner', duration_minutes: 5, usage_setting: 'both',
    status: 'active', tags: []
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [content, regions, skillsData, diagnosesData] = await Promise.all([
        base44.entities.ContentItem.list(),
        base44.entities.BrainRegion.list(),
        base44.entities.FunctionalSkill.list(),
        base44.entities.Diagnosis.list()
      ]);
      setItems(content);
      setBrainRegions(regions);
      setSkills(skillsData);
      setDiagnoses(diagnosesData);
    } catch (err) {
      toast({ title: 'Error loading content', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '', description: '', type: 'video', link_type: 'external', url: '',
      thumbnail_url: '', brain_region_ids: [], functional_skill_ids: [], diagnosis_ids: [],
      age_groups: [], level: 'beginner', duration_minutes: 5, usage_setting: 'both',
      status: 'active', tags: []
    });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ ...item });
    setDialogOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, url: file_url }));
      toast({ title: 'File uploaded to CDN successfully' });
    } catch (err) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.ContentItem.update(editing.id, form);
        toast({ title: 'Content updated successfully' });
      } else {
        await base44.entities.ContentItem.create(form);
        toast({ title: 'Content created successfully' });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error saving content', variant: 'destructive' });
    }
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    await base44.entities.ContentItem.update(item.id, { status: newStatus });
    toast({ title: `Content ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
    loadData();
  };

  const toggleArrayItem = (field, id) => {
    const current = form[field] || [];
    setForm({ ...form, [field]: current.includes(id) ? current.filter(x => x !== id) : [...current, id] });
  };

  const filtered = items.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Content Library" description="Manage therapeutic videos and games">
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Content
        </Button>
      </PageHeader>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content..." className="pl-9 bg-card" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[130px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="game">Games</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-auto bg-card rounded-lg border border-border p-1">
          <button onClick={() => setView('grid')} className={cn("p-1.5 rounded-md transition-colors", view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={cn("p-1.5 rounded-md transition-colors", view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <Film className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No content found. Add your first video or game.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden group hover:shadow-md transition-all">
              {/* Thumbnail */}
              <div className={cn("relative h-32 flex items-center justify-center", item.type === 'video' ? 'bg-primary/5' : 'bg-accent/5')}>
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  item.type === 'video'
                    ? <Film className="w-10 h-10 text-primary/40" />
                    : <Gamepad2 className="w-10 h-10 text-accent/40" />
                )}
                <div className="absolute top-2 left-2"><StatusBadge status={item.type} /></div>
                <div className="absolute top-2 right-2"><StatusBadge status={item.status} /></div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <StatusBadge status={item.link_type} />
                  <span className="text-xs text-muted-foreground">{item.duration_minutes || 0} min</span>
                  <StatusBadge status={item.level} />
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(item)}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => toggleStatus(item)}>
                    <Power className={cn("w-3 h-3 mr-1", item.status === 'active' ? 'text-emerald-500' : 'text-gray-400')} />
                    {item.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Source</th>
                <th className="text-left px-4 py-3 font-semibold">Level</th>
                <th className="text-left px-4 py-3 font-semibold">Duration</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id} className={cn("border-b border-border/50 hover:bg-muted/30", idx % 2 === 1 && "bg-muted/20")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.type === 'video' ? <Film className="w-4 h-4 text-primary" /> : <Gamepad2 className="w-4 h-4 text-accent" />}
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={item.type} /></td>
                  <td className="px-4 py-3"><StatusBadge status={item.link_type} /></td>
                  <td className="px-4 py-3"><StatusBadge status={item.level} /></td>
                  <td className="px-4 py-3 text-sm">{item.duration_minutes || 0} min</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                        </a>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(item)}>
                        <Power className={cn("w-4 h-4", item.status === 'active' ? 'text-emerald-500' : 'text-gray-400')} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Content' : 'Add New Content'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Title *</Label>
              <Input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Content Type</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="game">Game</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty Level</Label>
              <Select value={form.level} onValueChange={v => setForm({...form, level: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Link Type & URL */}
            <div className="col-span-2">
              <Label>Content Source</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm({...form, link_type: 'external', url: ''})}
                  className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
                    form.link_type === 'external' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30')}
                >
                  <Link2 className="w-4 h-4" /> External Link
                </button>
                <button
                  type="button"
                  onClick={() => setForm({...form, link_type: 'cdn_upload', url: ''})}
                  className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
                    form.link_type === 'cdn_upload' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30')}
                >
                  <Upload className="w-4 h-4" /> Upload to CDN
                </button>
              </div>
            </div>
            <div className="col-span-2">
              {form.link_type === 'external' ? (
                <div>
                  <Label>External URL</Label>
                  <Input value={form.url || ''} onChange={e => setForm({...form, url: e.target.value})} className="mt-1" placeholder="https://youtube.com/watch?v=..." />
                </div>
              ) : (
                <div>
                  <Label>Upload File to CDN</Label>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileUpload(e.target.files?.[0])} />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
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
                        <p className="text-sm text-muted-foreground">Click to upload video/game file</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={form.duration_minutes || 0} onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value) || 0})} className="mt-1" />
            </div>
            <div>
              <Label>Usage Setting</Label>
              <Select value={form.usage_setting} onValueChange={v => setForm({...form, usage_setting: v})}>
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
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Taxonomy Tagging */}
            <div className="col-span-2">
              <Label>Brain Regions</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 border border-border rounded-lg bg-muted/20 max-h-32 overflow-y-auto scrollbar-thin">
                {brainRegions.length === 0 ? <p className="text-xs text-muted-foreground">No regions defined. Add them in Taxonomy.</p> :
                  brainRegions.filter(r => r.status === 'active').map(r => (
                    <button key={r.id} type="button" onClick={() => toggleArrayItem('brain_region_ids', r.id)}
                      className={cn("px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                        form.brain_region_ids?.includes(r.id) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground border-border hover:border-primary/30')}>
                      {r.name}
                    </button>
                  ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Functional Skills</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 border border-border rounded-lg bg-muted/20 max-h-32 overflow-y-auto scrollbar-thin">
                {skills.length === 0 ? <p className="text-xs text-muted-foreground">No skills defined.</p> :
                  skills.filter(s => s.status === 'active').map(s => (
                    <button key={s.id} type="button" onClick={() => toggleArrayItem('functional_skill_ids', s.id)}
                      className={cn("px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                        form.functional_skill_ids?.includes(s.id) ? 'bg-accent/10 text-accent border-accent/30' : 'bg-background text-muted-foreground border-border hover:border-accent/30')}>
                      {s.name}
                    </button>
                  ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Diagnoses</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 border border-border rounded-lg bg-muted/20 max-h-32 overflow-y-auto scrollbar-thin">
                {diagnoses.length === 0 ? <p className="text-xs text-muted-foreground">No diagnoses defined.</p> :
                  diagnoses.filter(d => d.status === 'active').map(d => (
                    <button key={d.id} type="button" onClick={() => toggleArrayItem('diagnosis_ids', d.id)}
                      className={cn("px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                        form.diagnosis_ids?.includes(d.id) ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-background text-muted-foreground border-border hover:border-purple-200')}>
                      {d.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{editing ? 'Save Changes' : 'Create Content'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}