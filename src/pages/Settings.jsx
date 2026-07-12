import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Settings as SettingsIcon, Shield, Server, HardDrive, Save, UserCog } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await base44.entities.User.list();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleInvite = async (email, role) => {
    try {
      await base44.users.inviteUser(email, role);
      toast({ title: `Invitation sent to ${email}` });
      loadUsers();
    } catch (err) {
      toast({ title: 'Error sending invitation', variant: 'destructive' });
    }
  };

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage platform configuration and admin users" />

      {/* Admin Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="w-4 h-4 text-primary" /> Admin Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Invite Form */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 p-4 bg-muted/30 rounded-lg">
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="admin@example.com"
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                if (inviteEmail) { handleInvite(inviteEmail, inviteRole); setInviteEmail(''); }
              }}
              className="bg-primary hover:bg-primary/90"
              disabled={!inviteEmail}
            >
              Send Invite
            </Button>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="flex justify-center h-32"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.full_name || u.email}</p>
                      {u.full_name && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                    {u.role || 'user'}
                  </span>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No admin users found</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50"><Server className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="font-semibold">eMazeBrain v2.0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50"><HardDrive className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Storage</p>
                <p className="font-semibold">CDN + External</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10"><SettingsIcon className="w-5 h-5 text-accent" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Environment</p>
                <p className="font-semibold">Production</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}