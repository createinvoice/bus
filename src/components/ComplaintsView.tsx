import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Download,
  X,
  Phone,
  MessageSquare,
  ShieldAlert,
  HelpCircle,
  User,
  Filter
} from 'lucide-react';
import {
  CustomerComplaint,
  Trip,
  Bus,
  en2bn,
  downloadCsv
} from '../data/initialData';

interface ComplaintsViewProps {
  complaints: CustomerComplaint[];
  trips: Trip[];
  buses: Bus[];
  onAddComplaint: (complaint: Omit<CustomerComplaint, 'id' | 'createdAt'>) => void;
  onResolveComplaint: (id: number, resolutionNote: string) => void;
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  complaints,
  trips,
  buses,
  onAddComplaint,
  onResolveComplaint
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'investigating' | 'resolved' | 'lost_item'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  // Form State
  const [ticketReference, setTicketReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tripId, setTripId] = useState<number>(trips[0]?.id || 1);
  const [category, setCategory] = useState<CustomerComplaint['category']>('হারানো জিনিস');
  const [priority, setPriority] = useState<CustomerComplaint['priority']>('medium');
  const [description, setDescription] = useState('');

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchSearch =
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerPhone.includes(searchTerm) ||
        (c.ticketReference && c.ticketReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'lost_item') return c.category === 'হারানো জিনিস';
      return c.status === statusFilter;
    });
  }, [complaints, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'open' || c.status === 'investigating').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const lostItems = complaints.filter(c => c.category === 'হারানো জিনিস').length;
    return { total, pending, resolved, lostItems };
  }, [complaints]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !description) {
      alert('অনুগ্রহ করে গ্রাহকের নাম, মোবাইল এবং অভিযোগের বিবরণ দিন।');
      return;
    }

    onAddComplaint({
      ticketReference: ticketReference || undefined,
      customerName,
      customerPhone,
      tripId,
      category,
      priority,
      status: 'open',
      description
    });

    setShowAddModal(false);
    setTicketReference('');
    setCustomerName('');
    setCustomerPhone('');
    setDescription('');
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resolvingId !== null && resolutionText.trim()) {
      onResolveComplaint(resolvingId, resolutionText);
      setResolvingId(null);
      setResolutionText('');
    }
  };

  const handleExportCsv = () => {
    const headers = ['আইডি', 'টিকিট রেফারেন্স', 'যাত্রী নাম', 'মোবাইল', 'ধরন', 'অগ্রাধিকার', 'স্ট্যাটাস', 'বিবরণ', 'সমাধান নোট', 'তারিখ'];
    const rows = filteredComplaints.map(c => [
      c.id,
      c.ticketReference || '-',
      c.customerName,
      c.customerPhone,
      c.category,
      c.priority,
      c.status === 'resolved' ? 'সমাধানকৃত' : 'তদন্তাধীন',
      c.description,
      c.resolutionNote || '-',
      c.createdAt
    ]);
    downloadCsv(`customer_complaints_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-rose-600" />
            <span>যাত্রী সেবা, অভিযোগ ও হারানো দ্রব্যাদি কেন্দ্র</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            যাত্রীদের মালামাল হারানো, এসি বা সিট সমস্যা এবং সেবার মান উন্নয়নে অভিযোগ লগ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV ডাউনলোড</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন অভিযোগ / হারানো মাল</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">মোট অভিযোগ এন্ট্রি</div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{en2bn(stats.total)} টি</div>
          <div className="text-[11px] text-slate-400 mt-0.5">সব ক্যাটাগরি মিলিয়ে</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>অমীমাংসিত / তদন্তাধীন</span>
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono mt-1">{en2bn(stats.pending)} টি</div>
          <div className="text-[11px] text-amber-500/80 mt-0.5">পদক্ষেপ নেওয়া দরকার</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>সমাধানকৃত (Resolved)</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">{en2bn(stats.resolved)} টি</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">যাত্রী সন্তুষ্ট হয়েছেন</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-purple-600 font-medium flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>হারানো মালামাল কেস</span>
          </div>
          <div className="text-2xl font-bold text-purple-700 font-mono mt-1">{en2bn(stats.lostItems)} টি</div>
          <div className="text-[11px] text-purple-500/80 mt-0.5">বাস ও কাউন্টারে খোঁজ</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            সকল ({en2bn(complaints.length)})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'open' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            নতুন অভিযোগ
          </button>
          <button
            onClick={() => setStatusFilter('investigating')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'investigating' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            তদন্তাধীন
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            সমাধানকৃত
          </button>
          <button
            onClick={() => setStatusFilter('lost_item')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'lost_item' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            হারানো জিনিস
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="যাত্রীর নাম, ফোন বা টিকিট..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        {filteredComplaints.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
            কোনো অভিযোগ রেকর্ড পাওয়া যায়নি
          </div>
        ) : (
          filteredComplaints.map(c => {
            const trip = trips.find(t => t.id === c.tripId);
            const bus = trip ? buses.find(b => b.id === trip.busId) : undefined;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      c.category === 'হারানো জিনিস'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : c.category === 'এসি সমস্যা'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {c.category}
                    </span>

                    <span className="font-bold text-slate-900 text-sm">
                      {c.customerName}
                    </span>

                    <span className="text-xs text-slate-500 font-mono">
                      {c.customerPhone}
                    </span>

                    {c.ticketReference && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-bold">
                        টিকিট: {c.ticketReference}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {c.status === 'resolved' ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>সমাধানকৃত</span>
                      </span>
                    ) : c.status === 'investigating' ? (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs flex items-center gap-1 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>তদন্তাধীন</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-xs flex items-center gap-1 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>নতুন অভিযোগ</span>
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono">
                      {c.createdAt}
                    </span>
                  </div>
                </div>

                <div className="py-3 text-xs text-slate-800">
                  <div className="font-semibold text-slate-700 mb-1">অভিযোগের বিবরণ:</div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                    {c.description}
                  </div>
                  {bus && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      সংশ্লিষ্ট গাড়ি: <span className="font-bold text-slate-700">{bus.name} ({bus.busNumber})</span>
                    </div>
                  )}
                </div>

                {c.resolutionNote && (
                  <div className="mt-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                    <span className="font-bold text-emerald-900">গৃহীত সমাধান ও পদক্ষেপ: </span>
                    <span className="text-emerald-800">{c.resolutionNote}</span>
                  </div>
                )}

                {c.status !== 'resolved' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setResolvingId(c.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>সমাধান নোট যুক্ত করুন ও নিষ্পত্তি করুন</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Modal */}
      {resolvingId !== null && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>অভিযোগ নিষ্পত্তি ও সমাধান নোট</span>
              </h3>
              <button onClick={() => setResolvingId(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResolveSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  যাত্রীকে কী সমাধান দেওয়া হয়েছে? *
                </label>
                <textarea
                  rows={4}
                  required
                  value={resolutionText}
                  onChange={e => setResolutionText(e.target.value)}
                  placeholder="যেমন: সুপারভাইজারের মাধ্যমে ব্যাগ উদ্ধার করে যাত্রী করিম সাহেবের কাছে বুঝিয়ে দেওয়া হয়েছে।"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResolvingId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  নিষ্পত্তি নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Complaint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>নতুন অভিযোগ বা হারানো মালামাল এন্ট্রি</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">যাত্রীর নাম *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="যেমন: তানভীর আহমেদ"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">যাত্রীর মোবাইল *</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">টিকিট আইডি (যদি থাকে)</label>
                  <input
                    type="text"
                    value={ticketReference}
                    onChange={e => setTicketReference(e.target.value)}
                    placeholder="যেমন: BG-20260930-001"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">অভিযোগের ধরন *</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="হারানো জিনিস">হারানো জিনিসপত্র</option>
                    <option value="এসি সমস্যা">এসি বা ভেন্ট সমস্যা</option>
                    <option value="গাড়ির বিলম্ব">গাড়ি ছাড়তে বিলম্ব</option>
                    <option value="স্টাফের দুর্ব্যবহার">স্টাফের আচরণ</option>
                    <option value="অন্যান্য">অন্যান্য সমস্যা</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">সংশ্লিষ্ট ট্রিপ / বাস</label>
                <select
                  value={tripId}
                  onChange={e => setTripId(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  {trips.map(t => {
                    const bus = buses.find(b => b.id === t.busId);
                    return (
                      <option key={t.id} value={t.id}>
                        {bus?.name} ({t.departureTime})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">সমস্যার বিস্তারিত বিবরণ *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="হারানো জিনিসের বিস্তারিত বর্ণনা বা যাত্রীর অভিযোগ সংক্ষেপে লিখুন..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-xs"
                >
                  অভিযোগ সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
