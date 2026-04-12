import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, Users, Timer, Activity, ChevronDown, ChevronUp, AlertTriangle, MapPin, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SessionConfig {
  param: string;
  value: string;
}

interface Session {
  id: string;
  operatorId: string;
  operatorName: string;
  sessionType: string;
  presetUsed: string;
  status: string;
  startedAt: string;
  plannedEnd: string | null;
  actualEnd: string | null;
  configs: SessionConfig[];
}

interface SessionAlarm {
  id: string;
  type: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  turno: { label: 'Turno', color: '#3B82F6' },
  continua: { label: 'Continua', color: '#8B5CF6' },
  intervento: { label: 'Intervento', color: '#F39C12' },
  spazio_confinato: { label: 'Sp. Confinato', color: '#E74C3C' },
};

function formatDuration(startIso: string, endIso: string | null): string {
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const ms = end - new Date(startIso).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SessionsView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sessionAlarms, setSessionAlarms] = useState<SessionAlarm[]>([]);
  const [sessionConfigChanges, setSessionConfigChanges] = useState<any[]>([]);

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from('work_sessions')
      .select('*, operators(name)')
      .order('started_at', { ascending: false })
      .limit(100);

    // Fetch latest config per operator (last value for each param)
    const { data: configLogs } = await supabase
      .from('app_config_log')
      .select('operator_id, param_name, new_value, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    // Build latest config per operator
    const latestConfig = new Map<string, Record<string, string>>();
    (configLogs || []).forEach((c: any) => {
      if (!latestConfig.has(c.operator_id)) latestConfig.set(c.operator_id, {});
      const m = latestConfig.get(c.operator_id)!;
      if (!m[c.param_name]) m[c.param_name] = c.new_value;
    });

    // For each session: find config logs that happened just before or at session start
    const configBySession = new Map<string, SessionConfig[]>();
    if (data && configLogs) {
      for (const session of data) {
        const sessionStart = new Date(session.started_at).getTime();
        // Find config logs within 30s of session start (session_start logs)
        const matched = (configLogs as any[]).filter((c: any) =>
          c.operator_id === session.operator_id &&
          Math.abs(new Date(c.created_at).getTime() - sessionStart) < 30000
        );
        if (matched.length > 0) {
          configBySession.set(session.id, matched.map((c: any) => ({ param: c.param_name, value: c.new_value })));
        } else {
          // Use latest known config for this operator
          const latest = latestConfig.get(session.operator_id);
          if (latest && Object.keys(latest).length > 0) {
            configBySession.set(session.id, Object.entries(latest).map(([p, v]) => ({ param: p, value: v })));
          }
        }
      }
    }

    if (data) {
      setSessions(data.map((r: any) => ({
        id: r.id,
        operatorId: r.operator_id,
        operatorName: r.operators?.name || '—',
        sessionType: r.session_type,
        presetUsed: r.preset_used || '—',
        status: r.status,
        startedAt: r.started_at,
        plannedEnd: r.planned_end,
        actualEnd: r.actual_end,
        configs: configBySession.get(r.id) || [],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    const ch = supabase.channel('sessions_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_sessions' }, () => fetchSessions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchSessions]);

  // Fetch alarms + config changes for expanded session
  useEffect(() => {
    if (!expandedId) { setSessionAlarms([]); setSessionConfigChanges([]); return; }
    const session = sessions.find(s => s.id === expandedId);
    if (!session) return;
    const endTime = session.actualEnd || new Date().toISOString();

    supabase.from('alarm_events')
      .select('id, type, lat, lng, created_at')
      .eq('operator_id', session.operatorId)
      .gte('created_at', session.startedAt)
      .lte('created_at', endTime)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setSessionAlarms((data || []).map((a: any) => ({
          id: a.id, type: a.type, lat: a.lat, lng: a.lng, createdAt: a.created_at,
        })));
      });

    supabase.from('app_config_log')
      .select('id, param_name, old_value, new_value, created_at')
      .eq('operator_id', session.operatorId)
      .gte('created_at', session.startedAt)
      .lte('created_at', endTime)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setSessionConfigChanges(data || []); });
  }, [expandedId, sessions]);

  const filtered = sessions.filter(s => filterType === 'ALL' || s.sessionType === filterType);
  const active = sessions.filter(s => s.status === 'active');
  const todaySessions = sessions.filter(s => new Date(s.startedAt).toDateString() === new Date().toDateString());
  const todayHours = todaySessions.reduce((sum, s) => {
    const end = s.actualEnd ? new Date(s.actualEnd).getTime() : (s.status === 'active' ? Date.now() : new Date(s.startedAt).getTime());
    return sum + (end - new Date(s.startedAt).getTime()) / 3600000;
  }, 0);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2A2D3E' }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#ECEFF4' }}>Sessioni</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8899AA' }}>{sessions.length} sessioni registrate</p>
        </div>
        <button onClick={fetchSessions} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#8899AA' }}><RefreshCw size={16} /></button>
      </header>

      {/* Stats */}
      <div className="px-6 py-3 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: '1px solid #1A1D27' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
          <Activity size={14} style={{ color: '#2ECC71' }} />
          <div>
            <p className="text-xs" style={{ color: '#8899AA' }}>Attive ora</p>
            <p className="text-sm font-bold" style={{ color: '#2ECC71' }}>{active.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
          <Timer size={14} style={{ color: '#3B82F6' }} />
          <div>
            <p className="text-xs" style={{ color: '#8899AA' }}>Ore oggi</p>
            <p className="text-sm font-bold" style={{ color: '#ECEFF4' }}>{todayHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
          <Users size={14} style={{ color: '#F39C12' }} />
          <div>
            <p className="text-xs" style={{ color: '#8899AA' }}>Oggi</p>
            <p className="text-sm font-bold" style={{ color: '#ECEFF4' }}>{todaySessions.length}</p>
          </div>
        </div>

        <div className="ml-auto flex gap-1">
          {[{ k: 'ALL', l: 'Tutte' }, { k: 'turno', l: 'Turno' }, { k: 'continua', l: 'Continua' }, { k: 'intervento', l: 'Intervento' }].map(f => (
            <button key={f.k} onClick={() => setFilterType(f.k)}
              className="px-3 py-1 rounded-lg text-xs font-medium"
              style={{
                color: filterType === f.k ? '#ECEFF4' : '#8899AA',
                backgroundColor: filterType === f.k ? '#2A2D3E' : 'transparent',
              }}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={24} className="animate-spin" style={{ color: '#8899AA' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Clock size={40} style={{ color: '#2A2D3E' }} />
            <p className="mt-3 text-sm" style={{ color: '#8899AA' }}>Nessuna sessione</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2A2D3E' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#13151F' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Operatore</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Tipo</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Preset</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Inizio</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Fine prevista</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Durata</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Allarmi</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const tc = TYPE_LABELS[s.sessionType] || { label: s.sessionType, color: '#8899AA' };
                  const isExpanded = expandedId === s.id;
                  return (
                    <React.Fragment key={s.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="cursor-pointer hover:bg-white/5"
                        style={{ backgroundColor: idx % 2 === 0 ? '#1A1D27' : '#161922', borderTop: '1px solid #2A2D3E' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#ECEFF4' }}>{s.operatorName}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ color: tc.color, backgroundColor: `${tc.color}18` }}>{tc.label}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#8899AA' }}>{s.presetUsed}</td>
                      <td className="px-4 py-3" style={{ color: '#8899AA' }}>{formatTime(s.startedAt)}</td>
                      <td className="px-4 py-3" style={{ color: '#8899AA' }}>{s.plannedEnd ? formatTime(s.plannedEnd) : '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#ECEFF4' }}>{formatDuration(s.startedAt, s.actualEnd)}</td>
                      <td className="px-4 py-2">
                        {(() => {
                          const cfgMap = Object.fromEntries(s.configs.map(c => [c.param, c.value]));
                          const alarms = [
                            { name: 'Caduta', on: cfgMap['fall_enabled'] !== 'false', val: (cfgMap['fall_threshold_g'] || '2.5') + 'g' },
                            { name: 'Immobilità', on: cfgMap['immobility_enabled'] !== 'false', val: (cfgMap['immobility_seconds'] || '90') + 's' },
                            { name: 'Malore', on: cfgMap['malore_enabled'] !== 'false', val: (cfgMap['malore_angle'] || '45') + '°' },
                            { name: 'SOS', on: true, val: null },
                          ];
                          return (
                            <div className="flex flex-wrap gap-1">
                              {alarms.map(a => (
                                <span key={a.name} className="text-xs px-1.5 py-0.5 rounded" style={{
                                  backgroundColor: a.on ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.12)',
                                  color: a.on ? '#2ECC71' : '#E74C3C',
                                  border: `1px solid ${a.on ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.25)'}`,
                                }}>
                                  {a.name}: {a.on ? 'ON' : 'OFF'}{a.val ? ` | ${a.val}` : ''}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {s.status === 'active' ? (
                            <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ color: '#2ECC71', backgroundColor: 'rgba(46,204,113,0.15)' }}>In corso</span>
                          ) : (
                            <span className="text-xs" style={{ color: '#4A5568' }}>Completata</span>
                          )}
                          {isExpanded ? <ChevronUp size={14} style={{ color: '#8899AA' }} /> : <ChevronDown size={14} style={{ color: '#8899AA' }} />}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ backgroundColor: '#0F1117' }}>
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-2">
                            <div className="flex gap-4 text-xs" style={{ color: '#8899AA' }}>
                              <span>Inizio: <strong style={{ color: '#ECEFF4' }}>{new Date(s.startedAt).toLocaleString('it-IT')}</strong></span>
                              {s.actualEnd && <span>Fine: <strong style={{ color: '#ECEFF4' }}>{new Date(s.actualEnd).toLocaleString('it-IT')}</strong></span>}
                              <span>Durata: <strong style={{ color: '#ECEFF4' }}>{formatDuration(s.startedAt, s.actualEnd)}</strong></span>
                            </div>
                            {sessionAlarms.length > 0 ? (
                              <div>
                                <p className="text-xs font-semibold mb-1" style={{ color: '#E74C3C' }}>Allarmi durante sessione ({sessionAlarms.length})</p>
                                {sessionAlarms.map(a => (
                                  <div key={a.id} className="flex items-center gap-3 py-1 text-xs" style={{ borderTop: '1px solid #1A1D27' }}>
                                    <AlertTriangle size={12} style={{ color: '#E74C3C' }} />
                                    <span className="font-medium" style={{ color: '#E74C3C' }}>{a.type}</span>
                                    <span style={{ color: '#8899AA' }}>{new Date(a.createdAt).toLocaleTimeString('it-IT')}</span>
                                    {a.lat && a.lng && (
                                      <span className="flex items-center gap-1" style={{ color: '#3B82F6' }}>
                                        <MapPin size={10} /> {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs" style={{ color: '#2ECC71' }}>Nessun allarme durante questa sessione</p>
                            )}
                            {sessionConfigChanges.length > 0 && (() => {
                              const cm = Object.fromEntries(sessionConfigChanges.map((c: any) => [c.param_name, c.new_value]));
                              const alarms = [
                                { name: 'Caduta', on: cm['fall_enabled'] !== 'false', val: (cm['fall_threshold_g'] || '2.5') + 'g' },
                                { name: 'Immobilità', on: cm['immobility_enabled'] !== 'false', val: (cm['immobility_seconds'] || '90') + 's' },
                                { name: 'Malore', on: cm['malore_enabled'] !== 'false', val: (cm['malore_angle'] || '45') + '°' },
                                { name: 'SOS', on: true, val: null as string | null },
                              ];
                              return (
                                <div>
                                  <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: '#F39C12' }}>
                                    <Settings size={12} /> Impostazioni all'avvio sessione
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {alarms.map(a => (
                                      <span key={a.name} className="text-xs px-2 py-1 rounded" style={{
                                        backgroundColor: a.on ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.12)',
                                        color: a.on ? '#2ECC71' : '#E74C3C',
                                        border: `1px solid ${a.on ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.25)'}`,
                                      }}>
                                        {a.name}: {a.on ? 'ON' : 'OFF'}{a.val ? ` | ${a.val}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
