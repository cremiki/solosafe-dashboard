import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Clock, MapPin, Phone, CheckCircle, XCircle,
  Send, Shield, ChevronDown, ChevronUp,
  UserCheck, PhoneCall, Ban, Eye, Radio, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type AlarmType = 'FALL' | 'IMMOBILITY' | 'SOS' | 'SOS_TAG' | 'MAN_DOWN' | 'SESSION_EXPIRED' | 'DURESS' | 'MALORE' | 'CONFINED_TIMEOUT';
type AlarmStatus = 'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM';

interface Alarm {
  id: string;
  operatorName: string;
  type: AlarmType;
  status: AlarmStatus;
  lat: number | null;
  lng: number | null;
  locationAccuracy: number | null;
  isTest: boolean;
  isDuress: boolean;
  smsSent: boolean;
  smsCount: number;
  telegramSent: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  FALL:              { label: 'Caduta',          color: '#E74C3C', icon: <AlertTriangle size={16} /> },
  IMMOBILITY:        { label: 'Immobilità',      color: '#F39C12', icon: <Clock size={16} /> },
  SOS:               { label: 'SOS Manuale',     color: '#E74C3C', icon: <Radio size={16} /> },
  SOS_TAG:           { label: 'SOS Tag',         color: '#E74C3C', icon: <Radio size={16} /> },
  MAN_DOWN:          { label: 'Man Down',        color: '#E74C3C', icon: <AlertTriangle size={16} /> },
  MALORE:            { label: 'Malore',          color: '#9B59B6', icon: <Shield size={16} /> },
  SESSION_EXPIRED:   { label: 'Sessione Scaduta', color: '#F39C12', icon: <Clock size={16} /> },
  DURESS:            { label: 'Duress',          color: '#9B59B6', icon: <Shield size={16} /> },
  CONFINED_TIMEOUT:  { label: 'Sp. Confinato',   color: '#E74C3C', icon: <AlertTriangle size={16} /> },
};

const statusConfig: Record<AlarmStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:      { label: 'ATTIVO',       color: '#E74C3C', bg: 'rgba(231,76,60,0.15)' },
  RESOLVED:    { label: 'RISOLTO',      color: '#2ECC71', bg: 'rgba(46,204,113,0.1)' },
  FALSE_ALARM: { label: 'FALSO ALLARME', color: '#95A5A6', bg: 'rgba(149,165,166,0.1)' },
};

type TimeFilter = 'TODAY' | '3DAYS' | '7DAYS';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return `${Math.floor(diff / 86400)}g fa`;
}

function duration(from: string): string {
  const diff = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  if (m === 0) return `${s}s`;
  return `${m}min ${s}s`;
}

