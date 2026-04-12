import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, MapPin, Clock, User, Radio } from 'lucide-react';
import { AlarmNotification } from '../hooks/useAlarmNotifications';

const TYPE_LABELS: Record<string, string> = {
  FALL: 'CADUTA',
  IMMOBILITY: 'IMMOBILITÀ',
  SOS: 'SOS MANUALE',
  SOS_TAG: 'SOS TAG',
  MAN_DOWN: 'MAN DOWN',
  SESSION_EXPIRED: 'SESSIONE SCADUTA',
  DURESS: 'DURESS',
  CONFINED_TIMEOUT: 'SPAZIO CONFINATO',
};

interface Props {
  notification: AlarmNotification;
  index: number;
  onDismiss: (id: string) => void;
  onNavigate: () => void;
}

export default function AlarmToast({ notification, index, onDismiss, onNavigate }: Props) {
  const [progress, setProgress] = useState(100);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    requestAnimationFrame(() => setEntering(false));
  }, []);

  // Progress bar countdown 30s
  useEffect(() => {
    const start = Date.now();
    const duration = 30000;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const typeLabel = TYPE_LABELS[notification.type] || notification.type;
  const time = new Date(notification.createdAt);
  const timeStr = time.toLocaleDateString('it-IT', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }) + ', ' + time.toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div
      className="pointer-events-auto transition-all duration-300 ease-out"
      style={{
        transform: entering ? 'translateX(400px)' : 'translateX(0)',
        opacity: notification.dismissed ? 0 : 1,
        marginBottom: 8,
      }}
    >
      <div
        className="rounded-xl overflow-hidden cursor-pointer"
        style={{
          backgroundColor: '#7B0000',
          border: '1px solid #E74C3C',
          boxShadow: '0 4px 24px rgba(231,76,60,0.4)',
          width: 360,
        }}
        onClick={onNavigate}
      >
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="alarm-pulse flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
                   style={{ backgroundColor: 'rgba(231,76,60,0.3)' }}>
                <AlertTriangle size={20} color="#FF6B6B" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Radio size={12} color="#FF6B6B" />
                  <span className="text-xs font-bold tracking-wide" style={{ color: '#FF6B6B' }}>
                    ALLARME {typeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <User size={12} color="#FFB3B3" />
                  <span className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                    {notification.operatorName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock size={11} color="#FF9999" />
                  <span className="text-xs" style={{ color: '#FF9999' }}>{timeStr}</span>
                </div>
                {notification.lat !== null && notification.lng !== null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin size={11} color="#FF9999" />
                    <span className="text-xs font-mono" style={{ color: '#FF9999' }}>
                      {notification.lat.toFixed(4)}, {notification.lng.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDismiss(notification.id); }}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: '#FF9999' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#E74C3C',
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}
