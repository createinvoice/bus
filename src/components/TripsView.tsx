import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Bus as BusIcon,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Phone,
  Ticket,
  FileCheck,
  X
} from 'lucide-react';
import {
  Trip,
  Bus,
  Route,
  Booking,
  en2bn,
  formatTaka,
  formatBnDate,
  formatBnTime
} from '../data/initialData';

interface TripsViewProps {
  trips: Trip[];
  buses: Bus[];
  routes: Route[];
  bookings: Booking[];
  isAdmin: boolean;
  onUpdateTrips: (updatedTrips: Trip[]) => void;
  onSelectTripForBooking: (tripId: number) => void;
  onSelectTripForManifest: (tripId: number) => void;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export default function TripsView({
  trips,
  buses,
  routes,
  bookings,
  isAdmin,
  onUpdateTrips,
  onSelectTripForBooking,
  onSelectTripForManifest,
  showNotification
}: TripsViewProps) {
  const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);

  // New Trip form state
  const [busId, setBusId] = useState<number>(buses[0]?.id || 1);
  const [routeId, setRouteId] = useState<number>(routes[0]?.id || 1);
  const [journeyDate, setJourneyDate] = useState('2026-10-02');
  const [departureTime, setDepartureTime] = useState('22:00');
  const [arrivalTime, setArrivalTime] = useState('04:30');
  const [boardingPoint, setBoardingPoint] = useState('গাবতলী / কল্যাণপুর কাউন্টার');
  const [droppingPoint, setDroppingPoint] = useState('মজমপুর গেট / কেন্দ্রীয় বাস টার্মিনাল');
  const [seatFare, setSeatFare] = useState<number>(750);
  const [driverName, setDriverName] = useState('রফিকুল ইসলাম');
  const [driverPhone, setDriverPhone] = useState('01712-334455');
  const [supervisorName, setSupervisorName] = useState('মোঃ সোহেল রানা');
  const [supervisorPhone, setSupervisorPhone] = useState('01819-778899');

  const handleAddTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (seatFare <= 0) {
      showNotification('দয়া করে সঠিক সিট ভাড়া নির্ধারণ করুন!', 'error');
      return;
    }

    const newTrip: Trip = {
      id: Date.now(),
      busId,
      routeId,
      journeyDate,
      departureTime,
      arrivalTime,
      boardingPoint,
      droppingPoint,
      seatFare,
      driverName,
      driverPhone,
      supervisorName,
      supervisorPhone,
      status: 'scheduled'
    };

