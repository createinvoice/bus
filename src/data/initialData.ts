export interface ParcelBooking {
  id: number;
  trackingNumber: string;
  tripId: number;
  senderName: string;
  senderPhone: string;
  senderCounter: string;
  receiverName: string;
  receiverPhone: string;
  receiverCounter: string;
  itemDescription: string;
  weightKg: number;
  itemCategory: 'কাগজপত্র/ডকুমেন্ট' | 'পোশাক ও কাপড়' | 'ইলেকট্রনিক্স' | 'ফলমূল ও খাদ্যদ্রব্য' | 'সাধারণ কার্টুন';
  fare: number;
  paymentStatus: 'paid' | 'due';
  deliveryStatus: 'booked' | 'in_transit' | 'ready_for_pickup' | 'delivered';
  createdAt: string;
}

export interface CustomerComplaint {
  id: number;
  ticketReference?: string;
  customerName: string;
  customerPhone: string;
  tripId?: number;
  category: 'হারানো জিনিস' | 'এসি সমস্যা' | 'গাড়ির বিলম্ব' | 'স্টাফের দুর্ব্যবহার' | 'অন্যান্য';
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved';
  resolutionNote?: string;
  createdAt: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  phone: string;
  email?: string;
  counterName: string;
  role: 'admin' | 'operator' | 'staff';
  status: 'active' | 'inactive';
}

export interface Bus {
  id: number;
  name: string;
  busNumber: string;
  companyName: string;
  busType: 'AC' | 'Non-AC' | 'Deluxe' | 'Sleeper';
  totalSeats: number;
  defaultRouteId?: number;
  status: 'active' | 'inactive';
}

export interface Route {
  id: number;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedTime: string;
  status: 'active' | 'inactive';
}

export interface Trip {
  id: number;
  busId: number;
  routeId: number;
  journeyDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  arrivalTime: string;
  boardingPoint: string;
  droppingPoint: string;
  seatFare: number;
  driverName?: string;
  driverPhone?: string;
  supervisorName?: string;
  supervisorPhone?: string;
  status: 'scheduled' | 'departed' | 'completed' | 'cancelled';
}

export interface UserBusAssignment {
  id: number;
  userId: number;
  busId: number;
  tripId?: number; // optional specific trip
}

export interface PassengerDetail {
  seatNumber: string;
  name: string;
  phone?: string;
  gender?: string;
}

export interface Booking {
  id: number;
  bookingReference: string;
  tripId: number;
  userId: number;
  customerName: string;
  customerPhone: string;
  customerNid?: string;
  customerAddress?: string;
  totalSeats: number;
  selectedSeats: string[];
  totalFare: number;
  discountAmount?: number;
  advancePaid: number;
  dueAmount: number;
  bookingStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  cancellationReason?: string;
  passengers: PassengerDetail[];
  createdAt: string;
}

export interface TripExpense {
  id: number;
  tripId: number;
  expenseCategory: 'ডিজেল / জ্বালানি' | 'টোল ও ফেরি' | 'ড্রাইভার ও হেলপার ভাতা' | 'রোড ও পুলিশ খরচ' | 'অন্যান্য';
  amount: number;
  note?: string;
  expenseDate: string;
}

export interface CounterHandover {
  id: number;
  userId: number;
  counterName: string;
  date: string;
  totalCollected: number;
  expenseDeducted: number;
  netHandover: number;
  handoverMethod: 'নগদ প্রধান কার্যালয় জমা' | 'ব্যাংক ডিপোজিট' | 'বিকাশ/অনলাইন ট্রান্সফার';
  referenceNo?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
}

export interface PaymentTransaction {
  id: number;
  bookingId: number;
  userId: number;
  amount: number;
  paymentType: 'advance' | 'due_collection' | 'full_payment';
  paymentMethod: string;
  transactionReference?: string;
  note?: string;
  paymentDate: string;
}

