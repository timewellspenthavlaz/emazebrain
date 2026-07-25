import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, User, Calendar, Stethoscope, Building2, Brain, Activity, FileText, TrendingUp, Gamepad2 } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import TherapyLogSection from '@/components/therapy/TherapyLogSection';
import { calcAgeGroup } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import moment from 'moment';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [gameSessions, setGameSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPatient(); }, [id]);

  const loadPatient = async () => {
    try {
      const p = await base44.entities.Patient.get(id);
      setPatient(p);
      const [sessionData, gameSessionData, planData] = await Promise.all([
        base44.entities.SessionLog.filter({ patient_id: id }),
        base44.entities.GameSession.filter({ patient_id: id }),
        base44.entities.TherapyPlan.filter({ patient_id: id })
      ]);
      setSessions(sessionData);
      setGameSessions(gameSessionData);
      setPlans(planData);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  if (loading) {
    return <div className="flex justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>;
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Patient not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/patients')}>Back to Patients</Button>
      </div>
    );
  }

  const progressData = sessions
    .filter(s => s.progress_score != null)
    .sort((a, b) => new Date(a.session_date || a.created_date) - new Date(b.session_date || b.created_date))
    .map(s => ({
      date: moment(s.session_date || s.created_date).format('MMM DD'),
      score: s.progress_score || 0
    }));

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const avgProgress = progressData.length > 0
    ? Math.round(progressData.reduce((sum, p) => sum + p.score, 0) / progressData.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/patients')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold tracking-tight">{patient.full_name}</h1>
          <p className="text-sm text-muted-foreground">Patient Profile</p>
        </div>
        <StatusBadge status={patient.status} />
      </div>

      {/* Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Age Group</p>
                <p className="font-semibold">{calcAgeGroup(patient.date_of_birth) || patient.age_group || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Level</p>
                <p className="font-semibold capitalize">{patient.level || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
                <p className="font-semibold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">DOB:</span>
                <span className="font-medium">{patient.date_of_birth ? moment(patient.date_of_birth).format('MMM DD, YYYY') : '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Clinic:</span>
                <span className="font-medium">{patient.clinic_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Therapist:</span>
                <span className="font-medium">{patient.therapist_name || '—'}</span>
              </div>
              {patient.pulse != null && (
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Pulse Score:</span>
                  <span className="font-medium">{patient.pulse}</span>
                </div>
              )}
              {patient.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{patient.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-accent" /> Diagnoses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(patient.diagnosis_names || []).length > 0 ? patient.diagnosis_names.map((d, i) => (
                  <span key={i} className="px-3 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">{d}</span>
                )) : <p className="text-sm text-muted-foreground">No diagnoses assigned</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Progress + Sessions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Progress Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210 15% 90%)', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(168 65% 30%)" strokeWidth={2} dot={{ fill: 'hsl(168 65% 30%)', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No progress data yet</p>
              )}
              <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Progress</p>
                  <p className="text-lg font-bold text-primary">{avgProgress}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Minutes</p>
                  <p className="text-lg font-bold text-foreground">{totalMinutes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Session History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No sessions recorded</p>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 10).map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${s.content_type === 'video' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                        {s.content_type === 'video' ? '🎬' : '🎮'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.content_title || 'Unknown content'}</p>
                        <p className="text-xs text-muted-foreground">
                          {moment(s.session_date || s.created_date).format('MMM DD, YYYY')} · {s.duration_minutes || 0} min
                        </p>
                      </div>
                      {s.progress_score != null && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">{s.progress_score}%</p>
                          <p className="text-xs text-muted-foreground">progress</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-accent" /> Game Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gameSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No game sessions recorded</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 rounded-lg bg-primary/5">
                      <p className="text-xs text-muted-foreground">Games Played</p>
                      <p className="text-lg font-bold text-primary">{gameSessions.length}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-accent/5">
                      <p className="text-xs text-muted-foreground">Best Score</p>
                      <p className="text-lg font-bold text-accent">{Math.max(...gameSessions.map(g => g.score || 0))}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-purple-50">
                      <p className="text-xs text-muted-foreground">Highest Level</p>
                      <p className="text-lg font-bold text-purple-600">{Math.max(...gameSessions.map(g => g.highest_level || 0))}/10</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {gameSessions
                      .sort((a, b) => new Date(b.session_date || b.created_date) - new Date(a.session_date || a.created_date))
                      .slice(0, 10)
                      .map(g => (
                      <div key={g.id} className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
                            <Gamepad2 className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{g.game_id?.replace(/-/g, ' ') || 'Game'}</p>
                            <p className="text-xs text-muted-foreground">
                              {moment(g.session_date || g.created_date).format('MMM DD, YYYY HH:mm')} · {Math.round(g.duration_seconds || 0)}s
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-yellow-500">{g.score || 0}</p>
                              <p className="text-xs text-muted-foreground">score</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">{g.highest_level || 0}/10</p>
                              <p className="text-xs text-muted-foreground">level</p>
                            </div>
                            <StatusBadge status={g.status} />
                          </div>
                        </div>
                        {g.level_history && g.level_history.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">Level Breakdown</p>
                            <div className="flex flex-wrap gap-1.5">
                              {g.level_history.map((lh, i) => (
                                <span
                                  key={i}
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                    lh.completed
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                  title={`Level ${lh.level}: ${lh.completed ? 'Completed' : 'Not completed'} · Score: ${lh.score_earned || 0} · ${lh.bricks_destroyed || 0} bricks`}
                                >
                                  L{lh.level}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Therapy Log */}
          <TherapyLogSection patient={patient} />

          {/* Therapy Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" /> Therapy Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No therapy plans assigned</p>
              ) : (
                <div className="space-y-2">
                  {plans.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.content_item_ids?.length || 0} exercises · {p.plan_type === 'in_clinic' ? 'In-Clinic' : 'At-Home'}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}