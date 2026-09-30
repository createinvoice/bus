import React from 'react';
import {
  Bus,
  LayoutDashboard,
  Ticket,
  ClipboardList,
  FileText,
  Calendar,
  MapPin,
  TrendingUp,
  CreditCard,
  DollarSign,
  Package,
  AlertCircle,
  MessageSquare,
  Users,
  Settings,
  Code2,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  X,
  PhoneCall,
  Clock
} from 'lucide-react';
import { User, en2bn } from '../data/initialData';

export type NavTab =
  | 'dashboard'
  | 'new-booking'
  | 'bookings'
  | 'manifest'
  | 'parcels'
  | 'complaints'
  | 'sms-templates'
  | 'trips'
  | 'buses'
  | 'routes'
  | 'expenses'
  | 'daily-closing'
  | 'reports'
  | 'staff'
  | 'settings'
  | 'php-source'
  | 'ticket-print';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: User;
  onSwitchUser: (user: User) => void;
  allUsers: User[];
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  dueCount: number;
  tripsCount: number;
  parcelsCount: number;
  complaintsCount: number;
  busesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onSwitchUser,
  allUsers,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  dueCount,
  tripsCount,
  parcelsCount,
  complaintsCount,
  busesCount
}) => {
  const isAdmin = currentUser.role === 'admin';

  const navItem = (
    id: NavTab,
    label: string,
    Icon: React.ElementType,
    badge?: { count: number | string; color: string },
    adminOnly = false
  ) => {
    if (adminOnly && !isAdmin) return null;

    const isActive = activeTab === id;

    return (
      <button
        key={id}
        onClick={() => {
          setActiveTab(id);
          setIsMobileOpen(false);
        }}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all relative group ${
          isActive
            ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/40 translate-x-1'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
        {!isCollapsed && (
          <span className="truncate flex-1 text-left">{label}</span>
        )}
        {!isCollapsed && badge && Number(badge.count) > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono shrink-0 ${badge.color}`}>
            {typeof badge.count === 'number' ? en2bn(badge.count) : badge.count}
          </span>
        )}
        {isCollapsed && badge && Number(badge.count) > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-900 border-r border-slate-800/90 text-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50 shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div>
                <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>বাসগো</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] rounded font-mono uppercase font-bold">
                    PRO
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  পরিবহন ইআরপি সিস্টেম
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white items-center justify-center transition-colors border border-slate-700/60"
            title={isCollapsed ? 'মেন্যু বিস্তার করুন' : 'মেন্যু সংকুচিত করুন'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Quick Badge */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 font-bold text-xs ${
                isAdmin ? 'bg-indigo-600 ring-2 ring-indigo-400/40' : 'bg-emerald-700 ring-2 ring-emerald-500/40'
              }`}>
                {isAdmin ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>{currentUser.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isAdmin ? 'সুপার অ্যাডমিন' : currentUser.counterName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Switch Dropdown trigger */}
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                {allUsers.filter(u => u.id !== currentUser.id).slice(0, 1).map(other => (
                  <button
                    key={other.id}
                    onClick={() => onSwitchUser(other)}
                    title={`সুইচ করুন: ${other.name} (${other.role === 'admin' ? 'অ্যাডমিন' : 'অপারেটর'})`}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2 py-1 rounded border border-slate-700 font-medium transition-colors"
                  >
                    {other.role === 'admin' ? 'অ্যাডমিন' : 'কাউন্টার'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Section 1: Main Operations */}
          <div>
            {!isCollapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>অপারেশন ও টিকিট</span>
              </div>
            )}
            <div className="space-y-1">
              {navItem('dashboard', 'ড্যাশবোর্ড', LayoutDashboard)}
              {navItem('new-booking', '+ নতুন সিট বুকিং', Ticket, { count: 'নতুন', color: 'bg-emerald-500/20 text-emerald-300' })}
              {navItem('bookings', 'সকল বুকিং ও টিকিট', ClipboardList, dueCount > 0 ? { count: dueCount, color: 'bg-amber-500/20 text-amber-300' } : undefined)}
              {navItem('manifest', 'ওয়েবিল ও মেনিফেস্ট', FileText)}
            </div>
          </div>

          {/* Section 2: Parcel & Customer Care */}
          <div>
            {!isCollapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>পার্সেল ও গ্রাহক সেবা</span>
              </div>
            )}
            <div className="space-y-1">
              {navItem('parcels', 'লাগেজ ও পার্সেল বুকিং', Package, parcelsCount > 0 ? { count: parcelsCount, color: 'bg-sky-500/20 text-sky-300' } : undefined)}
              {navItem('complaints', 'অভিযোগ ও হারানো মাল', AlertCircle, complaintsCount > 0 ? { count: complaintsCount, color: 'bg-rose-500/20 text-rose-300' } : undefined)}
              {navItem('sms-templates', 'এসএমএস ও হোয়াটসঅ্যাপ', MessageSquare)}
            </div>
          </div>

          {/* Section 3: Fleet & Trips */}
          <div>
            {!isCollapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>ফ্লিট ও রুট</span>
              </div>
            )}
            <div className="space-y-1">
              {navItem('trips', 'ট্রিপ শিডিউলিং', Calendar, { count: tripsCount, color: 'bg-indigo-500/20 text-indigo-300' })}
              {navItem('buses', 'বাস ও ফ্লিট তালিকা', Bus, { count: busesCount, color: 'bg-slate-700 text-slate-300' })}
              {navItem('routes', 'রুট ও স্টপেজ', MapPin)}
            </div>
          </div>

          {/* Section 4: Accounts & Finance */}
          <div>
            {!isCollapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>হিসাব ও অর্থ</span>
              </div>
            )}
            <div className="space-y-1">
              {navItem('daily-closing', 'দৈনিক ক্যাশ ক্লোজিং', CreditCard)}
              {navItem('expenses', 'ট্রিপের খরচ ও নিট লাভ', DollarSign, undefined, true)}
              {navItem('reports', 'বিস্তারিত রিপোর্টস', TrendingUp, undefined, true)}
            </div>
          </div>

          {/* Section 5: Admin & Core */}
          {isAdmin && (
            <div>
              {!isCollapsed && (
                <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>অ্যাডমিন ও সিস্টেম</span>
                </div>
              )}
              <div className="space-y-1">
                {navItem('staff', 'স্টাফ ও অপারেটর', Users, undefined, true)}
                {navItem('settings', 'সিস্টেম ও কোম্পানি', Settings, undefined, true)}
              </div>
            </div>
          )}

          {/* Section 6: PHP Code & ZIP */}
          <div className="pt-2 border-t border-slate-800">
            {navItem('php-source', 'PHP সোর্স ও ZIP', Code2, { count: 'v8+', color: 'bg-amber-500/20 text-amber-300' })}
          </div>
        </div>

        {/* Sidebar Footer info */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0 text-center">
            <div className="text-[10px] text-slate-400">
              বাসগো বাংলা বাস ইআরপি
            </div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
              Namecheap & cPanel Ready
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
