import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Bell, BellOff, Zap, Hexagon } from 'lucide-react';
import { supabase, GOOGLE_MAPS_API_KEY } from '../lib/supabase';
import { AlarmNotification } from '../hooks/useAlarmNotifications';
import { useGeofences } from '../hooks/useGeofences';
import { createMarkerSvgUrl } from '../lib/markerIcons';
import { polygonCenter, LatLng } from '../lib/geofence';
import GeofencePanel from './GeofencePanel';

type OpStatus = 'alarm' | 'protected' | 'standby' | 'offline';

interface MapOperator {
  id: string;
  name: string;
  state: OpStatus;
  preset: string;
  batteryPhone: number;
  batteryTag: number | null;
  lastSeen: string;
  lat: number;
  lng: number;
  iconType: string;
}

const STATUS_COLORS: Record<OpStatus, string> = {
  alarm: '#E74C3C', protected: '#2ECC71', standby: '#95A5A6', offline: '#4A5568',
};
const STATUS_LABELS: Record<OpStatus, string> = {
  alarm: 'Allarme', protected: 'Protetto', standby: 'Standby', offline: 'Offline',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'ora';
  if (diff < 60) return `${diff}min fa`;
  return `${Math.floor(diff / 60)}h ${diff % 60}min fa`;
}

