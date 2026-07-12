import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Power, ExternalLink, Film, Search, Eye } from 'lucide-react';
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
import moment from 'moment';

export default function Videos() {
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [content, t, r, s, d] = await Promise.all([
        base44.entities.ContentItem.list(),
        base44.entities.Therapist.list(),
        base44.entities.BrainRegion.list(),
        base44.entities.FunctionalSkill.list(),
        base44.entities.Diagnosis.list()
      ]);
      setItems(content.filter(c => c.type === 'video'));
      setTherapists(t);
      setBrainRegions(r);
      setSkills(s);
      setDiagnoses(d);
    } catch {
      toast({ title: 'Error loading videos', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setEditing(item); setDialogOpen(true); };

  const toggleStatus = async (item) => {
    await base44.entities.ContentItem.update(item.id, { status: item.status === 'active' ? 'inactive' : 'active' });
    toast({ title: `Video ${item.status === 'active' ? 'set to Unavailable' : 'set to Available'}` });
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
      <PageHeader title="Videos" description="Manage therapeutic video content">
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Video
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos..." className="pl-9 bg-card" />
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
          <Film className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No videos found. Add your first video.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">Video Name</th>
                <th className="text-left px-4 py-3 font-semibold">Description</th>
                <th className="text-left px-4 py-3 font-semibold">Snapshot</th>
                <th className="text-left px-4 py-3 font-semibold">Video Link</th>
                <th className="text-left px-4 py-3 font-semibold">Connected Therapists</th>
                <th className="text-left px-4 py-3 font-semibold">Tagging</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
                <th className="text-left px-4 py-3 font-semibold">Updated</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
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
                        <Film className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] line-clamp-3">{item.description || '—'}</td>
                    <td className="px-4 py-3">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt={item.title} className="w-20 h-12 object-cover rounded-md border border-border" />
                      ) : (
                        <div className="w-20 h-12 rounded-md bg-muted flex items-center justify-center"><Film className="w-4 h-4 text-muted-foreground/40" /></div>
                      )}
                    </td>
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
                    <td className="px-4 py-3">{renderTags(item)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{item.created_date ? moment(item.created_date).format('MMM DD, YYYY') : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{item.updated_date ? moment(item.updated_date).format('MMM DD, YYYY') : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} customLabel={item.status === 'active' ? 'Available' : 'Unavailable'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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

      <ContentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} contentType="video"
        therapists={therapists} brainRegions={brainRegions} skills={skills} diagnoses={diagnoses} onSaved={loadData} />

      <ContentPreviewDrawer open={!!previewItem} onOpenChange={(v) => { if (!v) setPreviewItem(null); }}
        item={previewItem} contentType="video"
        brainRegions={brainRegions} skills={skills} diagnoses={diagnoses} therapists={therapists} />

      <MediaPreviewDialog open={!!mediaItem} onOpenChange={(v) => { if (!v) setMediaItem(null); }}
        item={mediaItem} contentType="video" />
    </div>
  );
}