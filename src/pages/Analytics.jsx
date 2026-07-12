import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, TrendingUp, Film, Gamepad2, Clock, Users } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import moment from 'moment';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [content, setContent] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [therapists, setTherapists] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, c, cl, t] = await Promise.all([
        base44.entities.SessionLog.list(),
        base44.entities.ContentItem.list(),
        base44.entities.Clinic.list(),
        base44.entities.Therapist.list()
      ]);
      setSessions(s); setContent(c); setClinics(cl); setTherapists(t);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  if (loading) {
    return <div className="flex justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>;
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalPlays = sessions.length;
  const avgDuration = totalPlays > 0 ? Math.round(totalMinutes / totalPlays) : 0;
  const activeUsers = new Set(sessions.map(s => s.patient_id)).size;

  // Content by type
  const videos = content.filter(c => c.type === 'video').length;
  const games = content.filter(c => c.type === 'game').length;

  // Sessions by clinic
  const byClinic = clinics.map(clinic => {
    const clinicSessions = sessions.filter(s => s.clinic_id === clinic.id);
    return { name: clinic.name.length > 12 ? clinic.name.substring(0, 12) + '...' : clinic.name, sessions: clinicSessions.length, minutes: clinicSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) };
  }).filter(c => c.sessions > 0).sort((a, b) => b.sessions - a.sessions);

  // Top content
  const contentCount = {};
  sessions.forEach(s => {
    const key = s.content_title || 'Unknown';
    contentCount[key] = (contentCount[key] || 0) + 1;
  });
  const topContent = Object.entries(contentCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Activity over last 14 days
  const last14Days = [];
  for (let i = 13; i >= 0; i--) {
    const day = moment().subtract(i, 'days');
    const dayStr = day.format('MMM DD');
    const count = sessions.filter(s => moment(s.session_date || s.created_date).isSame(day, 'day')).length;
    last14Days.push({ date: dayStr, sessions: count });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform usage and engagement metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Plays" value={totalPlays} icon={Activity} accent="primary" subtitle="All-time sessions" />
        <StatCard title="Total Minutes" value={totalMinutes} icon={Clock} accent="blue" subtitle="Watched/played" />
        <StatCard title="Avg Duration" value={`${avgDuration}m`} icon={TrendingUp} accent="accent" subtitle="Per session" />
        <StatCard title="Active Patients" value={activeUsers} icon={Users} accent="purple" subtitle="Engaged users" />
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" /> Activity (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={last14Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210 15% 90%)', fontSize: '12px' }} />
              <Line type="monotone" dataKey="sessions" stroke="hsl(168 65% 30%)" strokeWidth={2} dot={{ fill: 'hsl(168 65% 30%)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions by Clinic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="w-4 h-4 text-accent" /> Sessions by Clinic
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byClinic.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No session data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byClinic} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210 15% 90%)', fontSize: '12px' }} />
                  <Bar dataKey="sessions" fill="hsl(168 65% 30%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Content Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gamepad2 className="w-4 h-4 text-primary" /> Content Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={[
                  { name: 'Videos', value: videos, color: 'hsl(168 65% 30%)' },
                  { name: 'Games', value: games, color: 'hsl(28 79% 53%)' }
                ]} cx="50%" cy="50%" outerRadius={100} label dataKey="value">
                  <Cell fill="hsl(168 65% 30%)" />
                  <Cell fill="hsl(28 79% 53%)" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210 15% 90%)', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-accent" /> Top Content (Most Played)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topContent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No content played yet</p>
          ) : (
            <div className="space-y-3">
              {topContent.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">{idx + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / topContent[0].count) * 100}%` }}></div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground shrink-0">{item.count}x</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}