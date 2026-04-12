import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Phone, Send, MessageSquare, CheckCircle, XCircle,
  Clock, MapPin, Battery, Wifi, Signal, RefreshCw, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';

interface Incident {
  id: string;
  operatorId: string;
  operatorName: string;
  type: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  cancelled: boolean;
}

interface EventLog {
  id: string;
  eventType: string;
  alarmType: string;
  timestamp: string;
  recipientName: string | null;
  recipientPhone: string | null;
  channel: string | null;
  responseType: string | null;
  responseBy: string | null;
  batteryLevel: number | null;
  gsmSignal: number | null;
  notes: string | null;
}

const EVENT_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  PRE_ALARM_SHOWN: { icon: <AlertTriangle size={14} />, color: '#F39C12', label: 'Pre-allarme mostrato' },
  PRE_ALARM_CANCELLED: { icon: <CheckCircle size={14} />, color: '#2ECC71', label: 'Pre-allarme annullato' },
  ALARM_TRIGGERED: { icon: <AlertTriangle size={14} />, color: '#E74C3C', label: 'Allarme attivato' },
  SMS_SENT: { icon: <Send size={14} />, color: '#3B82F6', label: 'SMS inviato' },
  SMS_FAILED: { icon: <XCircle size={14} />, color: '#E74C3C', label: 'SMS fallito' },
  CALL_INITIATED: { icon: <Phone size={14} />, color: '#F39C12', label: 'Chiamata avviata' },
  CALL_ANSWERED: { icon: <CheckCircle size={14} />, color: '#2ECC71', label: 'Chiamata risposta' },
  CALL_NO_ANSWER: { icon: <XCircle size={14} />, color: '#E74C3C', label: 'Nessuna risposta' },
  CALL_FAILED: { icon: <XCircle size={14} />, color: '#E74C3C', label: 'Chiamata fallita' },
  TWILIO_FALLBACK: { icon: <Phone size={14} />, color: '#9B59B6', label: 'Fallback Twilio' },
  TELEGRAM_SENT: { icon: <MessageSquare size={14} />, color: '#3B82F6', label: 'Telegram inviato' },
  TELEGRAM_RESPONSE: { icon: <CheckCircle size={14} />, color: '#2ECC71', label: 'Risposta Telegram' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function IncidentReportView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from('alarm_events')
      .select('*, operators(name)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setIncidents(data.map((r: any) => ({
        id: r.id, operatorId: r.operator_id,
        operatorName: r.operators?.name || '—',
        type: r.type, lat: r.lat, lng: r.lng,
        createdAt: r.created_at,
        resolvedBy: r.resolved_by, resolvedAt: r.resolved_at,
        cancelled: r.cancelled || false,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  useEffect(() => {
    const ch = supabase.channel('incidents_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alarm_events' }, () => fetchIncidents())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alarm_event_log' }, () => {
        if (expandedId) fetchLogs(expandedId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchIncidents, expandedId]);

  async function fetchLogs(alarmId: string) {
    const { data } = await supabase
      .from('alarm_event_log')
      .select('*')
      .eq('alarm_event_id', alarmId)
      .order('timestamp', { ascending: true });

    if (data) {
      setEventLogs(data.map((r: any) => ({
        id: r.id, eventType: r.event_type, alarmType: r.alarm_type,
        timestamp: r.timestamp, recipientName: r.recipient_name,
        recipientPhone: r.recipient_phone, channel: r.channel,
        responseType: r.response_type, responseBy: r.response_by,
        batteryLevel: r.battery_level, gsmSignal: r.gsm_signal,
        notes: r.notes,
      })));
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); setEventLogs([]); }
    else { setExpandedId(id); fetchLogs(id); }
  }

  function exportPdf(incident: Incident) {
    const doc = new jsPDF();
    doc.setFillColor(230, 57, 70);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOSAFE — Incident Report', 15, 20);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text(`Allarme: ${incident.type}`, 15, 45);
    doc.text(`Operatore: ${incident.operatorName}`, 15, 55);
    doc.text(`Data: ${new Date(incident.createdAt).toLocaleString('it-IT')}`, 15, 65);
    if (incident.lat) doc.text(`GPS: ${incident.lat.toFixed(5)}, ${incident.lng?.toFixed(5)}`, 15, 75);
    doc.text(`Stato: ${incident.resolvedBy ? `Risolto da ${incident.resolvedBy}` : incident.cancelled ? 'Falso allarme' : 'Attivo'}`, 15, 85);

    doc.setFontSize(10);
    doc.text('Timeline eventi:', 15, 100);
    eventLogs.forEach((log, i) => {
      const cfg = EVENT_ICONS[log.eventType] || { label: log.eventType };
      const line = `${formatTime(log.timestamp)} — ${cfg.label}${log.recipientName ? ` → ${log.recipientName}` : ''}${log.channel ? ` (${log.channel})` : ''}`;
      doc.text(line, 20, 110 + i * 8);
    });

    doc.save(`Incident_${incident.type}_${incident.operatorName.replace(/\s/g, '_')}.pdf`);
  }

  const TYPE_EMOJI: Record<string, string> = { SOS: '🆘', MAN_DOWN: '💥', MALORE: '🫀', IMMOBILITY: '⏱️', FALL: '📉', SESSION_EXPIRED: '⏰' };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2A2D3E' }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#ECEFF4' }}>Incident Report</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8899AA' }}>Timeline dettagliata per ogni allarme</p>
        </div>
        <button onClick={fetchIncidents} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#8899AA' }}><RefreshCw size={16} /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40"><RefreshCw size={24} className="animate-spin" style={{ color: '#8899AA' }} /></div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <CheckCircle size={40} style={{ color: '#2ECC71' }} />
            <p className="mt-3 text-sm" style={{ color: '#8899AA' }}>Nessun incidente</p>
          </div>
        ) : incidents.map(inc => {
          const isExpanded = expandedId === inc.id;
          const emoji = TYPE_EMOJI[inc.type] || '🚨';
          const statusColor = inc.resolvedBy ? '#2ECC71' : inc.cancelled ? '#95A5A6' : '#E74C3C';
          return (
            <div key={inc.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
              <div className="h-1" style={{ backgroundColor: statusColor }} />
              <div className="p-4 cursor-pointer" onClick={() => toggleExpand(inc.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: '#ECEFF4' }}>{inc.type}</span>
                        <span className="text-xs" style={{ color: '#8899AA' }}>{inc.operatorName}</span>
                      </div>
                      <span className="text-xs" style={{ color: '#8899AA' }}>{new Date(inc.createdAt).toLocaleString('it-IT')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ color: statusColor, backgroundColor: `${statusColor}15` }}>
                      {inc.resolvedBy ? `Risolto (${inc.resolvedBy})` : inc.cancelled ? 'Falso allarme' : 'Attivo'}
                    </span>
                    {isExpanded ? <ChevronUp size={14} style={{ color: '#8899AA' }} /> : <ChevronDown size={14} style={{ color: '#8899AA' }} />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid #2A2D3E' }}>
                  {/* GPS */}
                  {inc.lat && (
                    <div className="flex items-center gap-2 text-xs pt-2" style={{ color: '#3B82F6' }}>
                      <MapPin size={12} />
                      <span>{inc.lat.toFixed(5)}, {inc.lng?.toFixed(5)}</span>
                      <a href={`https://maps.google.com/?q=${inc.lat},${inc.lng}`} target="_blank" rel="noreferrer"
                         className="underline">Mappa</a>
                    </div>
                  )}

                  {/* Timeline */}
                  {eventLogs.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold" style={{ color: '#8899AA' }}>Timeline</p>
                      {eventLogs.map(log => {
                        const cfg = EVENT_ICONS[log.eventType] || { icon: <Clock size={14} />, color: '#8899AA', label: log.eventType };
                        return (
                          <div key={log.id} className="flex items-start gap-3 py-1.5 text-xs" style={{ borderLeft: `2px solid ${cfg.color}`, paddingLeft: '10px' }}>
                            <span style={{ color: cfg.color }}>{cfg.icon}</span>
                            <div className="flex-1">
                              <span style={{ color: '#ECEFF4' }}>{cfg.label}</span>
                              {log.recipientName && <span style={{ color: '#8899AA' }}> → {log.recipientName}</span>}
                              {log.recipientPhone && <span style={{ color: '#4A5568' }}> ({log.recipientPhone})</span>}
                              {log.channel && <span className="ml-1 px-1 py-0.5 rounded" style={{ color: '#8899AA', backgroundColor: '#2A2D3E', fontSize: '10px' }}>{log.channel}</span>}
                              {log.responseBy && <span style={{ color: '#2ECC71' }}> — {log.responseBy}: {log.responseType}</span>}
                              {log.notes && <span style={{ color: '#F39C12' }}> ({log.notes})</span>}
                            </div>
                            <span style={{ color: '#4A5568' }}>{formatTime(log.timestamp)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: '#4A5568' }}>Nessun dettaglio disponibile</p>
                  )}

                  {/* Export */}
                  <button onClick={() => exportPdf(inc)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium"
                    style={{ backgroundColor: '#2A2D3E', color: '#8899AA' }}>
                    <FileText size={12} /> Esporta PDF Report
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