export interface SystemSettings {
  companyName: string;
  companyTagline: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  currencySymbol: string;
  ticketTerms: string;
  ticketFooterNote: string;
}

export function en2bn(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, d => bnDigits[Number(d)]);
}

export function formatTaka(amount: number): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return '৳ ' + en2bn(formatted);
}

export function formatBnDate(dateStr: string, withTime = false): string {
  if (!dateStr) return '-';
  const months: Record<string, string> = {
    '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ',
    '04': 'এপ্রিল', '05': 'মে', '06': 'জুন',
    '07': 'জুলাই', '08': 'আগস্ট', '09': 'সেপ্টেম্বর',
    '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
  };

  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) return dateStr;

  const y = en2bn(parts[0]);
  const m = months[parts[1]] || parts[1];
  const d = en2bn(parseInt(parts[2], 10));

  let res = `${d} ${m} ${y}`;
  if (withTime && dateStr.includes('T')) {
    const timePart = dateStr.split('T')[1].substring(0, 5);
    res += `, ${en2bn(timePart)}`;
  }
  return res;
}

export function formatBnTime(timeStr: string): string {
  if (!timeStr) return '-';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  let period = 'সকাল';
  if (h >= 12 && h < 16) period = 'দুপুর';
  else if (h >= 16 && h < 19) period = 'বিকাল';
  else if (h >= 19 || h < 4) period = 'রাত';
  else if (h >= 4 && h < 6) period = 'ভোর';

  const displayH = h % 12 || 12;
  return `${period} ${en2bn(displayH)}:${en2bn(mStr)} টা`;
}

export const INITIAL_SETTINGS: SystemSettings = {
  companyName: 'বাসগো পরিবহন লিমিটেড',
  companyTagline: 'নিরাপদ, আরামদায়ক ও নির্ভরযোগ্য ভ্রমণ',
  companyPhone: '০১৭০০-০০০০০০, ০১৮০০-০০০০০০',
  companyEmail: 'support@busgo.com.bd',
  companyAddress: 'গাবতলী বাস টার্মিনাল, ঢাকা-১২১৬, বাংলাদেশ',
  currencySymbol: '৳',
  ticketTerms: '১. যাত্রার অন্তত ৩০ মিনিট পূর্বে কাউন্টারে উপস্থিত থাকুন। ২. অগ্রিম বুকিংয়ের টিকিট পরিবর্তন যোগ্য নয়। ৩. বাকি টাকা বাসে ওঠার পূর্বে পরিশোধ করতে হবে। ৪. অননুমোদিত মাদক ও বিস্ফোরক বহন সম্পূর্ণ নিষিদ্ধ। ৫. টিকিট ছাড়া যাত্রা আইনত দণ্ডনীয়।',
  ticketFooterNote: 'ধন্যবাদ, আপনার যাত্রা শুভ ও নিরাপদ হোক।'
};

export const INITIAL_USERS: User[] = [
  {
    id: 1,
    name: 'সিস্টেম অ্যাডমিনিস্ট্রেটর',
    username: 'admin',
    phone: '01711000000',
    email: 'admin@busgo.com',
    counterName: 'হেড অফিস',
    role: 'admin',
    status: 'active',
  },
  {
    id: 2,
    name: 'মোহাম্মদ রহিম',
    username: 'operator1',
    phone: '01812345678',
    email: 'rahim@busgo.com',
    counterName: 'কল্যাণপুর কাউন্টার',
    role: 'operator',
    status: 'active',
  },
  {
    id: 3,
    name: 'করিমুল হক',
    username: 'operator2',
    phone: '01987654321',
    email: 'karim@busgo.com',
    counterName: 'গাবতলী কাউন্টার',
    role: 'operator',
    status: 'active',
  },
  {
    id: 4,
    name: 'আব্দুল কাদের',
    username: 'operator3',
    phone: '01712334455',
    email: 'kader@busgo.com',
    counterName: 'সায়দাবাদ কাউন্টার',
    role: 'staff',
    status: 'active',
  }
];