function svgUrl(color: string, size: number): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${color}" stroke="white" stroke-width="2"/></svg>`
  )}`;
}

type StatusFilter = 'ALL' | OpStatus;

// Load Google Maps script once
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

interface MapViewProps {
  latestAlarm?: AlarmNotification | null;
  hasActiveAlarms?: boolean;
  onAlarmShown?: () => void;
  audioEnabled?: boolean;
  onEnableAudio?: () => void;
  onSimulateAlarm?: () => void;
}

export default function MapView({ latestAlarm, hasActiveAlarms, onAlarmShown, audioEnabled, onEnableAudio, onSimulateAlarm }: MapViewProps) {
  const [operators, setOperators] = useState<MapOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapsReady, setMapsReady] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [mapType, setMapType] = useState<string>('hybrid');
  const [showGeofence, setShowGeofence] = useState(false);
  const [showPolygons, setShowPolygons] = useState(true);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState<LatLng[] | null>(null);

  const geofence = useGeofences();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const geoPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const geoLabelsRef = useRef<google.maps.OverlayView[]>([]);
  const drawListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const drawMarkersRef = useRef<google.maps.Marker[]>([]);
  const alarmMarkerRef = useRef<google.maps.Marker | null>(null);
  const lastAlarmIdRef = useRef<string | null>(null);

  // Load script
  useEffect(() => {
    loadGoogleMaps().then(() => setMapsReady(true)).catch(console.error);
  }, []);

  // Fetch operators
  const fetchOperators = useCallback(async () => {
    const { data } = await supabase
      .from('operator_status')
      .select('*, operators!inner(id, name, default_preset, icon_name, devices(icon_type))')
      .not('last_lat', 'is', null);
    if (data) {
      setOperators(data.map((r: any) => ({
        id: r.operators.id, name: r.operators.name,
        state: r.state as OpStatus, preset: r.operators.default_preset || 'WAREHOUSE',
        batteryPhone: r.battery_phone ?? 0, batteryTag: r.battery_tag,
        lastSeen: r.last_seen || new Date().toISOString(),
        lat: r.last_lat, lng: r.last_lng,
        iconType: r.operators.icon_name || r.operators.devices?.icon_type || 'shield',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOperators(); }, [fetchOperators]);

  // Create map once ready
  useEffect(() => {
    if (!mapsReady || !containerRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 45.49, lng: 9.20 },
      zoom: 12,
      mapTypeId: mapType,
      gestureHandling: 'greedy',
      fullscreenControl: true,
      streetViewControl: true,
      zoomControl: true,
    });
    infoRef.current = new google.maps.InfoWindow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  // Map type
  useEffect(() => { mapRef.current?.setMapTypeId(mapType); }, [mapType]);

  // Markers
  useEffect(() => {
    const map = mapRef.current;
    const info = infoRef.current;
    if (!map || !info) return;

    markersRef.current.forEach(m => m.setMap(null));

    const filtered = operators.filter(op => filter === 'ALL' || op.state === filter);

    markersRef.current = filtered.map(op => {
      const isAlarm = op.state === 'alarm';
      const sz = isAlarm ? 44 : 32;
      const totalSz = sz + 10; // account for pulse ring overflow
      const marker = new google.maps.Marker({
        position: { lat: op.lat, lng: op.lng },
        map,
        icon: {
          url: createMarkerSvgUrl(op.iconType, STATUS_COLORS[op.state], sz, isAlarm),
          scaledSize: new google.maps.Size(totalSz, totalSz),
          anchor: new google.maps.Point(totalSz / 2, totalSz / 2),
        },
        zIndex: isAlarm ? 100 : 1,
        title: `${op.name} — ${STATUS_LABELS[op.state]}`,
        animation: isAlarm ? google.maps.Animation.BOUNCE : undefined,
      });
      marker.addListener('click', () => {
        const c = STATUS_COLORS[op.state];
        info.setContent(`
          <div style="font-family:Inter,sans-serif;color:#1A1D27;min-width:220px;padding:4px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:10px;height:10px;border-radius:50%;background:${c}"></div>
              <strong style="font-size:14px">${op.name}</strong>
            </div>
            <div style="font-size:12px;color:#555;line-height:1.8">
              <div>Stato: <strong style="color:${c}">${STATUS_LABELS[op.state]}</strong></div>
              <div>Preset: ${op.preset}</div>
              <div>Batteria: ${op.batteryPhone}%${op.batteryTag !== null ? ` | Tag: ${op.batteryTag}%` : ''}</div>
              <div>Heartbeat: ${timeAgo(op.lastSeen)}</div>
              <div style="font-size:11px;color:#888">${op.lat.toFixed(5)}, ${op.lng.toFixed(5)}</div>
            </div>
            ${isAlarm ? '<button style="margin-top:8px;width:100%;padding:6px 0;background:#E74C3C;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">Intervieni</button>' : ''}
          </div>
        `);
        info.open(map, marker);
      });
      return marker;
    });

    if (filtered.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filtered.forEach(op => bounds.extend({ lat: op.lat, lng: op.lng }));
      map.fitBounds(bounds, 60);
    }
  }, [operators, filter, mapsReady]);

  // React to new alarm — center + create alarm marker (no InfoWindow, toast handles info)
  useEffect(() => {
    if (!latestAlarm || !mapRef.current) return;
    if (latestAlarm.id === lastAlarmIdRef.current) return;
    lastAlarmIdRef.current = latestAlarm.id;

    const map = mapRef.current;

    // Remove previous alarm marker
    if (alarmMarkerRef.current) {
      alarmMarkerRef.current.setMap(null);
      alarmMarkerRef.current = null;
    }

    if (latestAlarm.lat && latestAlarm.lng) {
      map.panTo({ lat: latestAlarm.lat, lng: latestAlarm.lng });
      map.setZoom(16);

      const alarmSz = 52;
      const totalSz = alarmSz + 10;
      alarmMarkerRef.current = new google.maps.Marker({
        position: { lat: latestAlarm.lat, lng: latestAlarm.lng },
        map,
        icon: {
          url: createMarkerSvgUrl('shield', '#E74C3C', alarmSz, true),
          scaledSize: new google.maps.Size(totalSz, totalSz),
          anchor: new google.maps.Point(totalSz / 2, totalSz / 2),
        },
        zIndex: 200,
        animation: google.maps.Animation.BOUNCE,
      });
    }

    onAlarmShown?.();
  }, [latestAlarm, onAlarmShown]);

  // Draw geofence polygons on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapsReady) return;

    // Clear old
    geoPolygonsRef.current.forEach(p => p.setMap(null));
    geoPolygonsRef.current = [];

    if (!showPolygons) return;

    geofence.areas.filter(a => a.active).forEach(area => {
      const paths = area.polygon.map(p => ({ lat: p.lat, lng: p.lng }));
      const poly = new google.maps.Polygon({
        paths,
        strokeColor: area.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: area.color,
        fillOpacity: 0.12,
        map,
        zIndex: 1,
      });
      geoPolygonsRef.current.push(poly);

      // Label at center
      const center = polygonCenter(area.polygon);
      const labelMarker = new google.maps.Marker({
        position: center,
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>`
          )}`,
          scaledSize: new google.maps.Size(1, 1),
        },
        label: {
          text: area.name,
          color: area.color,
          fontSize: '11px',
          fontWeight: '600',
        },
        clickable: false,
        zIndex: 0,
      });
      // Store as polygon for cleanup
      geoPolygonsRef.current.push(labelMarker as any);
    });
  }, [geofence.areas, showPolygons, mapsReady]);

  // Drawing mode for new geofence
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapsReady) return;

    // Cleanup previous
    if (drawListenerRef.current) {
      google.maps.event.removeListener(drawListenerRef.current);
      drawListenerRef.current = null;
    }
    drawMarkersRef.current.forEach(m => m.setMap(null));
    drawMarkersRef.current = [];

    if (!drawingMode) return;

    const points: LatLng[] = [];
    map.setOptions({ draggableCursor: 'crosshair', disableDoubleClickZoom: true });

    // Live polyline connecting points
    const polyline = new google.maps.Polyline({
      path: [],
      strokeColor: '#E63946',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      map,
      zIndex: 300,
    });

    // Preview polygon (shown after 2+ points, closed on dblclick)
    const previewPoly = new google.maps.Polygon({
      paths: [],
      strokeColor: '#E63946',
      strokeOpacity: 0.6,
      strokeWeight: 1,
      fillColor: '#E63946',
      fillOpacity: 0.1,
      map,
      zIndex: 299,
    });

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      points.push(pt);
      setDrawnPolygon([...points]);

      // Update polyline
      polyline.setPath(points.map(p => ({ lat: p.lat, lng: p.lng })));

      // Update preview polygon (fill area)
      if (points.length >= 3) {
        previewPoly.setPaths(points.map(p => ({ lat: p.lat, lng: p.lng })));
      }

      // Add vertex marker
      const m = new google.maps.Marker({
        position: pt,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#E63946',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        zIndex: 301,
        label: points.length === 1 ? { text: '1', color: '#fff', fontSize: '9px', fontWeight: '700' } : undefined,
      });
      drawMarkersRef.current.push(m);
    });

    const dblClickListener = map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
      e.stop?.();
      if (points.length >= 3) {
        // Close the polygon visually
        previewPoly.setPaths(points.map(p => ({ lat: p.lat, lng: p.lng })));
        previewPoly.setOptions({ strokeOpacity: 0.9, fillOpacity: 0.2 });
        polyline.setMap(null);
        setDrawnPolygon([...points]);
      }
      setDrawingMode(false);
    });

    drawListenerRef.current = clickListener;

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(dblClickListener);
      map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
      polyline.setMap(null);
      previewPoly.setMap(null);
      drawMarkersRef.current.forEach(m => m.setMap(null));
      drawMarkersRef.current = [];
    };
  }, [drawingMode, mapsReady]);

  const counts = {
    all: operators.length,
    alarm: operators.filter(o => o.state === 'alarm').length,
    protected: operators.filter(o => o.state === 'protected').length,
    standby: operators.filter(o => o.state === 'standby').length,
    offline: operators.filter(o => o.state === 'offline').length,
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid #2A2D3E' }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#ECEFF4' }}>Mappa Operatori</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8899AA' }}>
            {operators.length} operatori con posizione GPS
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onSimulateAlarm && (
            <button onClick={onSimulateAlarm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: '#F39C12', backgroundColor: 'rgba(243,156,18,0.1)', border: '1px solid rgba(243,156,18,0.3)' }}>
              <Zap size={14} /> Simula Allarme
            </button>
          )}
          {onEnableAudio && (
            <button onClick={onEnableAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: audioEnabled ? '#2ECC71' : '#8899AA',
                backgroundColor: audioEnabled ? 'rgba(46,204,113,0.1)' : 'transparent',
                border: `1px solid ${audioEnabled ? 'rgba(46,204,113,0.3)' : '#2A2D3E'}`,
              }}>
              {audioEnabled ? <Bell size={14} /> : <BellOff size={14} />}
              {audioEnabled ? 'Suono ON' : 'Attiva suono'}
            </button>
          )}
          <div className="w-px h-6" style={{ backgroundColor: '#2A2D3E' }} />
          {(['roadmap', 'satellite', 'hybrid'] as const).map(t => (
            <button key={t} onClick={() => setMapType(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: mapType === t ? '#ECEFF4' : '#8899AA',
                backgroundColor: mapType === t ? '#2A2D3E' : 'transparent',
                border: `1px solid ${mapType === t ? '#3A3D4E' : 'transparent'}`,
              }}>
              {t === 'roadmap' ? 'Mappa' : t === 'satellite' ? 'Satellite' : 'Ibrido'}
            </button>
          ))}
          <div className="w-px h-6" style={{ backgroundColor: '#2A2D3E' }} />
          <button onClick={() => setShowPolygons(!showPolygons)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              color: showPolygons ? '#3B82F6' : '#8899AA',
              backgroundColor: showPolygons ? 'rgba(59,130,246,0.1)' : 'transparent',
              border: `1px solid ${showPolygons ? 'rgba(59,130,246,0.3)' : '#2A2D3E'}`,
            }}>
            <Hexagon size={14} /> Geofence
          </button>
          <button onClick={() => setShowGeofence(!showGeofence)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              color: showGeofence ? '#ECEFF4' : '#8899AA',
              backgroundColor: showGeofence ? '#2A2D3E' : 'transparent',
              border: `1px solid ${showGeofence ? '#3A3D4E' : 'transparent'}`,
            }}>
            {showGeofence ? 'Chiudi pannello' : 'Gestisci'}
          </button>
        </div>
      </header>

      <div className="px-6 py-2 flex items-center gap-2 flex-shrink-0"
           style={{ borderBottom: '1px solid #1A1D27' }}>
        {([
          { key: 'ALL' as StatusFilter, label: 'Tutti', count: counts.all, color: '#8899AA' },
          { key: 'alarm' as StatusFilter, label: 'Allarme', count: counts.alarm, color: '#E74C3C' },
          { key: 'protected' as StatusFilter, label: 'Protetti', count: counts.protected, color: '#2ECC71' },
          { key: 'standby' as StatusFilter, label: 'Standby', count: counts.standby, color: '#95A5A6' },
          { key: 'offline' as StatusFilter, label: 'Offline', count: counts.offline, color: '#4A5568' },
        ]).map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setFilter(key)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              color: filter === key ? '#ECEFF4' : '#8899AA',
              backgroundColor: filter === key ? `${color}20` : 'transparent',
              border: `1px solid ${filter === key ? `${color}40` : 'transparent'}`,
            }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {label} <span className="font-bold" style={{ color }}>{count}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 relative" style={{ backgroundColor: '#0F1117' }}>
        {(!mapsReady || loading) && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 size={32} className="animate-spin" style={{ color: '#8899AA' }} />
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: showGeofence ? 'calc(100%)' : '100%' }} />

        {/* Drawing mode indicator */}
        {drawingMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg"
               style={{ backgroundColor: 'rgba(230,57,70,0.9)', color: '#fff' }}>
            <span className="text-sm font-semibold">Clicca sulla mappa per creare i vertici — Doppio click per chiudere</span>
          </div>
        )}

        {/* Red flash overlay */}
        {hasActiveAlarms && (
          <div className="absolute inset-0 pointer-events-none z-20 alarm-flash-loop" />
        )}

        {/* Geofence panel */}
        {showGeofence && (
          <GeofencePanel
            areas={geofence.areas}
            events={geofence.events}
            onToggleArea={geofence.toggleArea}
            onDeleteArea={geofence.deleteArea}
            onStartDraw={() => { setDrawingMode(true); setDrawnPolygon(null); }}
            onCreate={geofence.createArea}
            drawnPolygon={drawnPolygon}
            onClearDraw={() => { setDrawnPolygon(null); setDrawingMode(false); }}
          />
        )}
      </div>
    </>
  );
}