    onUpdateTrips([newTrip, ...trips]);
    showNotification('নতুন ট্রিপ শিডিউল সফলভাবে তৈরি হয়েছে!', 'success');
    setIsAddTripModalOpen(false);
  };

  const handleUpdateTripStatus = (tripId: number, nextStatus: 'scheduled' | 'departed' | 'completed' | 'cancelled') => {
    const updated = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, status: nextStatus };
      }
      return t;
    });
    onUpdateTrips(updated);
    const labels = {
      scheduled: 'শিডিউল্ড',
      departed: 'ছেড়ে গেছে (On the Road)',
      completed: 'গন্তব্যে পৌঁছেছে (Completed)',
      cancelled: 'বাতিলকৃত'
    };
    showNotification(`ট্রিপের অবস্থা পরিবর্তন: ${labels[nextStatus]}`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span>ট্রিপ শিডিউলিং ও ডিউটি রোস্টার (Trip Operations)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            দৈনিক বাস ছাড়ার সময়সূচি, চালক ও সুপারভাইজার রোস্টার এবং লাইভ বুকিং অগ্রগতি
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddTripModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ট্রিপ তৈরি করুন</span>
          </button>
        )}
      </div>

      {/* Trips Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.map(trip => {
          const bus = buses.find(b => b.id === trip.busId);
          const route = routes.find(r => r.id === trip.routeId);
          const bookedCount = bookings
            .filter(b => b.tripId === trip.id && b.bookingStatus !== 'cancelled')
            .reduce((s, b) => s + b.totalSeats, 0);
          const totalCapacity = bus?.totalSeats || 40;
          const freeSeats = Math.max(0, totalCapacity - bookedCount);
          const percent = Math.round((bookedCount / totalCapacity) * 100);

          return (
            <div
              key={trip.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
            >
              {/* Trip Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{bus?.name}</h3>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {bus?.busType}
                    </span>
                  </div>
                  <div className="text-emerald-700 font-bold text-sm mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{route?.origin} হতে {route?.destination}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-400 block mt-0.5">{bus?.busNumber}</span>
                </div>

                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-emerald-800 block">
                    {formatTaka(trip.seatFare)}
                  </span>
                  <span className="text-[11px] text-slate-400">প্রতি আসন ভাড়া</span>
                </div>
              </div>

              {/* Time & Boarding Points */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">যাত্রার তারিখ ও ছাড়ার সময়:</span>
                  <strong className="text-slate-900 block mt-0.5">{formatBnDate(trip.journeyDate)}</strong>
                  <span className="text-emerald-700 font-bold">{formatBnTime(trip.departureTime)}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">বোর্ডিং ও গন্তব্য:</span>
                  <span className="text-slate-700 block truncate" title={trip.boardingPoint}>বোর্ডিং: {trip.boardingPoint}</span>
                  <span className="text-slate-700 block truncate" title={trip.droppingPoint}>ড্রপ: {trip.droppingPoint}</span>
                </div>
              </div>

              {/* Crew Info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>চালক: <strong>{trip.driverName || 'নির্ধারিত নয়'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{trip.driverPhone || '-'}</span>
                </div>
              </div>

              {/* Booking Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">সিট বুকিং স্থিতি:</span>
                  <span>
                    <strong className="text-emerald-700 font-mono">{en2bn(bookedCount)}</strong> / {en2bn(totalCapacity)} সিট 
                    <span className="text-slate-400 text-[11px]"> ({en2bn(percent)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      percent > 85 ? 'bg-red-500' : percent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className={`font-semibold ${freeSeats > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    খালি আছে: {en2bn(freeSeats)} আসন
                  </span>
                  <span className="text-slate-500">
                    স্ট্যাটাস: <strong className="text-slate-800">
                      {trip.status === 'scheduled' ? 'শিডিউল্ড' : trip.status === 'departed' ? 'অন রোড' : trip.status === 'completed' ? 'সম্পন্ন' : 'বাতিল'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectTripForBooking(trip.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>সিট বুকিং</span>
                  </button>
                  <button
                    onClick={() => onSelectTripForManifest(trip.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>ওয়েবিল</span>
                  </button>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 text-[11px]">
                    {trip.status === 'scheduled' && (
                      <button
                        onClick={() => handleUpdateTripStatus(trip.id, 'departed')}
                        className="px-2 py-1 bg-sky-50 text-sky-800 hover:bg-sky-100 rounded font-medium border border-sky-200"
                      >
                        বাস ছেড়েছে
                      </button>
                    )}
                    {trip.status === 'departed' && (
                      <button
                        onClick={() => handleUpdateTripStatus(trip.id, 'completed')}
                        className="px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded font-medium border border-emerald-200"
                      >
                        ট্রিপ সম্পন্ন
                      </button>
                    )}
                    {trip.status !== 'cancelled' && trip.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdateTripStatus(trip.id, 'cancelled')}
                        className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded font-medium border border-red-200"
                      >
                        বাতিল
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD NEW TRIP */}
      {isAddTripModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>নতুন ট্রিপ শিডিউল তৈরি করুন (Create Schedule)</span>
              </h3>
              <button onClick={() => setIsAddTripModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTrip} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">বাস নির্বাচন করুন <span className="text-red-500">*</span></label>
                  <select
                    value={busId}
                    onChange={e => setBusId(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.busNumber}) - {b.busType}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">রুট নির্বাচন করুন <span className="text-red-500">*</span></label>
                  <select
                    value={routeId}
                    onChange={e => setRouteId(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.origin} হতে {r.destination}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">যাত্রার তারিখ <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={journeyDate}
                    onChange={e => setJourneyDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ছাড়ার সময় <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">পৌঁছানোর সময়</label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={e => setArrivalTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">সিট প্রতি ভাড়া (টাকা) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="50"
                  required
                  value={seatFare}
                  onChange={e => setSeatFare(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm font-bold text-emerald-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">বোর্ডিং কাউন্টার / পয়েন্ট</label>
                  <input
                    type="text"
                    value={boardingPoint}
                    onChange={e => setBoardingPoint(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ড্রপিং পয়েন্ট</label>
                  <input
                    type="text"
                    value={droppingPoint}
                    onChange={e => setDroppingPoint(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">চালকের নাম</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">চালকের মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={e => setDriverPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">সুপারভাইজারের নাম</label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={e => setSupervisorName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">সুপারভাইজারের ফোন</label>
                  <input
                    type="text"
                    value={supervisorPhone}
                    onChange={e => setSupervisorPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                >
                  ট্রিপ শিডিউল সংরক্ষণ করুন
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddTripModalOpen(false)}
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
