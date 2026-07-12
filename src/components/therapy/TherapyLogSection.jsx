import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TherapyLogForm from './TherapyLogForm';
import TherapyLogEntry from './TherapyLogEntry';

export default function TherapyLogSection({ patient }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      const data = await base44.entities.TherapyLog.filter(
        { patient_id: patient.id },
        '-signed_at',
        100
      );
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [patient.id]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Therapy Log
          </CardTitle>
          <TherapyLogForm patient={patient} onSaved={loadLogs} />
        </div>
        <p className="text-xs text-muted-foreground">
          Immutable, signed clinical records. Entries cannot be edited or deleted — corrections are made via signed amendments only.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No therapy logs recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <TherapyLogEntry key={log.id} log={log} onAmended={loadLogs} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}