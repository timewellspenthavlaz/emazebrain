import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Stethoscope, Mail, Phone, Pencil, Power, CheckCircle2, XCircle } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import TableToolbar from '@/components/admin/TableToolbar';

export default function Therapists() {
  const { toast } = useToast();
  const [therapists, setTherapists] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', clinic_id: '', clinic_name: '', specialty: '', license_number: '', status: 'pending', signup_method: 'admin_created' });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClinic, setFilterClinic] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [therapistData, clinicData] = await Promise.all([
        base44.entities.Therapist.list(),
        base44.entities.Clinic.list()
      ]);
      setTherapists(therapistData);
      setClinics(clinicData);
    } catch (err) {
      toast({ title: 'Error loading therapists', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ full_name: '', email: '', phone: '', clinic_id: '', clinic_name: '', specialty: '', license_number: '', status: 'active', signup_method: 'admin_created' });
    setDialogOpen(true);
  };

  const openEdit = (therapist) => {
    setEditing(therapist);
    setForm({ ...therapist });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const clinic = clinics.find(c => c.id === form.clinic_id);
      const payload = { ...form, clinic_name: clinic?.name || '' };
      if (editing) {
        await base44.entities.Therapist.update(editing.id, payload);
        toast({ title: 'Therapist updated successfully' });
      } else {
        await base44.entities.Therapist.create(payload);
        toast({ title: 'Therapist created successfully' });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error saving therapist', variant: 'destructive' });
    }
  };

  const approveTherapist = async (therapist) => {
    try {
      await base44.entities.Therapist.update(therapist.id, { status: 'active' });
      toast({ title: 'Therapist approved' });
      loadData();
    } catch (err) {
      toast({ title: 'Error approving therapist', variant: 'destructive' });
    }
  };

  const rejectTherapist = async (therapist) => {
    try {
      await base44.entities.Therapist.update(therapist.id, { status: 'inactive' });
      toast({ title: 'Therapist deactivated' });
      loadData();
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const toggleStatus = async (therapist) => {
    const newStatus = therapist.status === 'active' ? 'inactive' : 'active';
    await base44.entities.Therapist.update(therapist.id, { status: newStatus });
    toast({ title: `Therapist ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
    loadData();
  };

  const filteredAndSorted = useMemo(() => {
    let result = therapists.filter(t => {
      if (search) {
        const lower = search.toLowerCase();
        const matches = ['full_name', 'email', 'clinic_name', 'specialty', 'license_number'].some(k =>
          t[k]?.toString().toLowerCase().includes(lower)
        );
        if (!matches) return false;
      }
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterClinic !== 'all' && t.clinic_id !== filterClinic) return false;
      if (filterSource !== 'all' && t.signup_method !== filterSource) return false;
      return true;
    });
    const sortFns = {
      newest: (a, b) => new Date(b.created_date) - new Date(a.created_date),
      oldest: (a, b) => new Date(a.created_date) - new Date(b.created_date),
      name_asc: (a, b) => (a.full_name || '').localeCompare(b.full_name || ''),
      name_desc: (a, b) => (b.full_name || '').localeCompare(a.full_name || ''),
      clinic_asc: (a, b) => (a.clinic_name || '').localeCompare(b.clinic_name || ''),
    };
    return result.sort(sortFns[sortBy] || sortFns.newest);
  }, [therapists, search, filterStatus, filterClinic, filterSource, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterClinic('all');
    setFilterSource('all');
  };

  const columns = [
    { key: 'full_name', label: 'Therapist', sortable: true, render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50">
          <Stethoscope className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="font-medium">{row.full_name}</p>
          {row.specialty && <p className="text-xs text-muted-foreground">{row.specialty}</p>}
        </div>
      </div>
    )},
    { key: 'email', label: 'Contact', render: (row) => (
      <div className="space-y-0.5">
        {row.email && <p className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" />{row.email}</p>}
        {row.phone && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{row.phone}</p>}
      </div>
    )},
    { key: 'clinic_name', label: 'Clinic', sortable: true, render: (row) => row.clinic_name || '—' },
    { key: 'signup_method', label: 'Source', render: (row) => (
      <span className="text-xs text-muted-foreground capitalize">{row.signup_method === 'admin_created' ? 'Admin' : 'Self-registered'}</span>
    )},
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex items-center gap-1">
        {row.status === 'pending' && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); approveTherapist(row); }} title="Approve">
              <CheckCircle2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); rejectTherapist(row); }} title="Reject">
              <XCircle className="w-4 h-4" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
          <Pencil className="w-4 h-4" />
        </Button>
        {row.status !== 'pending' && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}>
            <Power className={`w-4 h-4 ${row.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`} />
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Therapists" description="Manage therapist accounts and approvals">
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Therapist
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <>
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search therapists..."
            filters={[
              { key: 'status', label: 'Status', value: filterStatus, onChange: setFilterStatus, allLabel: 'All Statuses', options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]},
              { key: 'clinic', label: 'Clinic', value: filterClinic, onChange: setFilterClinic, allLabel: 'All Clinics', options: clinics.map(c => ({ value: c.id, label: c.name })) },
              { key: 'source', label: 'Source', value: filterSource, onChange: setFilterSource, allLabel: 'All Sources', options: [
                { value: 'admin_created', label: 'Admin Created' },
                { value: 'self_registered', label: 'Self Registered' },
              ]},
            ]}
            sortValue={sortBy}
            onSortChange={setSortBy}
            sortOptions={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'name_asc', label: 'Name (A-Z)' },
              { value: 'name_desc', label: 'Name (Z-A)' },
              { value: 'clinic_asc', label: 'Clinic (A-Z)' },
            ]}
            onClear={clearFilters}
          />
          <DataTable
            data={filteredAndSorted}
            columns={columns}
            emptyMessage="No therapists found."
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Therapist' : 'Add New Therapist'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name || ''} onChange={e => setForm({...form, full_name: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Clinic</Label>
              <Select value={form.clinic_id || ''} onValueChange={v => setForm({...form, clinic_id: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select clinic" /></SelectTrigger>
                <SelectContent>
                  {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Specialty</Label>
              <Input value={form.specialty || ''} onChange={e => setForm({...form, specialty: e.target.value})} className="mt-1" placeholder="e.g. Occupational Therapy" />
            </div>
            <div>
              <Label>License Number</Label>
              <Input value={form.license_number || ''} onChange={e => setForm({...form, license_number: e.target.value})} className="mt-1" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{editing ? 'Save Changes' : 'Create Therapist'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}