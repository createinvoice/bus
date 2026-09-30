import React, { useState } from 'react';
import {
  Bus as BusIcon,
  Plus,
  Wrench,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  Lock,
  Layers,
  X
} from 'lucide-react';
import { Bus, Route, en2bn } from '../data/initialData';

interface BusesViewProps {
  buses: Bus[];
  routes: Route[];
  isAdmin: boolean;
  onUpdateBuses: (updatedBuses: Bus[]) => void;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export default function BusesView({
  buses,
  routes,
  isAdmin,
  onUpdateBuses,
  showNotification
}: BusesViewProps) {
  // Modal states
  const [isAddBusModalOpen, setIsAddBusModalOpen] = useState(false);
  const [selectedBusForLayout, setSelectedBusForLayout] = useState<Bus | null>(null);

  // New bus form state
  const [busName, setBusName] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [companyName, setCompanyName] = useState('বাসগো পরিবহন লিমিটেড');
  const [busType, setBusType] = useState<'AC' | 'Non-AC' | 'Deluxe' | 'Sleeper'>('AC');
  const [totalSeats, setTotalSeats] = useState<number>(40);
  const [defaultRouteId, setDefaultRouteId] = useState<number>(routes[0]?.id || 1);

  // Handle Add Bus
  const handleAddBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busName.trim() || !busNumber.trim()) {
      showNotification('দয়া করে বাসের নাম এবং গাড়ি নম্বর লিখুন!', 'error');
      return;
    }

    const newBus: Bus = {
      id: Date.now(),
      name: busName.trim(),
      busNumber: busNumber.trim(),
      companyName: companyName.trim() || 'বাসগো পরিবহন',
      busType,
      totalSeats,
      defaultRouteId,
      status: 'active'
    };

