import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

export interface AlarmNotification {
  id: string;
  operatorId: string;
  operatorName: string;
  type: string;
  group: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  dismissed: boolean;
}

// Looping alarm sound — returns a stop function
function startAlarmLoop(): () => void {
  let stopped = false;
  let ctx: AudioContext | null = null;

  try {
    ctx = new AudioContext();
  } catch { return () => {}; }

  const loop = () => {
    if (stopped || !ctx) return;

    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.frequency.value = freq;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx!.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + start + dur);
      osc.start(ctx!.currentTime + start);
      osc.stop(ctx!.currentTime + start + dur);
    };

    // 3 beeps identici 880Hz
    beep(880, 0, 0.2);
    beep(880, 0.3, 0.2);
    beep(880, 0.6, 0.2);

    // Repeat after 1.5s
    setTimeout(loop, 1500);
  };

  loop();

  return () => {
    stopped = true;
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
  };
}

export function useAlarmNotifications() {
  const [notifications, setNotifications] = useState<AlarmNotification[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [latestAlarm, setLatestAlarm] = useState<AlarmNotification | null>(null);
  const audioEnabledRef = useRef(false);
  const stopSoundRef = useRef<(() => void) | null>(null);

  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);

  // Start/stop sound loop based on active (non-dismissed) notifications
  const activeCount = notifications.filter(n => !n.dismissed).length;

  useEffect(() => {
    if (activeCount > 0 && audioEnabledRef.current) {
      // Start looping if not already
      if (!stopSoundRef.current) {
        stopSoundRef.current = startAlarmLoop();
      }
    } else {
      // Stop sound
      if (stopSoundRef.current) {
        stopSoundRef.current();
        stopSoundRef.current = null;
      }
    }
  }, [activeCount, audioEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopSoundRef.current) {
        stopSoundRef.current();
        stopSoundRef.current = null;
      }
    };
  }, []);

  const enableAudio = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0;
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    } catch { /* ignore */ }
    setAudioEnabled(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 300);
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Simulate: pick a random PROTECTED operator and use their actual GPS
  const simulateAlarm = useCallback(async () => {
    // Fetch a protected operator with GPS
    const { data: statusData } = await supabase
      .from('operator_status')
      .select('operator_id, last_lat, last_lng, operators!inner(name)')
      .eq('state', 'protected')
      .not('last_lat', 'is', null)
      .limit(10);

    if (!statusData || statusData.length === 0) return;

    const pick = statusData[Math.floor(Math.random() * statusData.length)] as any;
    const types = ['FALL', 'IMMOBILITY', 'SOS', 'MAN_DOWN'];
    const type = types[Math.floor(Math.random() * types.length)];

    await supabase.from('alarm_events').insert({
      company_id: COMPANY_ID,
      operator_id: pick.operator_id,
      type,
      confirmation_level: 'SINGLE',
      lat: pick.last_lat,
      lng: pick.last_lng,
      is_test: false,
      is_duress: false,
      sms_sent: true,
      sms_count: 5,
      telegram_sent: true,
    });
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Subscribe to alarm_events inserts
  useEffect(() => {
    const channel = supabase
      .channel('alarm_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alarm_events' },
        async (payload) => {
          const row = payload.new as any;
          if (row.is_test) return;

          const { data: opData } = await supabase
            .from('operators')
            .select('name')
            .eq('id', row.operator_id)
            .single();

          const notification: AlarmNotification = {
            id: row.id,
            operatorId: row.operator_id,
            operatorName: opData?.name || 'Operatore',
            type: row.type || 'SOS',
            group: '',
            lat: row.lat,
            lng: row.lng,
            createdAt: row.created_at || new Date().toISOString(),
            dismissed: false,
          };

          setNotifications(prev => [notification, ...prev].slice(0, 10));
          setLatestAlarm(notification);

          // Web Notification (works when tab is in background)
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`🚨 ALLARME ${notification.type}`, {
                body: `Operatore: ${notification.operatorName}`,
                icon: '/favicon.ico',
                tag: notification.id,
                requireInteraction: true,
              });
            } catch (_) {}
          }

          // Auto-dismiss after 30s
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }, 30000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const visibleNotifications = notifications.filter(n => !n.dismissed).slice(0, 3);
  const hasActiveAlarms = notifications.some(n => !n.dismissed);

  return {
    notifications: visibleNotifications,
    latestAlarm,
    hasActiveAlarms,
    audioEnabled,
    enableAudio,
    dismiss,
    dismissAll,
    simulateAlarm,
    clearLatest: () => setLatestAlarm(null),
  };
}
