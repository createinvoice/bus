import React, { useState, useMemo } from 'react';
import {
  Bus,
  Ticket,
  Calendar,
  Users,
  CreditCard,
  Printer,
  Search,
  Plus,
  Check,
  X,
  MapPin,
  Clock,
  Download,
  FileText,
  Database,
  Copy,
  CheckCircle2,
  Lock,
  LogOut,
  Sliders,
  DollarSign,
  QrCode,
  Eye,
  Trash2,
  UserCheck,
  Receipt,
  FileSpreadsheet,
  Share2,
  Fuel,
  MessageSquare,
  FileCheck,
  PhoneCall,
  Send,
  Sparkles,
  ArrowRight,
  Menu,
  Package,
  AlertCircle
} from 'lucide-react';
import {
  User,
  Bus as BusType,
  Route as RouteType,
  Trip as TripType,
  UserBusAssignment,
  Booking,
  PaymentTransaction,
  TripExpense,
  CounterHandover,
  SystemSettings,
  ParcelBooking,
  CustomerComplaint,
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_ROUTES,
  INITIAL_BUSES,
  INITIAL_TRIPS,
  INITIAL_ASSIGNMENTS,
  INITIAL_BOOKINGS,
  INITIAL_PAYMENTS,
  INITIAL_EXPENSES,
  INITIAL_HANDOVERS,
  INITIAL_PARCELS,
  INITIAL_COMPLAINTS,
  en2bn,
  formatTaka,
  formatBnDate,
  formatBnTime,
  generateSmsTicketText,
  downloadCsv
} from './data/initialData';
import { PHP_PROJECT_FILES, downloadPhpProjectZip } from './data/phpProjectBundle';
import { Sidebar, NavTab } from './components/Sidebar';
import { ParcelView } from './components/ParcelView';
import { ComplaintsView } from './components/ComplaintsView';
import { SmsTemplateModal } from './components/SmsTemplateModal';
import BookingsView from './components/BookingsView';
import BusesView from './components/BusesView';
import RoutesView from './components/RoutesView';
import TripsView from './components/TripsView';
import StaffView from './components/StaffView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';