    onUpdateBuses([...buses, newBus]);
    showNotification(`নতুন বাস "${newBus.name}" সফলভাবে যুক্ত হয়েছে!`, 'success');
    setIsAddBusModalOpen(false);
    setBusName('');
    setBusNumber('');
  };

  // Toggle Bus Status
  const handleToggleBusStatus = (busId: number) => {
    const updated = buses.map(b => {
      if (b.id === busId) {
        const nextStatus = b.status === 'active' ? 'inactive' : 'active';
        return { ...b, status: nextStatus as 'active' | 'inactive' };
      }
      return b;
    });
    onUpdateBuses(updated);
    showNotification('বাসের অপারেশন স্ট্যাটাস পরিবর্তন করা হয়েছে।', 'info');
  };

  // Metrics
  const totalActive = buses.filter(b => b.status === 'active').length;
  const totalCapacity = buses.reduce((sum, b) => sum + (b.status === 'active' ? b.totalSeats : 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BusIcon className="w-5 h-5 text-emerald-600" />
            <span>বাস ও ফ্লিট ব্যবস্থাপনা (Fleet Management)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            কোম্পানির সকল বাসের তালিকা, সিট ক্যাপাসিটি, সার্ভিসিং স্ট্যাটাস ও আসন বিন্যাস
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddBusModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বাস যুক্ত করুন</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">মোট ফ্লিট বাস সংখ্যা</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{en2bn(buses.length)}টি</div>
          <div className="text-[11px] text-slate-400 mt-0.5">সব ধরনের গাড়ি অন্তর্ভুক্ত</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">বর্তমানে রোডে সক্রিয় বাস</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{en2bn(totalActive)}টি</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">যাত্রী পরিবহনে নিয়োজিত</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">মোট ফ্লিট আসন সক্ষমতা</span>
          <div className="text-2xl font-bold font-mono text-sky-600 mt-1">{en2bn(totalCapacity)} সিট</div>
          <div className="text-[11px] text-slate-400 mt-0.5">প্রতি ট্রিপে সর্বোচ্চ যাত্রী ধারণ</div>
        </div>
      </div>

      {/* Buses Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buses.map(bus => {
          const route = routes.find(r => r.id === bus.defaultRouteId);
          const isActive = bus.status === 'active';

          return (
            <div
              key={bus.id}
              className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 transition-all hover:shadow-md ${
                isActive ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{bus.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        bus.busType === 'AC'
                          ? 'bg-sky-100 text-sky-800'
                          : bus.busType === 'Deluxe'
                          ? 'bg-purple-100 text-purple-800'
                          : bus.busType === 'Sleeper'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {bus.busType}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-slate-600 mt-0.5">
                    {bus.busNumber}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">মালিকানা: {bus.companyName}</div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isActive ? <CheckCircle2 className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                  <span>{isActive ? 'সক্রিয়' : 'সার্ভিসিং'}</span>
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">মোট সিট সংখ্যা:</span>
                  <strong className="font-mono text-slate-800">{en2bn(bus.totalSeats)} আসন (২x২)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">নির্ধারিত প্রধান রুট:</span>
                  <span className="text-emerald-700 font-medium">
                    {route ? `${route.origin} → ${route.destination}` : 'নির্দিষ্ট নয়'}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Bus */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedBusForLayout(bus)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>সিট লেআউট দেখুন</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => handleToggleBusStatus(bus.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {isActive ? 'সার্ভিসিংয়ে পাঠান' : 'পুনরায় সক্রিয় করুন'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD NEW BUS */}
      {isAddBusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BusIcon className="w-5 h-5 text-emerald-600" />
                <span>নতুন বাস অন্তর্ভুক্ত করুন (Add Fleet Bus)</span>
              </h3>
              <button onClick={() => setIsAddBusModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBus} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  বাসের নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={busName}
                  onChange={e => setBusName(e.target.value)}
                  placeholder="যেমন: সোনার বাংলা এক্সপ্রেস"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  গাড়ি রেজিস্ট্রেশন নম্বর <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={busNumber}
                  onChange={e => setBusNumber(e.target.value)}
                  placeholder="যেমন: ঢাকা-মেট্রো-ব ১৫-৯৮৭৬"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">কোম্পানি / মালিকানা নাম</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">বাসের ধরন</label>
                  <select
                    value={busType}
                    onChange={e => setBusType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="AC">AC (শীতাতপ নিয়ন্ত্রিত)</option>
                    <option value="Non-AC">Non-AC (সাধারণ চেয়ার)</option>
                    <option value="Deluxe">Deluxe (ডিলাক্স)</option>
                    <option value="Sleeper">Sleeper (স্লিপার কোচ)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">মোট সিট সংখ্যা</label>
                  <select
                    value={totalSeats}
                    onChange={e => setTotalSeats(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  >
                    <option value="28">২৮ আসন</option>
                    <option value="36">৩৬ আসন</option>
                    <option value="40">৪০ আসন (স্ট্যান্ডার্ড)</option>
                    <option value="44">৪৪ আসন</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">নির্ধারিত রুট</label>
                <select
                  value={defaultRouteId}
                  onChange={e => setDefaultRouteId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                >
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.origin} হতে {r.destination} ({en2bn(r.distanceKm)} কিমি)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                >
                  বাস যুক্ত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddBusModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE SEAT LAYOUT PREVIEW */}
      {selectedBusForLayout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedBusForLayout.name}</h3>
                <span className="font-mono text-xs text-slate-500">{selectedBusForLayout.busNumber}</span>
              </div>
              <button onClick={() => setSelectedBusForLayout(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center text-xs text-slate-500">
              মোট সিট: <strong className="font-mono text-slate-800">{en2bn(selectedBusForLayout.totalSeats)}</strong> · ধরন: <strong>{selectedBusForLayout.busType}</strong>
            </div>

            {/* Bus Cabin Visual Layout */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-4 shadow-inner max-w-[280px] mx-auto">
              <div className="flex items-center justify-between border-b-2 border-dashed border-slate-300 pb-2 mb-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> প্রবেশদ্বার</span>
                <div className="w-7 h-7 rounded-full border-2 border-slate-400 flex items-center justify-center text-slate-600 font-bold text-[9px]">
                  ড্রাইভার
                </div>
              </div>

              <div className="space-y-2">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, Math.ceil(selectedBusForLayout.totalSeats / 4)).map(row => (
                  <div key={row} className="flex items-center justify-between text-xs">
                    <div className="flex gap-1.5">
                      <span className="w-8 h-8 rounded bg-white border border-slate-300 flex items-center justify-center font-mono font-bold text-slate-700 shadow-xs">
                        {row}1
                      </span>
                      <span className="w-8 h-8 rounded bg-white border border-slate-300 flex items-center justify-center font-mono font-bold text-slate-700 shadow-xs">
                        {row}2
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-300 font-mono w-4 text-center">{row}</span>

                    <div className="flex gap-1.5">
                      <span className="w-8 h-8 rounded bg-white border border-slate-300 flex items-center justify-center font-mono font-bold text-slate-700 shadow-xs">
                        {row}3
                      </span>
                      <span className="w-8 h-8 rounded bg-white border border-slate-300 flex items-center justify-center font-mono font-bold text-slate-700 shadow-xs">
                        {row}4
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedBusForLayout(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
