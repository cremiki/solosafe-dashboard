import React from 'react';
import {
  Shield, Users, Bell, LayoutDashboard, Settings, LogOut, Activity, AlertTriangle, Map as MapIcon, ClipboardList
} from 'lucide-react';
import { mockAlarms } from '../data/mockAlarms';
import DownloadBanner from './DownloadBanner';

export type Page = 'fleet' | 'alarms' | 'incidents' | 'map' | 'operators' | 'sessions' | 'settings';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  userEmail: string;
  onSignOut: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { icon: React.ReactNode; label: string; page: Page }[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Flotta',      page: 'fleet' },
  { icon: <Bell size={20} />,            label: 'Allarmi',     page: 'alarms' },
  { icon: <ClipboardList size={20} />,   label: 'Report',      page: 'incidents' },
  { icon: <MapIcon size={20} />,         label: 'Mappa',       page: 'map' },
  { icon: <Users size={20} />,           label: 'Operatori',   page: 'operators' },
  { icon: <Activity size={20} />,        label: 'Sessioni',    page: 'sessions' },
  { icon: <Settings size={20} />,        label: 'Account',     page: 'settings' },
];

export default function Layout({ currentPage, onNavigate, userEmail, onSignOut, children }: Props) {
  const activeAlarms = mockAlarms.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0F1117' }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col flex-shrink-0" style={{ backgroundColor: '#13151F', borderRight: '1px solid #2A2D3E' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid #2A2D3E' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E63946' }}>
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#ECEFF4' }}>SoloSafe</h1>
            <p className="text-xs" style={{ color: '#8899AA' }}>Worker Safety</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? '' : 'hover:bg-white/5'
                }`}
                style={{
                  color: isActive ? '#ECEFF4' : '#8899AA',
                  backgroundColor: isActive ? 'rgba(230,57,70,0.12)' : 'transparent',
                }}
              >
                <span style={{ color: isActive ? '#E63946' : '#8899AA' }}>{item.icon}</span>
                {item.label}
                {/* Alarm badge */}
                {item.page === 'alarms' && activeAlarms > 0 && (
                  <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold alarm-pulse"
                        style={{ backgroundColor: '#E74C3C', color: '#fff' }}>
                    {activeAlarms}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-4 space-y-2" style={{ borderTop: '1px solid #2A2D3E' }}>
          <div className="px-3 py-1">
            <p className="text-xs truncate" style={{ color: '#8899AA' }}>{userEmail}</p>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
            style={{ color: '#8899AA' }}
          >
            <LogOut size={20} />
            Esci
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <DownloadBanner />
        {children}
      </main>
    </div>
  );
}
