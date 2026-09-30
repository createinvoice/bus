import React, { useState } from 'react';
import {
  Sliders,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  Save,
  CheckCircle2,
  Ticket
} from 'lucide-react';
import { SystemSettings } from '../data/initialData';

interface SettingsViewProps {
  settings: SystemSettings;
  isAdmin: boolean;
  onUpdateSettings: (updatedSettings: SystemSettings) => void;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SettingsView({
  settings,
  isAdmin,
  onUpdateSettings,
  showNotification
}: SettingsViewProps) {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('শুধুমাত্র সুপার অ্যাডমিন সিস্টেম সেটিংস পরিবর্তন করতে পারেন!', 'error');
      return;
    }

    onUpdateSettings(formData);
    showNotification('সিস্টেম ও কোম্পানি সেটিংস সফলভাবে সংরক্ষিত হয়েছে!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-600" />
            <span>সিস্টেম ও কোম্পানি সেটিংস (Company Settings)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            কোম্পানির নাম, হেল্পলাইন নম্বর, টিকিট প্রিন্টের শর্তাবলি ও সার্বিক কনফিগারেশন
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>পরিবহন কোম্পানি ও যোগাযোগের তথ্য</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                কোম্পানির নাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formData.companyName}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                কোম্পানির স্লোগান / ট্যাগলাইন
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.companyTagline}
                onChange={e => setFormData({ ...formData, companyTagline: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                হেল্পলাইন ও সাপোর্ট মোবাইল নম্বর <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formData.companyPhone}
                onChange={e => setFormData({ ...formData, companyPhone: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">অফিসিয়াল ইমেইল</label>
              <input
                type="email"
                disabled={!isAdmin}
                value={formData.companyEmail}
                onChange={e => setFormData({ ...formData, companyEmail: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1 text-xs">
              হেড অফিস / প্রধান কাউন্টার ঠিকানা <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={formData.companyAddress}
              onChange={e => setFormData({ ...formData, companyAddress: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 pt-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>টিকিটের প্রিন্ট শর্তাবলি ও নিয়মকানুন</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                টিকিট প্রিন্টের পেছনের শর্তাবলি (Terms & Conditions)
              </label>
              <textarea
                rows={4}
                disabled={!isAdmin}
                value={formData.ticketTerms}
                onChange={e => setFormData({ ...formData, ticketTerms: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-3 text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">এই শর্তাবলি প্রিন্টকৃত টিকিটের নিচে স্বয়ংক্রিয়ভাবে মুদ্রিত হবে।</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                টিকিট ফুটার বার্তা / ধন্যবাদ নোট
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.ticketFooterNote}
                onChange={e => setFormData({ ...formData, ticketFooterNote: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-emerald-800 font-medium"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>পরিবর্তন সংরক্ষণ করুন</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Live Ticket Header Preview */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Ticket className="w-4 h-4" />
              <span>লাইভ টিকিট প্রিভিউ</span>
            </h3>
            <div className="bg-white text-slate-900 p-4 rounded-lg border border-slate-200 text-center space-y-1">
              <div className="font-bold text-emerald-700 text-base">{formData.companyName}</div>
              <div className="text-[11px] text-slate-500">{formData.companyTagline}</div>
              <div className="text-[10px] text-slate-600 font-mono">হেল্পলাইন: {formData.companyPhone}</div>
              <div className="text-[10px] text-slate-400">{formData.companyAddress}</div>
              <div className="pt-3 text-[9px] text-slate-500 border-t border-dashed border-slate-200 text-left">
                <strong>শর্তাবলি:</strong> {formData.ticketTerms}
              </div>
              <div className="text-emerald-700 font-bold text-[10px] pt-1">
                {formData.ticketFooterNote}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
