import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  Download,
  X,
  Phone,
  ArrowRight,
  Filter,
  DollarSign
} from 'lucide-react';
import {
  ParcelBooking,
  Trip,
  Bus,
  Route,
  en2bn,
  formatTaka,
  formatBnDate,
  downloadCsv
} from '../data/initialData';

interface ParcelViewProps {
  parcels: ParcelBooking[];
  trips: Trip[];
  buses: Bus[];
  routes: Route[];
  onAddParcel: (parcel: Omit<ParcelBooking, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: number, status: ParcelBooking['deliveryStatus'], paymentStatus?: ParcelBooking['paymentStatus']) => void;
  companyName: string;
  companyPhone: string;
}

export const ParcelView: React.FC<ParcelViewProps> = ({
  parcels,
  trips,
  buses,
  routes,
  onAddParcel,
  onUpdateStatus,
  companyName,
  companyPhone
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'booked' | 'ready_for_pickup' | 'delivered' | 'due'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParcelForPrint, setSelectedParcelForPrint] = useState<ParcelBooking | null>(null);

  // Form State
  const [tripId, setTripId] = useState<number>(trips[0]?.id || 1);
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderCounter, setSenderCounter] = useState('কল্যাণপুর কাউন্টার');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverCounter, setReceiverCounter] = useState('কুষ্টিয়া মজমপুর গেট');
  const [itemCategory, setItemCategory] = useState<ParcelBooking['itemCategory']>('কাগজপত্র/ডকুমেন্ট');
  const [itemDescription, setItemDescription] = useState('');
  const [weightKg, setWeightKg] = useState<number>(5);
  const [fare, setFare] = useState<number>(350);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'due'>('paid');

  const filteredParcels = useMemo(() => {
    return parcels.filter(p => {
      const matchSearch =
        p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.senderPhone.includes(searchTerm) ||
        p.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.receiverPhone.includes(searchTerm);

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'due') return p.paymentStatus === 'due';
      return p.deliveryStatus === statusFilter;
    });
  }, [parcels, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = parcels.length;
    const inTransit = parcels.filter(p => p.deliveryStatus === 'in_transit' || p.deliveryStatus === 'booked').length;
    const delivered = parcels.filter(p => p.deliveryStatus === 'delivered').length;
    const totalRevenue = parcels.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + p.fare, 0);
    const totalDue = parcels.filter(p => p.paymentStatus === 'due').reduce((s, p) => s + p.fare, 0);
    return { total, inTransit, delivered, totalRevenue, totalDue };
  }, [parcels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !senderPhone || !receiverName || !receiverPhone) {
      alert('অনুগ্রহ করে প্রেরক ও প্রাপকের নাম এবং মোবাইল নম্বর দিন।');
      return;
    }

    const trackingNumber = `PRC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    onAddParcel({
      trackingNumber,
      tripId,
      senderName,
      senderPhone,
      senderCounter,
      receiverName,
      receiverPhone,
      receiverCounter,
      itemCategory,
      itemDescription: itemDescription || `${itemCategory} (${weightKg} কেজি)`,
      weightKg: Number(weightKg),
      fare: Number(fare),
      paymentStatus,
      deliveryStatus: 'booked'
    });

    setShowAddModal(false);
    // Reset
    setSenderName('');
    setSenderPhone('');
    setReceiverName('');
    setReceiverPhone('');
    setItemDescription('');
    setWeightKg(5);
    setFare(350);
  };

  const handleExportCsv = () => {
    const headers = ['ট্র্যাকিং নম্বর', 'প্রেরক', 'প্রেরক ফোন', 'কাউন্টার', 'প্রাপক', 'প্রাপক ফোন', 'গন্তব্য কাউন্টার', 'পণ্যের বিবরণ', 'ওজন (কেজি)', 'ভাড়া', 'পেমেন্ট', 'স্ট্যাটাস', 'তারিখ'];
    const rows = filteredParcels.map(p => [
      p.trackingNumber,
      p.senderName,
      p.senderPhone,
      p.senderCounter,
      p.receiverName,
      p.receiverPhone,
      p.receiverCounter,
      p.itemDescription,
      p.weightKg,
      p.fare,
      p.paymentStatus === 'paid' ? 'পরিশোধিত' : 'বাকি',
      p.deliveryStatus,
      p.createdAt
    ]);
    downloadCsv(`parcel_manifest_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const getStatusBadge = (status: ParcelBooking['deliveryStatus']) => {
    switch (status) {
      case 'booked':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-700 border border-amber-300">বুকড (কাউন্টারে)</span>;
      case 'in_transit':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-700 border border-blue-300 flex items-center gap-1"><Truck className="w-3 h-3" /> বাসে রয়েছে</span>;
      case 'ready_for_pickup':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-700 border border-purple-300">কাউন্টারে প্রস্তুত</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ডেলিভারি সম্পন্ন</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>লাগেজ ও পার্সেল বুকিং ব্যবস্থাপনা</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            বাসের বক্সে মালামাল বুকিং, ট্র্যাকিং নম্বর, চালান তৈরি ও ডেলিভারি হিসাব
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV এক্সপোর্ট</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন পার্সেল বুকিং</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">মোট পার্সেল</div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{en2bn(stats.total)} টি</div>
          <div className="text-[11px] text-slate-400 mt-0.5">সব কাউন্টার মিলিয়ে</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            <span>চলমান / পথে রয়েছে</span>
          </div>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-1">{en2bn(stats.inTransit)} টি</div>
          <div className="text-[11px] text-blue-500/80 mt-0.5">ডেলিভারির অপেক্ষায়</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ডেলিভারি সম্পন্ন</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">{en2bn(stats.delivered)} টি</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">গ্রাহক গ্রহণ করেছেন</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span>পার্সেল আয় (ক্যাশ)</span>
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-mono mt-1">{formatTaka(stats.totalRevenue)}</div>
          {stats.totalDue > 0 && (
            <div className="text-[11px] text-amber-600 font-bold mt-0.5">বাকি আদায়যোগ্য: {formatTaka(stats.totalDue)}</div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            সকল ({en2bn(parcels.length)})
          </button>
          <button
            onClick={() => setStatusFilter('in_transit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'in_transit' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            পথে রয়েছে
          </button>
          <button
            onClick={() => setStatusFilter('ready_for_pickup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'ready_for_pickup' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            কাউন্টারে অপেক্ষমাণ
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            ডেলিভারিকৃত
          </button>
          <button
            onClick={() => setStatusFilter('due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${statusFilter === 'due' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            বকেয়া পার্সেল
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ট্র্যাকিং আইডি বা মোবাইল..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
        </div>
      </div>

      {/* Parcel Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">ট্র্যাকিং নম্বর</th>
                <th className="py-3 px-4 font-bold">প্রেরক (কাউন্টার)</th>
                <th className="py-3 px-4 font-bold">প্রাপক (গন্তব্য)</th>
                <th className="py-3 px-4 font-bold">মালামালের বিবরণ</th>
                <th className="py-3 px-4 font-bold">ওজন</th>
                <th className="py-3 px-4 font-bold">ভাড়া ও পেমেন্ট</th>
                <th className="py-3 px-4 font-bold">ডেলিভারি স্ট্যাটাস</th>
                <th className="py-3 px-4 font-bold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParcels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    কোনো পার্সেল রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredParcels.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      <div>{p.trackingNumber}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{p.createdAt}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{p.senderName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{p.senderPhone}</div>
                      <div className="text-[10px] text-slate-400">{p.senderCounter}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{p.receiverName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{p.receiverPhone}</div>
                      <div className="text-[10px] text-emerald-700 font-medium">{p.receiverCounter}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-medium text-slate-700">{p.itemDescription}</span>
                      <div className="text-[10px] text-slate-400">{p.itemCategory}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {en2bn(p.weightKg)} কেজি
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-mono">{formatTaka(p.fare)}</div>
                      {p.paymentStatus === 'paid' ? (
                        <span className="text-[10px] font-bold text-emerald-600">পরিশোধিত</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1 rounded">বকেয়া (Due)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(p.deliveryStatus)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedParcelForPrint(p)}
                          title="চালান রসিদ প্রিন্ট করুন"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {p.deliveryStatus !== 'delivered' && (
                          <button
                            onClick={() => onUpdateStatus(p.id, 'delivered', 'paid')}
                            title="ডেলিভারি ও পেমেন্ট সম্পন্ন করুন"
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors"
                          >
                            ডেলিভার্ড
                          </button>
                        )}
                        {p.deliveryStatus === 'booked' && (
                          <button
                            onClick={() => onUpdateStatus(p.id, 'in_transit')}
                            title="বাসে তুলুন"
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-colors"
                          >
                            বাসে
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Parcel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>নতুন লাগেজ ও পার্সেল বুকিং ফরম</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-emerald-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Trip Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">কোন বাসের ট্রিপে পার্সেল পাঠানো হবে?</label>
                <select
                  value={tripId}
                  onChange={e => setTripId(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  {trips.map(t => {
                    const bus = buses.find(b => b.id === t.busId);
                    const route = routes.find(r => r.id === t.routeId);
                    return (
                      <option key={t.id} value={t.id}>
                        {bus?.name} ({route?.origin} ➔ {route?.destination}) - {formatBnDate(t.journeyDate)} ({t.departureTime})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Sender Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">প্রেরক তথ্য</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1">প্রেরকের নাম *</label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                      placeholder="যেমন: জামাল উদ্দিন"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">প্রেরকের মোবাইল *</label>
                    <input
                      type="text"
                      required
                      value={senderPhone}
                      onChange={e => setSenderPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">প্রেরক কাউন্টার / স্থান</label>
                  <input
                    type="text"
                    value={senderCounter}
                    onChange={e => setSenderCounter(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Receiver Details */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider">প্রাপক তথ্য</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1">প্রাপকের নাম *</label>
                    <input
                      type="text"
                      required
                      value={receiverName}
                      onChange={e => setReceiverName(e.target.value)}
                      placeholder="যেমন: রফিকুল ইসলাম"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">প্রাপকের মোবাইল *</label>
                    <input
                      type="text"
                      required
                      value={receiverPhone}
                      onChange={e => setReceiverPhone(e.target.value)}
                      placeholder="018xxxxxxxx"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">গন্তব্য ডেলিভারি কাউন্টার</label>
                  <input
                    type="text"
                    value={receiverCounter}
                    onChange={e => setReceiverCounter(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Package & Fare Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">পণ্যের ক্যাটাগরি</label>
                  <select
                    value={itemCategory}
                    onChange={e => setItemCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="কাগজপত্র/ডকুমেন্ট">কাগজপত্র / ফাইল</option>
                    <option value="পোশাক ও কাপড়">পোশাক ও ফেব্রিক্স</option>
                    <option value="ইলেকট্রনিক্স">ইলেকট্রনিক্স পণ্য</option>
                    <option value="ফলমূল ও খাদ্যদ্রব্য">ফলমূল / শুকনা খাবার</option>
                    <option value="সাধারণ কার্টুন">সাধারণ কার্টুন / বক্স</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">ওজন (কেজি)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={weightKg}
                    onChange={e => setWeightKg(parseFloat(e.target.value) || 1)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">মালামালের সংক্ষিপ্ত বিবরণ</label>
                <input
                  type="text"
                  value={itemDescription}
                  onChange={e => setItemDescription(e.target.value)}
                  placeholder="যেমন: ২ টি কার্টুন, লাল টেপ লাগানো"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">পার্সেল চার্জ / ভাড়া (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={fare}
                    onChange={e => setFare(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold font-mono text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">পেমেন্ট অবস্থা</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="paid">পরিশোধিত (Paid)</option>
                    <option value="due">গন্তব্যে পরিশোধ (Due / To Pay)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs"
                >
                  পার্সেল বুকিং কনফার্ম করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parcel Print Slip Modal */}
      {selectedParcelForPrint && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative text-xs">
            <button
              onClick={() => setSelectedParcelForPrint(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Slip Content */}
            <div id="parcel-receipt" className="border-2 border-dashed border-slate-300 p-4 rounded-xl bg-slate-50/50">
              <div className="text-center pb-3 border-b border-slate-300">
                <div className="font-extrabold text-base text-slate-900">{companyName}</div>
                <div className="text-[10px] text-slate-500">পার্সেল ও লাগেজ বুকিং রসিদ (চালান)</div>
                <div className="mt-1 font-mono font-bold text-xs bg-emerald-100 text-emerald-800 py-0.5 px-2 rounded inline-block">
                  {selectedParcelForPrint.trackingNumber}
                </div>
              </div>

              <div className="py-3 space-y-2 border-b border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">বুকিং তারিখ:</span>
                  <span className="font-mono font-semibold">{selectedParcelForPrint.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">প্রেরক:</span>
                  <span className="font-bold text-slate-900">{selectedParcelForPrint.senderName} ({selectedParcelForPrint.senderPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">প্রেরক কাউন্টার:</span>
                  <span>{selectedParcelForPrint.senderCounter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">প্রাপক:</span>
                  <span className="font-bold text-emerald-800">{selectedParcelForPrint.receiverName} ({selectedParcelForPrint.receiverPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">গন্তব্য কাউন্টার:</span>
                  <span className="font-semibold">{selectedParcelForPrint.receiverCounter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">বিবরণ ও ওজন:</span>
                  <span>{selectedParcelForPrint.itemDescription} ({en2bn(selectedParcelForPrint.weightKg)} কেজি)</span>
                </div>
              </div>

              <div className="py-3 flex justify-between items-center text-sm font-bold">
                <span>মোট পার্সেল ভাড়া:</span>
                <span className="font-mono text-emerald-800 text-base">{formatTaka(selectedParcelForPrint.fare)}</span>
              </div>
              <div className="text-center font-bold text-[11px] mb-2">
                পেমেন্ট অবস্থা: {selectedParcelForPrint.paymentStatus === 'paid' ? 'পরিশোধিত (PAID)' : 'গন্তব্যে বাকি (TO PAY)'}
              </div>

              <div className="pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400">
                পার্সেল ডেলিভারি নিতে এই রসিদ বা ট্র্যাকিং নম্বর প্রদর্শন করুন।
                <br />হেল্পলাইন: {companyPhone}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট রসিদ</span>
              </button>
              <button
                onClick={() => setSelectedParcelForPrint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                বন্ধ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