export const INITIAL_ROUTES: Route[] = [
  { id: 1, origin: 'ঢাকা', destination: 'কুষ্টিয়া', distanceKm: 210, estimatedTime: '৫ ঘণ্টা ৩০ মিনিট', status: 'active' },
  { id: 2, origin: 'ঢাকা', destination: 'চট্টগ্রাম', distanceKm: 260, estimatedTime: '৫ ঘণ্টা', status: 'active' },
  { id: 3, origin: 'ঢাকা', destination: 'রাজশাহী', distanceKm: 250, estimatedTime: '৫ ঘণ্টা', status: 'active' },
  { id: 4, origin: 'ঢাকা', destination: 'সিলেট', distanceKm: 240, estimatedTime: '৫ ঘণ্টা', status: 'active' },
];

export const INITIAL_BUSES: Bus[] = [
  { id: 1, name: 'সোনার বাংলা এক্সপ্রেস', busNumber: 'ঢাকা-মেট্রো-ব ১৫-৯৮৭৬', companyName: 'সোনার বাংলা পরিবহন', busType: 'AC', totalSeats: 40, defaultRouteId: 1, status: 'active' },
  { id: 2, name: 'শ্যামলী ডিলাক্স', busNumber: 'ঢাকা-মেট্রো-ব ১২-৩৪৫৬', companyName: 'শ্যামলী এন আর ট্রাভেলস', busType: 'Non-AC', totalSeats: 40, defaultRouteId: 2, status: 'active' },
  { id: 3, name: 'গ্রীন লাইন রয়্যাল', busNumber: 'ঢাকা-মেট্রো-ব ৯৮-৭৬৫৪', companyName: 'গ্রীন লাইন পরিবহন', busType: 'AC', totalSeats: 40, defaultRouteId: 1, status: 'active' },
  { id: 4, name: 'হানিফ এন্টারপ্রাইজ', busNumber: 'ঢাকা-মেট্রো-ব ৭৬-৫৪৩২', companyName: 'হানিফ ট্রাভেলস', busType: 'Deluxe', totalSeats: 40, defaultRouteId: 3, status: 'active' },
];

export const INITIAL_TRIPS: Trip[] = [
  {
    id: 1,
    busId: 1,
    routeId: 1,
    journeyDate: '2026-09-30',
    departureTime: '22:00',
    arrivalTime: '03:30',
    boardingPoint: 'গাবতলী / কল্যাণপুর কাউন্টার',
    droppingPoint: 'কুষ্টিয়া মজমপুর গেট',
    seatFare: 750,
    driverName: 'মোশাররফ হোসেন',
    driverPhone: '01712-112233',
    supervisorName: 'মোঃ আলমগীর',
    supervisorPhone: '01819-445566',
    status: 'scheduled'
  },
  {
    id: 2,
    busId: 2,
    routeId: 2,
    journeyDate: '2026-09-30',
    departureTime: '23:30',
    arrivalTime: '05:00',
    boardingPoint: 'সায়দাবাদ / আরামবাগ কাউন্টার',
    droppingPoint: 'চট্টগ্রাম একে খান / দামপাড়া',
    seatFare: 850,
    driverName: 'শাহজাহান মিয়া',
    driverPhone: '01911-778899',
    supervisorName: 'খলিলুর রহমান',
    supervisorPhone: '01611-332211',
    status: 'scheduled'
  },
  {
    id: 3,
    busId: 3,
    routeId: 1,
    journeyDate: '2026-10-01',
    departureTime: '08:30',
    arrivalTime: '14:00',
    boardingPoint: 'কল্যাণপুর বাস টার্মিনাল',
    droppingPoint: 'কুষ্টিয়া চৌড়হাস মোড়',
    seatFare: 750,
    driverName: 'নুরুল ইসলাম',
    driverPhone: '01733-445566',
    supervisorName: 'জাহিদুল ইসলাম',
    supervisorPhone: '01833-556677',
    status: 'scheduled'
  },
  {
    id: 4,
    busId: 4,
    routeId: 3,
    journeyDate: '2026-10-01',
    departureTime: '22:30',
    arrivalTime: '04:00',
    boardingPoint: 'গাবতলী টার্মিনাল',
    droppingPoint: 'রাজশাহী শিরোইল',
    seatFare: 800,
    driverName: 'হবিবুর রহমান',
    driverPhone: '01922-334455',
    supervisorName: 'শাহাদাত হোসেন',
    supervisorPhone: '01722-667788',
    status: 'scheduled'
  }
];

