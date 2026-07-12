import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Users, Pencil, Power, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
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

export default function Patients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patients, setPatients] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', age_group: '3-5', gender: 'male',
    clinic_id: '', clinic_name: '', therapist_id: '', therapist_name: '',
    diagnosis_ids: [], diagnosis_names: [], level: 'beginner', status: 'active',
    signup_method: 'admin_created', notes: ''
  });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClinic, setFilterClinic] = useState('all');
  const [filterTherapist, setFilterTherapist] = useState('all');
  const [filterAgeGroup, setFilterAgeGroup] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [patientData, clinicData, therapistData, diagnosisData] = await Promise.all([
        base44.entities.Patient.list(),
        base44.entities.Clinic.list(),
        base44.entities.Therapist.list(),
        base44.entities.Diagnosis.list()
      ]);
      setPatients(patientData);
      setClinics(clinicData);
      setTherapists(therapistData);
      setDiagnoses(diagnosisData);
    } catch (err) {
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ full_name: '', date_of_birth: '', age_group: '3-5', gender: 'male',
      clinic_id: '', clinic_name: '', therapist_id: '', therapist_name: '',
      diagnosis_ids: [], diagnosis_names: [], level: 'beginner', status: 'active',
      signup_method: 'admin_created', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (patient) => {
    setEditing(patient);
    setForm({ ...patient });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const clinic = clinics.find(c => c.id === form.clinic_id);
      const therapist = therapists.find(t => t.id === form.therapist_id);
      const selectedDiagnoses = diagnoses.filter(d => form.diagnosis_ids?.includes(d.id));
      const payload = {
        ...form,
        clinic_name: clinic?.name || '',
        therapist_name: therapist?.full_name || '',
        diagnosis_names: selectedDiagnoses.map(d => d.name)
      };
      if (editing) {
        await base44.entities.Patient.update(editing.id, payload);
        toast({ title: 'Patient updated successfully' });
      } else {
        await base44.entities.Patient.create(payload);
        toast({ title: 'Patient created successfully' });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error saving patient', variant: 'destructive' });
    }
  };

  const toggleStatus = async (patient) => {
    const newStatus = patient.status === 'active' ? 'inactive' : 'active';
    await base44.entities.Patient.update(patient.id, { status: newStatus });
    toast({ title: `Patient ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
    loadData();
  };

  const toggleDiagnosis = (id) => {
    const current = form.diagnosis_ids || [];
    setForm({ ...form, diagnosis_ids: current.includes(id) ? current.filter(x => x !== id) : [...current, id] });
  };

  const filteredAndSorted = useMemo(() => {
    let result = patients.filter(p => {
      if (search) {
        const lower = search.toLowerCase();
        const matches = ['full_name', 'clinic_name', 'therapist_name'].some(k =>
          p[k]?.toString().toLowerCase().includes(lower)
        );
        if (!matches) return false;
      }
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterClinic !== 'all' && p.clinic_id !== filterClinic) return false;
      if (filterTherapist !== 'all' && p.therapist_id !== filterTherapist) return false;
      if (filterAgeGroup !== 'all' && p.age_group !== filterAgeGroup) return false;
      if (filterLevel !== 'all' && p.level !== filterLevel) return false;
      return true;
    });
    const sortFns = {
      newest: (a, b) => new Date(b.created_date) - new Date(a.created_date),
      oldest: (a, b) => new Date(a.created_date) - new Date(b.created_date),
      name_asc: (a, b) => (a.full_name || '').localeCompare(b.full_name || ''),
      name_desc: (a, b) => (b.full_name || '').localeCompare(a.full_name || ''),
      age_asc: (a, b) => (a.age_group || '').localeCompare(b.age_group || ''),
      level_asc: (a, b) => (a.level || '').localeCompare(b.level || ''),
    };
    return result.sort(sortFns[sortBy] || sortFns.newest);
  }, [patients, search, filterStatus, filterClinic, filterTherapist, filterAgeGroup, filterLevel, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterClinic('all');
    setFilterTherapist('all');
    setFilterAgeGroup('all');
    setFilterLevel('all');
  };

  const columns = [
    { key: 'full_name', label: 'Patient', sortable: true, render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-50 text-purple-600 font-semibold text-sm">
          {(row.full_name || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {[row.age_group, row.level].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    )},
    { key: 'diagnosis_names', label: 'Diagnoses', render: (row) => (
      <div className="flex flex-wrap gap-1 max-w-xs">
        {(row.diagnosis_names || []).length > 0 ? row.diagnosis_names.map((d, i) => (
          <span key={i} className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-medium">{d}</span>
        )) : <span className="text-muted-foreground text-xs">—</span>}
      </div>
    )},
    { key: 'clinic_name', label: 'Clinic', sortable: true, render: (row) => row.clinic_name || '—' },
    { key: 'therapist_name', label: 'Therapist', render: (row) => row.therapist_name || '—' },
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: '', render: (row) => (
      <div className="flex items-center gap-1">
        {row.status === 'pending' && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}>
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}>
          <Power className={`w-4 h-4 ${row.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`} />
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Patients" description="Manage patient profiles and clinical data">
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Patient
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <>
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search patients..."
            filters={[
              { key: 'status', label: 'Status', value: filterStatus, onChange: setFilterStatus, allLabel: 'All Statuses', options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]},
              { key: 'clinic', label: 'Clinic', value: filterClinic, onChange: setFilterClinic, allLabel: 'All Clinics', options: clinics.map(c => ({ value: c.id, label: c.name })) },
              { key: 'therapist', label: 'Therapist', value: filterTherapist, onChange: setFilterTherapist, allLabel: 'All Therapists', options: therapists.map(t => ({ value: t.id, label: t.full_name })) },
              { key: 'age', label: 'Age Group', value: filterAgeGroup, onChange: setFilterAgeGroup, allLabel: 'All Ages', options: [
                { value: '3-5', label: '3-5 years' },
                { value: '6-8', label: '6-8 years' },
                { value: '9-11', label: '9-11 years' },
                { value: '12-14', label: '12-14 years' },
                { value: '15-18', label: '15-18 years' },
              ]},
              { key: 'level', label: 'Level', value: filterLevel, onChange: setFilterLevel, allLabel: 'All Levels', options: [
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]},
            ]}
            sortValue={sortBy}
            onSortChange={setSortBy}
            sortOptions={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'name_asc', label: 'Name (A-Z)' },
              { value: 'name_desc', label: 'Name (Z-A)' },
              { value: 'age_asc', label: 'Age Group' },
              { value: 'level_asc', label: 'Level' },
            ]}
            onClear={clearFilters}
          />
          <DataTable
            data={filteredAndSorted}
            columns={columns}
            emptyMessage="No patients found."
            onRowClick={(row) => navigate(`/patients/${row.id}`)}
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name || ''} onChange={e => setForm({...form, full_name: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth || ''} onChange={e => setForm({...form, date_of_birth: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender || 'male'} onValueChange={v => setForm({...form, gender: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Age Group</Label>
              <Select value={form.age_group || '3-5'} onValueChange={v => setForm({...form, age_group: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="6-8">6-8 years</SelectItem>
                  <SelectItem value="9-11">9-11 years</SelectItem>
                  <SelectItem value="12-14">12-14 years</SelectItem>
                  <SelectItem value="15-18">15-18 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level</Label>
              <Select value={form.level || 'beginner'} onValueChange={v => setForm({...form, level: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
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
              <Label>Therapist</Label>
              <Select value={form.therapist_id || ''} onValueChange={v => setForm({...form, therapist_id: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select therapist" /></SelectTrigger>
                <SelectContent>
                  {therapists.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Diagnoses</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 border border-border rounded-lg bg-muted/20">
                {diagnoses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No diagnoses defined yet. Add them in the Taxonomy section.</p>
                ) : diagnoses.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDiagnosis(d.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                      form.diagnosis_ids?.includes(d.id)
                        ? 'bg-accent/10 text-accent border-accent/30'
                        : 'bg-background text-muted-foreground border-border hover:border-accent/30'
                    }`}
                  >
                    {d.name}
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
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{editing ? 'Save Changes' : 'Create Patient'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}