import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Search,
  Filter,
  Download,
  Printer,
  DollarSign,
  ArrowRightLeft,
  XCircle,
  Eye,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  MapPin,
  Bus as BusIcon,
  User as UserIcon,
  Phone
} from 'lucide-react';
import {
  Booking,
  Trip,
  Bus,
  Route,
  User,
  en2bn,
  formatTaka,
  formatBnDate,
  formatBnTime,
  generateSmsTicketText,
  downloadCsv
} from '../data/initialData';

interface BookingsViewProps {
  bookings: Booking[];
  trips: Trip[];
  buses: Bus[];
  routes: Route[];
  users: User[];
  currentUser: User;
  todayStr: string;
  companyName: string;
  companyPhone: string;
  onOpenDueCollect: (booking: Booking) => void;
  onOpenTicketPrint: (booking: Booking) => void;
  onUpdateBookings: (updatedBookings: Booking[]) => void;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export default function BookingsView({
  bookings,
  trips,
  buses,
  routes,
  users,
  currentUser,
  todayStr,
  companyName,
  companyPhone,
  onOpenDueCollect,
  onOpenTicketPrint,
  onUpdateBookings,
  showNotification
}: BookingsViewProps) {
  const isAdmin = currentUser.role === 'admin';

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'today' | 'due' | 'paid' | 'cancelled'>('all');
  const [tripFilter, setTripFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [detailsModalBooking, setDetailsModalBooking] = useState<Booking | null>(null);
  
  // Seat Shift Modal
  const [shiftModalBooking, setShiftModalBooking] = useState<Booking | null>(null);
  const [shiftFromSeat, setShiftFromSeat] = useState<string>('');
  const [shiftToSeat, setShiftToSeat] = useState<string>('');

  // Cancel & Refund Modal
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('যাত্রীর ব্যক্তিগত অনুরোধে বাতিল');
  const [cancellationFee, setCancellationFee] = useState<string>('100');

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Permission check
      if (!isAdmin && b.userId !== currentUser.id) return false;

      // Status Filter
      if (statusFilter === 'today' && !b.createdAt.startsWith(todayStr)) return false;
      if (statusFilter === 'due' && (b.dueAmount <= 0 || b.bookingStatus === 'cancelled')) return false;
      if (statusFilter === 'paid' && (b.dueAmount > 0 || b.bookingStatus === 'cancelled')) return false;
      if (statusFilter === 'cancelled' && b.bookingStatus !== 'cancelled') return false;

      // Trip Filter
      if (tripFilter !== 'all' && b.tripId !== tripFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = b.bookingReference.toLowerCase().includes(q);
        const matchesName = b.customerName.toLowerCase().includes(q);
        const matchesPhone = b.customerPhone.includes(q);
        const matchesSeat = b.selectedSeats.some(s => s.toLowerCase().includes(q));
        if (!matchesRef && !matchesName && !matchesPhone && !matchesSeat) return false;
      }

      return true;
    });
  }, [bookings, isAdmin, currentUser.id, statusFilter, todayStr, tripFilter, searchQuery]);

  // Seat shift available seats for the trip
  const availableSeatsForShift = useMemo(() => {
    if (!shiftModalBooking) return [];
    const tripId = shiftModalBooking.tripId;
    const bookedSeats = bookings
      .filter(b => b.tripId === tripId && b.bookingStatus !== 'cancelled')
      .flatMap(b => b.selectedSeats);
    
    // All 40 standard seats
    const allSeats: string[] = [];
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(row => {
      [1, 2, 3, 4].forEach(col => {
        allSeats.push(`${row}${col}`);
      });
    });

    return allSeats.filter(s => !bookedSeats.includes(s));
  }, [shiftModalBooking, bookings]);

  // Handle Seat Shift Execution
  const handleExecuteSeatShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftModalBooking || !shiftFromSeat || !shiftToSeat) {
      showNotification('অনুগ্রহ করে বর্তমান সিট এবং নতুন সিট নির্বাচন করুন!', 'error');
      return;
    }

    const updated = bookings.map(b => {
      if (b.id === shiftModalBooking.id) {
        const newSeats = b.selectedSeats.map(s => s === shiftFromSeat ? shiftToSeat : s);
        const newPassengers = b.passengers.map(p => 
          p.seatNumber === shiftFromSeat ? { ...p, seatNumber: shiftToSeat } : p
        );
        return {
          ...b,
          selectedSeats: newSeats,
          passengers: newPassengers
        };
      }
      return b;
    });

    onUpdateBookings(updated);
    showNotification(`সিট পরিবর্তন সম্পন্ন: ${shiftFromSeat} হতে ${shiftToSeat}-এ স্থানান্তর করা হয়েছে।`, 'success');
    setShiftModalBooking(null);
    setShiftFromSeat('');
    setShiftToSeat('');
  };

  // Handle Cancel & Refund Execution
  const handleExecuteCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalBooking) return;

    const fee = parseFloat(cancellationFee) || 0;
    const refundAmount = Math.max(0, cancelModalBooking.advancePaid - fee);

    const updated = bookings.map(b => {
      if (b.id === cancelModalBooking.id) {
        return {
          ...b,
          bookingStatus: 'cancelled' as const,
          cancellationReason: `${cancelReason} (কর্তন ফি: ৳ ${en2bn(fee)}, রিফান্ড: ৳ ${en2bn(refundAmount)})`
        };
      }
      return b;
    });

    onUpdateBookings(updated);
    showNotification(`বুকিং বাতিল করা হয়েছে। সিট রিলিজ হয়েছে। যাত্রী রিফান্ড: ${formatTaka(refundAmount)}`, 'info');
    setCancelModalBooking(null);
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Booking Reference',
      'Passenger Name',
      'Mobile Phone',
      'Route',
      'Journey Date',
      'Seats',
      'Total Fare',
      'Advance Paid',
      'Due Amount',
      'Status',
      'Booking Time'
    ];
    const rows = filteredBookings.map(b => {
      const trip = trips.find(t => t.id === b.tripId);
      const route = routes.find(r => r.id === trip?.routeId);
      return [
        b.bookingReference,
        b.customerName,
        b.customerPhone,
        `${route?.origin || ''} - ${route?.destination || ''}`,
        trip?.journeyDate || '',
        b.selectedSeats.join(' '),
        b.totalFare,
        b.advancePaid,
        b.dueAmount,
        b.bookingStatus === 'cancelled' ? 'বাতিল' : (b.dueAmount === 0 ? 'পরিশোধিত' : 'বাকি'),
        b.createdAt
      ];
    });
    downloadCsv(`busgo-bookings-${todayStr}.csv`, headers, rows);
    showNotification('বুকিং তালিকা CSV সফলভাবে ডাউনলোড হয়েছে!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-600" />
            <span>সকল বুকিং ও টিকিট ব্যবস্থাপনা (All Bookings Management)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            বুকিংয়ের পূর্ণ বিবরণ, টিকিট প্রিন্ট, বাকি টাকা আদায়, আসন পরিবর্তন ও রিফান্ড পলিসি
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV এক্সপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              সকল বুকিং ({en2bn(bookings.length)})
            </button>
            <button
              onClick={() => setStatusFilter('today')}
              className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'today' ? 'bg-white text-emerald-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              আজকের ({en2bn(bookings.filter(b => b.createdAt.startsWith(todayStr)).length)})
            </button>
            <button
              onClick={() => setStatusFilter('due')}
              className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'due' ? 'bg-white text-red-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              বকেয়া / বাকি ({en2bn(bookings.filter(b => b.dueAmount > 0 && b.bookingStatus !== 'cancelled').length)})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'paid' ? 'bg-white text-emerald-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              পরিশোধিত ({en2bn(bookings.filter(b => b.dueAmount === 0 && b.bookingStatus !== 'cancelled').length)})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'cancelled' ? 'bg-white text-slate-500 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              বাতিলকৃত ({en2bn(bookings.filter(b => b.bookingStatus === 'cancelled').length)})
            </button>
          </div>

          {/* Trip Selector Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">ট্রিপ:</span>
            <select
              value={tripFilter}
              onChange={e => setTripFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">সকল ট্রিপ</option>
              {trips.map(tp => {
                const b = buses.find(x => x.id === tp.busId);
                const r = routes.find(x => x.id === tp.routeId);
                return (
                  <option key={tp.id} value={tp.id}>
                    {b?.name} | {r?.origin}-{r?.destination} | {tp.departureTime}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="বুকিং রেফারেন্স, যাত্রীর নাম, মোবাইল নম্বর অথবা সিট নম্বর (যেমন: A1) দিয়ে সার্চ করুন..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
          <span>বুকিং তালিকা ({en2bn(filteredBookings.length)}টি ফলাফল)</span>
          <span className="text-slate-400 font-mono text-[11px]">তারিখ: {formatBnDate(todayStr)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">আইডি ও সময়</th>
                <th className="py-3 px-4">যাত্রীর বিবরণ</th>
                <th className="py-3 px-4">বাস ও রুট</th>
                <th className="py-3 px-4 text-center">আসনসমূহ</th>
                <th className="py-3 px-4 text-right">মোট ভাড়া</th>
                <th className="py-3 px-4 text-right">অগ্রিম / বাকি</th>
                <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    কোনো বুকিং পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredBookings.map(bk => {
                  const trip = trips.find(t => t.id === bk.tripId);
                  const bus = buses.find(b => b.id === trip?.busId);
                  const route = routes.find(r => r.id === trip?.routeId);
                  const isCancelled = bk.bookingStatus === 'cancelled';

                  return (
                    <tr key={bk.id} className={`hover:bg-slate-50/80 transition-colors ${isCancelled ? 'bg-red-50/30 opacity-75' : ''}`}>
                      {/* Reference & Created Time */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{bk.bookingReference}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {formatBnDate(bk.createdAt, true)}
                        </span>
                      </td>

                      {/* Passenger */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{bk.customerName}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{bk.customerPhone}</div>
                        {bk.customerNid && (
                          <div className="text-[10px] text-slate-400">NID: {bk.customerNid}</div>
                        )}
                      </td>

                      {/* Bus & Route */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{bus?.name}</div>
                        <div className="text-emerald-700 text-[11px] font-medium">
                          {route?.origin} → {route?.destination}
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          {formatBnDate(trip?.journeyDate || '')}, {formatBnTime(trip?.departureTime || '')}
                        </div>
                      </td>

                      {/* Seats */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-wrap gap-1 justify-center max-w-[120px]">
                          {bk.selectedSeats.map(st => (
                            <span key={st} className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px]">
                              {st}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          মোট {en2bn(bk.totalSeats)} আসন
                        </span>
                      </td>

                      {/* Total Fare */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatTaka(bk.totalFare)}
                        {bk.discountAmount ? (
                          <span className="block text-[10px] text-amber-600 font-normal font-sans">
                            ছাড়: {formatTaka(bk.discountAmount)}
                          </span>
                        ) : null}
                      </td>

                      {/* Advance & Due */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-emerald-700 font-bold block">{formatTaka(bk.advancePaid)}</span>
                        {bk.dueAmount > 0 && !isCancelled ? (
                          <span className="text-red-600 font-bold text-[11px] block">
                            বাকি: {formatTaka(bk.dueAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] block">পরিশোধিত</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isCancelled ? (
                          <span className="bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded text-[11px]">
                            বাতিল
                          </span>
                        ) : bk.dueAmount === 0 ? (
                          <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded text-[11px]">
                            পরিশোধিত
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded text-[11px]">
                            আংশিক বাকি
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ticket Print */}
                          <button
                            onClick={() => onOpenTicketPrint(bk)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors"
                            title="টিকিট প্রিন্ট ও প্রিভিউ"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Due Collect */}
                          {bk.dueAmount > 0 && !isCancelled && (
                            <button
                              onClick={() => onOpenDueCollect(bk)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold shadow-sm transition-colors flex items-center gap-0.5"
                              title="বাকি টাকা গ্রহণ করুন"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>বাকি আদায়</span>
                            </button>
                          )}

                          {/* Seat Shift */}
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setShiftModalBooking(bk);
                                setShiftFromSeat(bk.selectedSeats[0] || '');
                                setShiftToSeat('');
                              }}
                              className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors"
                              title="আসন পরিবর্তন / শিফট করুন"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Booking */}
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setCancelModalBooking(bk);
                                setCancellationFee('100');
                                setCancelReason('যাত্রীর ব্যক্তিগত অনুরোধে বাতিল');
                              }}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="বুকিং বাতিল ও রিফান্ড"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* View Details */}
                          <button
                            onClick={() => setDetailsModalBooking(bk)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: SEAT SHIFT MODAL */}
      {shiftModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-600" />
                <span>যাত্রীর আসন পরিবর্তন (Seat Shift / Change)</span>
              </h3>
              <button onClick={() => setShiftModalBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <div>বুকিং আইডি: <strong className="font-mono text-emerald-700">{shiftModalBooking.bookingReference}</strong></div>
              <div>যাত্রী: <strong>{shiftModalBooking.customerName}</strong> ({shiftModalBooking.customerPhone})</div>
              <div>বর্তমান বরাদ্দকৃত আসন: <span className="font-mono font-bold text-slate-800">{shiftModalBooking.selectedSeats.join(', ')}</span></div>
            </div>

            <form onSubmit={handleExecuteSeatShift} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">কোন আসনটি পরিবর্তন করবেন?</label>
                <select
                  value={shiftFromSeat}
                  onChange={e => setShiftFromSeat(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                >
                  {shiftModalBooking.selectedSeats.map(st => (
                    <option key={st} value={st}>আসন {st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  নতুন খালি আসন নির্বাচন করুন ({en2bn(availableSeatsForShift.length)}টি খালি) <span className="text-red-500">*</span>
                </label>
                {availableSeatsForShift.length === 0 ? (
                  <div className="text-red-500 p-2 bg-red-50 rounded border border-red-200">
                    এই ট্রিপে কোনো খালি আসন অবশিষ্ট নেই!
                  </div>
                ) : (
                  <select
                    value={shiftToSeat}
                    onChange={e => setShiftToSeat(e.target.value)}
                    required
                    className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-800 bg-emerald-50/50"
                  >
                    <option value="">-- খালি আসন বেছে নিন --</option>
                    {availableSeatsForShift.map(st => (
                      <option key={st} value={st}>আসন {st} (খালি)</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!shiftToSeat}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs shadow transition-colors"
                >
                  আসন স্থানান্তর নিশ্চিত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setShiftModalBooking(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL & REFUND MODAL */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5 text-red-600" />
                <span>টিকিট বাতিল ও রিফান্ড পলিসি</span>
              </h3>
              <button onClick={() => setCancelModalBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 p-3 rounded-lg text-xs space-y-1 text-red-950 border border-red-200">
              <div>বুকিং আইডি: <strong className="font-mono">{cancelModalBooking.bookingReference}</strong></div>
              <div>যাত্রী: <strong>{cancelModalBooking.customerName}</strong> ({cancelModalBooking.customerPhone})</div>
              <div>মোট ভাড়া: <span className="font-mono">{formatTaka(cancelModalBooking.totalFare)}</span></div>
              <div>যাত্রী কর্তৃক পরিশোধিত অগ্রিম: <span className="font-mono font-bold text-emerald-700">{formatTaka(cancelModalBooking.advancePaid)}</span></div>
            </div>

            <form onSubmit={handleExecuteCancel} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">বাতিলের কারণ</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  বাতিলকরণ কর্তন ফি (Cancellation Fee / টাকা)
                </label>
                <input
                  type="number"
                  min="0"
                  max={cancelModalBooking.advancePaid}
                  value={cancellationFee}
                  onChange={e => setCancellationFee(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between items-center font-bold">
                <span className="text-slate-600">যাত্রীকে ফেরতযোগ্য রিফান্ড:</span>
                <span className="text-emerald-700 font-mono text-sm">
                  {formatTaka(Math.max(0, cancelModalBooking.advancePaid - (parseFloat(cancellationFee) || 0)))}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                >
                  বুকিং চূড়ান্ত বাতিল করুন
                </button>
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
                >
                  ফিরে যান
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BOOKING FULL DETAILS MODAL */}
      {detailsModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-600" />
                <span>বুকিং বিস্তারিত তথ্য ({detailsModalBooking.bookingReference})</span>
              </h3>
              <button onClick={() => setDetailsModalBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Passenger & Trip Details Card */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">যাত্রীর নাম:</span>
                  <strong className="text-slate-900 text-sm block mt-0.5">{detailsModalBooking.customerName}</strong>
                  <span className="font-mono text-slate-600">{detailsModalBooking.customerPhone}</span>
                  {detailsModalBooking.customerNid && (
                    <div className="text-slate-500 text-[10px] mt-0.5">NID: {detailsModalBooking.customerNid}</div>
                  )}
                  {detailsModalBooking.customerAddress && (
                    <div className="text-slate-500 text-[10px] mt-0.5">ঠিকানা: {detailsModalBooking.customerAddress}</div>
                  )}
                </div>

                <div>
                  {(() => {
                    const tp = trips.find(t => t.id === detailsModalBooking.tripId);
                    const b = buses.find(x => x.id === tp?.busId);
                    const r = routes.find(x => x.id === tp?.routeId);
                    return (
                      <>
                        <span className="text-slate-400 block text-[11px]">ভ্রমণের বিবরণ:</span>
                        <strong className="text-slate-900 block mt-0.5">{b?.name} ({b?.busNumber})</strong>
                        <span className="text-emerald-700 font-bold block">{r?.origin} → {r?.destination}</span>
                        <span className="text-slate-500 text-[11px]">
                          {formatBnDate(tp?.journeyDate || '')}, {formatBnTime(tp?.departureTime || '')}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Passenger List by Seat */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-1.5">সিট অনুযায়ী যাত্রী তালিকা:</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="py-1.5 px-3">সিট</th>
                        <th className="py-1.5 px-3">নাম</th>
                        <th className="py-1.5 px-3">লিঙ্গ</th>
                        <th className="py-1.5 px-3">মোবাইল</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailsModalBooking.passengers.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-mono font-bold text-emerald-700">{p.seatNumber}</td>
                          <td className="py-1.5 px-3">{p.name}</td>
                          <td className="py-1.5 px-3 text-slate-500">{p.gender || 'পুরুষ'}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-500">{p.phone || detailsModalBooking.customerPhone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">মোট ভাড়া:</span>
                  <span className="font-mono font-bold">{formatTaka(detailsModalBooking.totalFare)}</span>
                </div>
                {detailsModalBooking.discountAmount ? (
                  <div className="flex justify-between text-amber-600">
                    <span>ছাড় / ডিসকাউন্ট:</span>
                    <span className="font-mono">-{formatTaka(detailsModalBooking.discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-emerald-700">
                  <span>পরিশোধিত অগ্রিম:</span>
                  <span className="font-mono font-bold">{formatTaka(detailsModalBooking.advancePaid)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold border-t border-slate-100 pt-1">
                  <span>বাকি টাকা:</span>
                  <span className="font-mono text-sm">{formatTaka(detailsModalBooking.dueAmount)}</span>
                </div>
                {detailsModalBooking.cancellationReason && (
                  <div className="text-red-600 p-2 bg-red-50 rounded mt-2 text-[11px]">
                    <strong>বাতিলের বিবরণ:</strong> {detailsModalBooking.cancellationReason}
                  </div>
                )}
              </div>

              {/* Actions Footer inside Details */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailsModalBooking(null);
                    onOpenTicketPrint(detailsModalBooking);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>টিকিট প্রিন্ট করুন</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    (() => {
                      const trip = trips.find(t => t.id === detailsModalBooking.tripId);
                      const bus = buses.find(b => b.id === trip?.busId);
                      const route = routes.find(r => r.id === trip?.routeId);
                      return generateSmsTicketText(detailsModalBooking, trip, bus, route, companyName, companyPhone);
                    })()
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>হোয়াটসঅ্যাপ</span>
                </a>

                <button
                  type="button"
                  onClick={() => setDetailsModalBooking(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
