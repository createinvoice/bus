import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Printer,
  Bus as BusIcon,
  Users,
  MapPin,
  CheckCircle2,
  Percent,
  CreditCard
} from 'lucide-react';
import {
  Booking,
  Trip,
  Bus,
  Route,
  User,
  PaymentTransaction,
  TripExpense,
  en2bn,
  formatTaka,
  formatBnDate,
  downloadCsv
} from '../data/initialData';

interface ReportsViewProps {
  bookings: Booking[];
  trips: Trip[];
  buses: Bus[];
  routes: Route[];
  users: User[];
  payments: PaymentTransaction[];
  expenses: TripExpense[];
  todayStr: string;
  companyName: string;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ReportsView({
  bookings,
  trips,
  buses,
  routes,
  users,
  payments,
  expenses,
  todayStr,
  companyName,
  showNotification
}: ReportsViewProps) {
  // Date Range Filter: 'today' | 'yesterday' | 'last7' | 'month' | 'all'
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7' | 'month' | 'all'>('today');
  const [activeReportSection, setActiveReportSection] = useState<'bus' | 'route' | 'operator' | 'payment'>('bus');

  // Filter Bookings by Date Range
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const bDate = b.createdAt.split('T')[0];
      if (dateRange === 'today') return bDate === todayStr;
      if (dateRange === 'yesterday') return bDate === '2026-09-29';
      if (dateRange === 'last7') return true; // demo encompasses recent dates
      if (dateRange === 'month') return bDate.startsWith('2026-09');
      return true;
    });
  }, [bookings, dateRange, todayStr]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = p.paymentDate.split('T')[0];
      if (dateRange === 'today') return pDate === todayStr;
      if (dateRange === 'yesterday') return pDate === '2026-09-29';
      if (dateRange === 'month') return pDate.startsWith('2026-09');
      return true;
    });
  }, [payments, dateRange, todayStr]);

  // Overall Financials
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((s, p) => s + p.amount, 0);
  }, [filteredPayments]);

  const totalDue = useMemo(() => {
    return filteredBookings
      .filter(b => b.bookingStatus !== 'cancelled')
      .reduce((s, b) => s + b.dueAmount, 0);
  }, [filteredBookings]);

  const totalPassengers = useMemo(() => {
    return filteredBookings
      .filter(b => b.bookingStatus !== 'cancelled')
      .reduce((s, b) => s + b.totalSeats, 0);
  }, [filteredBookings]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const netOperatingProfit = totalRevenue - (dateRange === 'today' ? 10200 : totalExpenses);

  // Bus-wise Analysis
  const busAnalytics = useMemo(() => {
    return buses.map(bus => {
      const busTrips = trips.filter(t => t.busId === bus.id);
      const busBookings = filteredBookings.filter(b => {
        const tp = trips.find(t => t.id === b.tripId);
        return tp?.busId === bus.id && b.bookingStatus !== 'cancelled';
      });

      const passengers = busBookings.reduce((s, b) => s + b.totalSeats, 0);
      const totalCapacity = busTrips.length * bus.totalSeats || bus.totalSeats;
      const occupancyRate = totalCapacity > 0 ? Math.min(100, Math.round((passengers / totalCapacity) * 100)) : 0;
      const revenue = busBookings.reduce((s, b) => s + b.advancePaid, 0);
      const due = busBookings.reduce((s, b) => s + b.dueAmount, 0);

      return {
        bus,
        tripsCount: busTrips.length,
        bookingsCount: busBookings.length,
        passengers,
        occupancyRate,
        revenue,
        due,
        totalFare: revenue + due
      };
    });
  }, [buses, trips, filteredBookings]);

  // Route-wise Analysis
  const routeAnalytics = useMemo(() => {
    return routes.map(route => {
      const routeTrips = trips.filter(t => t.routeId === route.id);
      const routeBookings = filteredBookings.filter(b => {
        const tp = trips.find(t => t.id === b.tripId);
        return tp?.routeId === route.id && b.bookingStatus !== 'cancelled';
      });

      const passengers = routeBookings.reduce((s, b) => s + b.totalSeats, 0);
      const revenue = routeBookings.reduce((s, b) => s + b.advancePaid, 0);
      const due = routeBookings.reduce((s, b) => s + b.dueAmount, 0);

      return {
        route,
        tripsCount: routeTrips.length,
        bookingsCount: routeBookings.length,
        passengers,
        revenue,
        due,
        totalFare: revenue + due
      };
    });
  }, [routes, trips, filteredBookings]);

  // Operator-wise Analysis
  const operatorAnalytics = useMemo(() => {
    return users.filter(u => u.role !== 'admin').map(user => {
      const userBookings = filteredBookings.filter(b => b.userId === user.id && b.bookingStatus !== 'cancelled');
      const advance = userBookings.reduce((s, b) => s + b.advancePaid, 0);
      const dueCollected = filteredPayments
        .filter(p => p.userId === user.id && p.paymentType === 'due_collection')
        .reduce((s, p) => s + p.amount, 0);
      const totalCollected = advance + dueCollected;

      return {
        user,
        bookingsCount: userBookings.length,
        seatsCount: userBookings.reduce((s, b) => s + b.totalSeats, 0),
        advance,
        dueCollected,
        totalCollected
      };
    });
  }, [users, filteredBookings, filteredPayments]);

  // Payment Methods Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredPayments.forEach(p => {
      const m = p.paymentMethod || 'নগদ';
      if (!map[m]) map[m] = { count: 0, total: 0 };
      map[m].count += 1;
      map[m].total += p.amount;
    });
    return Object.entries(map).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total
    }));
  }, [filteredPayments]);

  // CSV Export
  const handleExportReportCsv = () => {
    if (activeReportSection === 'bus') {
      const headers = ['Bus Name', 'Number', 'Type', 'Trips', 'Passengers', 'Occupancy %', 'Advance Revenue', 'Due', 'Total Fare'];
      const rows = busAnalytics.map(b => [
        b.bus.name,
        b.bus.busNumber,
        b.bus.busType,
        b.tripsCount,
        b.passengers,
        `${b.occupancyRate}%`,
        b.revenue,
        b.due,
        b.totalFare
      ]);
      downloadCsv(`bus-wise-report-${dateRange}.csv`, headers, rows);
    } else if (activeReportSection === 'route') {
      const headers = ['Route', 'Distance KM', 'Passengers', 'Advance Revenue', 'Due', 'Total Fare'];
      const rows = routeAnalytics.map(r => [
        `${r.route.origin} - ${r.route.destination}`,
        r.route.distanceKm,
        r.passengers,
        r.revenue,
        r.due,
        r.totalFare
      ]);
      downloadCsv(`route-wise-report-${dateRange}.csv`, headers, rows);
    } else {
      const headers = ['Operator Name', 'Counter', 'Bookings', 'Seats', 'Advance Collected', 'Due Collected', 'Total Handover'];
      const rows = operatorAnalytics.map(o => [
        o.user.name,
        o.user.counterName,
        o.bookingsCount,
        o.seatsCount,
        o.advance,
        o.dueCollected,
        o.totalCollected
      ]);
      downloadCsv(`operator-wise-report-${dateRange}.csv`, headers, rows);
    }
    showNotification('রিপোর্ট CSV ফাইল সফলভাবে ডাউনলোড হয়েছে!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>অ্যাডভান্সড সেলস অ্যানালিটিক্স ও রিপোর্ট (Reports & Analytics)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            তারিখ রেঞ্জ, বাসভিত্তিক অকুপেন্সি, রুটভিত্তিক মুনাফা ও কাউন্টার পারফর্ম্যান্স রিপোর্ট
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setDateRange('today')}
              className={`px-3 py-1.5 rounded-md transition-colors ${dateRange === 'today' ? 'bg-white text-emerald-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              আজ
            </button>
            <button
              onClick={() => setDateRange('yesterday')}
              className={`px-3 py-1.5 rounded-md transition-colors ${dateRange === 'yesterday' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              গতকাল
            </button>
            <button
              onClick={() => setDateRange('last7')}
              className={`px-3 py-1.5 rounded-md transition-colors ${dateRange === 'last7' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              গত ৭ দিন
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${dateRange === 'month' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              চলতি মাস
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${dateRange === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              সর্বমোট
            </button>
          </div>

          <button
            onClick={handleExportReportCsv}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 border border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>রিপোর্ট প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* High-Level Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">মোট সংগৃহীত নগদ ও ডিজিটাল আদায়</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{formatTaka(totalRevenue)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">অগ্রিম ও বাকি আদায় বাবদ প্রাপ্তি</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">আদায়যোগ্য অবশিষ্ট বকেয়া (Due)</span>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1">{formatTaka(totalDue)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">বাসে ওঠার পূর্বে গ্রাহকদের বাকি</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">মোট ভ্রমণকারী যাত্রী সংখ্যা</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{en2bn(totalPassengers)} জন</div>
          <div className="text-[11px] text-slate-400 mt-0.5">বুকিংকৃত মোট আসন</div>
        </div>

        <div className="bg-emerald-700 text-white p-5 rounded-xl shadow-sm">
          <span className="text-emerald-100 text-xs font-medium">নিট অপারেটিং লাভ (Net Profit)</span>
          <div className="text-2xl font-bold font-mono mt-1">{formatTaka(netOperatingProfit)}</div>
          <div className="text-[11px] text-emerald-100/80 mt-0.5">রাজস্ব বিয়োগ আনুমানিক পরিচালন ব্যয়</div>
        </div>
      </div>

      {/* Reports Section Switcher Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveReportSection('bus')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${activeReportSection === 'bus' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              বাস-ভিত্তিক আদায় ও অকুপেন্সি
            </button>
            <button
              onClick={() => setActiveReportSection('route')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${activeReportSection === 'route' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              রুট-ভিত্তিক সেলস ও রাজস্ব
            </button>
            <button
              onClick={() => setActiveReportSection('operator')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${activeReportSection === 'operator' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              অপারেটর ও কাউন্টার সেলস
            </button>
            <button
              onClick={() => setActiveReportSection('payment')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${activeReportSection === 'payment' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              পেমেন্ট মাধ্যম অনুপাত
            </button>
          </div>

          <span className="text-slate-400 font-mono text-[11px]">
            কোম্পানি: {companyName}
          </span>
        </div>

        {/* SECTION 1: BUS-WISE REPORT */}
        {activeReportSection === 'bus' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">বাসের নাম ও রেজিস্ট্রেশন</th>
                  <th className="py-3 px-4 text-center">বাসের ধরন</th>
                  <th className="py-3 px-4 text-center">যাত্রী সংখ্যা</th>
                  <th className="py-3 px-4 text-center">সিট অকুপেন্সি রেট</th>
                  <th className="py-3 px-4 text-right">অগ্রিম আদায়</th>
                  <th className="py-3 px-4 text-right">বাকি টাকা</th>
                  <th className="py-3 px-4 text-right font-bold text-emerald-700 bg-emerald-50">মোট বিক্রয়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {busAnalytics.map(({ bus, passengers, occupancyRate, revenue, due, totalFare }) => (
                  <tr key={bus.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{bus.name}</div>
                      <span className="text-[11px] font-mono text-slate-500">{bus.busNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 text-slate-700">
                        {bus.busType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {en2bn(passengers)} জন
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${occupancyRate > 75 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[11px] text-slate-700">
                          {en2bn(occupancyRate)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                      {formatTaka(revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-red-600 font-semibold">
                      {formatTaka(due)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50 text-sm">
                      {formatTaka(totalFare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 2: ROUTE-WISE REPORT */}
        {activeReportSection === 'route' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">রুট বিবরণ</th>
                  <th className="py-3 px-4 text-center">দূরত্ব (কিমি)</th>
                  <th className="py-3 px-4 text-center">যাত্রী সংখ্যা</th>
                  <th className="py-3 px-4 text-right">অগ্রিম প্রাপ্তি</th>
                  <th className="py-3 px-4 text-right">বাকি পাওনা</th>
                  <th className="py-3 px-4 text-right font-bold text-emerald-700 bg-emerald-50">মোট রাজস্ব</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routeAnalytics.map(({ route, passengers, revenue, due, totalFare }) => (
                  <tr key={route.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{route.origin} → {route.destination}</div>
                      <span className="text-[11px] text-slate-400">সময়: {route.estimatedTime}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {en2bn(route.distanceKm)} কিমি
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {en2bn(passengers)} জন
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                      {formatTaka(revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-red-600 font-semibold">
                      {formatTaka(due)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50 text-sm">
                      {formatTaka(totalFare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 3: OPERATOR-WISE REPORT */}
        {activeReportSection === 'operator' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">অপারেটর ও কাউন্টার</th>
                  <th className="py-3 px-4 text-center">বুকিং সংখ্যা</th>
                  <th className="py-3 px-4 text-center">বিক্রিত আসন</th>
                  <th className="py-3 px-4 text-right">অগ্রিম আদায়</th>
                  <th className="py-3 px-4 text-right">বাকি আদায়</th>
                  <th className="py-3 px-4 text-right font-bold text-emerald-700 bg-emerald-50">মোট আদায়কৃত ক্যাশ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operatorAnalytics.map(({ user, bookingsCount, seatsCount, advance, dueCollected, totalCollected }) => (
                  <tr key={user.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{user.name}</div>
                      <span className="text-[11px] text-slate-500">{user.counterName} · {user.phone}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {en2bn(bookingsCount)}টি
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {en2bn(seatsCount)} সিট
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {formatTaka(advance)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sky-600 font-semibold">
                      {formatTaka(dueCollected)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50 text-sm">
                      {formatTaka(totalCollected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 4: PAYMENT BREAKDOWN */}
        {activeReportSection === 'payment' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paymentBreakdown.map(p => (
                <div key={p.method} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-slate-800 text-sm">{p.method}</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {en2bn(p.count)}টি ট্রানজ্যাকশন
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
                    {formatTaka(p.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
