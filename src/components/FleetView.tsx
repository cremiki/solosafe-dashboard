import React, { useState, useEffect } from 'react';
import { Users, Search, AlertTriangle, Database, HardDrive, RefreshCw } from 'lucide-react';
import OperatorCard from './OperatorCard';
import AlarmMapModal from './AlarmMapModal';
import { mockOperators, companyInfo as mockCompanyInfo, Operator, OperatorStatus } from '../data/mockOperators';
import { useFleetData } from '../hooks/useFleetData';

type StatusFilter = 'TUTTI' | OperatorStatus;

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

interface FleetViewProps {
  onOpenOperator?: (operatorId: string, tab?: 'status' | 'alarms') => void;
}

export default function FleetView({ onOpenOperator }: FleetViewProps = {}) {
  const [filter, setFilter] = useState<StatusFilter>('TUTTI');
  const [mapOp, setMapOp] = useState<Operator | null>(null);
  const [search, setSearch] = useState('');
  const now = useCurrentTime();
  const { operators: dbOperators, company: dbCompany, loading, error, source, refetch } = useFleetData();

  // Use DB data if available, fallback to mock
  const operators = source === 'db' ? dbOperators : mockOperators;
  const companyInfo = source === 'db' ? dbCompany : mockCompanyInfo;

  const filtered = operators
    .filter(op => filter === 'TUTTI' || op.status === filter)
    .filter(op => op.name.toLowerCase().includes(search.toLowerCase()) ||
                  op.group.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const priority: Record<OperatorStatus, number> = { ALLARME: 0, PROTETTO: 1, STANDBY: 2, OFFLINE: 3 };
      return priority[a.status] - priority[b.status];
    });

  const counts = {
    total: operators.length,
    protetto: operators.filter(o => o.status === 'PROTETTO').length,
    standby: operators.filter(o => o.status === 'STANDBY').length,
    allarme: operators.filter(o => o.status === 'ALLARME').length,
    offline: operators.filter(o => o.status === 'OFFLINE').length,
  };

  const alarmActive = counts.allarme > 0;

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2A2D3E' }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#ECEFF4' }}>
            {loading ? 'Caricamento...' : companyInfo.name}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs" style={{ color: '#8899AA' }}>Vista flotta operatori in tempo reale</p>
            {/* Data source indicator */}
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                  style={{
                    color: source === 'db' ? '#2ECC71' : '#F39C12',
                    backgroundColor: source === 'db' ? 'rgba(46,204,113,0.1)' : 'rgba(243,156,18,0.1)',
                  }}>
              {source === 'db' ? <Database size={10} /> : <HardDrive size={10} />}
              {source === 'db' ? 'Live DB' : 'Dati mock'}
            </span>
            {source === 'db' && (
              <button onClick={refetch} className="p-0.5 rounded hover:bg-white/5 transition-colors" style={{ color: '#8899AA' }}>
                <RefreshCw size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-5">
          {/* Slot meter */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
            <div className="text-right">
              <p className="text-xs" style={{ color: '#8899AA' }}>Slot attivi</p>
              <p className="text-sm font-bold" style={{ color: '#ECEFF4' }}>
                <span style={{ color: companyInfo.slotsUsed >= companyInfo.slotsTotal ? '#E74C3C' : '#2ECC71' }}>
                  {companyInfo.slotsUsed}
                </span>
                /{companyInfo.slotsTotal}
              </p>
            </div>
            <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2D3E' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${companyInfo.slotsTotal > 0 ? (companyInfo.slotsUsed / companyInfo.slotsTotal) * 100 : 0}%`,
                  backgroundColor: companyInfo.slotsTotal > 0 && companyInfo.slotsUsed / companyInfo.slotsTotal > 0.85 ? '#F39C12' : '#2ECC71',
                }}
              />
            </div>
          </div>

          {/* Alarm indicator */}
          {alarmActive && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg alarm-pulse"
                 style={{ backgroundColor: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)' }}>
              <AlertTriangle size={18} className="text-red-400" />
              <span className="text-sm font-bold text-red-300">{counts.allarme} ALLARMI</span>
            </div>
          )}

          {/* Clock */}
          <div className="text-right">
            <p className="text-lg font-mono font-bold" style={{ color: '#ECEFF4' }}>
              {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-xs" style={{ color: '#8899AA' }}>
              {now.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      {/* Toolbar: stats + search + filter */}
      <div className="px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #1A1D27' }}>
        {/* Status counters */}
        <div className="flex items-center gap-2">
          {([
            { key: 'TUTTI' as StatusFilter, label: 'Tutti', count: counts.total, color: '#8899AA' },
            { key: 'PROTETTO' as StatusFilter, label: 'Protetti', count: counts.protetto, color: '#2ECC71' },
            { key: 'STANDBY' as StatusFilter, label: 'Standby', count: counts.standby, color: '#95A5A6' },
            { key: 'ALLARME' as StatusFilter, label: 'Allarme', count: counts.allarme, color: '#E74C3C' },
            { key: 'OFFLINE' as StatusFilter, label: 'Offline', count: counts.offline, color: '#4A5568' },
          ]).map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: filter === key ? '#ECEFF4' : '#8899AA',
                backgroundColor: filter === key ? `${color}20` : 'transparent',
                border: `1px solid ${filter === key ? `${color}40` : 'transparent'}`,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {label}
              <span className="ml-1 font-bold" style={{ color }}>{count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8899AA' }} />
          <input
            type="text"
            placeholder="Cerca operatore o gruppo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2A2D3E',
              color: '#ECEFF4',
              width: '260px',
            }}
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 px-4 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(243,156,18,0.1)', border: '1px solid rgba(243,156,18,0.3)', color: '#F39C12' }}>
          Connessione DB non riuscita — visualizzazione dati mock. Errore: {error}
        </div>
      )}

      {/* Operator grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin" style={{ color: '#8899AA' }} />
            <p className="mt-4 text-sm" style={{ color: '#8899AA' }}>Caricamento operatori...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(op => (
                <div key={op.id} className="relative group">
                  <div onClick={() => onOpenOperator?.(op.id, 'status')} className="cursor-pointer">
                    <OperatorCard operator={op} onShowMap={setMapOp} />
                  </div>
                  {onOpenOperator && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenOperator(op.id, 'alarms'); }}
                      className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'rgba(230,57,70,0.9)', color: '#fff' }}
                      title="Impostazioni allarmi">
                      ⚙
                    </button>
                  )}
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Users size={48} style={{ color: '#2A2D3E' }} />
                <p className="mt-4 text-sm" style={{ color: '#8899AA' }}>
                  Nessun operatore trovato
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Map modal */}
      {mapOp && (
        <AlarmMapModal
          name={mapOp.name}
          state={mapOp.status}
          lat={45.49 + Math.random() * 0.05}
          lng={9.17 + Math.random() * 0.05}
          batteryPhone={mapOp.batteryPhone}
          onClose={() => setMapOp(null)}
        />
      )}
    </>
  );
}
