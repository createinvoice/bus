import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Send,
  Check,
  X,
  Phone,
  Share2,
  Sparkles,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import {
  Booking,
  Trip,
  Bus,
  Route,
  ParcelBooking,
  formatTaka,
  formatBnDate,
  formatBnTime,
  en2bn
} from '../data/initialData';

interface SmsTemplateModalProps {
  bookings: Booking[];
  parcels: ParcelBooking[];
  trips: Trip[];
  buses: Bus[];
  routes: Route[];
  companyName: string;
  helpline: string;
  onClose?: () => void;
}

export const SmsTemplateModal: React.FC<SmsTemplateModalProps> = ({
  bookings,
  parcels,
  trips,
  buses,
  routes,
  companyName,
  helpline,
  onClose
}) => {
  const [selectedBookingId, setSelectedBookingId] = useState<number>(bookings[0]?.id || 1);
  const [templateType, setTemplateType] = useState<'confirmation' | 'reminder' | 'seat_change' | 'cancellation' | 'parcel'>('confirmation');
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState('');

  const selectedBooking = bookings.find(b => b.id === selectedBookingId) || bookings[0];
  const selectedTrip = trips.find(t => t.id === selectedBooking?.tripId);
  const selectedBus = selectedTrip ? buses.find(b => b.id === selectedTrip.busId) : undefined;
  const selectedRoute = selectedTrip ? routes.find(r => r.id === selectedTrip.routeId) : undefined;

  const targetPhone = customPhone || selectedBooking?.customerPhone || '';

  const generateMessage = () => {
    if (!selectedBooking) return '';

    const pName = selectedBooking.customerName;
    const pnr = selectedBooking.bookingReference;
    const busName = selectedBus?.name || 'বাসগো এক্সপ্রেস';
    const origin = selectedRoute?.origin || 'ঢাকা';
    const dest = selectedRoute?.destination || 'কুষ্টিয়া';
    const date = formatBnDate(selectedTrip?.journeyDate || '');
    const time = formatBnTime(selectedTrip?.departureTime || '');
    const seats = selectedBooking.selectedSeats.join(', ');
    const boarding = selectedTrip?.boardingPoint || 'কাউন্টার';
    const due = selectedBooking.dueAmount > 0 ? `বাকি: ${formatTaka(selectedBooking.dueAmount)}` : 'পরিশোধিত';

    switch (templateType) {
      case 'confirmation':
        return `[${companyName}] সম্মানিত ${pName}, আপনার টিকিট কনফার্ম হয়েছে। আইডি: ${pnr}। বাস: ${busName}। রুট: ${origin}-${dest}। তারিখ: ${date}, সময়: ${time}। আসন: ${seats}। মোট ভাড়া: ${formatTaka(selectedBooking.totalFare)}, অগ্রিম: ${formatTaka(selectedBooking.advancePaid)}, ${due}। বোর্ডিং: ${boarding}। হেল্পলাইন: ${helpline}। শুভ যাত্রা!`;

      case 'reminder':
        return `[${companyName} রিমাইন্ডার] সম্মানিত ${pName}, আপনার বাস (${busName}) আজ ${time}-এ ${boarding} থেকে ছাড়বে। আইডি: ${pnr}, আসন: ${seats}। যাত্রা শুরুর ৩০ মিনিট পূর্বে কাউন্টারে উপস্থিত থাকার অনুরোধ রইল। হেল্পলাইন: ${helpline}`;

      case 'seat_change':
        return `[${companyName}] সম্মানিত ${pName}, আপনার টিকিটের (আইডি: ${pnr}) আসন সফলভাবে পরিবর্তন করা হয়েছে। নতুন আসন: ${seats}। বাস: ${busName}, সময়: ${time}। হেল্পলাইন: ${helpline}`;

      case 'cancellation':
        return `[${companyName}] সম্মানিত ${pName}, আপনার অনুরোধে টিকিট আইডি: ${pnr} বাতিল করা হয়েছে। রিফান্ড বা তথ্যের জন্য যোগাযোগ করুন: ${helpline}`;

      case 'parcel': {
        const parcel = parcels[0];
        if (!parcel) return `[${companyName}] পার্সেল রসিদ: আপনার মালামাল বুকিং সম্পন্ন হয়েছে। হেল্পলাইন: ${helpline}`;
        return `[${companyName}] আপনার পার্সেল বুকিং নিশ্চিত হয়েছে। ট্র্যাকিং নং: ${parcel.trackingNumber}। প্রাপক: ${parcel.receiverName} (${parcel.receiverPhone})। গন্তব্য কাউন্টার: ${parcel.receiverCounter}। হেল্পলাইন: ${helpline}`;
      }
    }
  };

  const messageText = generateMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    let finalPhone = cleanPhone;
    if (cleanPhone.startsWith('01')) {
      finalPhone = '88' + cleanPhone;
    }
    const encoded = encodeURIComponent(messageText);
    const url = `https://wa.me/${finalPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            <span>যাত্রী এসএমএস ও হোয়াটসঅ্যাপ ম্যাসেজিং কেন্দ্র</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            টিকিট বুকিং, জার্নি রিমাইন্ডার এবং পার্সেল ট্র্যাকিং মেসেজ ১-ক্লিকে হোয়াটসঅ্যাপ বা এসএমএসে পাঠান
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Template & Booking Selectors */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              মেসেজের ধরন নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => setTemplateType('confirmation')}
                className={`p-2.5 rounded-xl text-xs font-bold text-left transition-colors flex items-center justify-between ${
                  templateType === 'confirmation' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>🎫 টিকিট কনফার্মেশন SMS</span>
              </button>
              <button
                onClick={() => setTemplateType('reminder')}
                className={`p-2.5 rounded-xl text-xs font-bold text-left transition-colors flex items-center justify-between ${
                  templateType === 'reminder' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>⏰ বাস ছাড়ার পূর্বে রিমাইন্ডার</span>
              </button>
              <button
                onClick={() => setTemplateType('seat_change')}
                className={`p-2.5 rounded-xl text-xs font-bold text-left transition-colors flex items-center justify-between ${
                  templateType === 'seat_change' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>💺 আসন স্থানান্তর নোটিফিকেশন</span>
              </button>
              <button
                onClick={() => setTemplateType('cancellation')}
                className={`p-2.5 rounded-xl text-xs font-bold text-left transition-colors flex items-center justify-between ${
                  templateType === 'cancellation' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>❌ টিকিট বাতিল নোটিশ</span>
              </button>
              <button
                onClick={() => setTemplateType('parcel')}
                className={`p-2.5 rounded-xl text-xs font-bold text-left transition-colors flex items-center justify-between ${
                  templateType === 'parcel' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>📦 পার্সেল ট্র্যাকিং নোটিশ</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              কোন যাত্রীর টিকিট ডেটা লোড করবেন?
            </label>
            <select
              value={selectedBookingId}
              onChange={e => setSelectedBookingId(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
            >
              {bookings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.bookingReference} - {b.customerName} ({b.selectedSeats.join(',')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              প্রাপকের মোবাইল নম্বর
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={customPhone || selectedBooking?.customerPhone || ''}
                onChange={e => setCustomPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              ডিফল্টভাবে নির্বাচিত যাত্রীর মোবাইল নম্বর অটো লোড হয়েছে
            </div>
          </div>
        </div>

        {/* Right: Message Preview & Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl relative shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Smartphone className="w-4 h-4" />
                <span>লাইভ এসএমএস প্রিভিউ</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                দৈর্ঘ্য: {en2bn(messageText.length)} অক্ষর
              </span>
            </div>

            <div className="py-4 text-xs font-mono leading-relaxed text-slate-200 whitespace-pre-wrap select-all">
              {messageText}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>প্রেরক: {companyName}</span>
              <span className="text-emerald-400 font-mono font-bold">
                {targetPhone ? `প্রাপক: ${targetPhone}` : 'মোবাইল নেই'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">মেসেজ কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>কপি এসএমএস টেক্সট</span>
                </>
              )}
            </button>

            <button
              onClick={handleWhatsApp}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>সরাসরি হোয়াটসঅ্যাপে পাঠান</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">পরামর্শ: </span>
            কাউন্টার থেকে কোনো যাত্রীর টিকিট বুকিং করার পর সরাসরি <strong>"হোয়াটসঅ্যাপে পাঠান"</strong> বাটনে ক্লিক করলে আপনার কম্পিউটার বা ফোনের WhatsApp Web খুলে যাবে এবং যাত্রীর নম্বরে এই বাংলা টেক্সটটি মুহূর্তেই পাঠিয়ে দেওয়া যাবে।
          </div>
        </div>
      </div>
    </div>
  );
};