function AlarmCard({ alarm, expanded, onToggle }: { alarm: Alarm; expanded: boolean; onToggle: () => void }) {
  const tCfg = typeConfig[alarm.type] || { label: alarm.type, color: '#8899AA', icon: <AlertTriangle size={16} /> };
  const isActive = alarm.status === 'ACTIVE';
  const sCfg = statusConfig[alarm.status] || statusConfig.ACTIVE;

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${isActive ? 'alarm-card' : ''}`}
         style={{ backgroundColor: '#1A1D27', border: `1px solid ${isActive ? 'rgba(231,76,60,0.5)' : '#2A2D3E'}` }}>
      <div className="h-1" style={{ backgroundColor: tCfg.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${isActive ? 'alarm-pulse' : ''}`}
                 style={{ backgroundColor: `${tCfg.color}20`, color: tCfg.color }}>
              {tCfg.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold" style={{ color: '#ECEFF4' }}>{alarm.operatorName}</h3>
                <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color: tCfg.color, backgroundColor: `${tCfg.color}18` }}>
                  {tCfg.label}
                </span>
                {alarm.isTest && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.15)' }}>TEST</span>}
                {alarm.isDuress && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color: '#9B59B6', backgroundColor: 'rgba(155,89,182,0.15)' }}>DURESS</span>}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs" style={{ color: '#8899AA' }}>
                  {new Date(alarm.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {isActive && <span className="text-xs font-mono font-bold" style={{ color: tCfg.color }}>{duration(alarm.createdAt)}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isActive ? 'alarm-pulse' : ''}`} style={{ color: sCfg.color, backgroundColor: sCfg.bg }}>
              {sCfg.label}
            </span>
            <button onClick={onToggle} className="p-1 rounded hover:bg-white/5" style={{ color: '#8899AA' }}>
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          {alarm.smsSent && <div className="flex items-center gap-1 text-xs" style={{ color: '#2ECC71' }}><Send size={12} /> SMS ({alarm.smsCount})</div>}
          {alarm.telegramSent && <div className="flex items-center gap-1 text-xs" style={{ color: '#2ECC71' }}><Send size={12} /> Telegram</div>}
          {alarm.lat !== null && <div className="flex items-center gap-1 text-xs" style={{ color: '#3B82F6' }}><MapPin size={12} /> GPS</div>}
        </div>
        {isActive && (
          <div className="flex items-center gap-2 mt-4">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#F39C12', color: '#0F1117' }}>
              <UserCheck size={14} /> Sto intervenendo
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#3B82F6', color: '#fff' }}>
              <PhoneCall size={14} /> Chiama
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(149,165,166,0.2)', color: '#95A5A6', border: '1px solid rgba(149,165,166,0.3)' }}>
              <Ban size={14} /> Falso allarme
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid #2A2D3E' }}>
          <div className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><p className="text-xs mb-0.5" style={{ color: '#8899AA' }}>Creato</p><p className="text-xs font-medium" style={{ color: '#ECEFF4' }}>{new Date(alarm.createdAt).toLocaleString('it-IT')}</p></div>
            {alarm.resolvedBy && <div><p className="text-xs mb-0.5" style={{ color: '#8899AA' }}>Risolto da</p><p className="text-xs font-medium" style={{ color: '#ECEFF4' }}>{alarm.resolvedBy}</p></div>}
            {alarm.cancelReason && <div><p className="text-xs mb-0.5" style={{ color: '#8899AA' }}>Motivo</p><p className="text-xs font-medium" style={{ color: '#ECEFF4' }}>{alarm.cancelReason}</p></div>}
          </div>
          {alarm.lat !== null && alarm.lng !== null && (
            <div className="rounded-lg p-3" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
              <div className="flex items-center gap-2 mb-1"><MapPin size={14} style={{ color: '#3B82F6' }} /><span className="text-xs font-medium" style={{ color: '#ECEFF4' }}>GPS</span></div>
              <span className="text-xs font-mono" style={{ color: '#8899AA' }}>{alarm.lat.toFixed(6)}, {alarm.lng.toFixed(6)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type StatusFilterType = 'ALL' | AlarmStatus;

export default function AlarmsView() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7DAYS');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAlarms = useCallback(async () => {
    const timeMs: Record<TimeFilter, number> = { TODAY: 86400000, '3DAYS': 3 * 86400000, '7DAYS': 7 * 86400000 };
    const since = new Date(Date.now() - timeMs[timeFilter]).toISOString();

    const { data } = await supabase
      .from('alarm_events')
      .select('*, operators(name)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setAlarms(data.map((row: any) => {
        const isResolved = row.resolved_at !== null;
        const isCancelled = row.cancelled === true;
        return {
          id: row.id,
          operatorName: row.operators?.name || 'Operatore',
          type: row.type as AlarmType,
          status: isCancelled ? 'FALSE_ALARM' as AlarmStatus : isResolved ? 'RESOLVED' as AlarmStatus : 'ACTIVE' as AlarmStatus,
          lat: row.lat,
          lng: row.lng,
          locationAccuracy: row.location_accuracy,
          isTest: row.is_test || false,
          isDuress: row.is_duress || false,
          smsSent: row.sms_sent || false,
          smsCount: row.sms_count || 0,
          telegramSent: row.telegram_sent || false,
          resolvedBy: row.resolved_by,
          resolvedAt: row.resolved_at,
          cancelledAt: row.cancelled_at,
          cancelReason: row.cancel_reason,
          createdAt: row.created_at,
        };
      }));
    }
    setLoading(false);
  }, [timeFilter]);

  useEffect(() => { fetchAlarms(); }, [fetchAlarms]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('alarms_view')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alarm_events' }, () => fetchAlarms())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAlarms]);

  const filtered = alarms
    .filter(a => statusFilter === 'ALL' || a.status === statusFilter)
    .sort((a, b) => {
      const priority: Record<AlarmStatus, number> = { ACTIVE: 0, RESOLVED: 2, FALSE_ALARM: 3 };
      const diff = (priority[a.status] || 1) - (priority[b.status] || 1);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const activeCount = alarms.filter(a => a.status === 'ACTIVE').length;

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2A2D3E' }}>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold" style={{ color: '#ECEFF4' }}>Allarmi</h2>
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-lg alarm-pulse"
                  style={{ color: '#E74C3C', backgroundColor: 'rgba(231,76,60,0.15)' }}>
              <AlertTriangle size={16} /> {activeCount} attivi
            </span>
          )}
          <button onClick={fetchAlarms} className="p-1 rounded hover:bg-white/5" style={{ color: '#8899AA' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <div className="px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #1A1D27' }}>
        <div className="flex items-center gap-2">
          {([
            { key: 'ALL' as StatusFilterType, label: 'Tutti', color: '#8899AA' },
            { key: 'ACTIVE' as StatusFilterType, label: 'Attivi', color: '#E74C3C' },
            { key: 'RESOLVED' as StatusFilterType, label: 'Risolti', color: '#2ECC71' },
            { key: 'FALSE_ALARM' as StatusFilterType, label: 'Falsi allarmi', color: '#95A5A6' },
          ]).map(({ key, label, color }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: statusFilter === key ? '#ECEFF4' : '#8899AA',
                backgroundColor: statusFilter === key ? `${color}20` : 'transparent',
                border: `1px solid ${statusFilter === key ? `${color}40` : 'transparent'}`,
              }}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 px-1 py-1 rounded-lg" style={{ backgroundColor: '#1A1D27' }}>
          {([
            { key: 'TODAY' as TimeFilter, label: 'Oggi' },
            { key: '3DAYS' as TimeFilter, label: '3 giorni' },
            { key: '7DAYS' as TimeFilter, label: '7 giorni' },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => setTimeFilter(key)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                color: timeFilter === key ? '#ECEFF4' : '#8899AA',
                backgroundColor: timeFilter === key ? '#2A2D3E' : 'transparent',
              }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={24} className="animate-spin" style={{ color: '#8899AA' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <CheckCircle size={48} style={{ color: '#2ECC71' }} />
            <p className="mt-4 text-sm font-medium" style={{ color: '#2ECC71' }}>Nessun allarme nel periodo</p>
          </div>
        ) : (
          filtered.map(alarm => (
            <AlarmCard key={alarm.id} alarm={alarm} expanded={expandedId === alarm.id}
              onToggle={() => setExpandedId(expandedId === alarm.id ? null : alarm.id)} />
          ))
        )}
      </div>
    </>
  );
}
