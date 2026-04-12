import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LatLng } from '../lib/geofence';

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

export interface GeofenceArea {
  id: string;
  name: string;
  description: string | null;
  color: string;
  polygon: LatLng[];
  alert_on_exit: boolean;
  alert_on_enter: boolean;
  active: boolean;
  created_at: string;
  operatorCount?: number;
}

export interface GeofenceEvent {
  id: string;
  operator_id: string;
  geofence_id: string;
  event_type: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  operatorName?: string;
  geofenceName?: string;
}

export function useGeofences() {
  const [areas, setAreas] = useState<GeofenceArea[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAreas = useCallback(async () => {
    const { data } = await supabase
      .from('geofence_areas')
      .select('*, operator_geofences(operator_id)')
      .eq('company_id', COMPANY_ID)
      .order('name');

    if (data) {
      setAreas(data.map((a: any) => ({
        ...a,
        polygon: typeof a.polygon === 'string' ? JSON.parse(a.polygon) : a.polygon,
        operatorCount: a.operator_geofences?.length || 0,
      })));
    }
    setLoading(false);
  }, []);

  const fetchEvents = useCallback(async (limit = 50) => {
    const { data } = await supabase
      .from('geofence_events')
      .select('*, operators(name), geofence_areas(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (data) {
      setEvents(data.map((e: any) => ({
        ...e,
        operatorName: e.operators?.name,
        geofenceName: e.geofence_areas?.name,
      })));
    }
  }, []);

  useEffect(() => {
    fetchAreas();
    fetchEvents();
  }, [fetchAreas, fetchEvents]);

  const createArea = useCallback(async (area: {
    name: string; description?: string; color: string;
    polygon: LatLng[]; alert_on_exit: boolean; alert_on_enter: boolean;
  }) => {
    const { error } = await supabase.from('geofence_areas').insert({
      company_id: COMPANY_ID,
      ...area,
      polygon: JSON.stringify(area.polygon),
    });
    if (error) throw error;
    await fetchAreas();
  }, [fetchAreas]);

  const deleteArea = useCallback(async (id: string) => {
    await supabase.from('operator_geofences').delete().eq('geofence_id', id);
    await supabase.from('geofence_events').delete().eq('geofence_id', id);
    await supabase.from('geofence_areas').delete().eq('id', id);
    await fetchAreas();
  }, [fetchAreas]);

  const toggleArea = useCallback(async (id: string, active: boolean) => {
    await supabase.from('geofence_areas').update({ active }).eq('id', id);
    await fetchAreas();
  }, [fetchAreas]);

  const assignOperator = useCallback(async (operatorId: string, geofenceId: string, active: boolean) => {
    if (active) {
      await supabase.from('operator_geofences').upsert({ operator_id: operatorId, geofence_id: geofenceId, active: true });
    } else {
      await supabase.from('operator_geofences').delete().eq('operator_id', operatorId).eq('geofence_id', geofenceId);
    }
    await fetchAreas();
  }, [fetchAreas]);

  return { areas, events, loading, fetchAreas, fetchEvents, createArea, deleteArea, toggleArea, assignOperator };
}
