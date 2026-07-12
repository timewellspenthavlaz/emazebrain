import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Building2, Mail, Phone, MapPin, Pencil, Power } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import TableToolbar from '@/components/admin/TableToolbar';

export default function Clinics() {
  const { toast } = useToast();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', contact_email: '', contact_phone: '', status: 'active', description: '' });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => { loadClinics(); }, []);

  const loadClinics = async () => {
    try {
      const data = await base44.entities.Clinic.list();
      setClinics(data);
    } catch (err) {
      toast({ title: 'Error loading clinics', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', city: '', state: '', contact_email: '', contact_phone: '', status: 'active', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (clinic) => {
    setEditing(clinic);
    setForm({ ...clinic });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.Clinic.update(editing.id, form);
        toast({ title: 'Clinic updated successfully' });
      } else {
        await base44.entities.Clinic.create(form);
        toast({ title: 'Clinic created successfully' });
      }
      setDialogOpen(false);
      loadClinics();
    } catch (err) {
      toast({ title: 'Error saving clinic', variant: 'destructive' });
    }
  };

  const toggleStatus = async (clinic) => {
    try {
      const newStatus = clinic.status === 'active' ? 'inactive' : 'active';
      await base44.entities.Clinic.update(clinic.id, { status: newStatus });
      toast({ title: `Clinic ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
      loadClinics();
    } catch (err) {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const cities = useMemo(() => [...new Set(clinics.map(c => c.city).filter(Boolean))].sort(), [clinics]);
  const states = useMemo(() => [...new Set(clinics.map(c => c.state).filter(Boolean))].sort(), [clinics]);

  const filteredAndSorted = useMemo(() => {
    let result = clinics.filter(c => {
      if (search) {
        const lower = search.toLowerCase();
        const matches = ['name', 'city', 'state', 'contact_email', 'contact_phone'].some(k =>
          c[k]?.toString().toLowerCase().includes(lower)
        );
        if (!matches) return false;
      }
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterCity !== 'all' && c.city !== filterCity) return false;
      if (filterState !== 'all' && c.state !== filterState) return false;
      return true;
    });
    const sortFns = {
      newest: (a, b) => new Date(b.created_date) - new Date(a.created_date),
      oldest: (a, b) => new Date(a.created_date) - new Date(b.created_date),
      name_asc: (a, b) => (a.name || '').localeCompare(b.name || ''),
      name_desc: (a, b) => (b.name || '').localeCompare(a.name || ''),
      city_asc: (a, b) => (a.city || '').localeCompare(b.city || ''),
    };
    return result.sort(sortFns[sortBy] || sortFns.newest);
  }, [clinics, search, filterStatus, filterCity, filterState, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterCity('all');
    setFilterState('all');
  };

  const columns = [
    { key: 'name', label: 'Clinic', sortable: true, render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{row.description}</p>}
        </div>
      </div>
    )},
    { key: 'city', label: 'Location', sortable: true, render: (row) => (
      <span className="flex items-center gap-1 text-muted-foreground">
        <MapPin className="w-3.5 h-3.5" />
        {[row.city, row.state].filter(Boolean).join(', ') || '—'}
      </span>
    )},
    { key: 'contact_email', label: 'Contact', render: (row) => (
      <div className="space-y-0.5">
        {row.contact_email && <p className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" />{row.contact_email}</p>}
        {row.contact_phone && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{row.contact_phone}</p>}
      </div>
    )},
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}>
          <Power className={`w-4 h-4 ${row.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`} />
        </Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Clinics" description="Manage all clinics on the platform">
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Clinic
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <>
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search clinics..."
            filters={[
              { key: 'status', label: 'Status', value: filterStatus, onChange: setFilterStatus, allLabel: 'All Statuses', options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]},
              { key: 'city', label: 'City', value: filterCity, onChange: setFilterCity, allLabel: 'All Cities', options: cities.map(c => ({ value: c, label: c })) },
              { key: 'state', label: 'State', value: filterState, onChange: setFilterState, allLabel: 'All States', options: states.map(s => ({ value: s, label: s })) },
            ]}
            sortValue={sortBy}
            onSortChange={setSortBy}
            sortOptions={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'name_asc', label: 'Name (A-Z)' },
              { value: 'name_desc', label: 'Name (Z-A)' },
              { value: 'city_asc', label: 'City (A-Z)' },
            ]}
            onClear={clearFilters}
          />
          <DataTable
            data={filteredAndSorted}
            columns={columns}
            emptyMessage="No clinics found. Add your first clinic."
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Clinic' : 'Add New Clinic'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Clinic Name *</Label>
              <Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state || ''} onChange={e => setForm({...form, state: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" value={form.contact_email || ''} onChange={e => setForm({...form, contact_email: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={form.contact_phone || ''} onChange={e => setForm({...form, contact_phone: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{editing ? 'Save Changes' : 'Create Clinic'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}