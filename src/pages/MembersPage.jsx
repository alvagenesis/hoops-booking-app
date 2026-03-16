import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MOCK_MEMBERS = [
  { id: '1', first_name: 'John', last_name: 'Doe', role: 'admin', created_at: '2026-01-15T00:00:00Z' },
  { id: '2', first_name: 'Jane', last_name: 'Smith', role: 'member', created_at: '2026-02-01T00:00:00Z' },
  { id: '3', first_name: 'Mike', last_name: 'Santos', role: 'member', created_at: '2026-02-10T00:00:00Z' },
];

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      if (!supabase) {
        setMembers(MOCK_MEMBERS);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMembers(data);
      } else {
        setMembers(MOCK_MEMBERS);
      }
      setLoading(false);
    }
    fetchMembers();
  }, []);

  async function toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!supabase) {
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Members</h2>
            <p className="text-sm text-gray-500">{members.length} registered member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111116] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800 bg-[#16161c]">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Joined</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const name = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unnamed';
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const joinDate = member.created_at
                  ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—';

                return (
                  <tr key={member.id} className="border-b border-gray-800/50 hover:bg-[#16161c] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-200">{name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${member.role === 'admin'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{joinDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleRole(member.id, member.role)}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {member.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">No members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MembersPage;
