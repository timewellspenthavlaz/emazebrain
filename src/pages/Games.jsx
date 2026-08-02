import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Power, ExternalLink, Gamepad2, Search, Eye, Play } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import ContentFormDialog from '@/components/content/ContentFormDialog';
import ContentPreviewDrawer from '@/components/content/ContentPreviewDrawer';
import MediaPreviewDialog from '@/components/content/MediaPreviewDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function Games() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [brainRegions, setBrainRegions] = useState([]);
  const [skills, setSkills] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterSkill, setFilterSkill] = useState('all');
  const [filterDiagnosis, setFilterDiagnosis] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [mediaItem, setMediaItem] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [content, t, r, s, d, p] = await Promise.all([
        base44.entities.ContentItem.list(),
        base44.entities.Therapist.list(),
        base44.entities.BrainRegion.list(),
        base44.entities.FunctionalSkill.list(),
        base44.entities.Diagnosis.list(),
        base44.entities.Patient.list()
      ]);
      setItems(content.filter(c => c.type === 'game'));
      setTherapists(t);
      setBrainRegions(r);
      setSkills(s);
      setDiagnoses(d);
      setPatients(p);
    } catch {
      toast({ title: 'Error loading games', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setEditing(item); setDialogOpen(true); };

  const toggleStatus = async (item) => {
    await base44.entities.ContentItem.update(item.id, { status: item.status === 'active' ? 'inactive' : 'active' });
    toast({ title: `Game ${item.status === 'active' ? 'set to Unavailable' : 'set to Available'}` });
    loadData();
  };

  const filtered = items.filter(item => {
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRegion !== 'all' && !item.brain_region_ids?.includes(filterRegion)) return false;
    if (filterSkill !== 'all' && !item.functional_skill_ids?.includes(filterSkill)) return false;
    if (filterDiagnosis !== 'all' && !item.diagnosis_ids?.includes(filterDiagnosis)) return false;
    return true;
  });

  const namesFor = (ids, source, field) => (ids || []).map(id => source.find(x => x.id === id)?.[field]).filter(Boolean);

  const playHref = (base) => (selectedPatient ? `${base}&patientId=${selectedPatient}` : base);
  const guardPlay = (e) => {
    if (!selectedPatient) {
      e.preventDefault();
      toast({ title: 'Select a patient first', description: 'Choose a patient from the dropdown before playing so the session is recorded on their profile.', variant: 'destructive' });
    }
  };

  const renderTags = (item) => {
    const regions = namesFor(item.brain_region_ids, brainRegions, 'name');
    const sList = namesFor(item.functional_skill_ids, skills, 'name');
    const dList = namesFor(item.diagnosis_ids, diagnoses, 'name');
    if (regions.length === 0 && sList.length === 0 && dList.length === 0)
      return <span className="text-xs text-muted-foreground">None</span>;
    return (
      <div className="space-y-1 max-w-[180px]">
        {regions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {regions.slice(0, 2).map((n, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{n}</span>)}
            {regions.length > 2 && <span className="text-[10px] text-muted-foreground">+{regions.length - 2}</span>}
          </div>
        )}
        {sList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sList.slice(0, 2).map((n, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-medium">{n}</span>)}
            {sList.length > 2 && <span className="text-[10px] text-muted-foreground">+{sList.length - 2}</span>}
          </div>
        )}
        {dList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dList.slice(0, 2).map((n, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-medium">{n}</span>)}
            {dList.length > 2 && <span className="text-[10px] text-muted-foreground">+{dList.length - 2}</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Games" description="Manage therapeutic game content">
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Game
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger className="w-[240px] bg-card"><SelectValue placeholder="Select patient for session" /></SelectTrigger>
          <SelectContent>
            {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search games..." className="pl-9 bg-card" />
        </div>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-[200px] bg-card"><SelectValue placeholder="Brain Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brain Regions</SelectItem>
            {brainRegions.filter(r => r.status === 'active').map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSkill} onValueChange={setFilterSkill}>
          <SelectTrigger className="w-[200px] bg-card"><SelectValue placeholder="Functional Skill" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Functional Skills</SelectItem>
            {skills.filter(s => s.status === 'active').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDiagnosis} onValueChange={setFilterDiagnosis}>
          <SelectTrigger className="w-[200px] bg-card"><SelectValue placeholder="Diagnosis" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Diagnoses</SelectItem>
            {diagnoses.filter(d => d.status === 'active').map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No games found. Add your first game.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Description</th>
                <th className="text-left px-4 py-3 font-semibold">Game Link</th>
                <th className="text-left px-4 py-3 font-semibold">Connected Therapists</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Tagging</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const tNames = namesFor(item.therapist_ids, therapists, 'full_name');
                return (
                  <tr key={item.id} className={cn("border-b border-border/50 hover:bg-muted/30 align-top", idx % 2 === 1 && "bg-muted/20")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4 text-accent shrink-0" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] line-clamp-3">{item.description || '—'}</td>
                    <td className="px-4 py-3">
                      {item.url ? (
                        <button onClick={() => setMediaItem(item)} className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Preview
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {tNames.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : tNames.slice(0, 2).map((n, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium">{n}</span>
                        ))}
                        {tNames.length > 2 && <span className="text-[10px] text-muted-foreground">+{tNames.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} customLabel={item.status === 'active' ? 'Available' : 'Unavailable'} /></td>
                    <td className="px-4 py-3">{renderTags(item)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {item.title?.toLowerCase().includes('block crasher') && item.background_url && (
                          <a href={playHref(`/block-crasher?level=1&bg=${encodeURIComponent(item.background_url)}`)} onClick={guardPlay}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Play Game"><Play className="w-4 h-4" /></Button>
                          </a>
                        )}
                        {item.title?.toLowerCase().includes('catch me') && (
                          <a href={playHref('/catch-me-if-you-can?level=2&br=left&orientation=right')} onClick={guardPlay}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-600" title="Play Game"><Play className="w-4 h-4" /></Button>
                          </a>
                        )}
                        {item.title?.toLowerCase().includes('orbital') && (
                          <a href={playHref('/orbital-order?difficulty_level=3&br=left&neon=0&bg=dark')} onClick={guardPlay}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500" title="Play Game"><Play className="w-4 h-4" /></Button>
                          </a>
                        )}
                        {item.title?.toLowerCase().includes('beep') && (
                          <a href={playHref('/beep-beep?difficulty_level=3&level=1&orientation=right&br=right&bg=coldg&lives=3&hint_after=20')} onClick={guardPlay}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" title="Play Game"><Play className="w-4 h-4" /></Button>
                          </a>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewItem(item)} title="Quick Preview"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(item)}>
                          <Power className={cn("w-4 h-4", item.status === 'active' ? 'text-emerald-500' : 'text-gray-400')} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ContentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} contentType="game"
        therapists={therapists} brainRegions={brainRegions} skills={skills} diagnoses={diagnoses} onSaved={loadData} />

      <ContentPreviewDrawer open={!!previewItem} onOpenChange={(v) => { if (!v) setPreviewItem(null); }}
        item={previewItem} contentType="game"
        brainRegions={brainRegions} skills={skills} diagnoses={diagnoses} therapists={therapists} />

      <MediaPreviewDialog open={!!mediaItem} onOpenChange={(v) => { if (!v) setMediaItem(null); }}
        item={mediaItem} contentType="game" />
    </div>
  );
}