export const INITIAL_ASSIGNMENTS: UserBusAssignment[] = [
  { id: 1, userId: 2, busId: 1, tripId: 1 },
  { id: 2, userId: 2, busId: 3, tripId: 3 },
  { id: 3, userId: 3, busId: 2, tripId: 2 },
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 1,
    bookingReference: 'BUS-20260930-0001',
    tripId: 1,
    userId: 2,
    customerName: 'তানভীর আহমেদ',
    customerPhone: '01711223344',
    customerNid: '19902692512345',
    customerAddress: 'মিরপুর-১, ঢাকা',
    totalSeats: 2,
    selectedSeats: ['A1', 'A2'],
    totalFare: 1500,
    advancePaid: 1000,
    dueAmount: 500,
    bookingStatus: 'confirmed',
    paymentStatus: 'partial',
    passengers: [
      { seatNumber: 'A1', name: 'তানভীর আহমেদ', phone: '01711223344', gender: 'পুরুষ' },
      { seatNumber: 'A2', name: 'নাজমুল হুদা', phone: '01711223345', gender: 'পুরুষ' },
    ],
    createdAt: '2026-09-30T09:30:00'
  },
  {
    id: 2,
    bookingReference: 'BUS-20260930-0002',
    tripId: 1,
    userId: 2,
    customerName: 'মোছাঃ সুমাইয়া আক্তার',
    customerPhone: '01822334455',
    customerNid: '',
    customerAddress: 'ধানমন্ডি, ঢাকা',
    totalSeats: 1,
    selectedSeats: ['B1'],
    totalFare: 750,
    advancePaid: 750,
    dueAmount: 0,
    bookingStatus: 'confirmed',
    paymentStatus: 'paid',
    passengers: [
      { seatNumber: 'B1', name: 'মোছাঃ সুমাইয়া আক্তার', phone: '01822334455', gender: 'মহিলা' }
    ],
    createdAt: '2026-09-30T10:15:00'
  },
  {
    id: 3,
    bookingReference: 'BUS-20260930-0003',
    tripId: 2,
    userId: 3,
    customerName: 'মোঃ কামরুল হাসান',
    customerPhone: '01933445566',
    customerNid: '19852692598765',
    customerAddress: 'উত্তরা, ঢাকা',
    totalSeats: 3,
    selectedSeats: ['A1', 'A2', 'A3'],
    totalFare: 2550,
    advancePaid: 1500,
    dueAmount: 1050,
    bookingStatus: 'confirmed',
    paymentStatus: 'partial',
    passengers: [
      { seatNumber: 'A1', name: 'মোঃ কামরুল হাসান', phone: '01933445566', gender: 'পুরুষ' },
      { seatNumber: 'A2', name: 'রাবেয়া সুলতানা', phone: '01933445567', gender: 'মহিলা' },
      { seatNumber: 'A3', name: 'হাসিব হাসান', phone: '', gender: 'পুরুষ' }
    ],
    createdAt: '2026-09-30T11:20:00'
  },
  {
    id: 4,
    bookingReference: 'BUS-20260930-0004',
    tripId: 1,
    userId: 2,
    customerName: 'প্রকৌশলী রফিকুল ইসলাম',
    customerPhone: '01715566778',
    customerNid: '19882692576543',
    customerAddress: 'মোহাম্মদপুর, ঢাকা',
    totalSeats: 2,
    selectedSeats: ['C1', 'C2'],
    totalFare: 1500,
    advancePaid: 1500,
    dueAmount: 0,
    bookingStatus: 'confirmed',
    paymentStatus: 'paid',
    passengers: [
      { seatNumber: 'C1', name: 'প্রকৌশলী রফিকুল ইসলাম', phone: '01715566778', gender: 'পুরুষ' },
      { seatNumber: 'C2', name: 'শামীমা নাসরিন', phone: '01715566779', gender: 'মহিলা' }
    ],
    createdAt: '2026-09-30T12:05:00'
  },
  {
    id: 5,
    bookingReference: 'BUS-20260930-0005',
    tripId: 2,
    userId: 3,
    customerName: 'ডাঃ আশরাফুল আলম',
    customerPhone: '01611224466',
    customerNid: '19822692511223',
    customerAddress: 'মতিঝিল, ঢাকা',
    totalSeats: 1,
    selectedSeats: ['B3'],
    totalFare: 850,
    advancePaid: 500,
    dueAmount: 350,
    bookingStatus: 'confirmed',
    paymentStatus: 'partial',
    passengers: [
      { seatNumber: 'B3', name: 'ডাঃ আশরাফুল আলম', phone: '01611224466', gender: 'পুরুষ' }
    ],
    createdAt: '2026-09-30T13:40:00'
  },
  {
    id: 6,
    bookingReference: 'BUS-20260929-0009',
    tripId: 1,
    userId: 2,
    customerName: 'মাহমুদুল হক',
    customerPhone: '01799887766',
    customerNid: '',
    customerAddress: 'মিরপুর-১০',
    totalSeats: 1,
    selectedSeats: ['D4'],
    totalFare: 750,
    advancePaid: 0,
    dueAmount: 750,
    bookingStatus: 'cancelled',
    paymentStatus: 'unpaid',
    cancellationReason: 'যাত্রী যাত্রা বাতিল করেছেন (জরুরি কাজ)',
    passengers: [
      { seatNumber: 'D4', name: 'মাহমুদুল হক', phone: '01799887766', gender: 'পুরুষ' }
    ],
    createdAt: '2026-09-29T16:10:00'
  }
];

