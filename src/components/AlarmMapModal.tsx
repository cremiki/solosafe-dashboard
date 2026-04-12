import React, { useEffect, useRef } from 'react';
import { X, Phone, UserCheck } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY } from '../lib/supabase';

interface Props {
  name: string;
  state: string;
  lat: number;
  lng: number;
  batteryPhone?: number;
  onClose: () => void;
}

function svgUrl(color: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/></svg>`
  )}`;
}

export default function AlarmMapModal({ name, state, lat, lng, batteryPhone, onClose }: Props) {
  const isAlarm = state === 'alarm' || state === 'ALLARME';
  const color = isAlarm ? '#E74C3C' : '#2ECC71';
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 17,
      mapTypeId: 'hybrid',
      gestureHandling: 'greedy',
      fullscreenControl: true,
      zoomControl: true,
    });

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      icon: {
        url: svgUrl(color),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20),
      },
      animation: isAlarm ? google.maps.Animation.BOUNCE : undefined,
    });

    const info = new google.maps.InfoWindow({
      content: `
        <div style="font-family:Inter,sans-serif;color:#1A1D27;min-width:160px;padding:4px">
          <strong style="font-size:13px">${name}</strong>
          <div style="font-size:11px;color:#555;margin-top:4px">
            <div>Stato: <span style="color:${color};font-weight:600">${isAlarm ? 'ALLARME' : state}</span></div>
            ${batteryPhone !== undefined ? `<div>Batteria: ${batteryPhone}%</div>` : ''}
            <div style="color:#888">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          </div>
        </div>
      `,
    });
    info.open(map, marker);
  }, [lat, lng, name, state, color, isAlarm, batteryPhone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl rounded-xl overflow-hidden"
           style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E', height: '70vh' }}>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderBottom: '1px solid #2A2D3E' }}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isAlarm ? 'alarm-pulse' : ''}`}
                 style={{ backgroundColor: color }} />
            <h3 className="text-sm font-bold" style={{ color: '#ECEFF4' }}>{name}</h3>
            <span className="text-xs px-2 py-0.5 rounded" style={{ color, backgroundColor: `${color}18` }}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAlarm && (
              <>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: '#F39C12', color: '#0F1117' }}>
                  <UserCheck size={14} /> Intervieni
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: '#3B82F6', color: '#fff' }}>
                  <Phone size={14} /> Chiama
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"
                    style={{ color: '#8899AA' }}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div ref={mapRef} style={{ height: 'calc(100% - 48px)', width: '100%' }} />
      </div>
    </div>
  );
}
