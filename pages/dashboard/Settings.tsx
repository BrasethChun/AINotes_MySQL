import React, { useEffect, useState } from 'react';
import { User, Shield, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  role: string;
  can_access_welcome: boolean;
  can_access_it: boolean;
  can_access_pro: boolean;
}

export const Settings: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [originalUsers, setOriginalUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
      setOriginalUsers(JSON.parse(JSON.stringify(data)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLocalChange = (userId: string, field: string, value: boolean | string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
    setSuccess('');
    setError('');
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      
      const modifiedUsers = users.filter((u, index) => {
        const originalUser = originalUsers.find(og => og.id === u.id);
        return JSON.stringify(u) !== JSON.stringify(originalUser);
      });
      
      if (modifiedUsers.length === 0) {
        setSuccess('No changes to save.');
        setSaving(false);
        return;
      }
      
      const promises = modifiedUsers.map(async u => {
        const res = await fetch(`/api/users/${u.id}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            role: u.role,
            can_access_welcome: u.can_access_welcome,
            can_access_it: u.can_access_it,
            can_access_pro: u.can_access_pro
          })
        });
        if (!res.ok) throw new Error(`Failed to update ${u.email}`);
      });

      await Promise.all(promises);
      setSuccess('Configuration saved successfully');
      setOriginalUsers(JSON.parse(JSON.stringify(users)));
    } catch (e: any) {
      setError('Failed to save configuration: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(users) !== JSON.stringify(originalUsers);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" />
            User & Role Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure system access and roles for all users.</p>
        </div>
        <Button 
          onClick={handleSaveConfiguration} 
          disabled={!hasChanges || saving}
          className="flex items-center"
        >
          {saving ? (
            <span className="flex items-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Saving...</span>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Configuration</>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-800">Error</h4>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-emerald-800">Success</h4>
            <p className="text-sm text-emerald-600 mt-1">{success}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left bg-white">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Dashboard</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">IT Dashboard</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Upgrade Pro</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                          {u.full_name?.charAt(0) || u.display_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{u.full_name || u.display_name}</div>
                          <div className="text-xs text-slate-500">ID: {u.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'owner'
                          ? 'bg-rose-100 text-rose-800'
                          : u.can_access_pro
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role === 'owner' ? 'Owner' : 
                         u.role === 'admin' ? 'Admin' : 
                         u.can_access_pro ? 'Pro User' : 'Basic User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <input 
                        type="checkbox" 
                        checked={u.can_access_welcome} 
                        onChange={(e) => handleLocalChange(u.id, 'can_access_welcome', e.target.checked)} 
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" 
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <input 
                        type="checkbox" 
                        checked={u.can_access_it} 
                        onChange={(e) => handleLocalChange(u.id, 'can_access_it', e.target.checked)} 
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" 
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <input 
                        type="checkbox" 
                        checked={u.can_access_pro} 
                        onChange={(e) => handleLocalChange(u.id, 'can_access_pro', e.target.checked)} 
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" 
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleLocalChange(u.id, 'role', e.target.value)}
                        className="rounded-lg border border-slate-200 text-sm py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

