import React, { useState } from 'react';
import {
  Users,
  Plus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  X,
  Phone,
  Building2,
  Bus as BusIcon
} from 'lucide-react';
import { User, Bus, UserBusAssignment, en2bn } from '../data/initialData';

interface StaffViewProps {
  users: User[];
  buses: Bus[];
  assignments: UserBusAssignment[];
  isAdmin: boolean;
  onUpdateUsers: (updatedUsers: User[]) => void;
  onUpdateAssignments: (updatedAssignments: UserBusAssignment[]) => void;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export default function StaffView({
  users,
  buses,
  assignments,
  isAdmin,
  onUpdateUsers,
  onUpdateAssignments,
  showNotification
}: StaffViewProps) {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [assignBusUser, setAssignBusUser] = useState<User | null>(null);

  // New User Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [counterName, setCounterName] = useState('কল্যাণপুর কাউন্টার');
  const [role, setRole] = useState<'operator' | 'staff' | 'admin'>('operator');

  // Assign Bus State
  const [selectedBusId, setSelectedBusId] = useState<number>(buses[0]?.id || 1);

  // Handle Add User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !phone.trim()) {
      showNotification('দয়া করে নাম, ইউজারনেম ও ফোন নম্বর দিন!', 'error');
      return;
    }

    const newUser: User = {
      id: Date.now(),
      name: name.trim(),
      username: username.trim().toLowerCase(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      counterName: counterName.trim() || 'সাধারণ কাউন্টার',
      role,
      status: 'active'
    };

    onUpdateUsers([...users, newUser]);
    showNotification(`নতুন ব্যবহারকারী "${newUser.name}" সফলভাবে যুক্ত হয়েছে!`, 'success');
    setIsAddUserModalOpen(false);
    setName('');
    setUsername('');
    setPhone('');
    setEmail('');
  };

  // Toggle User Status
  const handleToggleUserStatus = (userId: number) => {
    if (userId === 1) {
      showNotification('প্রধান অ্যাডমিন অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না!', 'error');
      return;
    }
    const updated = users.map(u => {
      if (u.id === userId) {
        const next = u.status === 'active' ? 'inactive' : 'active';
        return { ...u, status: next as 'active' | 'inactive' };
      }
      return u;
    });
    onUpdateUsers(updated);
    showNotification('অপারেটরের একাউন্ট স্ট্যাটাস আপডেট করা হয়েছে।', 'info');
  };