export const INITIAL_PAYMENTS: PaymentTransaction[] = [
  {
    id: 1,
    bookingId: 1,
    userId: 2,
    amount: 1000,
    paymentType: 'advance',
    paymentMethod: 'নগদ',
    transactionReference: 'CASH-REC-01',
    note: 'বুকিংয়ের সময় কাউন্টারে নগদ অগ্রিম গ্রহণ',
    paymentDate: '2026-09-30T09:30:00'
  },
  {
    id: 2,
    bookingId: 2,
    userId: 2,
    amount: 750,
    paymentType: 'full_payment',
    paymentMethod: 'বিকাশ',
    transactionReference: 'BKASH-TRX-98762',
    note: 'বিকাশের মাধ্যমে সম্পূর্ণ পরিশোধ',
    paymentDate: '2026-09-30T10:15:00'
  },
  {
    id: 3,
    bookingId: 3,
    userId: 3,
    amount: 1500,
    paymentType: 'advance',
    paymentMethod: 'নগদ (Nagad)',
    transactionReference: 'NAGAD-98231',
    note: 'কাউন্টারে নগদ প্রদান',
    paymentDate: '2026-09-30T11:20:00'
  },
  {
    id: 4,
    bookingId: 4,
    userId: 2,
    amount: 1500,
    paymentType: 'full_payment',
    paymentMethod: 'নগদ',
    transactionReference: 'CASH-REC-04',
    note: 'কাউন্টারে সম্পূর্ণ ভাড়া পরিশোধ',
    paymentDate: '2026-09-30T12:05:00'
  },
  {
    id: 5,
    bookingId: 5,
    userId: 3,
    amount: 500,
    paymentType: 'advance',
    paymentMethod: 'বিকাশ',
    transactionReference: 'BKASH-TRX-11229',
    note: 'বিকাশে অগ্রিম জমা',
    paymentDate: '2026-09-30T13:40:00'
  }
];

