import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Navigation,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight
} from 'lucide-react';
import { Route, en2bn } from '../data/initialData';

interface RoutesViewProps {
  routes: Route[];
  isAdmin: boolean;
  onUpdateRoutes: (updatedRoutes: Route[]) => void;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export default function RoutesView({
  routes,
  isAdmin,
  onUpdateRoutes,
  showNotification
}: RoutesViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState<number>(200);
  const [estimatedTime, setEstimatedTime] = useState('৫ ঘণ্টা');

  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      showNotification('দয়া করে রুটের উৎস ও গন্তব্য লিখুন!', 'error');
      return;
    }

    const newRoute: Route = {
      id: Date.now(),
      origin: origin.trim(),
      destination: destination.trim(),
      distanceKm,
      estimatedTime: estimatedTime.trim() || '৫ ঘণ্টা',
      status: 'active'
    };

    onUpdateRoutes([...routes, newRoute]);
    showNotification(`নতুন রুট "${newRoute.origin} হতে ${newRoute.destination}" যুক্ত হয়েছে!`, 'success');
    setIsAddModalOpen(false);
    setOrigin('');
    setDestination('');
  };

  const handleToggleRouteStatus = (routeId: number) => {
    const updated = routes.map(r => {
      if (r.id === routeId) {
        const next = r.status === 'active' ? 'inactive' : 'active';
        return { ...r, status: next as 'active' | 'inactive' };
      }
      return r;
    });
    onUpdateRoutes(updated);
    showNotification('রুটের স্ট্যাটাস পরিবর্তন করা হয়েছে।', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>রুট ও কাউন্টার সংযোগ (Route Management)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            আন্তঃজেলা বাস চলাচলের নির্ধারিত রুট, আনুমানিক ভ্রমণ সময় ও দূরত্ব কনফিগারেশন
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন রুট তৈরি করুন</span>
          </button>
        )}
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routes.map(route => {
          const isActive = route.status === 'active';

          return (
            <div
              key={route.id}
              className={`bg-white rounded-xl border p-5 space-y-4 shadow-sm hover:shadow-md transition-all ${
                isActive ? 'border-slate-200' : 'border-slate-300 opacity-70 bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                    <span>{route.origin}</span>
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                    <span>{route.destination}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">রুট কোড: RT-{route.id}</span>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>{isActive ? 'সক্রিয়' : 'স্থগিত'}</span>
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-slate-400" />
                    <span>মোট দূরত্ব:</span>
                  </span>
                  <strong className="font-mono text-slate-900">{en2bn(route.distanceKm)} কিমি</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>আনুমানিক সময়:</span>
                  </span>
                  <strong className="text-slate-900">{route.estimatedTime}</strong>
                </div>
              </div>

              {isAdmin && (
                <div className="border-t border-slate-100 pt-3 flex justify-end">
                  <button
                    onClick={() => handleToggleRouteStatus(route.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isActive ? 'সাময়িক স্থগিত করুন' : 'রুট চালু করুন'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD NEW ROUTE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <span>নতুন রুট এন্ট্রি করুন (Add New Route)</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoute} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  যাত্রার শুরু / উৎস পয়েন্ট (Origin) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  placeholder="যেমন: ঢাকা (গাবতলী / সায়দাবাদ)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  গন্তব্য পয়েন্ট (Destination) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="যেমন: চট্টগ্রাম / কক্সবাজার / কুষ্টিয়া"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">দূরত্ব (কিলোমিটার)</label>
                  <input
                    type="number"
                    min="1"
                    value={distanceKm}
                    onChange={e => setDistanceKm(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">আনুমানিক সময়</label>
                  <input
                    type="text"
                    value={estimatedTime}
                    onChange={e => setEstimatedTime(e.target.value)}
                    placeholder="যেমন: ৫ ঘণ্টা ৩০ মিনিট"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                >
                  রুট সংরক্ষণ করুন
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