  // Handle Assign Bus
  const handleAssignBusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBusUser) return;

    // Check if already assigned
    const exists = assignments.some(a => a.userId === assignBusUser.id && a.busId === selectedBusId);
    if (exists) {
      showNotification('এই বাসটি ইতিমধ্যে এই অপারেটরের জন্য নির্ধারিত রয়েছে!', 'info');
      setAssignBusUser(null);
      return;
    }

    const newAssignment: UserBusAssignment = {
      id: Date.now(),
      userId: assignBusUser.id,
      busId: selectedBusId
    };

    onUpdateAssignments([...assignments, newAssignment]);
    const bus = buses.find(b => b.id === selectedBusId);
    showNotification(`বাস "${bus?.name}" অপারেটর ${assignBusUser.name}-কে বরাদ্দ করা হয়েছে।`, 'success');
    setAssignBusUser(null);
  };

  // Remove Bus Assignment
  const handleRemoveAssignment = (assignmentId: number) => {
    onUpdateAssignments(assignments.filter(a => a.id !== assignmentId));
    showNotification('বাসের বরাদ্দ বাতিল করা হয়েছে।', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>অপারেটর ও কাউন্টার স্টাফ ব্যবস্থাপনা (User Management)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            কাউন্টার কর্মী তৈরি, রোল নির্ধারণ, পাসওয়ার্ড নিয়ন্ত্রণ ও বাস বরাদ্দকরণ
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন অপারেটর তৈরি করুন</span>
          </button>
        )}
      </div>

      {/* Staff Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => {
          const isActive = u.status === 'active';
          const userAssignedBuses = assignments
            .filter(a => a.userId === u.id)
            .map(a => ({
              assignmentId: a.id,
              bus: buses.find(b => b.id === a.busId)
            }))
            .filter(item => item.bus !== undefined);

          return (
            <div
              key={u.id}
              className={`bg-white rounded-xl border p-5 space-y-4 shadow-sm hover:shadow-md transition-all ${
                isActive ? 'border-slate-200' : 'border-slate-300 opacity-70 bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{u.name}</h3>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">@{u.username}</div>
                  <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{u.counterName}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'operator'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {u.role === 'admin' ? 'সুপার অ্যাডমিন' : u.role === 'operator' ? 'অপারেটর' : 'স্টাফ'}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {isActive ? '● সক্রিয়' : '○ নিষ্ক্রিয়'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{u.phone}</span>
                </div>
              </div>

              {/* Assigned Buses Section */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">বরাদ্দকৃত বাস:</span>
                  {isAdmin && u.role !== 'admin' && (
                    <button
                      onClick={() => setAssignBusUser(u)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                    >
                      + বাস নির্ধারণ
                    </button>
                  )}
                </div>

                {u.role === 'admin' ? (
                  <div className="text-[11px] text-slate-400 italic">
                    সকল বাসে সম্পূর্ণ প্রশাসনিক এক্সেস
                  </div>
                ) : userAssignedBuses.length === 0 ? (
                  <div className="text-[11px] text-amber-600">
                    কোনো বাস বরাদ্দ নেই (অ্যাসাইন করুন)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {userAssignedBuses.map(({ assignmentId, bus }) => (
                      <span
                        key={assignmentId}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200"
                      >
                        <BusIcon className="w-3 h-3 text-emerald-600" />
                        <span>{bus?.name}</span>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveAssignment(assignmentId)}
                            className="text-slate-400 hover:text-red-500 ml-0.5"
                            title="বরাদ্দ বাতিল"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isAdmin && u.id !== 1 && (
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => setResetPasswordUser(u)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded font-medium flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>পাসওয়ার্ড</span>
                  </button>

                  <button
                    onClick={() => handleToggleUserStatus(u.id)}
                    className={`px-2.5 py-1 rounded font-medium ${
                      isActive
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD USER */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>নতুন অপারেটর অ্যাকাউন্ট তৈরি করুন</span>
              </h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  কর্মীর পুরো নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="যেমন: মোঃ জাহিদুল হক"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    ইউজারনেম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="যেমন: jahid_knt"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    মোবাইল নম্বর <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">কাউন্টারের নাম</label>
                <input
                  type="text"
                  value={counterName}
                  onChange={e => setCounterName(e.target.value)}
                  placeholder="যেমন: সায়দাবাদ কাউন্টার-১"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ব্যবহারকারীর ভূমিকা</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                >
                  <option value="operator">অপারেটর (টিকিট বুকিং ও কালেকশন)</option>
                  <option value="staff">কাউন্টার স্টাফ (সহকারী)</option>
                  <option value="admin">সুপার অ্যাডমিন (পূর্ণ নিয়ন্ত্রণ)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                >
                  অ্যাকাউন্ট তৈরি করুন
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN BUS MODAL */}
      {assignBusUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">বাস বরাদ্দ করুন</h3>
              <button onClick={() => setAssignBusUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
              অপারেটর: <strong className="text-slate-900">{assignBusUser.name}</strong> ({assignBusUser.counterName})
            </div>

            <form onSubmit={handleAssignBusSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">কোন বাসটি বরাদ্দ করবেন?</label>
                <select
                  value={selectedBusId}
                  onChange={e => setSelectedBusId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                >
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.busNumber}) - {b.busType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                >
                  বরাদ্দ নিশ্চিত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setAssignBusUser(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PASSWORD RESET */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">পাসওয়ার্ড রিসেট</h3>
              <button onClick={() => setResetPasswordUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>ব্যবহারকারী: <strong>{resetPasswordUser.name}</strong></p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                ডিফল্ট পাসওয়ার্ড: <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-300">123456</code>-এ সেট করা হয়েছে।
              </div>
            </div>

            <button
              onClick={() => {
                showNotification(`অপারেটর ${resetPasswordUser.name}-এর পাসওয়ার্ড 123456-এ রিসেট করা হয়েছে।`, 'success');
                setResetPasswordUser(null);
              }}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
            >
              নিশ্চিত করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
