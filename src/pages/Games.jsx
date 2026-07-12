import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Power, ExternalLink, Gamepad2, Search } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import ContentFormDialog from '@/components/content/ContentFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

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
      setItems(content.filter(c => c.type === 'game'));
      setTherapists(t);
      setBrainRegions(r);
      setSkills(s);
      setDiagnoses(d);
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

  const filtered = items.filter(item => !search || item.title?.toLowerCase().includes(search.toLowerCase()));

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
      <PageHeader title="Games" description="Manage therapeutic game content">
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Game
        </Button>
      </PageHeader>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search games..." className="pl-9 bg-card" />
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
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
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
    </div>
  );
}