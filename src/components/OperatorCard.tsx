import React from 'react';
import {
  Shield, ShieldOff, AlertTriangle, WifiOff,
  BatteryLow, BatteryMedium, BatteryFull, BatteryWarning,
  Bluetooth, Clock, HardHat, Truck, Building2, Factory, Mountain, Warehouse, MapPin
} from 'lucide-react';
import { Operator, OperatorStatus, PresetType } from '../data/mockOperators';
import OperatorIcon from './OperatorIcon';

const statusConfig: Record<OperatorStatus, { color: string; bg: string; border: string; label: string; pulse: boolean }> = {
  PROTETTO:  { color: '#2ECC71', bg: 'rgba(46,204,113,0.12)', border: 'rgba(46,204,113,0.3)', label: 'Protetto', pulse: true },
  STANDBY:   { color: '#95A5A6', bg: 'rgba(149,165,166,0.08)', border: 'rgba(149,165,166,0.2)', label: 'Standby', pulse: false },
  ALLARME:   { color: '#E74C3C', bg: 'rgba(231,76,60,0.15)',  border: 'rgba(231,76,60,0.5)',  label: 'Allarme', pulse: true },
  OFFLINE:   { color: '#4A5568', bg: 'rgba(74,85,104,0.08)',  border: 'rgba(74,85,104,0.2)',  label: 'Offline', pulse: false },
};

const presetIcons: Record<PresetType, React.ReactNode> = {
  OFFICE:       <Building2 size={14} />,
  WAREHOUSE:    <Warehouse size={14} />,
  CONSTRUCTION: <HardHat size={14} />,
  INDUSTRY:     <Factory size={14} />,
  VEHICLE:      <Truck size={14} />,
  ALTITUDE:     <Mountain size={14} />,
};

const sessionLabels: Record<string, { label: string; color: string }> = {
  TURNO:            { label: 'Turno', color: '#3B82F6' },
  CONTINUA:         { label: 'Continua', color: '#8B5CF6' },
  INTERVENTO:       { label: 'Intervento', color: '#F39C12' },
  SPAZIO_CONFINATO: { label: 'Sp. Confinato', color: '#E74C3C' },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'ora';
  if (diff < 60) return `${diff}min fa`;
  const h = Math.floor(diff / 60);
  return `${h}h ${diff % 60}min fa`;
}

function BatteryIcon({ level }: { level: number }) {
  if (level <= 0) return <BatteryWarning size={16} className="text-red-500" />;
  if (level <= 20) return <BatteryLow size={16} className="text-red-400" />;
  if (level <= 50) return <BatteryMedium size={16} className="text-yellow-400" />;
  return <BatteryFull size={16} className="text-green-400" />;
}

interface Props {
  operator: Operator;
  onShowMap?: (op: Operator) => void;
}

export default function OperatorCard({ operator, onShowMap }: Props) {
  const cfg = statusConfig[operator.status];
  const isAlarm = operator.status === 'ALLARME';

  return (
    <div
      className={`relative rounded-xl p-4 transition-all duration-300 ${isAlarm ? 'alarm-card' : ''}`}
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        order: isAlarm ? -1 : 0,
      }}
    >
      {/* Status indicator bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ backgroundColor: cfg.color }}
      />

      {/* Header: name + status */}
      <div className="flex items-center justify-between mt-1 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <OperatorIcon iconName={operator.iconName} status={operator.status} size={36} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: '#ECEFF4' }}>
              {operator.name}
            </h3>
            <span className="text-xs font-medium" style={{ color: cfg.color }}>
              {cfg.label}
              {isAlarm && operator.alarmType && (
                <span className="ml-1.5 text-xs opacity-80">
                  — {operator.alarmType}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {onShowMap && (
            <button onClick={() => onShowMap(operator)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: '#3B82F6' }} title="Mostra su mappa">
              <MapPin size={14} />
            </button>
          )}
          <span className="text-xs px-2 py-0.5 rounded-md" style={{ color: '#8899AA', backgroundColor: '#1A1D27' }}>
            {operator.group}
          </span>
        </div>
      </div>

      {/* Alarm timestamp */}
      {isAlarm && operator.alarmTimestamp && (
        <div className="mb-3 px-3 py-2 rounded-lg flex items-center gap-2"
             style={{ backgroundColor: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.25)' }}>
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-xs font-medium text-red-300">
            Allarme attivo da {timeAgo(operator.alarmTimestamp)}
          </span>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Preset */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8899AA' }}>
          {presetIcons[operator.preset]}
          <span>{operator.preset}</span>
        </div>

        {/* Session */}
        <div className="flex items-center gap-1.5 text-xs">
          {operator.sessionType ? (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    color: sessionLabels[operator.sessionType].color,
                    backgroundColor: `${sessionLabels[operator.sessionType].color}18`,
                  }}>
              {sessionLabels[operator.sessionType].label}
            </span>
          ) : (
            <span style={{ color: '#4A5568' }}>—</span>
          )}
        </div>

        {/* Battery phone */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8899AA' }}>
          <BatteryIcon level={operator.batteryPhone} />
          <span>{operator.batteryPhone}%</span>
        </div>

        {/* Battery tag */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8899AA' }}>
          {operator.batteryTag !== null ? (
            <>
              <Bluetooth size={14} className="text-blue-400" />
              <span>Tag {operator.batteryTag}%</span>
            </>
          ) : (
            <>
              <Bluetooth size={14} style={{ color: '#4A5568' }} />
              <span style={{ color: '#4A5568' }}>No tag</span>
            </>
          )}
        </div>

        {/* Heartbeat */}
        <div className="col-span-2 flex items-center gap-1.5 text-xs mt-1" style={{ color: '#8899AA' }}>
          <Clock size={14} />
          <span>Heartbeat: {timeAgo(operator.lastHeartbeat)}</span>
        </div>
      </div>
    </div>
  );
}