export default function App() {
  // Global Application State
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [buses, setBuses] = useState<BusType[]>(INITIAL_BUSES);
  const [routes, setRoutes] = useState<RouteType[]>(INITIAL_ROUTES);
  const [trips, setTrips] = useState<TripType[]>(INITIAL_TRIPS);
  const [assignments, setAssignments] = useState<UserBusAssignment[]>(INITIAL_ASSIGNMENTS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [payments, setPayments] = useState<PaymentTransaction[]>(INITIAL_PAYMENTS);
  const [expenses, setExpenses] = useState<TripExpense[]>(INITIAL_EXPENSES);
  const [handovers, setHandovers] = useState<CounterHandover[]>(INITIAL_HANDOVERS);
  const [parcels, setParcels] = useState<ParcelBooking[]>(INITIAL_PARCELS);
  const [complaints, setComplaints] = useState<CustomerComplaint[]>(INITIAL_COMPLAINTS);

  // Responsive Sidebar States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Authentication & Active User State
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); // default Super Admin

  // Active Tab/View Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedBookingForTicket, setSelectedBookingForTicket] = useState<Booking | null>(INITIAL_BOOKINGS[0]);
  const [isThermalTicket, setIsThermalTicket] = useState<boolean>(false);
  const [copiedSms, setCopiedSms] = useState<boolean>(false);

  // Top Bar Universal Quick Search
  const [universalSearch, setUniversalSearch] = useState<string>('');

  // Flash Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>({
    type: 'info',
    text: 'স্বাগতম! আপনি এখন সম্পূর্ণ বাংলা বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেমে আছেন।'
  });

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const isAdmin = currentUser.role === 'admin';

  // ---------------------------------------------------------------------------------
  // Filtered Data based on Current User Role
  // ---------------------------------------------------------------------------------
  const assignedTrips = useMemo(() => {
    if (isAdmin) return trips;
    return trips.filter(t => {
      const hasBusAssignment = assignments.some(a => a.userId === currentUser.id && a.busId === t.busId && (!a.tripId || a.tripId === t.id));
      return hasBusAssignment;
    });
  }, [isAdmin, trips, assignments, currentUser.id]);

  const matchingSearchBookings = useMemo(() => {
    if (!universalSearch.trim()) return [];
    const q = universalSearch.toLowerCase().trim();
    return bookings.filter(b => 
      b.bookingReference.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.customerPhone.includes(q) ||
      b.selectedSeats.some(s => s.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [bookings, universalSearch]);

  const userBookings = useMemo(() => {
    let list = isAdmin ? bookings : bookings.filter(b => b.userId === currentUser.id);
    if (universalSearch.trim()) {
      const q = universalSearch.toLowerCase().trim();
      list = list.filter(b => 
        b.bookingReference.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        b.selectedSeats.some(s => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [isAdmin, bookings, currentUser.id, universalSearch]);

  // Financial Metrics for Dashboard
  const todayStr = '2026-09-30';
  const todayBookings = useMemo(() => {
    return userBookings.filter(b => b.createdAt.startsWith(todayStr) && b.bookingStatus !== 'cancelled');
  }, [userBookings, todayStr]);

  const todayCollection = useMemo(() => {
    return payments
      .filter(p => (isAdmin || p.userId === currentUser.id) && p.paymentDate.startsWith(todayStr))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, isAdmin, currentUser.id, todayStr]);

  const todayAdvance = useMemo(() => {
    return todayBookings.reduce((sum, b) => sum + b.advancePaid, 0);
  }, [todayBookings]);

  const todayDue = useMemo(() => {
    return todayBookings.reduce((sum, b) => sum + b.dueAmount, 0);
  }, [todayBookings]);

  const todayPassengers = useMemo(() => {
    return todayBookings.reduce((sum, b) => sum + b.totalSeats, 0);
  }, [todayBookings]);

  // ---------------------------------------------------------------------------------
  // New Booking State & Handlers
  // ---------------------------------------------------------------------------------
  const [bookingTripId, setBookingTripId] = useState<number>(assignedTrips[0]?.id || 1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custNid, setCustNid] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [advanceInput, setAdvanceInput] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('নগদ');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [passengerNames, setPassengerNames] = useState<Record<string, string>>({});

  const currentTripForBooking = useMemo(() => {
    return trips.find(t => t.id === bookingTripId) || trips[0];
  }, [trips, bookingTripId]);

  const currentBusForBooking = useMemo(() => {
    if (!currentTripForBooking) return buses[0];
    return buses.find(b => b.id === currentTripForBooking.busId) || buses[0];
  }, [buses, currentTripForBooking]);

  const currentRouteForBooking = useMemo(() => {
    if (!currentTripForBooking) return routes[0];
    return routes.find(r => r.id === currentTripForBooking.routeId) || routes[0];
  }, [routes, currentTripForBooking]);

  // Seats already booked for selected trip
  const alreadyBookedSeatsForTrip = useMemo(() => {
    const booked: string[] = [];
    bookings
      .filter(b => b.tripId === bookingTripId && b.bookingStatus !== 'cancelled')
      .forEach(b => {
        booked.push(...b.selectedSeats);
      });
    return booked;
  }, [bookings, bookingTripId]);

  const handleSeatClick = (seatNo: string) => {
    if (alreadyBookedSeatsForTrip.includes(seatNo)) return;
    if (selectedSeats.includes(seatNo)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNo));
      const nextNames = { ...passengerNames };
      delete nextNames[seatNo];
      setPassengerNames(nextNames);
    } else {
      setSelectedSeats([...selectedSeats, seatNo]);
    }
  };

  const rawFare = selectedSeats.length * (currentTripForBooking?.seatFare || 750);
  const numDiscount = Math.min(rawFare, parseFloat(discountInput) || 0);
  const bookingTotalFare = Math.max(0, rawFare - numDiscount);
  const numAdvance = parseFloat(advanceInput) || 0;
  const bookingDueAmount = Math.max(0, bookingTotalFare - numAdvance);

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeats.length === 0) {
      showNotification('দয়া করে বাসের অন্তত একটি সিট নির্বাচন করুন!', 'error');
      return;
    }
    if (!custName.trim() || !custPhone.trim()) {
      showNotification('যাত্রীর নাম এবং মোবাইল নম্বর আবশ্যক!', 'error');
      return;
    }

    const nextNum = bookings.length + 1;
    const ref = `BUS-${todayStr.replace(/-/g, '')}-${String(nextNum).padStart(4, '0')}`;

    const passengersList = selectedSeats.map(st => ({
      seatNumber: st,
      name: passengerNames[st]?.trim() || custName.trim(),
      phone: custPhone.trim(),
      gender: 'পুরুষ'
    }));

    const finalAdvance = Math.min(numAdvance, bookingTotalFare);
    const finalDue = Math.max(0, bookingTotalFare - finalAdvance);
    const payStatus: 'paid' | 'partial' | 'unpaid' = finalDue === 0 ? 'paid' : (finalAdvance > 0 ? 'partial' : 'unpaid');

    const newBooking: Booking = {
      id: Date.now(),
      bookingReference: ref,
      tripId: bookingTripId,
      userId: currentUser.id,
      customerName: custName.trim(),
      customerPhone: custPhone.trim(),
      customerNid: custNid.trim(),
      customerAddress: custAddress.trim(),
      totalSeats: selectedSeats.length,
      selectedSeats: [...selectedSeats],
      totalFare: bookingTotalFare,
      discountAmount: numDiscount,
      advancePaid: finalAdvance,
      dueAmount: finalDue,
      bookingStatus: 'confirmed',
      paymentStatus: payStatus,
      passengers: passengersList,
      createdAt: `${todayStr}T${new Date().toLocaleTimeString('en-US', { hour12: false })}`
    };

    setBookings([newBooking, ...bookings]);

    if (finalAdvance > 0) {
      const newPay: PaymentTransaction = {
        id: Date.now() + 1,
        bookingId: newBooking.id,
        userId: currentUser.id,
        amount: finalAdvance,
        paymentType: finalDue === 0 ? 'full_payment' : 'advance',
        paymentMethod: paymentMethod,
        transactionReference: paymentNote || 'CASH-REC',
        note: paymentNote || 'বুকিংয়ের সময় অগ্রিম আদায়',
        paymentDate: `${todayStr}T${new Date().toLocaleTimeString('en-US', { hour12: false })}`
      };
      setPayments([newPay, ...payments]);
    }

    showNotification(`বুকিং সফল হয়েছে! আইডি: ${ref}`, 'success');

    setSelectedSeats([]);
    setCustName('');
    setCustPhone('');
    setCustNid('');
    setCustAddress('');
    setDiscountInput('0');
    setAdvanceInput('0');
    setPassengerNames({});

    setSelectedBookingForTicket(newBooking);
    setActiveTab('ticket-print');
  };

  // Due Collection Modal State
  const [dueCollectModalBooking, setDueCollectModalBooking] = useState<Booking | null>(null);
  const [duePaymentAmount, setDuePaymentAmount] = useState<string>('');
  const [duePaymentMethod, setDuePaymentMethod] = useState<string>('নগদ');
  const [duePaymentNote, setDuePaymentNote] = useState<string>('বাকি আদায়');

  const handleDueCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueCollectModalBooking) return;

    const amount = parseFloat(duePaymentAmount) || 0;
    if (amount <= 0 || amount > dueCollectModalBooking.dueAmount) {
      showNotification('দয়া করে সঠিক আদায়ের পরিমাণ দিন!', 'error');
      return;
    }

    const updatedAdvance = dueCollectModalBooking.advancePaid + amount;
    const updatedDue = Math.max(0, dueCollectModalBooking.totalFare - updatedAdvance);
    const updatedPaymentStatus: 'paid' | 'partial' = updatedDue === 0 ? 'paid' : 'partial';

    const updatedBookings: Booking[] = bookings.map(b => {
      if (b.id === dueCollectModalBooking.id) {
        return {
          ...b,
          advancePaid: updatedAdvance,
          dueAmount: updatedDue,
          paymentStatus: updatedPaymentStatus
        };
      }
      return b;
    });

    const newPay: PaymentTransaction = {
      id: Date.now(),
      bookingId: dueCollectModalBooking.id,
      userId: currentUser.id,
      amount: amount,
      paymentType: 'due_collection',
      paymentMethod: duePaymentMethod,
      transactionReference: 'DUE-COLL-' + Math.floor(Math.random() * 9000 + 1000),
      note: duePaymentNote,
      paymentDate: `${todayStr}T${new Date().toLocaleTimeString('en-US', { hour12: false })}`
    };

    setBookings(updatedBookings);
    setPayments([newPay, ...payments]);
    setDueCollectModalBooking(null);
    showNotification(`বাকি টাকা ${formatTaka(amount)} সফলভাবে আদায় করা হয়েছে!`, 'success');
  };

  const handleCancelBooking = (bookingId: number) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বুকিংটি বাতিল করতে চান? সংরক্ষিত সিটগুলো পুনরায় অন্য যাত্রীদের জন্য উন্মুক্ত হবে।')) return;
    setBookings(bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          bookingStatus: 'cancelled',
          cancellationReason: 'যাত্রীর অনুরোধে বাতিল'
        };
      }
      return b;
    }));
    showNotification('বুকিং সফলভাবে বাতিল করা হয়েছে। সিট রিলিজ হয়েছে।', 'info');
  };

  const handleSwitchUser = (targetUserId: number) => {
    const target = users.find(u => u.id === targetUserId);
    if (target) {
      setCurrentUser(target);
      showNotification(`লগইন পরিবর্তন: ${target.name} (${target.role === 'admin' ? 'সুপার অ্যাডমিন' : 'অপারেটর'})`, 'info');
    }
  };

  // ---------------------------------------------------------------------------------
  // Passenger Manifest State
  // ---------------------------------------------------------------------------------
  const [manifestTripId, setManifestTripId] = useState<number>(assignedTrips[0]?.id || 1);
  const currentManifestTrip = useMemo(() => {
    return trips.find(t => t.id === manifestTripId) || trips[0];
  }, [trips, manifestTripId]);

  const manifestBus = useMemo(() => {
    return buses.find(b => b.id === currentManifestTrip?.busId) || buses[0];
  }, [buses, currentManifestTrip]);

  const manifestRoute = useMemo(() => {
    return routes.find(r => r.id === currentManifestTrip?.routeId) || routes[0];
  }, [routes, currentManifestTrip]);

  const manifestPassengers = useMemo(() => {
    const list: {
      seat: string;
      bookingRef: string;
      name: string;
      phone: string;
      boarding: string;
      dropping: string;
      fare: number;
      due: number;
    }[] = [];

    bookings
      .filter(b => b.tripId === manifestTripId && b.bookingStatus !== 'cancelled')
      .forEach(b => {
        b.passengers.forEach(p => {
          list.push({
            seat: p.seatNumber,
            bookingRef: b.bookingReference,
            name: p.name,
            phone: p.phone || b.customerPhone,
            boarding: b.customerAddress || currentManifestTrip.boardingPoint,
            dropping: currentManifestTrip.droppingPoint,
            fare: currentManifestTrip.seatFare,
            due: Math.round(b.dueAmount / b.totalSeats)
          });
        });
      });

    return list.sort((a, b) => a.seat.localeCompare(b.seat));
  }, [bookings, manifestTripId, currentManifestTrip]);

  // ---------------------------------------------------------------------------------
  // Trip Expenses & Profit State
  // ---------------------------------------------------------------------------------
  const [expenseTripId, setExpenseTripId] = useState<number>(trips[0]?.id || 1);
  const [expenseCategory, setExpenseCategory] = useState<'ডিজেল / জ্বালানি' | 'টোল ও ফেরি' | 'ড্রাইভার ও হেলপার ভাতা' | 'রোড ও পুলিশ খরচ' | 'অন্যান্য'>('ডিজেল / জ্বালানি');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseNote, setExpenseNote] = useState<string>('');

  const currentExpenseTrip = useMemo(() => {
    return trips.find(t => t.id === expenseTripId) || trips[0];
  }, [trips, expenseTripId]);

  const currentExpenseBus = useMemo(() => {
    return buses.find(b => b.id === currentExpenseTrip?.busId) || buses[0];
  }, [buses, currentExpenseTrip]);

  const currentExpenseRoute = useMemo(() => {
    return routes.find(r => r.id === currentExpenseTrip?.routeId) || routes[0];
  }, [routes, currentExpenseTrip]);

  const tripExpensesList = useMemo(() => {
    return expenses.filter(e => e.tripId === expenseTripId);
  }, [expenses, expenseTripId]);

  const tripTotalRevenue = useMemo(() => {
    return bookings
      .filter(b => b.tripId === expenseTripId && b.bookingStatus !== 'cancelled')
      .reduce((s, b) => s + b.totalFare, 0);
  }, [bookings, expenseTripId]);

  const tripTotalExpense = useMemo(() => {
    return tripExpensesList.reduce((s, e) => s + e.amount, 0);
  }, [tripExpensesList]);

  const tripNetProfit = tripTotalRevenue - tripTotalExpense;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount) || 0;
    if (amt <= 0) {
      showNotification('দয়া করে সঠিক খরচের পরিমাণ দিন!', 'error');
      return;
    }

    const newExp: TripExpense = {
      id: Date.now(),
      tripId: expenseTripId,
      expenseCategory,
      amount: amt,
      note: expenseNote.trim() || 'সাধারণ ট্রিপ ব্যয়',
      expenseDate: todayStr
    };

    setExpenses([newExp, ...expenses]);
    setExpenseAmount('');
    setExpenseNote('');
    showNotification(`খরচ ৳ ${en2bn(amt)} সফলভাবে যুক্ত হয়েছে।`, 'success');
  };

  // ---------------------------------------------------------------------------------
  // Counter Handover State (in Daily Closing)
  // ---------------------------------------------------------------------------------
  const [handoverAmountInput, setHandoverAmountInput] = useState<string>('');
  const [handoverMethod, setHandoverMethod] = useState<'নগদ প্রধান কার্যালয় জমা' | 'ব্যাংক ডিপোজিট' | 'বিকাশ/অনলাইন ট্রান্সফার'>('নগদ প্রধান কার্যালয় জমা');
  const [handoverRef, setHandoverRef] = useState<string>('');

  const handleAddHandover = (e: React.FormEvent) => {
    e.preventDefault();
    const net = parseFloat(handoverAmountInput) || 0;
    if (net <= 0) {
      showNotification('দয়া করে জমার সঠিক পরিমাণ দিন!', 'error');
      return;
    }

    const newH: CounterHandover = {
      id: Date.now(),
      userId: currentUser.id,
      counterName: currentUser.counterName,
      date: todayStr,
      totalCollected: todayCollection,
      expenseDeducted: 0,
      netHandover: net,
      handoverMethod,
      referenceNo: handoverRef || `REC-${todayStr.replace(/-/g, '')}-01`,
      status: isAdmin ? 'approved' : 'pending',
      approvedBy: isAdmin ? currentUser.name : undefined
    };

    setHandovers([newH, ...handovers]);
    setHandoverAmountInput('');
    setHandoverRef('');
    showNotification('কাউন্টার ক্যাশ হ্যান্ডওভার ভাউচার সফলভাবে জমা হয়েছে।', 'success');
  };

  // ---------------------------------------------------------------------------------
  // Source Code Explorer State
  // ---------------------------------------------------------------------------------
  const [selectedSourcePath, setSelectedSourcePath] = useState<string>('login.php');
  const [copyStatus, setCopyStatus] = useState<boolean>(false);

  const currentSourceFile = useMemo(() => {
    return PHP_PROJECT_FILES.find(f => f.path === selectedSourcePath) || PHP_PROJECT_FILES[0];
  }, [selectedSourcePath]);

  const handleCopyCode = () => {
    if (!currentSourceFile) return;
    navigator.clipboard.writeText(currentSourceFile.content);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  // CSV Export Handlers
  const handleExportBookingsCsv = () => {
    const headers = ['Booking ID', 'Customer Name', 'Phone', 'Seats', 'Total Fare', 'Advance Paid', 'Due', 'Status', 'Date'];
    const rows = userBookings.map(b => [
      b.bookingReference,
      b.customerName,
      b.customerPhone,
      b.selectedSeats.join(' '),
      b.totalFare,
      b.advancePaid,
      b.dueAmount,
      b.paymentStatus,
      b.createdAt
    ]);
    downloadCsv(`busgo-bookings-${todayStr}.csv`, headers, rows);
    showNotification('বুকিং তালিকা CSV ফাইল সফলভাবে ডাউনলোড হয়েছে!', 'success');
  };

  const handleExportManifestCsv = () => {
    const headers = ['Seat', 'Passenger Name', 'Phone', 'Boarding', 'Dropping', 'Due on Bus', 'Ticket Ref'];
    const rows = manifestPassengers.map(p => [
      p.seat,
      p.name,
      p.phone,
      p.boarding,
      p.dropping,
      p.due,
      p.bookingRef
    ]);
    downloadCsv(`trip-manifest-${currentManifestTrip.id}-${todayStr}.csv`, headers, rows);
    showNotification('যাত্রী তালিকা ও ওয়েবিল CSV ডাউনলোড সম্পন্ন!', 'success');
  };

  // Parcel & Luggage Booking Handlers
  const handleAddParcel = (newP: Omit<ParcelBooking, 'id' | 'createdAt'>) => {
    const p: ParcelBooking = {
      ...newP,
      id: parcels.length ? Math.max(...parcels.map(x => x.id)) + 1 : 1,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setParcels([p, ...parcels]);
    showNotification(`পার্সেল চালান (${p.trackingNumber}) সফলভাবে তৈরি হয়েছে!`, 'success');
  };

  const handleUpdateParcelStatus = (id: number, deliveryStatus: ParcelBooking['deliveryStatus'], paymentStatus?: ParcelBooking['paymentStatus']) => {
    setParcels(parcels.map(p => {
      if (p.id === id) {
        return {
          ...p,
          deliveryStatus,
          paymentStatus: paymentStatus || p.paymentStatus
        };
      }
      return p;
    }));
    showNotification('পার্সেল স্ট্যাটাস সফলভাবে আপডেট হয়েছে!', 'success');
  };

  // Passenger Complaint Desk Handlers
  const handleAddComplaint = (newC: Omit<CustomerComplaint, 'id' | 'createdAt'>) => {
    const c: CustomerComplaint = {
      ...newC,
      id: complaints.length ? Math.max(...complaints.map(x => x.id)) + 1 : 1,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setComplaints([c, ...complaints]);
    showNotification('যাত্রীর অভিযোগ সফলভাবে সিস্টেমে লিপিবদ্ধ করা হয়েছে!', 'success');
  };

  const handleResolveComplaint = (id: number, resolutionNote: string) => {
    setComplaints(complaints.map(c => {
      if (c.id === id) {
        return { ...c, status: 'resolved', resolutionNote };
      }
      return c;
    }));
    showNotification('অভিযোগ সফলভাবে সমাধান ও নিষ্পত্তি করা হয়েছে!', 'success');
  };

  // Sidebar Badge Stats
  const dueCount = useMemo(() => bookings.filter(b => b.dueAmount > 0).length, [bookings]);
  const activeTripsCount = trips.length;
  const pendingParcelsCount = useMemo(() => parcels.filter(p => p.deliveryStatus !== 'delivered').length, [parcels]);
  const openComplaintsCount = useMemo(() => complaints.filter(c => c.status !== 'resolved').length, [complaints]);
  const activeBusesCount = buses.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-['Noto_Sans_Bengali',sans-serif]">
      {/* Sleek Modern Bengali Sidebar Menu */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onSwitchUser={user => setCurrentUser(user)}
        allUsers={users}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        dueCount={dueCount}
        tripsCount={activeTripsCount}
        parcelsCount={pendingParcelsCount}
        complaintsCount={openComplaintsCount}
        busesCount={activeBusesCount}
      />

      {/* Main Content Area with dynamic margin based on sidebar state */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top Application Bar */}
        <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 no-print">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            {/* Left: Sidebar Toggle & Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="মেন্যু খুলুন"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="সাইডবার টগল"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2 text-lg font-extrabold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>{settings.companyName}</span>
              </button>
            </div>

          {/* Quick Universal Ticket Search Box */}
          <div className="hidden md:flex items-center max-w-xs w-full relative">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
            <input
              type="text"
              value={universalSearch}
              onChange={e => setUniversalSearch(e.target.value)}
              placeholder="আইডি বা মোবাইল দিয়ে টিকিট খুঁজুন..."
              className="w-full bg-slate-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono placeholder:text-slate-500 placeholder:font-sans"
            />
            {universalSearch && (
              <button onClick={() => setUniversalSearch('')} className="absolute right-2 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Floating Dropdown Results */}
            {universalSearch.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-xs">
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center text-[11px]">
                  <span>টিকিট অনুসন্ধান ফলাফল</span>
                  <span className="font-mono text-emerald-700">{en2bn(matchingSearchBookings.length)}টি পাওয়া গেছে</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {matchingSearchBookings.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      কোনো টিকিট পাওয়া যায়নি
                    </div>
                  ) : (
                    matchingSearchBookings.map(b => (
                      <div key={b.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors">
                        <div>
                          <div className="font-bold text-emerald-800 font-mono">{b.bookingReference}</div>
                          <div className="font-semibold text-slate-900">{b.customerName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{b.customerPhone}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">আসন: {b.selectedSeats.join(', ')} · {formatTaka(b.totalFare)}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => {
                              setSelectedBookingForTicket(b);
                              setActiveTab('ticket-print');
                              setUniversalSearch('');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] shadow-xs"
                          >
                            প্রিন্ট
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('bookings');
                            }}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px]"
                          >
                            তালিকা
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Zone 2: Primary Quick Links */}
          <nav className="hidden xl:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${activeTab === 'dashboard' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              ড্যাশবোর্ড
            </button>
            <button
              onClick={() => setActiveTab('new-booking')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${activeTab === 'new-booking' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-emerald-400 hover:text-emerald-300 font-medium'}`}
            >
              + নতুন বুকিং
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${activeTab === 'bookings' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              সকল বুকিং
            </button>
            <button
              onClick={() => setActiveTab('manifest')}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${activeTab === 'manifest' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              ওয়েবিল
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${activeTab === 'trips' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              ট্রিপ শিডিউল
            </button>
            <button
              onClick={() => setActiveTab('buses')}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${activeTab === 'buses' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              বাস ও ফ্লিট
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${activeTab === 'reports' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
                >
                  রিপোর্ট ও অ্যানালিটিক্স
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${activeTab === 'settings' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
                >
                  সেটিংস
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('php-source')}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1 ${activeTab === 'php-source' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-amber-400 hover:text-amber-300'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>PHP ZIP</span>
            </button>
          </nav>

          {/* Zone 3: Demo Role Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => handleSwitchUser(1)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${currentUser.id === 1 ? 'bg-emerald-500 text-white font-medium' : 'text-slate-300 hover:bg-slate-700'}`}
              >
                অ্যাডমিন
              </button>
              <button
                onClick={() => handleSwitchUser(2)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${currentUser.id === 2 ? 'bg-emerald-500 text-white font-medium' : 'text-slate-300 hover:bg-slate-700'}`}
              >
                রহিম (কাউন্টার)
              </button>
            </div>

            <button
              onClick={downloadPhpProjectZip}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
              title="cPanel / Namecheap-এর জন্য সম্পূর্ণ PHP প্রজেক্ট জিপ ডাউনলোড"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ZIP ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* Categorized Sub-Navbar Bar */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto no-print">
          <div className="max-w-7xl mx-auto flex items-center gap-4 text-xs font-medium whitespace-nowrap min-w-max">
            {/* Group 1: Operations */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1">অপারেশন:</span>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                ড্যাশবোর্ড
              </button>
              <button
                onClick={() => setActiveTab('new-booking')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'new-booking' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400 hover:text-emerald-300'}`}
              >
                + নতুন বুকিং
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'bookings' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                সকল বুকিং ({en2bn(bookings.length)})
              </button>
              <button
                onClick={() => setActiveTab('manifest')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'manifest' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                ওয়েবিল / মেনিফেস্ট
              </button>
            </div>

            {/* Group: Parcels & Care */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1">পার্সেল ও সেবা:</span>
              <button
                onClick={() => setActiveTab('parcels')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'parcels' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                লাগেজ ও পার্সেল ({en2bn(parcels.length)})
              </button>
              <button
                onClick={() => setActiveTab('complaints')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'complaints' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                অভিযোগ ও হারানো মাল ({en2bn(complaints.length)})
              </button>
              <button
                onClick={() => setActiveTab('sms-templates')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'sms-templates' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                এসএমএস ও হোয়াটসঅ্যাপ
              </button>
            </div>

            {/* Group 2: Fleet & Trips */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1">ফ্লিট ও রুট:</span>
              <button
                onClick={() => setActiveTab('trips')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'trips' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                ট্রিপ শিডিউল ({en2bn(trips.length)})
              </button>
              <button
                onClick={() => setActiveTab('buses')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'buses' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                বাস ও ফ্লিট ({en2bn(buses.length)})
              </button>
              <button
                onClick={() => setActiveTab('routes')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'routes' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                রুট ({en2bn(routes.length)})
              </button>
            </div>

            {/* Group 3: Accounts & Reports */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1">হিসাব ও ক্লোজিং:</span>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'expenses' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
                >
                  ট্রিপ খরচ ও লাভ
                </button>
              )}
              <button
                onClick={() => setActiveTab('daily-closing')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'daily-closing' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                ডেইলি ক্লোজিং ও ক্যাশ
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'reports' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
                >
                  অ্যানালিটিক্স ও রিপোর্ট
                </button>
              )}
            </div>

            {/* Group 4: Admin & System */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1">অ্যাডমিন:</span>
              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'staff' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
                  >
                    স্টাফ ও অপারেটর ({en2bn(users.length)})
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'settings' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
                  >
                    সিস্টেম সেটিংস
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('php-source')}
                className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'php-source' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-amber-400 hover:text-amber-300'}`}
              >
                PHP সোর্স ও ZIP
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Notification */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 no-print">
          <div className={`p-3 rounded-lg flex items-center justify-between text-sm ${notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : notification.type === 'info' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{notification.text}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* VIEW 1: DASHBOARD (ADMIN OR OPERATOR) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  স্বাগতম, {currentUser.name}!
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  ভূমিকা: <strong className="text-slate-700">{isAdmin ? 'সুপার অ্যাডমিন' : 'কাউন্টার অপারেটর'}</strong> · 
                  কাউন্টার: <strong className="text-slate-700">{currentUser.counterName}</strong> · 
                  তারিখ: <strong className="text-slate-700">{formatBnDate(todayStr)}</strong>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('new-booking')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন টিকিট বুকিং</span>
                </button>
                <button
                  onClick={() => setActiveTab('manifest')}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-3.5 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>ওয়েবিল প্রিন্ট</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-3.5 py-2 rounded-lg text-sm transition-colors border border-slate-300 flex items-center gap-1.5"
                  >
                    <Fuel className="w-4 h-4 text-amber-600" />
                    <span>ট্রিপ খরচ ও নিট লাভ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-sm font-medium">
                  <span>আজকের মোট আদায়</span>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono">
                  {formatTaka(todayCollection)}
                </div>
                <div className="text-xs text-slate-400 mt-1">নগদ ও ডিজিটাল আদায়</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-sm font-medium">
                  <span>আজকের মোট অগ্রিম</span>
                  <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-sky-600 mt-2 font-mono">
                  {formatTaka(todayAdvance)}
                </div>
                <div className="text-xs text-slate-400 mt-1">বুকিংকালীন প্রাপ্ত</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-sm font-medium">
                  <span>আজকের বাকি টাকা (Due)</span>
                  <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600 mt-2 font-mono">
                  {formatTaka(todayDue)}
                </div>
                <div className="text-xs text-slate-400 mt-1">যাত্রীদের নিকট আদায়যোগ্য</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-sm font-medium">
                  <span>আজকের মোট বুকিং</span>
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Ticket className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
                  {en2bn(todayBookings.length)}টি
                </div>
                <div className="text-xs text-slate-400 mt-1">মোট যাত্রী: {en2bn(todayPassengers)} জন</div>
              </div>
            </div>

            {/* Two Column Layout: Assigned Trips + Recent Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Assigned Buses & Trips */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <Bus className="w-4 h-4 text-emerald-600" />
                    <span>{isAdmin ? 'সক্রিয় বাস ও ট্রিপসমূহ' : 'আমার নির্ধারিত বাস ও ট্রিপ'}</span>
                  </h2>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    {en2bn(assignedTrips.length)}টি ট্রিপ
                  </span>
                </div>

                <div className="space-y-3">
                  {assignedTrips.map(trip => {
                    const b = buses.find(x => x.id === trip.busId);
                    const r = routes.find(x => x.id === trip.routeId);
                    const bookedCount = bookings
                      .filter(bk => bk.tripId === trip.id && bk.bookingStatus !== 'cancelled')
                      .reduce((sum, bk) => sum + bk.totalSeats, 0);
                    const freeSeats = (b?.totalSeats || 40) - bookedCount;

                    return (
                      <div key={trip.id} className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-900 text-sm">{b?.name}</div>
                          <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            {formatTaka(trip.seatFare)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-500" />
                          <span>{r?.origin} হতে {r?.destination}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="text-slate-500">
                            {formatBnDate(trip.journeyDate)} · {formatBnTime(trip.departureTime)}
                          </span>
                          <span className={`font-medium ${freeSeats > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            খালি: {en2bn(freeSeats)}টি
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setBookingTripId(trip.id);
                              setActiveTab('new-booking');
                            }}
                            className="flex-1 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded text-center transition-colors"
                          >
                            সিট বুকিং করুন →
                          </button>
                          <button
                            onClick={() => {
                              setManifestTripId(trip.id);
                              setActiveTab('manifest');
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded text-center"
                            title="ওয়েবিল মেনিফেস্ট দেখুন"
                          >
                            ওয়েবিল
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Recent Bookings Table */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-sky-600" />
                    <span>{isAdmin ? 'সাম্প্রতিক সকল বুকিং' : 'আমার সাম্প্রতিক বুকিং'}</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportBookingsCsv}
                      className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded flex items-center gap-1 font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      সকল বুকিং দেখুন →
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-medium">
                        <th className="pb-2">বুকিং আইডি</th>
                        <th className="pb-2">যাত্রী ও ফোন</th>
                        <th className="pb-2 text-right">ভাড়া</th>
                        <th className="pb-2 text-right">অগ্রিম / বাকি</th>
                        <th className="pb-2 text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {userBookings.slice(0, 6).map(bk => (
                        <tr key={bk.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 font-mono font-medium text-emerald-700">
                            {bk.bookingReference}
                            <span className="block text-[11px] text-slate-400 font-sans">সিট: {bk.selectedSeats.join(', ')}</span>
                          </td>
                          <td className="py-2.5">
                            <div className="font-medium text-slate-900">{bk.customerName}</div>
                            <div className="text-slate-400 text-[11px]">{bk.customerPhone}</div>
                          </td>
                          <td className="py-2.5 text-right font-mono font-medium">
                            {formatTaka(bk.totalFare)}
                          </td>
                          <td className="py-2.5 text-right font-mono">
                            <span className="text-emerald-600 block">{formatTaka(bk.advancePaid)}</span>
                            {bk.dueAmount > 0 ? (
                              <span className="text-red-500 font-bold text-[11px]">বাকি: {formatTaka(bk.dueAmount)}</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">পরিশোধিত</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedBookingForTicket(bk);
                                  setActiveTab('ticket-print');
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                                title="টিকিট প্রিন্ট ও SMS"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {bk.dueAmount > 0 && bk.bookingStatus !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    setDueCollectModalBooking(bk);
                                    setDuePaymentAmount(String(bk.dueAmount));
                                  }}
                                  className="px-2 py-0.5 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                                  title="বাকি আদায়"
                                >
                                  বাকি আদায়
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: NEW BOOKING (SEAT MAP, DISCOUNT & ADVANCE PAYMENT) */}
        {activeTab === 'new-booking' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-emerald-600" />
                  <span>নতুন টিকিট বুকিং ও সিট নির্বাচন</span>
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  ট্রিপ নির্বাচন করে আসন পছন্দ করুন, প্রয়োজনে ছাড় বা ডিসকাউন্ট দিন এবং অগ্রিম টাকা জমা নিন
                </p>
              </div>

              {/* Trip Selector Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">ট্রিপ নির্বাচন:</label>
                <select
                  value={bookingTripId}
                  onChange={e => {
                    setBookingTripId(Number(e.target.value));
                    setSelectedSeats([]);
                  }}
                  className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {assignedTrips.map(tp => {
                    const b = buses.find(x => x.id === tp.busId);
                    const r = routes.find(x => x.id === tp.routeId);
                    return (
                      <option key={tp.id} value={tp.id}>
                        {b?.name} ({b?.busNumber}) | {r?.origin} → {r?.destination} | {formatBnDate(tp.journeyDate)} | ৳{en2bn(tp.seatFare)}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Trip Details Bar with Driver & Supervisor */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-emerald-700 block">বাস ও ধরন:</span>
                <strong className="text-sm font-semibold">{currentBusForBooking.name}</strong>
                <span className="block text-slate-500">{currentBusForBooking.busNumber} ({currentBusForBooking.busType})</span>
              </div>
              <div>
                <span className="text-emerald-700 block">রুট ও বোর্ডিং:</span>
                <strong className="text-sm font-semibold">{currentRouteForBooking.origin} → {currentRouteForBooking.destination}</strong>
                <span className="block text-slate-500">বোর্ডিং: {currentTripForBooking.boardingPoint}</span>
              </div>
              <div>
                <span className="text-emerald-700 block">যাত্রার সময় ও চালক:</span>
                <strong className="text-sm font-semibold">{formatBnDate(currentTripForBooking.journeyDate)} ({formatBnTime(currentTripForBooking.departureTime)})</strong>
                <span className="block text-slate-500">চালক: {currentTripForBooking.driverName || 'মোশাররফ হোসেন'}</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-700 block">প্রতি সিট ভাড়া:</span>
                <span className="text-xl font-bold font-mono text-emerald-800">{formatTaka(currentTripForBooking.seatFare)}</span>
              </div>
            </div>

            {/* Two Column: 2x2 Bus Cabin Layout + Passenger & Payment Form */}
            <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive 2x2 Bus Cabin */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="text-center pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">বাসের সিট লেআউট (২ x ২)</h3>
                  <div className="flex items-center justify-center gap-4 text-xs mt-2">
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-slate-300 bg-white inline-block"></span> খালি</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block"></span> নির্বাচিত</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-red-500 inline-block"></span> বুকড</span>
                  </div>
                </div>

                {/* Bus Interior Box */}
                <div className="max-w-[320px] mx-auto bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 shadow-inner">
                  {/* Driver Cabin Front */}
                  <div className="flex items-center justify-between border-b-2 border-dashed border-slate-300 pb-3 mb-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> প্রবেশদ্বার</span>
                    <div className="w-8 h-8 rounded-full border-2 border-slate-400 flex items-center justify-center text-slate-600 font-bold" title="ড্রাইভারের আসন">
                      <span className="text-[10px]">স্টু</span>
                    </div>
                  </div>

                  {/* 10 Rows (A through J) with 4 seats each (2 left, aisle, 2 right) */}
                  <div className="space-y-2.5">
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((rowChar) => (
                      <div key={rowChar} className="flex items-center justify-between">
                        {/* Left Pair */}
                        <div className="flex gap-2">
                          {[1, 2].map(col => {
                            const seatCode = `${rowChar}${col}`;
                            const isBooked = alreadyBookedSeatsForTrip.includes(seatCode);
                            const isSelected = selectedSeats.includes(seatCode);

                            return (
                              <button
                                key={seatCode}
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleSeatClick(seatCode)}
                                className={`w-10 h-10 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center border shadow-sm ${
                                  isBooked
                                    ? 'bg-red-500 border-red-600 text-white cursor-not-allowed opacity-90'
                                    : isSelected
                                    ? 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-300 scale-105'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                                }`}
                              >
                                {seatCode}
                              </button>
                            );
                          })}
                        </div>

                        {/* Walking Aisle */}
                        <div className="w-6 text-center text-[10px] text-slate-300 font-mono">
                          {rowChar}
                        </div>

                        {/* Right Pair */}
                        <div className="flex gap-2">
                          {[3, 4].map(col => {
                            const seatCode = `${rowChar}${col}`;
                            const isBooked = alreadyBookedSeatsForTrip.includes(seatCode);
                            const isSelected = selectedSeats.includes(seatCode);

                            return (
                              <button
                                key={seatCode}
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleSeatClick(seatCode)}
                                className={`w-10 h-10 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center border shadow-sm ${
                                  isBooked
                                    ? 'bg-red-500 border-red-600 text-white cursor-not-allowed opacity-90'
                                    : isSelected
                                    ? 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-300 scale-105'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                                }`}
                              >
                                {seatCode}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Passenger Info & Financial Form with Discount */}
              <div className="lg:col-span-7 space-y-4">
                {/* Passenger Form Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>যাত্রীর তথ্য ও যোগাযোগ</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        যাত্রীর নাম <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={custName}
                        onChange={e => setCustName(e.target.value)}
                        placeholder="যেমন: মোঃ তানভীর হাসান"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        মোবাইল নম্বর <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={custPhone}
                        onChange={e => setCustPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">জাতীয় পরিচয়পত্র / NID (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        value={custNid}
                        onChange={e => setCustNid(e.target.value)}
                        placeholder="NID বা জন্ম নিবন্ধন নম্বর"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">বোর্ডিং পয়েন্ট / ঠিকানা (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        value={custAddress}
                        onChange={e => setCustAddress(e.target.value)}
                        placeholder="যেমন: গাবতলী কাউন্টার থেকে উঠবেন"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Multiple Passengers Extra Names if > 1 seat selected */}
                  {selectedSeats.length > 1 && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-slate-700">
                        অন্যান্য সিটের যাত্রীদের নাম (ঐচ্ছিক):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedSeats.map(st => (
                          <div key={st} className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-slate-200 px-2 py-1 rounded">
                              {st}
                            </span>
                            <input
                              type="text"
                              value={passengerNames[st] || ''}
                              onChange={e => setPassengerNames({ ...passengerNames, [st]: e.target.value })}
                              placeholder={`সিট ${st} যাত্রীর নাম`}
                              className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Summary, Discount & Advance Payment */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>ভাড়া হিসাব, ছাড় ও অগ্রিম আদায়</span>
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">নির্বাচিত আসন ({en2bn(selectedSeats.length)}টি):</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'কোনো আসন নির্বাচিত হয়নি'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-t border-slate-100 font-medium">
                      <span className="text-slate-600">মূল ভাড়া ({en2bn(selectedSeats.length)} x {formatTaka(currentTripForBooking?.seatFare || 750)}):</span>
                      <span className="font-mono text-slate-800">{formatTaka(rawFare)}</span>
                    </div>

                    {/* Discount Input */}
                    <div className="flex justify-between items-center py-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block">ছাড় / বিশেষ ডিসকাউন্ট (টাকা):</span>
                        <span className="text-[11px] text-slate-400">প্রযোজ্য ক্ষেত্রে ছাড় দিন</span>
                      </div>
                      <div className="w-36">
                        <input
                          type="number"
                          min="0"
                          max={rawFare}
                          value={discountInput}
                          onChange={e => setDiscountInput(e.target.value)}
                          placeholder="০"
                          className="w-full px-3 py-1 font-mono text-right font-medium text-amber-700 border border-amber-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-t border-slate-100 font-semibold text-base">
                      <span>মোট প্রদেয় ভাড়া:</span>
                      <span className="font-mono text-slate-900">{formatTaka(bookingTotalFare)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-t border-slate-100 bg-emerald-50/70 p-2.5 rounded-lg">
                      <div>
                        <span className="font-semibold text-emerald-900 block">অগ্রিম আদায় (Advance):</span>
                        <span className="text-xs text-emerald-700">কাউন্টারে এখন প্রাপ্ত নগদ টাকা</span>
                      </div>
                      <div className="w-40">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                          <input
                            type="number"
                            min="0"
                            max={bookingTotalFare}
                            value={advanceInput}
                            onChange={e => setAdvanceInput(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 font-mono font-bold text-right text-emerald-800 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-slate-100 bg-red-50/70 p-2.5 rounded-lg">
                      <span className="font-bold text-red-900">অবশিষ্ট বাকি টাকা (Due):</span>
                      <span className="font-mono font-bold text-lg text-red-600">{formatTaka(bookingDueAmount)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">পেমেন্ট মাধ্যম</label>
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="নগদ">নগদ (Cash)</option>
                        <option value="বিকাশ">বিকাশ (bKash)</option>
                        <option value="নগদ (Nagad)">নগদ (Nagad)</option>
                        <option value="রকেট">রকেট (Rocket)</option>
                        <option value="ব্যাংক">ব্যাংক ট্রান্সফার</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">পেমেন্ট নোট / রেফারেন্স</label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={e => setPaymentNote(e.target.value)}
                        placeholder="যেমন: রশিদ নং বা TrxID"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={selectedSeats.length === 0}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2 mt-4"
                  >
                    <Check className="w-5 h-5" />
                    <span>বুকিং নিশ্চিত করুন ও টিকিট প্রিন্ট করুন</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: ALL BOOKINGS LIST & MANAGEMENT */}
        {activeTab === 'bookings' && (
          <BookingsView
            bookings={bookings}
            trips={trips}
            buses={buses}
            routes={routes}
            users={users}
            currentUser={currentUser}
            todayStr={todayStr}
            companyName={settings.companyName}
            companyPhone={settings.companyPhone}
            onOpenDueCollect={(b) => {
              setDueCollectModalBooking(b);
              setDuePaymentAmount(String(b.dueAmount));
            }}
            onOpenTicketPrint={(b) => {
              setSelectedBookingForTicket(b);
              setActiveTab('ticket-print');
            }}
            onUpdateBookings={(updated) => setBookings(updated)}
            showNotification={showNotification}
          />
        )}

        {/* VIEW 3: PASSENGER MANIFEST & WAYBILL (যাত্রী তালিকা ও ট্রিপ মেনিফেস্ট) */}
        {activeTab === 'manifest' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <span>যাত্রী তালিকা ও ট্রিপ ওয়েবিল (Passenger Waybill / Manifest)</span>
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  চালক ও সুপারভাইজারের স্বাক্ষর কপি, সিট অনুযায়ী যাত্রী ও বাসের বাকি টাকা আদায় বিবরণী
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={manifestTripId}
                  onChange={e => setManifestTripId(Number(e.target.value))}
                  className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800"
                >
                  {trips.map(tp => {
                    const b = buses.find(x => x.id === tp.busId);
                    const r = routes.find(x => x.id === tp.routeId);
                    return (
                      <option key={tp.id} value={tp.id}>
                        {b?.name} | {r?.origin} → {r?.destination} | {formatBnDate(tp.journeyDate)} ({formatBnTime(tp.departureTime)})
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={handleExportManifestCsv}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>ওয়েবিল প্রিন্ট</span>
                </button>
              </div>
            </div>

            {/* Printable Manifest Sheet */}
            <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm space-y-5 print:border-none print:shadow-none print:p-0">
              {/* Manifest Header */}
              <div className="text-center border-b border-slate-300 pb-4">
                <h2 className="text-2xl font-bold text-emerald-700">{settings.companyName}</h2>
                <h3 className="text-base font-bold text-slate-800 mt-1">যাত্রী তালিকা ও ট্রিপ ওয়েবিল (Passenger Manifest)</h3>
                <div className="text-xs text-slate-500 mt-0.5">হেল্পলাইন: {settings.companyPhone} · প্রধান কার্যালয়, ঢাকা</div>
              </div>

              {/* Trip & Crew Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">বাস ও লাইসেন্স:</span>
                  <strong className="text-sm text-slate-900">{manifestBus.name}</strong>
                  <div className="font-mono text-slate-600 font-semibold">{manifestBus.busNumber} ({manifestBus.busType})</div>
                </div>
                <div>
                  <span className="text-slate-400 block">রুট ও সময়:</span>
                  <strong className="text-sm text-emerald-800">{manifestRoute.origin} হতে {manifestRoute.destination}</strong>
                  <div className="text-slate-700">{formatBnDate(currentManifestTrip.journeyDate)}, {formatBnTime(currentManifestTrip.departureTime)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block">ড্রাইভার ও সুপারভাইজার:</span>
                  <div>চালক: <strong>{currentManifestTrip.driverName || 'মোশাররফ হোসেন'}</strong> ({currentManifestTrip.driverPhone || '01712-112233'})</div>
                  <div>সুপারভাইজার: <strong>{currentManifestTrip.supervisorName || 'মোঃ আলমগীর'}</strong> ({currentManifestTrip.supervisorPhone || '01819-445566'})</div>
                </div>
              </div>

              {/* Manifest Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-900 text-white font-medium">
                    <tr>
                      <th className="py-2.5 px-3 border border-slate-700 w-16 text-center">আসন</th>
                      <th className="py-2.5 px-3 border border-slate-700">যাত্রীর নাম</th>
                      <th className="py-2.5 px-3 border border-slate-700 font-mono">মোবাইল নম্বর</th>
                      <th className="py-2.5 px-3 border border-slate-700">বোর্ডিং পয়েন্ট</th>
                      <th className="py-2.5 px-3 border border-slate-700">ড্রপিং পয়েন্ট</th>
                      <th className="py-2.5 px-3 border border-slate-700 font-mono">বুকিং আইডি</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-right">বাসে আদায়যোগ্য বাকি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Render all 40 seats in sequence */}
                    {['A1','A2','A3','A4','B1','B2','B3','B4','C1','C2','C3','C4','D1','D2','D3','D4','E1','E2','E3','E4','F1','F2','F3','F4','G1','G2','G3','G4','H1','H2','H3','H4','I1','I2','I3','I4','J1','J2','J3','J4'].map(seatCode => {
                      const passenger = manifestPassengers.find(p => p.seat === seatCode);

                      return (
                        <tr key={seatCode} className={passenger ? 'hover:bg-slate-50' : 'bg-slate-50/40 text-slate-400'}>
                          <td className="py-2 px-3 border border-slate-200 text-center font-mono font-bold text-slate-800">
                            {seatCode}
                          </td>
                          <td className="py-2 px-3 border border-slate-200">
                            {passenger ? (
                              <strong className="text-slate-900">{passenger.name}</strong>
                            ) : (
                              <span className="italic text-slate-400">-- খালি আসন (Vacant) --</span>
                            )}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 font-mono">
                            {passenger?.phone || '-'}
                          </td>
                          <td className="py-2 px-3 border border-slate-200">
                            {passenger?.boarding || '-'}
                          </td>
                          <td className="py-2 px-3 border border-slate-200">
                            {passenger?.dropping || '-'}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 font-mono text-[11px]">
                            {passenger?.bookingRef || '-'}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono">
                            {passenger ? (
                              passenger.due > 0 ? (
                                <span className="font-bold text-red-600">{formatTaka(passenger.due)}</span>
                              ) : (
                                <span className="text-emerald-700">পরিশোধিত</span>
                              )
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Manifest Totals */}
              <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500 block">মোট সিট সংখ্যা</span>
                  <strong className="text-base">{en2bn(manifestBus.totalSeats)}টি</strong>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                  <span className="block text-emerald-700">মোট বুকড আসন</span>
                  <strong className="text-base font-bold">{en2bn(manifestPassengers.length)}টি</strong>
                </div>
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-900">
                  <span className="block text-red-700">বাসে আদায়যোগ্য মোট বাকি</span>
                  <strong className="text-base font-mono font-bold">
                    {formatTaka(manifestPassengers.reduce((s, p) => s + p.due, 0))}
                  </strong>
                </div>
              </div>

              {/* Signatures Area */}
              <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs">
                <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800">
                  কাউন্টার মাস্টারের স্বাক্ষর
                </div>
                <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800">
                  সুপারভাইজারের স্বাক্ষর
                </div>
                <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800">
                  চালকের (Driver) স্বাক্ষর
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: TRIP EXPENSES & NET PROFIT (ট্রিপ খরচ ও নিট আয়) */}
        {activeTab === 'expenses' && isAdmin && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-amber-600" />
                  <span>ট্রিপ খরচ ও নিট লাভ-লোকসান হিসাব (Trip Expenses & Net Profit)</span>
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  ডিজেল, টোল, চালক-হেলপার খোরাকি ইত্যাদি খরচ এন্ট্রি এবং ট্রিপের নিট লাভ বিশ্লেষণ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={expenseTripId}
                  onChange={e => setExpenseTripId(Number(e.target.value))}
                  className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800"
                >
                  {trips.map(tp => {
                    const b = buses.find(x => x.id === tp.busId);
                    const r = routes.find(x => x.id === tp.routeId);
                    return (
                      <option key={tp.id} value={tp.id}>
                        {b?.name} | {r?.origin} → {r?.destination} | {formatBnDate(tp.journeyDate)}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Profit Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 text-xs font-medium">টিকিট বিক্রি হতে মোট আয় (Revenue)</span>
                <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                  {formatTaka(tripTotalRevenue)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">যাত্রীদের মোট ভাড়া বাবদ</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 text-xs font-medium">মোট ট্রিপ খরচ (Expenses)</span>
                <div className="text-2xl font-bold font-mono text-red-600 mt-1">
                  {formatTaka(tripTotalExpense)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">জ্বালানি, টোল ও কর্মচারীদের ভাতা</div>
              </div>

              <div className={`p-5 rounded-xl border shadow-sm ${tripNetProfit >= 0 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-red-600 text-white border-red-700'}`}>
                <span className="text-xs text-white/80 font-medium">ট্রিপের নিট লাভ (Net Profit)</span>
                <div className="text-3xl font-bold font-mono mt-1">
                  {formatTaka(tripNetProfit)}
                </div>
                <div className="text-[11px] text-white/80 mt-0.5">মোট আয় মাইনাস মোট খরচ</div>
              </div>
            </div>

            {/* Expense Form & Voucher Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Expense Entry Form */}
              <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>নতুন খরচ ভাউচার এন্ট্রি</span>
                </h3>

                <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">খরচের খাত (Category)</label>
                    <select
                      value={expenseCategory}
                      onChange={e => setExpenseCategory(e.target.value as any)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="ডিজেল / জ্বালানি">ডিজেল / জ্বালানি</option>
                      <option value="টোল ও ফেরি">টোল ও ফেরি</option>
                      <option value="ড্রাইভার ও হেলপার ভাতা">ড্রাইভার ও হেলপার ভাতা</option>
                      <option value="রোড ও পুলিশ খরচ">রোড ও পুলিশ খরচ</option>
                      <option value="অন্যান্য">অন্যান্য</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      খরচের পরিমাণ (টাকা) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={expenseAmount}
                      onChange={e => setExpenseAmount(e.target.value)}
                      placeholder="টাকার পরিমাণ"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-red-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">বিবরণ / নোট</label>
                    <input
                      type="text"
                      value={expenseNote}
                      onChange={e => setExpenseNote(e.target.value)}
                      placeholder="যেমন: যমুনা সেতু টোল প্লাজা"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-sm transition-colors mt-2"
                  >
                    খরচ সংরক্ষণ করুন
                  </button>
                </form>
              </div>

              {/* Expenses List */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
                  <span>ট্রিপ #{currentExpenseTrip.id} খরচের ভাউচারসমূহ ({currentExpenseBus.name})</span>
                  <span className="font-mono text-emerald-400">{en2bn(tripExpensesList.length)}টি ভাউচার</span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">তারিখ</th>
                        <th className="py-2.5 px-4">খাত</th>
                        <th className="py-2.5 px-4">বিবরণ</th>
                        <th className="py-2.5 px-4 text-right">পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tripExpensesList.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4 text-slate-500">{formatBnDate(exp.expenseDate)}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{exp.expenseCategory}</td>
                          <td className="py-2.5 px-4 text-slate-600">{exp.note || '-'}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-red-600">
                            {formatTaka(exp.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: DAILY CLOSING & COUNTER HANDOVER */}
        {activeTab === 'daily-closing' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <span>ডেইলি ক্লোজিং ও ক্যাশ হ্যান্ডওভার (Daily Closing & Handover)</span>
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  প্রতিদিনের অপারেটরভিত্তিক মোট আদায় ও প্রধান কার্যালয়ে ক্যাশ সমর্পণ রিপোর্ট
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 no-print"
                >
                  <Printer className="w-4 h-4" />
                  <span>রিপোর্ট প্রিন্ট করুন</span>
                </button>
              </div>
            </div>

            {/* Daily Grand Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-600 text-white p-5 rounded-xl shadow-sm">
                <span className="text-emerald-100 text-xs">আজকের সর্বমোট আদায় (Grand Total)</span>
                <div className="text-3xl font-bold font-mono mt-1">{formatTaka(todayCollection)}</div>
                <div className="text-xs text-emerald-100 mt-1">সব অপারেটর ও কাউন্টারের মোট প্রাপ্তি</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 text-xs">আজকের মোট টিকিট বিক্রি</span>
                <div className="text-3xl font-bold font-mono text-slate-900 mt-1">{en2bn(todayBookings.length)}টি</div>
                <div className="text-xs text-slate-400 mt-1">মোট যাত্রী: {en2bn(todayPassengers)} জন</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 text-xs">আজকের বকেয়া বা বাকি টাকা</span>
                <div className="text-3xl font-bold font-mono text-red-600 mt-1">{formatTaka(todayDue)}</div>
                <div className="text-xs text-slate-400 mt-1">যাত্রীদের নিকট আদায়যোগ্য</div>
              </div>
            </div>

            {/* Operator-wise Daily Closing Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
                <span>অপারেটর অনুযায়ী দৈনিক আদায় (User-wise Daily Closing)</span>
                <span className="text-xs font-mono text-emerald-400">তারিখ: {formatBnDate(todayStr)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">অপারেটর ও কাউন্টার</th>
                      <th className="py-3 px-4 text-center">বুকিং সংখ্যা</th>
                      <th className="py-3 px-4 text-center">যাত্রী সংখ্যা</th>
                      <th className="py-3 px-4 text-right">অগ্রিম সংগ্রহ</th>
                      <th className="py-3 px-4 text-right">বাকি আদায়</th>
                      <th className="py-3 px-4 text-right font-bold text-emerald-700 bg-emerald-50">সর্বমোট আদায়</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.filter(u => u.role !== 'admin').map(user => {
                      const userBks = bookings.filter(b => b.userId === user.id && b.createdAt.startsWith(todayStr) && b.bookingStatus !== 'cancelled');
                      const userPassengers = userBks.reduce((sum, b) => sum + b.totalSeats, 0);
                      const userAdvance = userBks.reduce((sum, b) => sum + b.advancePaid, 0);
                      const userDueColl = payments
                        .filter(p => p.userId === user.id && p.paymentType === 'due_collection' && p.paymentDate.startsWith(todayStr))
                        .reduce((sum, p) => sum + p.amount, 0);
                      const userTotal = userAdvance + userDueColl;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{user.name}</div>
                            <span className="text-[11px] text-slate-500">{user.counterName} · {user.phone}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">{en2bn(userBks.length)}টি</td>
                          <td className="py-3 px-4 text-center font-mono">{en2bn(userPassengers)} জন</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-800">{formatTaka(userAdvance)}</td>
                          <td className="py-3 px-4 text-right font-mono text-sky-600">{formatTaka(userDueColl)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50 text-sm">
                            {formatTaka(userTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Counter Cash Handover Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>কাউন্টার ক্যাশ হ্যান্ডওভার ফরম (Cash Handover)</span>
                </h3>

                <form onSubmit={handleAddHandover} className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">হ্যান্ডওভারকারী:</span>
                    <strong className="text-sm text-slate-800">{currentUser.name} ({currentUser.counterName})</strong>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      হ্যান্ডওভার / জমা টাকার পরিমাণ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={handoverAmountInput}
                      onChange={e => setHandoverAmountInput(e.target.value)}
                      placeholder="টাকার পরিমাণ লিখুন"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">জমার মাধ্যম</label>
                    <select
                      value={handoverMethod}
                      onChange={e => setHandoverMethod(e.target.value as any)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    >
                      <option value="নগদ প্রধান কার্যালয় জমা">নগদ প্রধান কার্যালয় জমা</option>
                      <option value="ব্যাংক ডিপোজিট">ব্যাংক ডিপোজিট</option>
                      <option value="বিকাশ/অনলাইন ট্রান্সফার">বিকাশ/অনলাইন ট্রান্সফার</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">রেফারেন্স / ব্যাংক স্লিপ নম্বর</label>
                    <input
                      type="text"
                      value={handoverRef}
                      onChange={e => setHandoverRef(e.target.value)}
                      placeholder="যেমন: DEP-99882 বা ভাউচার নম্বর"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm transition-colors mt-2"
                  >
                    হ্যান্ডওভার ভাউচার সাবমিট করুন
                  </button>
                </form>
              </div>

              {/* Handover List */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
                  <span>কাউন্টার ক্যাশ সমর্পণ হিস্ট্রি</span>
                  <span className="font-mono text-emerald-400">{en2bn(handovers.length)}টি রেকর্ড</span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">তারিখ</th>
                        <th className="py-2.5 px-3">কাউন্টার</th>
                        <th className="py-2.5 px-3">মাধ্যম ও রেফারেন্স</th>
                        <th className="py-2.5 px-3 text-right">জমা টাকা</th>
                        <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {handovers.map(h => (
                        <tr key={h.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-slate-500">{formatBnDate(h.date)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{h.counterName}</td>
                          <td className="py-2.5 px-3">
                            <div>{h.handoverMethod}</div>
                            <span className="text-[11px] font-mono text-slate-400">{h.referenceNo}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatTaka(h.netHandover)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                              অনুমোদিত
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: TRIP SCHEDULING & ROSTER */}
        {activeTab === 'trips' && (
          <TripsView
            trips={trips}
            buses={buses}
            routes={routes}
            bookings={bookings}
            isAdmin={isAdmin}
            onUpdateTrips={(updated) => setTrips(updated)}
            onSelectTripForBooking={(id) => {
              setBookingTripId(id);
              setActiveTab('new-booking');
            }}
            onSelectTripForManifest={(id) => {
              setManifestTripId(id);
              setActiveTab('manifest');
            }}
            showNotification={showNotification}
          />
        )}

        {/* VIEW: BUSES & FLEET MANAGEMENT */}
        {activeTab === 'buses' && (
          <BusesView
            buses={buses}
            routes={routes}
            isAdmin={isAdmin}
            onUpdateBuses={(updated) => setBuses(updated)}
            showNotification={showNotification}
          />
        )}

        {/* VIEW: ROUTES MANAGEMENT */}
        {activeTab === 'routes' && (
          <RoutesView
            routes={routes}
            isAdmin={isAdmin}
            onUpdateRoutes={(updated) => setRoutes(updated)}
            showNotification={showNotification}
          />
        )}

        {/* VIEW: ADVANCED REPORTS & ANALYTICS */}
        {activeTab === 'reports' && isAdmin && (
          <ReportsView
            bookings={bookings}
            trips={trips}
            buses={buses}
            routes={routes}
            users={users}
            payments={payments}
            expenses={expenses}
            todayStr={todayStr}
            companyName={settings.companyName}
            showNotification={showNotification}
          />
        )}

        {/* VIEW: STAFF & OPERATOR MANAGEMENT */}
        {activeTab === 'staff' && isAdmin && (
          <StaffView
            users={users}
            buses={buses}
            assignments={assignments}
            isAdmin={isAdmin}
            onUpdateUsers={(updated) => setUsers(updated)}
            onUpdateAssignments={(updated) => setAssignments(updated)}
            showNotification={showNotification}
          />
        )}

        {/* VIEW: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            isAdmin={isAdmin}
            onUpdateSettings={(updated) => setSettings(updated)}
            showNotification={showNotification}
          />
        )}

        {/* VIEW 6: PRINTABLE TICKET & SMS SHARE (SECTION 19) */}
        {activeTab === 'ticket-print' && selectedBookingForTicket && (
          <div className="space-y-4">
            {/* Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsThermalTicket(!isThermalTicket)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    isThermalTicket ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isThermalTicket ? '✓ থার্মাল POS স্লিপ মোড' : 'রেগুলার A4 মোড'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const trip = trips.find(t => t.id === selectedBookingForTicket.tripId);
                    const bus = buses.find(b => b.id === trip?.busId);
                    const route = routes.find(r => r.id === trip?.routeId);
                    const smsText = generateSmsTicketText(selectedBookingForTicket, trip, bus, route, settings.companyName, settings.companyPhone);
                    navigator.clipboard.writeText(smsText);
                    setCopiedSms(true);
                    setTimeout(() => setCopiedSms(false), 2500);
                  }}
                  className="bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-sky-600" />
                  <span>{copiedSms ? 'এসএমএস কপি হয়েছে!' : 'এসএমএস টেক্সট কপি'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    (() => {
                      const trip = trips.find(t => t.id === selectedBookingForTicket.tripId);
                      const bus = buses.find(b => b.id === trip?.busId);
                      const route = routes.find(r => r.id === trip?.routeId);
                      return generateSmsTicketText(selectedBookingForTicket, trip, bus, route, settings.companyName, settings.companyPhone);
                    })()
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>হোয়াটসঅ্যাপে পাঠান</span>
                </a>

                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>টিকিট প্রিন্ট করুন</span>
                </button>

                <button
                  onClick={() => setActiveTab('bookings')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg"
                >
                  বুকিং তালিকা
                </button>
              </div>
            </div>

            {/* The Ticket Box */}
            <div className="flex justify-center">
              {!isThermalTicket ? (
                /* Standard A4 View */
                <div className="ticket-print-box max-w-2xl w-full bg-white border border-slate-300 rounded-xl p-6 shadow-sm space-y-4 print:border-black print:rounded-none">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-dashed border-slate-300 pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
                        <Bus className="w-6 h-6 text-emerald-600" />
                        <span>{settings.companyName}</span>
                      </h2>
                      <div className="text-xs text-slate-500">{settings.companyTagline}</div>
                      <div className="text-xs text-slate-600 mt-1">হেল্পলাইন: {settings.companyPhone}</div>
                    </div>
                    <div className="text-right">
                      <div className="bg-slate-900 text-white font-mono text-sm px-3 py-1 rounded font-bold inline-block">
                        {selectedBookingForTicket.bookingReference}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        ইস্যু: {formatBnDate(selectedBookingForTicket.createdAt, true)}
                      </div>
                    </div>
                  </div>

                  {/* Passenger & Bus Info */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">যাত্রীর বিবরণ:</span>
                      <strong className="text-sm text-slate-900 block mt-0.5">{selectedBookingForTicket.customerName}</strong>
                      <span className="font-mono text-slate-700 font-semibold">{selectedBookingForTicket.customerPhone}</span>
                      {selectedBookingForTicket.customerNid && (
                        <div className="text-slate-500 text-[11px] mt-0.5">NID: {selectedBookingForTicket.customerNid}</div>
                      )}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {(() => {
                        const trip = trips.find(t => t.id === selectedBookingForTicket.tripId);
                        const bus = buses.find(b => b.id === trip?.busId);
                        const route = routes.find(r => r.id === trip?.routeId);
                        return (
                          <>
                            <span className="text-slate-400 block text-[11px]">বাস ও ভ্রমণ:</span>
                            <strong className="text-sm text-slate-900 block mt-0.5">{bus?.name} ({bus?.busNumber})</strong>
                            <span className="text-emerald-700 font-bold block">{route?.origin} → {route?.destination}</span>
                            <span className="text-slate-500 text-[11px]">
                              যাত্রার সময়: {formatBnDate(trip?.journeyDate || '')}, {formatBnTime(trip?.departureTime || '')}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Seat and Fare breakdown */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">সংরক্ষিত আসন:</span>
                      <span className="font-mono text-sm font-bold bg-emerald-100 text-emerald-900 px-3 py-0.5 rounded">
                        {selectedBookingForTicket.selectedSeats.join(', ')} ({en2bn(selectedBookingForTicket.totalSeats)}টি)
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-2 space-y-1">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-500">মোট ভাড়া:</span>
                        <span className="font-mono">{formatTaka(selectedBookingForTicket.totalFare)}</span>
                      </div>
                      {selectedBookingForTicket.discountAmount ? (
                        <div className="flex justify-between font-medium text-amber-700">
                          <span>প্রদত্ত বিশেষ ছাড় (Discount):</span>
                          <span className="font-mono">-{formatTaka(selectedBookingForTicket.discountAmount)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between font-medium text-emerald-700">
                        <span>অগ্রিম জমা:</span>
                        <span className="font-mono">{formatTaka(selectedBookingForTicket.advancePaid)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-red-600 pt-1 border-t border-slate-100">
                        <span>বাকি টাকা (Due):</span>
                        <span className="font-mono">{formatTaka(selectedBookingForTicket.dueAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Terms & QR */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="max-w-[75%] space-y-1 leading-tight">
                      <p>{settings.ticketTerms}</p>
                      <div className="text-emerald-700 font-bold text-xs pt-1">{settings.ticketFooterNote}</div>
                    </div>
                    <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center text-slate-600">
                      <QrCode className="w-8 h-8" />
                      <span className="text-[8px] font-mono mt-0.5">VERIFIED</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Thermal 80mm Receipt View */
                <div className="w-[80mm] bg-white border border-dashed border-slate-400 p-4 font-mono text-xs space-y-2 text-slate-900 print:border-none print:w-full">
                  <div className="text-center pb-2 border-b border-dashed border-slate-400">
                    <div className="font-bold text-sm">{settings.companyName}</div>
                    <div className="text-[10px] text-slate-600">{settings.companyPhone}</div>
                    <div className="font-bold mt-1 text-[11px]">টিকিট: {selectedBookingForTicket.bookingReference}</div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div>যাত্রী: {selectedBookingForTicket.customerName}</div>
                    <div>ফোন: {selectedBookingForTicket.customerPhone}</div>
                    {(() => {
                      const trip = trips.find(t => t.id === selectedBookingForTicket.tripId);
                      const bus = buses.find(b => b.id === trip?.busId);
                      const route = routes.find(r => r.id === trip?.routeId);
                      return (
                        <>
                          <div>বাস: {bus?.name}</div>
                          <div>রুট: {route?.origin} → {route?.destination}</div>
                          <div>তারিখ: {formatBnDate(trip?.journeyDate || '')} ({formatBnTime(trip?.departureTime || '')})</div>
                        </>
                      );
                    })()}
                    <div className="font-bold pt-1 border-t border-dashed border-slate-300">
                      আসন: {selectedBookingForTicket.selectedSeats.join(', ')}
                    </div>
                    <div className="flex justify-between pt-1">
                      <span>মোট ভাড়া:</span>
                      <span>{formatTaka(selectedBookingForTicket.totalFare)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>অগ্রিম জমা:</span>
                      <span>{formatTaka(selectedBookingForTicket.advancePaid)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-600 text-xs">
                      <span>বাকি টাকা:</span>
                      <span>{formatTaka(selectedBookingForTicket.dueAmount)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-400 pt-2 text-center text-[10px] text-slate-500">
                    {settings.ticketFooterNote}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 7: PHP SOURCE CODE VIEWER & 1-CLICK ZIP DOWNLOADER */}
        {activeTab === 'php-source' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Namecheap Shared Hosting / cPanel প্রস্তুত প্যাকেজ</span>
                </div>
                <h1 className="text-2xl font-bold">
                  সম্পূর্ণ PHP 8+ ও MySQL সোর্স কোড এক্সপ্লোরার
                </h1>
                <p className="text-slate-300 text-xs mt-1 max-w-2xl">
                  কোনো Node.js বা Composer ছাড়াই সরাসরি Namecheap Starter/Shared Hosting-এর <code>public_html</code>-এ আপলোড করে চালানোর উপযোগী সম্পূর্ণ প্রজেক্ট। এতে ডেটাবেস স্কিমা, সিট লেআউট, ট্রিপ খরচ ও যাত্রী তালিকা মেনিফেস্ট অন্তর্ভুক্ত রয়েছে।
                </p>
              </div>
              <button
                onClick={downloadPhpProjectZip}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm transition-all transform hover:scale-[1.02] shrink-0"
              >
                <Download className="w-5 h-5" />
                <span>সম্পূর্ণ প্রজেক্ট ZIP ডাউনলোড করুন</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* File Selector */}
              <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>প্রজেক্ট ফাইল তালিকা ({en2bn(PHP_PROJECT_FILES.length)}টি ফাইল)</span>
                </h3>

                <div className="space-y-1">
                  {PHP_PROJECT_FILES.map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedSourcePath(file.path)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                        selectedSourcePath === file.path
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{file.path}</span>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                        selectedSourcePath === file.path ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {file.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Viewer */}
              <div className="lg:col-span-8 bg-slate-950 text-slate-100 rounded-xl shadow-md border border-slate-800 overflow-hidden flex flex-col">
                <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-emerald-400 font-bold">{currentSourceFile.path}</span>
                    <span className="text-slate-400 block text-[11px] mt-0.5">{currentSourceFile.description}</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs transition-colors"
                  >
                    {copyStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copyStatus ? 'কপি হয়েছে' : 'কোড কপি করুন'}</span>
                  </button>
                </div>

                <div className="p-4 overflow-x-auto font-mono text-xs leading-relaxed max-h-[500px]">
                  <pre className="text-emerald-300">
                    <code>{currentSourceFile.content}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Module: Parcel & Luggage Booking */}
        {activeTab === 'parcels' && (
          <ParcelView
            parcels={parcels}
            trips={trips}
            buses={buses}
            routes={routes}
            onAddParcel={handleAddParcel}
            onUpdateStatus={handleUpdateParcelStatus}
            companyName={settings.companyName}
            companyPhone={settings.companyPhone}
          />
        )}

        {/* Module: Passenger Complaints & Lost and Found */}
        {activeTab === 'complaints' && (
          <ComplaintsView
            complaints={complaints}
            trips={trips}
            buses={buses}
            onAddComplaint={handleAddComplaint}
            onResolveComplaint={handleResolveComplaint}
          />
        )}

        {/* Module: SMS and WhatsApp Quick Messaging */}
        {activeTab === 'sms-templates' && (
          <SmsTemplateModal
            bookings={bookings}
            parcels={parcels}
            trips={trips}
            buses={buses}
            routes={routes}
            companyName={settings.companyName}
            helpline={settings.companyPhone}
          />
        )}

      </main>

      {/* Due Collection Modal */}
      {dueCollectModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>বাকি টাকা গ্রহণ করুন (Due Collection)</span>
              </h3>
              <button onClick={() => setDueCollectModalBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <div>বুকিং আইডি: <strong className="font-mono text-emerald-700">{dueCollectModalBooking.bookingReference}</strong></div>
              <div>যাত্রী: <strong>{dueCollectModalBooking.customerName}</strong> ({dueCollectModalBooking.customerPhone})</div>
              <div>মোট ভাড়া: <span className="font-mono">{formatTaka(dueCollectModalBooking.totalFare)}</span></div>
              <div>পূর্বে পরিশোধিত: <span className="font-mono text-emerald-600">{formatTaka(dueCollectModalBooking.advancePaid)}</span></div>
              <div className="text-red-600 font-bold pt-1 border-t border-slate-200">
                বর্তমান বাকি টাকা: <span className="font-mono text-sm">{formatTaka(dueCollectModalBooking.dueAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleDueCollectionSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  আদায়ের পরিমাণ (টাকা) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={dueCollectModalBooking.dueAmount}
                  required
                  value={duePaymentAmount}
                  onChange={e => setDuePaymentAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-emerald-700 text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={duePaymentMethod}
                  onChange={e => setDuePaymentMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                >
                  <option value="নগদ">নগদ (Cash)</option>
                  <option value="বিকাশ">বিকাশ (bKash)</option>
                  <option value="নগদ (Nagad)">নগদ (Nagad)</option>
                  <option value="রকেট">রকেট (Rocket)</option>
                  <option value="ব্যাংক">ব্যাংক ট্রান্সফার</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={duePaymentNote}
                  onChange={e => setDuePaymentNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                >
                  টাকা গ্রহণ নিশ্চিত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setDueCollectModalBooking(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            &copy; {en2bn(2026)} <strong>{settings.companyName}</strong> - বাংলা বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
          </div>
          <div className="flex items-center gap-3">
            <span>হেল্পলাইন: {settings.companyPhone}</span>
            <span>·</span>
            <span className="text-emerald-600 font-medium">নিরাপদ ও নির্ভরযোগ্য সিস্টেম</span>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