export const INITIAL_EXPENSES: TripExpense[] = [
  {
    id: 1,
    tripId: 1,
    expenseCategory: 'ডিজেল / জ্বালানি',
    amount: 7500,
    note: 'যমুনা সেতু ফিলিং স্টেশন - ৮০ লিটার ডিজেল',
    expenseDate: '2026-09-30'
  },
  {
    id: 2,
    tripId: 1,
    expenseCategory: 'টোল ও ফেরি',
    amount: 1200,
    note: 'বঙ্গবন্ধু যমুনা সেতু টোল প্লাজা',
    expenseDate: '2026-09-30'
  },
  {
    id: 3,
    tripId: 1,
    expenseCategory: 'ড্রাইভার ও হেলপার ভাতা',
    amount: 1500,
    note: 'ড্রাইভার মোশাররফ ও হেলপার খোরাকি',
    expenseDate: '2026-09-30'
  },
  {
    id: 4,
    tripId: 2,
    expenseCategory: 'ডিজেল / জ্বালানি',
    amount: 8500,
    note: 'মেঘনা ফিলিং স্টেশন - ৯০ লিটার ডিজেল',
    expenseDate: '2026-09-30'
  },
  {
    id: 5,
    tripId: 2,
    expenseCategory: 'টোল ও ফেরি',
    amount: 1600,
    note: 'মেঘনা ও গোমতী সেতু এক্সপ্রেসওয়ে টোল',
    expenseDate: '2026-09-30'
  }
];

export const INITIAL_HANDOVERS: CounterHandover[] = [
  {
    id: 1,
    userId: 2,
    counterName: 'কল্যাণপুর কাউন্টার',
    date: '2026-09-29',
    totalCollected: 28500,
    expenseDeducted: 1500,
    netHandover: 27000,
    handoverMethod: 'নগদ প্রধান কার্যালয় জমা',
    referenceNo: 'REC-20260929-KL01',
    status: 'approved',
    approvedBy: 'সিস্টেম অ্যাডমিনিস্ট্রেটর'
  },
  {
    id: 2,
    userId: 3,
    counterName: 'গাবতলী কাউন্টার',
    date: '2026-09-29',
    totalCollected: 22400,
    expenseDeducted: 800,
    netHandover: 21600,
    handoverMethod: 'ব্যাংক ডিপোজিট',
    referenceNo: 'IBBL-DEP-99882',
    status: 'approved',
    approvedBy: 'সিস্টেম অ্যাডমিনিস্ট্রেটর'
  }
];

export const INITIAL_PARCELS: ParcelBooking[] = [
  {
    id: 1,
    trackingNumber: 'PRC-2026-9011',
    tripId: 1,
    senderName: 'কামাল হোসেন',
    senderPhone: '01711223344',
    senderCounter: 'কল্যাণপুর কাউন্টার',
    receiverName: 'ফারুক আহমেদ',
    receiverPhone: '01911998877',
    receiverCounter: 'কুষ্টিয়া মজমপুর গেট',
    itemDescription: 'জরুরি অফিশিয়াল ফাইল ও বইয়ের কার্টুন',
    weightKg: 8.5,
    itemCategory: 'কাগজপত্র/ডকুমেন্ট',
    fare: 450,
    paymentStatus: 'paid',
    deliveryStatus: 'in_transit',
    createdAt: '2026-09-30 08:30:00'
  },
  {
    id: 2,
    trackingNumber: 'PRC-2026-9012',
    tripId: 2,
    senderName: 'সাদিয়া ইসলাম',
    senderPhone: '01822334455',
    senderCounter: 'গাবতলী কাউন্টার',
    receiverName: 'মাহবুবুর রহমান',
    receiverPhone: '01633445566',
    receiverCounter: 'রাজশাহী শিরোইল টার্মিনাল',
    itemDescription: 'পোশাক ও শীতের শাল পার্সেল',
    weightKg: 14.0,
    itemCategory: 'পোশাক ও কাপড়',
    fare: 750,
    paymentStatus: 'due',
    deliveryStatus: 'booked',
    createdAt: '2026-09-30 09:15:00'
  },
  {
    id: 3,
    trackingNumber: 'PRC-2026-8995',
    tripId: 1,
    senderName: 'আরিফুল হক',
    senderPhone: '01511223344',
    senderCounter: 'কল্যাণপুর কাউন্টার',
    receiverName: 'তানভীর আহমেদ',
    receiverPhone: '01755667788',
    receiverCounter: 'ঝিনাইদহ টার্মিনাল',
    itemDescription: 'কম্পিউটার হার্ডওয়্যার যন্ত্রাংশ',
    weightKg: 5.2,
    itemCategory: 'ইলেকট্রনিক্স',
    fare: 600,
    paymentStatus: 'paid',
    deliveryStatus: 'delivered',
    createdAt: '2026-09-29 14:20:00'
  }
];

