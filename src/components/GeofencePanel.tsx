import React, { useState } from 'react';
import {
  Plus, Trash2, ToggleLeft, ToggleRight, MapPin, Users, Clock,
  X, Save, Loader2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { GeofenceArea, GeofenceEvent } from '../hooks/useGeofences';
import { LatLng } from '../lib/geofence';

interface Props {
  areas: GeofenceArea[];
  events: GeofenceEvent[];
  onToggleArea: (id: string, active: boolean) => void;
  onDeleteArea: (id: string) => void;
  onStartDraw: () => void;
  onCreate: (area: {
    name: string; description?: string; color: string;
    polygon: LatLng[]; alert_on_exit: boolean; alert_on_enter: boolean;
  }) => Promise<void>;
  drawnPolygon: LatLng[] | null;
  onClearDraw: () => void;
}

export default function GeofencePanel({
  areas, events, onToggleArea, onDeleteArea, onStartDraw, onCreate, drawnPolygon, onClearDraw
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [alertExit, setAlertExit] = useState(true);
  const [alertEnter, setAlertEnter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const COLORS = ['#3B82F6', '#2ECC71', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C', '#E67E22', '#8899AA'];

  async function handleSave() {
    if (!name.trim()) { setError('Nome obbligatorio'); return; }
    if (!drawnPolygon || drawnPolygon.length < 3) { setError('Disegna un poligono sulla mappa (min 3 punti)'); return; }
    setSaving(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), description: desc || undefined, color, polygon: drawnPolygon, alert_on_exit: alertExit, alert_on_enter: alertEnter });
      setShowCreate(false);
      setName(''); setDesc(''); setColor('#3B82F6'); setAlertExit(true); setAlertEnter(false);
      onClearDraw();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div className="absolute top-0 right-0 w-80 h-full overflow-y-auto z-10"
         style={{ backgroundColor: '#1A1D27', borderLeft: '1px solid #2A2D3E' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
           style={{ backgroundColor: '#1A1D27', borderBottom: '1px solid #2A2D3E' }}>
        <h3 className="text-sm font-bold" style={{ color: '#ECEFF4' }}>Geofence</h3>
        <button onClick={() => { setShowCreate(true); onStartDraw(); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: '#E63946', color: '#fff' }}>
          <Plus size={14} /> Nuova Area
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid #2A2D3E' }}>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                 style={{ backgroundColor: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.25)' }}>
              <AlertCircle size={12} className="text-red-400" />
              <span className="text-xs text-red-300">{error}</span>
            </div>
          )}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#8899AA' }}>Nome area</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="es. Zona A"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#8899AA' }}>Descrizione</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Opzionale"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }} />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#8899AA' }}>Colore</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    border: color === c ? '2px solid #fff' : '2px solid transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#ECEFF4' }}>
              <input type="checkbox" checked={alertExit} onChange={e => setAlertExit(e.target.checked)}
                     style={{ accentColor: '#E63946' }} /> Allarme uscita
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#ECEFF4' }}>
              <input type="checkbox" checked={alertEnter} onChange={e => setAlertEnter(e.target.checked)}
                     style={{ accentColor: '#E63946' }} /> Allarme entrata
            </label>
          </div>
          <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#0F1117', color: drawnPolygon ? '#2ECC71' : '#F39C12' }}>
            {drawnPolygon ? `Poligono: ${drawnPolygon.length} vertici` : 'Clicca sulla mappa per disegnare i vertici. Doppio click per chiudere.'}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: '#E63946', color: '#fff' }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salva
            </button>
            <button onClick={() => { setShowCreate(false); onClearDraw(); }}
              className="px-3 py-2 rounded-lg text-xs" style={{ border: '1px solid #2A2D3E', color: '#8899AA' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Areas list */}
      <div className="p-4 space-y-2">
        {areas.map(area => (
          <div key={area.id} className="rounded-lg overflow-hidden"
               style={{ backgroundColor: '#0F1117', border: `1px solid ${area.active ? area.color + '40' : '#2A2D3E'}` }}>
            <div className="flex items-center justify-between p-3 cursor-pointer"
                 onClick={() => setExpandedId(expandedId === area.id ? null : area.id)}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color, opacity: area.active ? 1 : 0.3 }} />
                <span className="text-sm font-medium" style={{ color: area.active ? '#ECEFF4' : '#8899AA' }}>{area.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#8899AA' }}>
                  <Users size={10} className="inline mr-1" />{area.operatorCount}
                </span>
                <button onClick={e => { e.stopPropagation(); onToggleArea(area.id, !area.active); }}
                  style={{ color: area.active ? '#2ECC71' : '#4A5568' }}>
                  {area.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                {expandedId === area.id ? <ChevronUp size={14} style={{ color: '#8899AA' }} /> : <ChevronDown size={14} style={{ color: '#8899AA' }} />}
              </div>
            </div>
            {expandedId === area.id && (
              <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid #2A2D3E' }}>
                {area.description && <p className="text-xs mt-2" style={{ color: '#8899AA' }}>{area.description}</p>}
                <div className="flex items-center gap-3 text-xs" style={{ color: '#8899AA' }}>
                  {area.alert_on_exit && <span style={{ color: '#F39C12' }}>Allarme uscita</span>}
                  {area.alert_on_enter && <span style={{ color: '#E74C3C' }}>Allarme entrata</span>}
                  <span>{area.polygon.length} vertici</span>
                </div>
                {deleteConfirm === area.id ? (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => { onDeleteArea(area.id); setDeleteConfirm(null); }}
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: 'rgba(231,76,60,0.2)', color: '#E74C3C' }}>Conferma</button>
                    <button onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 rounded text-xs" style={{ color: '#8899AA' }}>Annulla</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(area.id)}
                    className="flex items-center gap-1 text-xs mt-1" style={{ color: '#8899AA' }}>
                    <Trash2 size={12} /> Elimina area
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {areas.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: '#8899AA' }}>Nessuna area geofence</p>
        )}
      </div>

      {/* Recent events */}
      {events.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-xs font-semibold mb-2" style={{ color: '#8899AA' }}>Eventi recenti</h4>
          <div className="space-y-1">
            {events.slice(0, 10).map(ev => (
              <div key={ev.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded"
                   style={{ backgroundColor: '#1A1D27' }}>
                <span style={{ color: ev.event_type === 'EXIT' ? '#F39C12' : '#E74C3C' }}>
                  {ev.event_type === 'EXIT' ? '↗' : '↙'}
                </span>
                <span style={{ color: '#ECEFF4' }}>{ev.operatorName}</span>
                <span style={{ color: '#4A5568' }}>—</span>
                <span style={{ color: '#8899AA' }}>{ev.geofenceName}</span>
                <span className="ml-auto" style={{ color: '#4A5568' }}>
                  {new Date(ev.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
