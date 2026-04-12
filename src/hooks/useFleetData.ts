import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Operator, OperatorStatus, PresetType } from '../data/mockOperators';

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

function mapState(dbState: string): OperatorStatus {
  switch (dbState) {
    case 'alarm': return 'ALLARME';
    case 'protected': return 'PROTETTO';
    case 'standby': return 'STANDBY';
    case 'offline': return 'OFFLINE';
    default: return 'OFFLINE';
  }
}

function mapPreset(dbPreset: string | null): PresetType {
  const valid: PresetType[] = ['OFFICE', 'WAREHOUSE', 'CONSTRUCTION', 'INDUSTRY', 'VEHICLE', 'ALTITUDE'];
  if (dbPreset && valid.includes(dbPreset as PresetType)) return dbPreset as PresetType;
  return 'WAREHOUSE';
}

interface CompanyInfo {
  name: string;
  slotsUsed: number;
  slotsTotal: number;
}

export function useFleetData() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [company, setCompany] = useState<CompanyInfo>({ name: '', slotsUsed: 0, slotsTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'db' | 'mock'>('db');

  const fetchFleet = useCallback(async () => {
    try {
      // Fetch company info
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('name, concurrent_slots')
        .eq('id', COMPANY_ID)
        .single();

      if (companyError) {
        console.warn('Company fetch error:', companyError.message);
        throw companyError;
      }

      // Fetch operator_status joined with operators
      const { data: statusData, error: statusError } = await supabase
        .from('operator_status')
        .select('*, operators!inner(id, name, company_id, default_preset, default_session_type, icon_name)');

      if (statusError) {
        console.warn('Status fetch error:', statusError.message);
        throw statusError;
      }

      if (!statusData || statusData.length === 0) {
        setSource('mock');
        setLoading(false);
        return;
      }

      // Fetch active alarms (last 30 min, not resolved)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: activeAlarms } = await supabase
        .from('alarm_events')
        .select('operator_id, type, created_at')
        .gte('created_at', thirtyMinAgo)
        .is('resolved_at', null)
        .eq('cancelled', false)
        .order('created_at', { ascending: false });

      const alarmMap = new Map<string, { type: string; timestamp: string }>();
      (activeAlarms || []).forEach((a: any) => {
        if (!alarmMap.has(a.operator_id)) {
          alarmMap.set(a.operator_id, { type: a.type, timestamp: a.created_at });
        }
      });

      const mapped: Operator[] = statusData
        .filter((row: any) => row.operators.company_id === COMPANY_ID)
        .map((row: any) => {
          const alarm = alarmMap.get(row.operators.id);
          return {
          id: row.operators.id,
          name: row.operators.name,
          status: mapState(row.state),
          preset: mapPreset(row.operators.default_preset),
          batteryPhone: row.battery_phone ?? 0,
          batteryTag: row.battery_tag,
          lastHeartbeat: row.last_seen || new Date().toISOString(),
          sessionType: null,
          sessionStart: null,
          sessionEnd: null,
          group: '',
          iconName: row.operators.icon_name || 'shield',
          alarmType: alarm?.type,
          alarmTimestamp: alarm?.timestamp,
        };
        });

      const activeSlots = mapped.filter(o => o.status === 'PROTETTO' || o.status === 'ALLARME').length;

      setOperators(mapped);
      setCompany({
        name: companyData?.name || 'SoloSafe',
        slotsUsed: activeSlots,
        slotsTotal: companyData?.concurrent_slots || 12,
      });
      setSource('db');
      setError(null);
    } catch (err: any) {
      console.error('Fleet fetch error:', err);
      setError(err.message || String(err));
      setSource('mock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();

    // Realtime subscription — non-blocking, failures don't affect data display
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('operator_status_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'operator_status' },
          (_payload) => {
            fetchFleet();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime: subscribed to operator_status');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime: channel error — data still available via REST');
          }
        });
    } catch (e) {
      console.warn('Realtime subscription failed (non-blocking):', e);
    }

    // Polling fallback — refresh every 30s regardless of realtime status
    const pollId = setInterval(fetchFleet, 30000);

    return () => {
      clearInterval(pollId);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchFleet]);

  return { operators, company, loading, error, source, refetch: fetchFleet };
}