export const INITIAL_COMPLAINTS: CustomerComplaint[] = [
  {
    id: 1,
    ticketReference: 'BG-20260930-001',
    customerName: 'আব্দুল করিম',
    customerPhone: '01712345678',
    tripId: 1,
    category: 'হারানো জিনিস',
    description: 'বাসের ওভারহেড তাকে একটি কালো চামড়ার পার্স ফেলে এসেছি, সিট A1',
    priority: 'high',
    status: 'investigating',
    resolutionNote: 'সুপারভাইজার খলিল মিয়াকে ফোন দেওয়া হয়েছে। ব্যাগটি নিরাপদে বাসে পাওয়া গেছে, কুষ্টিয়া কাউন্টারে রাখা হবে।',
    createdAt: '2026-09-30 11:30:00'
  },
  {
    id: 2,
    ticketReference: 'BG-20260930-002',
    customerName: 'নাসরিন আক্তার',
    customerPhone: '01819283746',
    tripId: 2,
    category: 'এসি সমস্যা',
    description: 'সিট B1-এর ওপর এসি ভেন্ট দিয়ে ঠান্ডা বাতাস আসছিল না, ঠিক করা দরকার',
    priority: 'medium',
    status: 'resolved',
    resolutionNote: 'বাস গ্যারেজে এসি মেকানিক দিয়ে ভেন্ট ফিল্টার পরিষ্কার করে টেস্ট করা হয়েছে।',
    createdAt: '2026-09-29 16:45:00'
  }
];

export function generateSmsTicketText(booking: Booking, trip: Trip | undefined, bus: Bus | undefined, route: Route | undefined, companyName: string, helpline: string): string {
  const passengerName = booking.customerName;
  const busName = bus?.name || 'বাসগো এক্সপ্রেস';
  const origin = route?.origin || 'ঢাকা';
  const destination = route?.destination || 'কুষ্টিয়া';
  const dateFormatted = formatBnDate(trip?.journeyDate || '');
  const timeFormatted = formatBnTime(trip?.departureTime || '');
  const seats = booking.selectedSeats.join(', ');
  const due = booking.dueAmount > 0 ? `বাকি: ${formatTaka(booking.dueAmount)}` : 'পরিশোধিত';

  return `${companyName}: সম্মানিত ${passengerName}, আপনার টিকিট নিশ্চিত হয়েছে। আইডি: ${booking.bookingReference}। বাস: ${busName}। রুট: ${origin}-${destination}। তারিখ: ${dateFormatted}, ছাড়ার সময়: ${timeFormatted}। আসন: ${seats}। মোট ভাড়া: ${formatTaka(booking.totalFare)}, অগ্রিম: ${formatTaka(booking.advancePaid)}, ${due}। বোর্ডিং: ${trip?.boardingPoint || 'কাউন্টার'}। হেল্পলাইন: ${helpline}। শুভ যাত্রা!`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const content = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
