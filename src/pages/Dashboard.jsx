import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Stethoscope, Users, Film, Clock, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Link } from 'react-router-dom';
import moment from 'moment';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ clinics: 0, therapists: 0, patients: 0, content: 0, pendingTherapists: 0, pendingPatients: 0 });
  const [sessions, setSessions] = useState([]);
  const [contentByType, setContentByType] = useState([]);
  const [usageData, setUsageData] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [clinics, therapists, patients, content, sessions] = await Promise.all([
        base44.entities.Clinic.list(),
        base44.entities.Therapist.list(),
        base44.entities.Patient.list(),
        base44.entities.ContentItem.list(),
        base44.entities.SessionLog.list('-created_date', 10)
      ]);

      const activeClinics = clinics.filter(c => c.status === 'active').length;
      const pendingTherapists = therapists.filter(t => t.status === 'pending').length;
      const pendingPatients = patients.filter(p => p.status === 'pending').length;

      setStats({
        clinics: activeClinics,
        therapists: therapists.length,
        patients: patients.length,
        content: content.filter(c => c.status === 'active').length,
        pendingTherapists,
        pendingPatients
      });

      const videos = content.filter(c => c.type === 'video').length;
      const games = content.filter(c => c.type === 'game').length;
      setContentByType([
        { name: 'Videos', value: videos, color: 'hsl(168 65% 30%)' },
        { name: 'Games', value: games, color: 'hsl(28 79% 53%)' }
      ]);

      setSessions(sessions);

      // Build usage data from sessions grouped by day
      const byDay = {};
      sessions.forEach(s => {
        const day = moment(s.session_date || s.created_date).format('MMM DD');
        byDay[day] = (byDay[day] || 0) + 1;
      });
      const usageArr = Object.entries(byDay).map(([date, count]) => ({ date, sessions: count }));
      setUsageData(usageArr.length > 0 ? usageArr : [{ date: 'Today', sessions: 0 }]);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingCount = stats.pendingTherapists + stats.pendingPatients;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview and key metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Clinics" value={stats.clinics} icon={Building2} accent="primary" trend={8} />
        <StatCard title="Therapists" value={stats.therapists} icon={Stethoscope} accent="blue" trend={12} />
        <StatCard title="Patients" value={stats.patients} icon={Users} accent="purple" trend={15} />
        <StatCard title="Active Content" value={stats.content} icon={Film} accent="accent" trend={5} />
      </div>

      {/* Pending Approvals Banner */}
      {pendingCount > 0 && (
        <Link to="/therapists" className="block">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 hover:bg-amber-100/70 transition-colors">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {pendingCount} account{pendingCount > 1 ? 's' : ''} pending approval
              </p>
              <p className="text-xs text-amber-600">
                {stats.pendingTherapists} therapist(s) and {stats.pendingPatients} patient(s) awaiting review
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-amber-600" />
          </div>
        </Link>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Usage Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" />
              Session Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(168 65% 30%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(168 65% 30%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210 15% 90%)', fontSize: '12px' }} />
                <Area type="monotone" dataKey="sessions" stroke="hsl(168 65% 30%)" strokeWidth={2} fill="url(#colorSessions)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Content Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="w-4 h-4 text-accent" />
              Content Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={contentByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {contentByType.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210 15% 90%)', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-2">
              {contentByType.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm font-medium">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-primary" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No sessions recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2 px-3 font-semibold">Patient</th>
                    <th className="text-left py-2 px-3 font-semibold">Content</th>
                    <th className="text-left py-2 px-3 font-semibold">Type</th>
                    <th className="text-left py-2 px-3 font-semibold">Duration</th>
                    <th className="text-left py-2 px-3 font-semibold">Location</th>
                    <th className="text-left py-2 px-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, idx) => (
                    <tr key={s.id || idx} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-3 text-sm font-medium">{s.patient_name || '—'}</td>
                      <td className="py-3 px-3 text-sm">{s.content_title || '—'}</td>
                      <td className="py-3 px-3"><StatusBadge status={s.content_type} /></td>
                      <td className="py-3 px-3 text-sm">{s.duration_minutes || 0} min</td>
                      <td className="py-3 px-3"><StatusBadge status={s.location} /></td>
                      <td className="py-3 px-3 text-sm text-muted-foreground">
                        {moment(s.session_date || s.created_date).format('MMM DD, YYYY')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}