import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Power, Network, Brain, Zap, Stethoscope, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function Taxonomy() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('regions');

  return (
    <div>
      <PageHeader title="Taxonomy" description="Manage the neurological mapping system: brain regions, functional skills, and diagnoses" />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="regions">Brain Regions</TabsTrigger>
          <TabsTrigger value="skills">Functional Skills</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
        </TabsList>
        <TabsContent value="regions" className="mt-6"><BrainRegionsTab /></TabsContent>
        <TabsContent value="skills" className="mt-6"><SkillsTab /></TabsContent>
        <TabsContent value="diagnoses" className="mt-6"><DiagnosesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function BrainRegionsTab() {
  const { toast } = useToast();
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', level_type: 'lobe', hemisphere: 'both', parent_id: '',
    lobe: '', brodmann_area: '', description: '', status: 'active', sort_order: 0
  });

  useEffect(() => { loadRegions(); }, []);
  const loadRegions = async () => {
    try { setRegions(await base44.entities.BrainRegion.list()); }
    catch { toast({ title: 'Error loading regions', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', level_type: 'lobe', hemisphere: 'both', parent_id: '', lobe: '', brodmann_area: '', description: '', status: 'active', sort_order: 0 });
    setDialogOpen(true);
  };
  const openEdit = (r) => { setEditing(r); setForm({ ...r }); setDialogOpen(true); };

  const handleSave = async () => {
    const parent = regions.find(r => r.id === form.parent_id);
    const payload = { ...form, parent_name: parent?.name || '' };
    if (editing) {
      await base44.entities.BrainRegion.update(editing.id, payload);
      toast({ title: 'Region updated' });
    } else {
      await base44.entities.BrainRegion.create(payload);
      toast({ title: 'Region created' });
    }
    setDialogOpen(false); loadRegions();
  };

  const toggleStatus = async (r) => {
    await base44.entities.BrainRegion.update(r.id, { status: r.status === 'active' ? 'inactive' : 'active' });
    loadRegions();
  };

  const levelLabels = { hemisphere: 'Hemisphere', neuroanatomical: 'Neuroanatomical', lobe: 'Lobe', brodmann_area: 'Brodmann Area' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{regions.length} regions defined</p>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Add Region</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-48"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">Region</th>
                <th className="text-left px-4 py-3 font-semibold">Level Type</th>
                <th className="text-left px-4 py-3 font-semibold">Hemisphere</th>
                <th className="text-left px-4 py-3 font-semibold">Brodmann Area</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {regions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No regions defined yet</td></tr>
              ) : regions.map((r, idx) => (
                <tr key={r.id} className={cn("border-b border-border/50 hover:bg-muted/30", idx % 2 === 1 && "bg-muted/20")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
                        <Brain className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        {r.parent_name && <p className="text-xs text-muted-foreground">Parent: {r.parent_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{levelLabels[r.level_type] || r.level_type}</td>
                  <td className="px-4 py-3 text-sm capitalize">{r.hemisphere || '—'}</td>
                  <td className="px-4 py-3 text-sm">{r.brodmann_area || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(r)}>
                        <Power className={cn("w-4 h-4", r.status === 'active' ? 'text-emerald-500' : 'text-gray-400')} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Region' : 'Add Brain Region'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Region Name *</Label>
              <Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Level Type</Label>
              <Select value={form.level_type} onValueChange={v => setForm({...form, level_type: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hemisphere">Hemisphere</SelectItem>
                  <SelectItem value="neuroanatomical">Neuroanatomical</SelectItem>
                  <SelectItem value="lobe">Lobe</SelectItem>
                  <SelectItem value="brodmann_area">Brodmann Area</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hemisphere</Label>
              <Select value={form.hemisphere} onValueChange={v => setForm({...form, hemisphere: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parent Region</Label>
              <Select value={form.parent_id || ''} onValueChange={v => setForm({...form, parent_id: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {regions.filter(r => r.id !== editing?.id).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Brodmann Area #</Label>
              <Input value={form.brodmann_area || ''} onChange={e => setForm({...form, brodmann_area: e.target.value})} className="mt-1" placeholder="e.g. BA17" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="mt-1" rows={2} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SkillsTab() {
  const { toast } = useToast();
  const [skills, setSkills] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', category: '', brain_region_ids: [], status: 'active' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [s, r] = await Promise.all([base44.entities.FunctionalSkill.list(), base44.entities.BrainRegion.list()]);
      setSkills(s); setRegions(r);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', category: '', brain_region_ids: [], status: 'active' }); setDialogOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    const selectedRegions = regions.filter(r => form.brain_region_ids?.includes(r.id));
    const payload = { ...form, brain_region_names: selectedRegions.map(r => r.name) };
    if (editing) {
      await base44.entities.FunctionalSkill.update(editing.id, payload);
      toast({ title: 'Skill updated' });
    } else {
      await base44.entities.FunctionalSkill.create(payload);
      toast({ title: 'Skill created' });
    }
    setDialogOpen(false); loadData();
  };

  const toggleStatus = async (s) => {
    await base44.entities.FunctionalSkill.update(s.id, { status: s.status === 'active' ? 'inactive' : 'active' });
    loadData();
  };

  const toggleArrayItem = (id) => {
    const current = form.brain_region_ids || [];
    setForm({ ...form, brain_region_ids: current.includes(id) ? current.filter(x => x !== id) : [...current, id] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{skills.length} skills defined</p>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Add Skill</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-48"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.length === 0 ? (
            <div className="col-span-full bg-card rounded-xl border border-border p-12 text-center">
              <Zap className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No functional skills defined yet</p>
            </div>
          ) : skills.map(s => (
            <div key={s.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10"><Zap className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    {s.category && <p className="text-xs text-muted-foreground">{s.category}</p>}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
              {s.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.description}</p>}
              {s.brain_region_names?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
                  {s.brain_region_names.slice(0, 3).map((r, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-medium">{r}</span>
                  ))}
                  {s.brain_region_names.length > 3 && <span className="text-[10px] text-muted-foreground">+{s.brain_region_names.length - 3} more</span>}
                </div>
              )}
              <div className="flex items-center gap-1 mt-3">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(s)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => toggleStatus(s)}>
                  <Power className={cn("w-3 h-3 mr-1", s.status === 'active' ? 'text-emerald-500' : 'text-gray-400')} />
                  {s.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Skill' : 'Add Functional Skill'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Skill Name *</Label>
              <Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} className="mt-1" placeholder="e.g. Motor, Cognitive" />
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
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="mt-1" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Related Brain Regions</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 border border-border rounded-lg bg-muted/20 max-h-40 overflow-y-auto scrollbar-thin">
                {regions.length === 0 ? <p className="text-xs text-muted-foreground">No regions defined yet.</p> :
                  regions.filter(r => r.status === 'active').map(r => (
                    <button key={r.id} type="button" onClick={() => toggleArrayItem(r.id)}
                      className={cn("px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                        form.brain_region_ids?.includes(r.id) ? 'bg-accent/10 text-accent border-accent/30' : 'bg-background text-muted-foreground border-border hover:border-accent/30')}>
                      {r.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiagnosesTab() {
  const { toast } = useToast();
  const [diagnoses, setDiagnoses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', brain_region_ids: [], functional_skill_ids: [], status: 'active' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [d, r, s] = await Promise.all([base44.entities.Diagnosis.list(), base44.entities.BrainRegion.list(), base44.entities.FunctionalSkill.list()]);
      setDiagnoses(d); setRegions(r); setSkills(s);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', brain_region_ids: [], functional_skill_ids: [], status: 'active' }); setDialogOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ ...d }); setDialogOpen(true); };

  const handleSave = async () => {
    const selectedRegions = regions.filter(r => form.brain_region_ids?.includes(r.id));
    const selectedSkills = skills.filter(s => form.functional_skill_ids?.includes(s.id));
    const payload = {
      ...form,
      brain_region_names: selectedRegions.map(r => r.name),
      functional_skill_names: selectedSkills.map(s => s.name)
    };
    if (editing) {
      await base44.entities.Diagnosis.update(editing.id, payload);
      toast({ title: 'Diagnosis updated' });
    } else {
      await base44.entities.Diagnosis.create(payload);
      toast({ title: 'Diagnosis created' });
    }
    setDialogOpen(false); loadData();
  };

  const toggleStatus = async (d) => {
    await base44.entities.Diagnosis.update(d.id, { status: d.status === 'active' ? 'inactive' : 'active' });
    loadData();
  };

  const toggleArrayItem = (field, id) => {
    const current = form[field] || [];
    setForm({ ...form, [field]: current.includes(id) ? current.filter(x => x !== id) : [...current, id] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{diagnoses.length} diagnoses defined</p>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Add Diagnosis</Button>
      </div>

      {loading ? (
        <div className="flex justify-center h-48"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diagnoses.length === 0 ? (
            <div className="col-span-full bg-card rounded-xl border border-border p-12 text-center">
              <Stethoscope className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No diagnoses defined yet</p>
            </div>
          ) : diagnoses.map(d => (
            <div key={d.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-50"><Stethoscope className="w-4 h-4 text-purple-600" /></div>
                  <p className="font-semibold">{d.name}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              {d.description && <p className="text-sm text-muted-foreground mt-2">{d.description}</p>}
              <div className="mt-3 space-y-2">
                {d.brain_region_names?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Related Regions</p>
                    <div className="flex flex-wrap gap-1">
                      {d.brain_region_names.map((r, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-medium">{r}</span>)}
                    </div>
                  </div>
                )}
                {d.functional_skill_names?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Related Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {d.functional_skill_names.map((s, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(d)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => toggleStatus(d)}>
                  <Power className={cn("w-3 h-3 mr-1", d.status === 'active' ? 'text-emerald-500' : 'text-gray-400')} />
                  {d.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Diagnosis' : 'Add Diagnosis'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Diagnosis Name *</Label>
              <Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" placeholder="e.g. Autism Spectrum Disorder" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="mt-1" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Related Brain Regions</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 border border-border rounded-lg bg-muted/20 max-h-32 overflow-y-auto scrollbar-thin">
                {regions.filter(r => r.status === 'active').map(r => (
                  <button key={r.id} type="button" onClick={() => toggleArrayItem('brain_region_ids', r.id)}
                    className={cn("px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                      form.brain_region_ids?.includes(r.id) ? 'bg-accent/10 text-accent border-accent/30' : 'bg-background text-muted-foreground border-border hover:border-accent/30')}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Related Functional Skills</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 border border-border rounded-lg bg-muted/20 max-h-32 overflow-y-auto scrollbar-thin">
                {skills.filter(s => s.status === 'active').map(s => (
                  <button key={s.id} type="button" onClick={() => toggleArrayItem('functional_skill_ids', s.id)}
                    className={cn("px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                      form.functional_skill_ids?.includes(s.id) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground border-border hover:border-primary/30')}>
                    {s.name}
                  </button>
                ))}
              </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}