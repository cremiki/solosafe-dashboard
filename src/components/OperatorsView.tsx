import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Trash2, X, Save, Loader2,
  Phone, Shield, Smartphone, Clock, Users, AlertCircle, ChevronDown, FileText,
  AlertTriangle, Activity, SlidersHorizontal, Battery, MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEVICE_ICONS, ICON_PATHS } from '../lib/markerIcons';
import { generateOnboardingPdf } from '../utils/generateOnboardingPdf';
import { reverseGeocode } from '../lib/geocoding';
import OperatorIcon from './OperatorIcon';

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

// ============================================================================
// TYPES
// ============================================================================

interface EmergencyContact {
  id?: string;
  position: number;
  name: string;
  phone: string;
  preferred_channel: 'sms' | 'telegram' | 'whatsapp';
  dtmf_required: boolean;
  sms_enabled: boolean;
  telegram_enabled: boolean;
  call_enabled: boolean;
  relation: string;
  telegram_chat_id: number | null;
}

interface DeviceInfo {
  id?: string;
  model: string;
  imei: string;
  is_shared: boolean;
  certification: 'basic' | 'compatible' | 'certified';
  icon_type: string;
}

interface OperatorRow {
  id: string;
  name: string;
  default_preset: string;
  default_session_type: string;
  default_duration_hours: number;
  allow_preset_change: boolean;
  login_pin: string | null;
  duress_pin: string | null;
  locale: string;
  device_id: string | null;
  devices: DeviceInfo | null;
  emergency_contacts: EmergencyContact[];
  cascade_max_rounds?: number;
  cascade_timeout_seconds?: number;
  cascade_delay_seconds?: number;
  battery_alert_threshold?: number;
  birth_date?: string | null;
  notes?: string | null;
  icon_name?: string;
  app_language?: string;
  email?: string | null;
  phone_number?: string | null;
  badge_number?: string | null;
}

type EditTab = 'anagrafica' | 'turni' | 'alarms' | 'contacts' | 'status' | 'pdf';
type FormMode = null | 'create' | 'edit';

interface AnagraficaData {
  name: string;
  icon_name: string;
  app_language: string;
  email: string;
  phone_number: string;
  badge_number: string;
  birth_date: string;
  notes: string;
  device: DeviceInfo;
}

interface TurniData {
  default_preset: string;
  default_session_type: string;
  default_duration_hours: number;
  allow_preset_change: boolean;
  login_pin: string;
  duress_pin: string;
}

interface CascadeData {
  rounds: number;
  timeout: number;
  delay: number;
}

interface OperatorEditBuffer {
  operatorId: string | null;
  mode: FormMode;
  anagrafica: AnagraficaData | null;
  turni: TurniData | null;
  alarms: Record<string, string>;
  contacts: EmergencyContact[];
  cascade: CascadeData | null;
}

interface OperatorStatus {
  operator_id: string;
  state: string;
  battery_phone: number | null;
  is_charging: boolean;
  last_seen: string;
  last_lat: number | null;
  last_lng: number | null;
  session_id?: string;
  updated_at: string;
  created_at?: string;
}

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const PRESET_COLORS: Record<string, string> = {
  OFFICE: '#3B82F6', WAREHOUSE: '#9B59B6', CONSTRUCTION: '#F39C12',
  INDUSTRY: '#E74C3C', ALTITUDE: '#1ABC9C', VEHICLE: '#2ECC71',
};

const PRESETS = ['OFFICE', 'WAREHOUSE', 'CONSTRUCTION', 'INDUSTRY', 'VEHICLE', 'ALTITUDE'];
const SESSION_TYPES = [
  { value: 'turno', label: 'Turno' },
  { value: 'intervento', label: 'Intervento' },
  { value: 'continua', label: 'Continua' },
];

const emptyContact = (): EmergencyContact => ({
  position: 1,
  name: '',
  phone: '',
  preferred_channel: 'sms',
  dtmf_required: false,
  sms_enabled: true,
  telegram_enabled: true,
  call_enabled: true,
  relation: 'manager',
  telegram_chat_id: null,
});

const emptyDevice = (): DeviceInfo => ({
  model: '',
  imei: '',
  is_shared: false,
  certification: 'basic',
  icon_type: 'shield',
});

const emptyEditBuffer = (): OperatorEditBuffer => ({
  operatorId: null,
  mode: null,
  anagrafica: null,
  turni: null,
  alarms: {},
  contacts: [],
  cascade: null,
});

// Styled components
function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }}
      />
    </div>
  );
}

function Select({ label, options, ...props }: { label: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>{label}</label>
      <select
        {...props}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
        style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
             className="w-4 h-4 rounded" style={{ accentColor: '#E63946' }} />
      <span className="text-sm" style={{ color: '#ECEFF4' }}>{label}</span>
    </label>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5 first:mt-0">
      <span style={{ color: '#E63946' }}>{icon}</span>
      <h3 className="text-sm font-semibold" style={{ color: '#ECEFF4' }}>{title}</h3>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface OperatorsViewProps {
  pendingOpen?: { id: string; tab: 'status' | 'alarms' } | null;
  onOpenHandled?: () => void;
}

export default function OperatorsView({ pendingOpen, onOpenHandled }: OperatorsViewProps = {}) {
  // Global data
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusByOp, setStatusByOp] = useState<Record<string, OperatorStatus>>({});
  const [paramsByOp, setParamsByOp] = useState<Record<string, Record<string, string>>>({});
  const [addressByOp, setAddressByOp] = useState<Record<string, string>>({});

  // Edit panel state
  const [editBuffer, setEditBuffer] = useState<OperatorEditBuffer>(emptyEditBuffer());
  const [editTab, setEditTab] = useState<EditTab>('anagrafica');
  const [dirtyTabs, setDirtyTabs] = useState<Record<EditTab, boolean>>({
    anagrafica: false, turni: false, alarms: false, contacts: false, status: false, pdf: false,
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [unsavedDialog, setUnsavedDialog] = useState<{ nextTab: EditTab } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ========================================================================
  // DATA LOADING
  // ========================================================================

  const fetchOperators = useCallback(async () => {
    const { data, error } = await supabase
      .from('operators')
      .select('*, devices(*), emergency_contacts(*), birth_date, notes, icon_name, app_language, email, phone_number, badge_number')
      .eq('company_id', COMPANY_ID)
      .order('name');
    if (!error && data) {
      setOperators(data as OperatorRow[]);
    }
    setLoading(false);
  }, []);

  const fetchStatus = useCallback(async () => {
    const { data: hb } = await supabase
      .from('operator_status')
      .select('operator_id, state, battery_phone, is_charging, last_seen, last_lat, last_lng, session_id, updated_at');
    const map: Record<string, OperatorStatus> = {};
    (hb || []).forEach((h: any) => {
      map[h.operator_id] = {
        operator_id: h.operator_id,
        state: h.state,
        battery_phone: h.battery_phone,
        is_charging: h.is_charging,
        last_seen: h.last_seen,
        last_lat: h.last_lat,
        last_lng: h.last_lng,
        session_id: h.session_id,
        updated_at: h.updated_at,
        created_at: h.last_seen || h.updated_at,
      };
    });
    setStatusByOp(map);

    // Load alarm params — DISTINCT ON param_name, latest value
    const { data: logs } = await supabase
      .from('app_config_log')
      .select('operator_id, param_name, new_value, created_at')
      .order('created_at', { ascending: false });

    const pmap: Record<string, Record<string, string>> = {};
    const seen: Set<string> = new Set();
    (logs || []).forEach((l: any) => {
      const key = `${l.operator_id}|${l.param_name}`;
      if (!seen.has(key)) {
        if (!pmap[l.operator_id]) pmap[l.operator_id] = {};
        pmap[l.operator_id][l.param_name] = l.new_value;
        seen.add(key);
      }
    });
    setParamsByOp(pmap);
  }, []);

  useEffect(() => {
    fetchOperators();
    fetchStatus();
  }, [fetchOperators, fetchStatus]);

  // Realtime subscriptions
  useEffect(() => {
    const ch = supabase.channel('operators_view_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operator_status' }, () => fetchStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config_log' }, () => fetchStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_contacts' }, () => fetchOperators())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'operators' }, () => fetchOperators())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOperators, fetchStatus]);

  // Load geocoding on status tab
  useEffect(() => {
    if (!editBuffer.operatorId || editTab !== 'status') return;
    const st = statusByOp[editBuffer.operatorId];
    if (!st?.last_lat || !st?.last_lng) return;
    if (addressByOp[editBuffer.operatorId]) return;
    (async () => {
      const addr = await reverseGeocode(st.last_lat!, st.last_lng!);
      setAddressByOp(prev => ({ ...prev, [editBuffer.operatorId!]: addr }));
    })();
  }, [editBuffer.operatorId, editTab, statusByOp]);

  // FIX 2: Ensure buffer is fresh when operator opens or paramsByOp updates from DB
  useEffect(() => {
    if (!editBuffer.operatorId) return;

    // Reload alarm buffer from DB when operator changes or DB updates
    const opParams = paramsByOp[editBuffer.operatorId] || {};
    const freshAlarmBuffer = {
      fall_enabled: opParams.fall_enabled || 'true',
      fall_threshold_g: opParams.fall_threshold_g || '2.5',
      immobility_enabled: opParams.immobility_enabled || 'true',
      immobility_seconds: opParams.immobility_seconds || '90',
      malore_enabled: opParams.malore_enabled || 'true',
      malore_angle: opParams.malore_angle || '45',
    };

    // Only update if buffer alarms differ from fresh DB values
    if (JSON.stringify(editBuffer.alarms) !== JSON.stringify(freshAlarmBuffer)) {
      setEditBuffer(prev => ({ ...prev, alarms: freshAlarmBuffer }));
    }
  }, [editBuffer.operatorId, paramsByOp]);

  // ========================================================================
  // DIRTY TABS TRACKING
  // ========================================================================

  useEffect(() => {
    if (!editBuffer.operatorId) {
      setDirtyTabs({ anagrafica: false, turni: false, alarms: false, contacts: false, status: false, pdf: false });
      return;
    }

    const op = operators.find(o => o.id === editBuffer.operatorId);
    if (!op) return;

    // Check anagrafica
    let anaIsDirty = false;
    if (editBuffer.anagrafica) {
      anaIsDirty = editBuffer.anagrafica.name !== op.name ||
                   editBuffer.anagrafica.icon_name !== (op.icon_name || 'shield') ||
                   editBuffer.anagrafica.app_language !== (op.app_language || 'it') ||
                   editBuffer.anagrafica.email !== (op.email || '') ||
                   editBuffer.anagrafica.phone_number !== (op.phone_number || '') ||
                   editBuffer.anagrafica.badge_number !== (op.badge_number || '') ||
                   editBuffer.anagrafica.birth_date !== (op.birth_date || '') ||
                   editBuffer.anagrafica.notes !== (op.notes || '') ||
                   JSON.stringify(editBuffer.anagrafica.device) !== JSON.stringify(op.devices || emptyDevice());
    }

    // Check turni
    let turniIsDirty = false;
    if (editBuffer.turni) {
      turniIsDirty = editBuffer.turni.default_preset !== op.default_preset ||
                     editBuffer.turni.default_session_type !== op.default_session_type ||
                     editBuffer.turni.default_duration_hours !== op.default_duration_hours ||
                     editBuffer.turni.allow_preset_change !== op.allow_preset_change ||
                     editBuffer.turni.login_pin !== (op.login_pin || '') ||
                     editBuffer.turni.duress_pin !== (op.duress_pin || '');
    }

    // Check alarms — compare buffer values with paramsByOp (current DB values)
    const params = paramsByOp[editBuffer.operatorId] || {};
    const alarmDefs = [
      { enableKey: 'fall_enabled', valKey: 'fall_threshold_g', defEn: 'true', defVal: '2.5' },
      { enableKey: 'immobility_enabled', valKey: 'immobility_seconds', defEn: 'true', defVal: '90' },
      { enableKey: 'malore_enabled', valKey: 'malore_angle', defEn: 'true', defVal: '45' },
    ];
    let alarmsIsDirty = false;
    alarmDefs.forEach(a => {
      const bufferEn = editBuffer.alarms[a.enableKey] !== undefined ? editBuffer.alarms[a.enableKey] : (params[a.enableKey] || a.defEn);
      const bufferVal = editBuffer.alarms[a.valKey] !== undefined ? editBuffer.alarms[a.valKey] : (params[a.valKey] || a.defVal);
      const dbEn = params[a.enableKey] || a.defEn;
      const dbVal = params[a.valKey] || a.defVal;
      if (bufferEn !== dbEn || bufferVal !== dbVal) {
        alarmsIsDirty = true;
      }
    });

    // Check contacts
    const contactsIsDirty = JSON.stringify(editBuffer.contacts) !== JSON.stringify(op.emergency_contacts || []);

    // Check cascade
    let cascadeIsDirty = false;
    if (editBuffer.cascade) {
      cascadeIsDirty = editBuffer.cascade.rounds !== (op.cascade_max_rounds || 2) ||
                       editBuffer.cascade.timeout !== (op.cascade_timeout_seconds || 25) ||
                       editBuffer.cascade.delay !== (op.cascade_delay_seconds || 10);
    }

    setDirtyTabs(prev => ({
      ...prev,
      anagrafica: anaIsDirty,
      turni: turniIsDirty,
      alarms: alarmsIsDirty,
      contacts: contactsIsDirty || cascadeIsDirty,
      status: false,
      pdf: false,
    }));
  }, [editBuffer, operators]);

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  function disabledAlarmCount(opId: string): number {
    const p = paramsByOp[opId] || {};
    return ['fall_enabled', 'immobility_enabled', 'malore_enabled'].filter(k => p[k] === 'false').length;
  }

  function offlineMin(iso?: string): number | null {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  }

  function statusFor(opId: string) {
    const st = statusByOp[opId];
    if (!st) return { color: '#6B7280', label: '⚫ Offline', state: 'offline' };
    const m = offlineMin(st.created_at) || 0;
    if (m > 30) return { color: '#6B7280', label: '⚫ Offline', state: 'offline' };
    if (st.state === 'alarm') return { color: '#E74C3C', label: '🔴 Allarme', state: 'alarm' };
    if (st.state === 'protected') return { color: '#2ECC71', label: '🟢 Protetto', state: 'protected' };
    return { color: '#8899AA', label: '⚪ Standby', state: 'standby' };
  }

  function batteryColor(pct: number | null | undefined): string {
    if (pct == null) return '#4A5568';
    if (pct < 20) return '#E74C3C';
    if (pct < 50) return '#F39C12';
    return '#2ECC71';
  }

  function heartbeatColor(min: number | null): string {
    if (min == null) return '#4A5568';
    if (min < 10) return '#2ECC71';
    if (min < 30) return '#F39C12';
    return '#E74C3C';
  }

  // ========================================================================
  // EDIT BUFFER OPERATIONS
  // ========================================================================

  function loadOperatorToBuffer(op: OperatorRow, mode: FormMode) {
    // Load alarm parameters from paramsByOp (app_config_log latest values)
    // Convert numeric strings to Numbers to prevent auto-increment bugs
    const opParams = paramsByOp[op.id] || {};
    const alarmBuffer = {
      fall_enabled: opParams.fall_enabled || 'true',
      fall_threshold_g: String(Number(opParams.fall_threshold_g || '2.5')),
      immobility_enabled: opParams.immobility_enabled || 'true',
      immobility_seconds: String(Number(opParams.immobility_seconds || '90')),
      malore_enabled: opParams.malore_enabled || 'true',
      malore_angle: String(Number(opParams.malore_angle || '45')),
    };

    setEditBuffer({
      operatorId: op.id,
      mode,
      anagrafica: {
        name: op.name,
        icon_name: op.icon_name || 'shield',
        app_language: op.app_language || 'it',
        email: op.email || '',
        phone_number: op.phone_number || '',
        badge_number: op.badge_number || '',
        birth_date: op.birth_date || '',
        notes: op.notes || '',
        device: op.devices || emptyDevice(),
      },
      turni: {
        default_preset: op.default_preset || 'WAREHOUSE',
        default_session_type: op.default_session_type || 'turno',
        default_duration_hours: op.default_duration_hours || 8,
        allow_preset_change: op.allow_preset_change || false,
        login_pin: op.login_pin || '',
        duress_pin: op.duress_pin || '',
      },
      alarms: alarmBuffer,
      contacts: (op.emergency_contacts || []).sort((a, b) => a.position - b.position),
      cascade: {
        rounds: op.cascade_max_rounds || 2,
        timeout: op.cascade_timeout_seconds || 25,
        delay: op.cascade_delay_seconds || 10,
      },
    });
    setEditTab('anagrafica');
    setDirtyTabs({ anagrafica: false, turni: false, alarms: false, contacts: false, status: false, pdf: false });
  }

  function updateAnagrafica(patch: Partial<AnagraficaData>) {
    setEditBuffer(prev => ({
      ...prev,
      anagrafica: prev.anagrafica ? { ...prev.anagrafica, ...patch } : null,
    }));
  }

  function updateTurni(patch: Partial<TurniData>) {
    setEditBuffer(prev => ({
      ...prev,
      turni: prev.turni ? { ...prev.turni, ...patch } : null,
    }));
  }

  function updateAlarms(paramName: string, value: string) {
    setEditBuffer(prev => ({
      ...prev,
      alarms: { ...prev.alarms, [paramName]: value },
    }));
  }

  function updateCascade(patch: Partial<CascadeData>) {
    setEditBuffer(prev => ({
      ...prev,
      cascade: prev.cascade ? { ...prev.cascade, ...patch } : null,
    }));
  }

  function addContact() {
    if (editBuffer.contacts.length >= 5) return;
    setEditBuffer(prev => ({
      ...prev,
      contacts: [...prev.contacts, { ...emptyContact(), position: prev.contacts.length + 1 }],
    }));
  }

  function removeContact(idx: number) {
    setEditBuffer(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i + 1 })),
    }));
  }

  function updateContact(idx: number, patch: Partial<EmergencyContact>) {
    setEditBuffer(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => i === idx ? { ...c, ...patch } : c),
    }));
  }

  // ========================================================================
  // SAVE LOGIC — UNIFIED
  // ========================================================================

  async function saveTab(tab: EditTab): Promise<boolean> {
    if (!editBuffer.operatorId) return false;
    const op = operators.find(o => o.id === editBuffer.operatorId);
    if (!op) return false;

    try {
      if (tab === 'anagrafica' && editBuffer.anagrafica) {
        // Save device
        let deviceId = op.device_id;
        if (editBuffer.anagrafica.device.model || editBuffer.anagrafica.device.imei) {
          if (editBuffer.anagrafica.device.id) {
            await supabase.from('devices').update({
              model: editBuffer.anagrafica.device.model || null,
              imei: editBuffer.anagrafica.device.imei || null,
              is_shared: editBuffer.anagrafica.device.is_shared,
              certification: editBuffer.anagrafica.device.certification,
              icon_type: editBuffer.anagrafica.device.icon_type,
            }).eq('id', editBuffer.anagrafica.device.id);
            deviceId = editBuffer.anagrafica.device.id;
          } else {
            const { data: dev, error: devErr } = await supabase.from('devices').insert({
              company_id: COMPANY_ID,
              model: editBuffer.anagrafica.device.model || null,
              imei: editBuffer.anagrafica.device.imei || null,
              is_shared: editBuffer.anagrafica.device.is_shared,
              certification: editBuffer.anagrafica.device.certification,
              icon_type: editBuffer.anagrafica.device.icon_type,
            }).select('id').single();
            if (devErr) throw devErr;
            deviceId = dev.id;
          }
        }

        // Save operator anagrafica
        const { error } = await supabase.from('operators').update({
          name: editBuffer.anagrafica.name.trim(),
          icon_name: editBuffer.anagrafica.icon_name,
          app_language: editBuffer.anagrafica.app_language,
          email: editBuffer.anagrafica.email || null,
          phone_number: editBuffer.anagrafica.phone_number || null,
          badge_number: editBuffer.anagrafica.badge_number || null,
          birth_date: editBuffer.anagrafica.birth_date || null,
          notes: editBuffer.anagrafica.notes || null,
          device_id: deviceId,
        }).eq('id', editBuffer.operatorId);
        if (error) throw error;

        // Update local operators
        setOperators(prev => prev.map(o => o.id === editBuffer.operatorId ? { ...o, ...editBuffer.anagrafica, devices: editBuffer.anagrafica!.device } : o));
        setDirtyTabs(prev => ({...prev, anagrafica: false}));
      }

      if (tab === 'turni' && editBuffer.turni) {
        const { error } = await supabase.from('operators').update({
          default_preset: editBuffer.turni.default_preset,
          default_session_type: editBuffer.turni.default_session_type,
          default_duration_hours: editBuffer.turni.default_duration_hours,
          allow_preset_change: editBuffer.turni.allow_preset_change,
          login_pin: editBuffer.turni.login_pin || null,
          duress_pin: editBuffer.turni.duress_pin || null,
        }).eq('id', editBuffer.operatorId);
        if (error) throw error;

        setOperators(prev => prev.map(o => o.id === editBuffer.operatorId ? { ...o, ...editBuffer.turni } : o));
        setDirtyTabs(prev => ({...prev, turni: false}));
      }

      if (tab === 'alarms') {
        const rows: any[] = [];
        const alarmDefs = [
          { enableKey: 'fall_enabled', valKey: 'fall_threshold_g', def: 'true', defVal: '2.5' },
          { enableKey: 'immobility_enabled', valKey: 'immobility_seconds', def: 'true', defVal: '90' },
          { enableKey: 'malore_enabled', valKey: 'malore_angle', def: 'true', defVal: '45' },
        ];

        const params = paramsByOp[editBuffer.operatorId] || {};

        alarmDefs.forEach(a => {
          const curEn = params[a.enableKey] !== 'false' ? 'true' : 'false';
          if (editBuffer.alarms[a.enableKey] !== undefined && editBuffer.alarms[a.enableKey] !== curEn) {
            rows.push({
              operator_id: editBuffer.operatorId,
              company_id: COMPANY_ID,
              change_type: 'dashboard',
              param_name: a.enableKey,
              old_value: curEn,
              new_value: editBuffer.alarms[a.enableKey],
            });
          }

          const curVal = params[a.valKey] || a.defVal;
          if (editBuffer.alarms[a.valKey] !== undefined && editBuffer.alarms[a.valKey] !== curVal) {
            rows.push({
              operator_id: editBuffer.operatorId,
              company_id: COMPANY_ID,
              change_type: 'dashboard',
              param_name: a.valKey,
              old_value: curVal,
              new_value: editBuffer.alarms[a.valKey],
            });
          }
        });

        if (rows.length > 0) {
          const { error } = await supabase.from('app_config_log').insert(rows);
          if (error) throw error;

          // Update paramsByOp directly
          setParamsByOp(prev => {
            const next = { ...prev };
            if (!next[editBuffer.operatorId!]) next[editBuffer.operatorId!] = {};
            rows.forEach(r => {
              next[editBuffer.operatorId!][r.param_name] = r.new_value;
            });
            return next;
          });
        }

        // DO NOT reset alarms buffer — keep current values for user to see changes
        // Buffer will be properly compared against DB in next dirtyTabs check
        setDirtyTabs(prev => ({...prev, alarms: false}));
      }

      if (tab === 'contacts' && editBuffer.contacts !== undefined) {
        // Delete all contacts for operator, then re-insert
        await supabase.from('emergency_contacts').delete().eq('operator_id', editBuffer.operatorId);

        if (editBuffer.contacts.length > 0) {
          const rows = editBuffer.contacts.map((c, i) => ({
            operator_id: editBuffer.operatorId,
            position: i + 1,
            name: c.name.trim(),
            phone: c.phone.trim(),
            preferred_channel: c.preferred_channel,
            dtmf_required: c.dtmf_required,
            sms_enabled: c.sms_enabled,
            telegram_enabled: c.telegram_enabled,
            call_enabled: c.call_enabled,
            relation: c.relation,
            telegram_chat_id: c.telegram_chat_id,
          })).filter(c => c.name && c.phone);

          if (rows.length > 0) {
            const { error } = await supabase.from('emergency_contacts').insert(rows);
            if (error) throw error;
          }
        }

        // Save cascade settings
        if (editBuffer.cascade) {
          const patch: any = {};
          if (editBuffer.cascade.rounds !== op.cascade_max_rounds) patch.cascade_max_rounds = editBuffer.cascade.rounds;
          if (editBuffer.cascade.timeout !== op.cascade_timeout_seconds) patch.cascade_timeout_seconds = editBuffer.cascade.timeout;
          if (editBuffer.cascade.delay !== op.cascade_delay_seconds) patch.cascade_delay_seconds = editBuffer.cascade.delay;
          if (Object.keys(patch).length > 0) {
            const { error } = await supabase.from('operators').update(patch).eq('id', editBuffer.operatorId);
            if (error) throw error;
          }
        }

        // Update local operators
        setOperators(prev => prev.map(o => o.id === editBuffer.operatorId ? { ...o, emergency_contacts: editBuffer.contacts, ...editBuffer.cascade } : o));
        setDirtyTabs(prev => ({...prev, contacts: false}));
      }

      return true;
    } catch (err: any) {
      setFormError(err.message || `Errore salvataggio ${tab}`);
      return false;
    }
  }

  async function handleSaveAndClose() {
    setSaving(true);
    try {
      const dirtyTabsList = Object.entries(dirtyTabs).filter(([_, isDirty]) => isDirty).map(([tab]) => tab as EditTab);

      for (const tab of dirtyTabsList) {
        const success = await saveTab(tab);
        if (!success) {
          setToast({ message: `❌ Errore salvataggio ${tab}`, type: 'error' });
          setTimeout(() => setToast(null), 3000);
          return;
        }
      }

      // All saved — close the panel
      setEditBuffer(emptyEditBuffer());
      setDirtyTabs({ anagrafica: false, turni: false, alarms: false, contacts: false, status: false, pdf: false });
      setToast({ message: '✅ Tutte le modifiche salvate', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleTabChange(nextTab: EditTab) {
    // Always change tab directly — dialog only appears on close, not on tab change
    setEditTab(nextTab);
  }

  function closePanel() {
    if (Object.values(dirtyTabs).some(Boolean)) {
      setUnsavedDialog({ nextTab: 'anagrafica' });
    } else {
      setEditBuffer(emptyEditBuffer());
      setDirtyTabs({ anagrafica: false, turni: false, alarms: false, contacts: false, status: false, pdf: false });
    }
  }

  function doClosePanel() {
    setEditBuffer(emptyEditBuffer());
    setDirtyTabs({ anagrafica: false, turni: false, alarms: false, contacts: false, status: false, pdf: false });
    setFormError(null);
    setUnsavedDialog(null);
  }

  const filtered = operators.filter(op => op.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2A2D3E' }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#ECEFF4' }}>Operatori</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8899AA' }}>{operators.length} operatori registrati</p>
        </div>
        <button
          onClick={() => {
            const newOp: OperatorRow = {
              id: Math.random().toString(36),
              name: '',
              default_preset: 'WAREHOUSE',
              default_session_type: 'turno',
              default_duration_hours: 8,
              allow_preset_change: false,
              login_pin: null,
              duress_pin: null,
              locale: 'it',
              device_id: null,
              devices: null,
              emergency_contacts: [],
            };
            loadOperatorToBuffer(newOp, 'create');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: '#E63946', color: '#fff' }}>
          <Plus size={16} /> Aggiungi Operatore
        </button>
      </header>

      {/* Search */}
      <div className="px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1A1D27' }}>
        <div className="relative" style={{ maxWidth: '320px' }}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8899AA' }} />
          <input
            type="text"
            placeholder="Cerca operatore..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E', color: '#ECEFF4' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin" style={{ color: '#8899AA' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Users size={40} style={{ color: '#2A2D3E' }} />
            <p className="mt-3 text-sm" style={{ color: '#8899AA' }}>
              {search ? 'Nessun operatore trovato' : 'Nessun operatore registrato'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2A2D3E' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#13151F' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Nome</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Stato</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Batteria</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Heartbeat</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Contatti</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Allarmi</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: '#8899AA' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((op, idx) => {
                  const st = statusByOp[op.id];
                  const sFor = statusFor(op.id);
                  const offMin = offlineMin(st?.created_at);
                  const presetColor = PRESET_COLORS[op.default_preset] || '#8899AA';
                  const disabledCount = disabledAlarmCount(op.id);
                  return (
                    <tr
                      key={op.id}
                      className="cursor-pointer hover:bg-white/5"
                      onClick={() => loadOperatorToBuffer(op, 'edit')}
                      style={{ backgroundColor: idx % 2 === 0 ? '#1A1D27' : '#161922', borderTop: '1px solid #2A2D3E' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <OperatorIcon iconName={op.icon_name || 'shield'} status={sFor.state === 'protected' ? 'PROTETTO' : sFor.state === 'alarm' ? 'ALLARME' : 'STANDBY'} size={28} />
                          <div>
                            <div className="font-medium" style={{ color: '#ECEFF4' }}>{op.name}</div>
                            <span className="text-xs" style={{ color: presetColor }}>{op.default_preset}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: sFor.color, backgroundColor: `${sFor.color}20` }}>
                          {sFor.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {st?.battery_phone != null ? (
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: batteryColor(st.battery_phone) }}>
                            <Battery size={12} /> {st.battery_phone}%
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#4A5568' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold" style={{ color: heartbeatColor(offMin) }}>
                          {offMin != null ? `${offMin}m fa` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: '#8899AA' }}>{op.emergency_contacts?.length || 0}/5</span>
                          {(op.emergency_contacts || []).some((c: any) => c.telegram_chat_id) && (
                            <span title="Telegram" className="text-xs" style={{ color: '#2ECC71' }}>✈</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {disabledCount > 0 ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ color: '#E74C3C', backgroundColor: 'rgba(231,76,60,0.15)' }}>
                            <AlertTriangle size={10} /> {disabledCount} OFF
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#2ECC71' }}>✓ tutti ON</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { loadOperatorToBuffer(op, 'edit'); setEditTab('alarms'); }} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#F39C12' }}>
                            <SlidersHorizontal size={16} />
                          </button>
                          <button
                            onClick={() => generateOnboardingPdf({
                              name: op.name,
                              companyName: 'Costruzioni Sicure S.r.l.',
                              preset: op.default_preset,
                              configToken: op.id,
                              operatorId: op.id,
                              contacts: (op.emergency_contacts || []).map((c: any) => ({
                                name: c.name,
                                sms: c.sms_enabled !== false,
                                telegram: c.telegram_enabled !== false,
                                call: c.call_enabled !== false,
                              })),
                            })}
                            className="p-2 rounded-lg hover:bg-white/5"
                            style={{ color: '#3B82F6' }}>
                            <FileText size={16} />
                          </button>
                          {deleteConfirm === op.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={async () => {
                                  await supabase.from('emergency_contacts').delete().eq('operator_id', op.id);
                                  await supabase.from('operator_status').delete().eq('operator_id', op.id);
                                  await supabase.from('operators').delete().eq('id', op.id);
                                  setDeleteConfirm(null);
                                  fetchOperators();
                                }}
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{ backgroundColor: 'rgba(231,76,60,0.2)', color: '#E74C3C' }}>
                                Conferma
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs" style={{ color: '#8899AA' }}>
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(op.id)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#8899AA' }}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Panel Modal */}
      {editBuffer.mode && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={e => { if (e.target === e.currentTarget) closePanel(); }}>
          <div className="w-full max-w-lg h-full overflow-y-auto" style={{ backgroundColor: '#1A1D27', borderLeft: '1px solid #2A2D3E' }}>
            {/* Panel Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#1A1D27', borderBottom: '1px solid #2A2D3E' }}>
              <h3 className="text-base font-bold" style={{ color: '#ECEFF4' }}>
                {editBuffer.mode === 'create' ? 'Nuovo Operatore' : editBuffer.anagrafica?.name || 'Modifica Operatore'}
              </h3>
              <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#8899AA' }}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            {editBuffer.mode === 'edit' && (
              <div className="flex gap-1 px-5 pt-3 overflow-x-auto" style={{ borderBottom: '1px solid #2A2D3E' }}>
                {(['anagrafica', 'turni', 'alarms', 'contacts', 'status', 'pdf'] as EditTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className="px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: editTab === tab ? '#E63946' : 'transparent',
                      color: editTab === tab ? '#fff' : '#8899AA',
                      borderBottom: dirtyTabs[tab] ? '2px solid #F39C12' : 'none',
                    }}>
                    {tab === 'anagrafica' && '📋 Anagrafica'}
                    {tab === 'turni' && '⏱️ Turni'}
                    {tab === 'alarms' && '🚨 Allarmi'}
                    {tab === 'contacts' && '📞 Contatti'}
                    {tab === 'status' && '📊 Stato'}
                    {tab === 'pdf' && '📄 PDF'}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* ANAGRAFICA TAB */}
              {(editBuffer.mode === 'create' || editTab === 'anagrafica') && editBuffer.anagrafica && (
                <div className="space-y-4">
                  <SectionTitle icon={<Shield size={16} />} title="Anagrafica" />
                  <Input label="Nome" value={editBuffer.anagrafica.name} onChange={e => updateAnagrafica({ name: e.target.value })} />
                  <Input label="Email" value={editBuffer.anagrafica.email} onChange={e => updateAnagrafica({ email: e.target.value })} />
                  <Input label="Telefono" value={editBuffer.anagrafica.phone_number} onChange={e => updateAnagrafica({ phone_number: e.target.value })} />
                  <Input label="Badge Number" value={editBuffer.anagrafica.badge_number} onChange={e => updateAnagrafica({ badge_number: e.target.value })} />
                  <Input label="Data Nascita" type="date" value={editBuffer.anagrafica.birth_date} onChange={e => updateAnagrafica({ birth_date: e.target.value })} />
                  <Input label="Note" value={editBuffer.anagrafica.notes} onChange={e => updateAnagrafica({ notes: e.target.value })} />
                  <SectionTitle icon={<Smartphone size={16} />} title="Dispositivo" />
                  {editBuffer.anagrafica?.device && (
                    <>
                      <Input label="Modello" value={editBuffer.anagrafica.device.model} onChange={e => updateAnagrafica({ device: { ...editBuffer.anagrafica!.device, model: e.target.value } })} />
                      <Input label="IMEI" value={editBuffer.anagrafica.device.imei} onChange={e => updateAnagrafica({ device: { ...editBuffer.anagrafica!.device, imei: e.target.value } })} />
                    </>
                  )}
                </div>
              )}

              {/* TURNI TAB */}
              {editTab === 'turni' && editBuffer.turni && (
                <div className="space-y-4">
                  <SectionTitle icon={<Clock size={16} />} title="Turni" />
                  <Select label="Preset" options={PRESETS.map(p => ({ value: p, label: p }))} value={editBuffer.turni.default_preset} onChange={e => updateTurni({ default_preset: e.target.value })} />
                  <Select label="Tipo Sessione" options={SESSION_TYPES} value={editBuffer.turni.default_session_type} onChange={e => updateTurni({ default_session_type: e.target.value })} />
                  <Input label="Durata (ore)" type="number" value={editBuffer.turni.default_duration_hours} onChange={e => updateTurni({ default_duration_hours: parseInt(e.target.value) || 8 })} />
                  <Checkbox label="Permetti cambio preset" checked={editBuffer.turni.allow_preset_change} onChange={v => updateTurni({ allow_preset_change: v })} />
                  <Input label="PIN Accesso" value={editBuffer.turni.login_pin} onChange={e => updateTurni({ login_pin: e.target.value })} />
                  <Input label="PIN Duress" value={editBuffer.turni.duress_pin} onChange={e => updateTurni({ duress_pin: e.target.value })} />
                </div>
              )}

              {/* ALARMS TAB */}
              {editTab === 'alarms' && (
                <div className="space-y-4">
                  <SectionTitle icon={<AlertTriangle size={16} />} title="Allarmi" />
                  {(['fall_enabled', 'immobility_enabled', 'malore_enabled'] as const).map((key, idx) => {
                    const enabled = editBuffer.alarms[key] !== 'false';
                    const names = ['🔴 Caduta', '🟠 Immobilità', '🟡 Malore'];
                    const valKeys = ['fall_threshold_g', 'immobility_seconds', 'malore_angle'];
                    const units = ['g', 's', '°'];
                    const defaults = ['2.5', '90', '45'];
                    return (
                      <div key={key} style={{ backgroundColor: enabled ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)', border: `1px solid ${enabled ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)'}`, borderRadius: '8px', padding: '12px' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold" style={{ color: '#ECEFF4' }}>{names[idx]}</span>
                          <button
                            onClick={() => updateAlarms(key, enabled ? 'false' : 'true')}
                            className="relative inline-flex items-center h-6 w-11 rounded-full"
                            style={{ backgroundColor: enabled ? '#2ECC71' : '#E74C3C' }}>
                            <span className="inline-block w-4 h-4 rounded-full bg-white" style={{ transform: enabled ? 'translateX(24px)' : 'translateX(2px)', transition: 'transform 0.15s' }} />
                          </button>
                        </div>
                        {enabled && (
                          <Input
                            label={`${['Soglia G', 'Tempo', 'Angolazione'][idx]} (${units[idx]})`}
                            type="number"
                            value={Number(editBuffer.alarms[valKeys[idx]] || defaults[idx])}
                            onChange={e => updateAlarms(valKeys[idx], String(Number(e.target.value || defaults[idx])))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CONTACTS TAB */}
              {editTab === 'contacts' && (
                <div className="space-y-4">
                  <SectionTitle icon={<Phone size={16} />} title="Contatti" />
                  {editBuffer.contacts.map((contact, idx) => (
                    <div key={idx} style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', borderRadius: '8px', padding: '12px' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: '#8899AA' }}>Contatto {idx + 1}</span>
                        <button onClick={() => removeContact(idx)} className="p-1" style={{ color: '#E74C3C' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <Input label="Nome" value={contact.name} onChange={e => updateContact(idx, { name: e.target.value })} />
                      <Input label="Telefono" value={contact.phone} onChange={e => updateContact(idx, { phone: e.target.value })} />
                      <Select
                        label="Relazione"
                        options={[
                          { value: 'manager', label: 'Manager' },
                          { value: 'rspp', label: 'RSPP' },
                          { value: 'familiare', label: 'Familiare' },
                          { value: 'collega', label: 'Collega' },
                        ]}
                        value={contact.relation}
                        onChange={e => updateContact(idx, { relation: e.target.value })}
                      />
                      <div className="flex gap-3 mt-2">
                        <Checkbox label="📱 SMS" checked={contact.sms_enabled} onChange={v => updateContact(idx, { sms_enabled: v })} />
                        <Checkbox label="✈️ Telegram" checked={contact.telegram_enabled} onChange={v => updateContact(idx, { telegram_enabled: v })} />
                        <Checkbox label="📞 Chiamata" checked={contact.call_enabled} onChange={v => updateContact(idx, { call_enabled: v })} />
                      </div>
                    </div>
                  ))}
                  {editBuffer.contacts.length < 5 && (
                    <button
                      onClick={addContact}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                      style={{ border: '1px dashed #2A2D3E', color: '#8899AA' }}>
                      <Plus size={14} /> Aggiungi contatto
                    </button>
                  )}
                  <SectionTitle icon={<SlidersHorizontal size={16} />} title="Cascata Chiamate" />
                  {editBuffer.cascade && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                        <span className="text-xs" style={{ color: '#ECEFF4' }}>Round</span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={editBuffer.cascade.rounds}
                          onChange={e => updateCascade({ rounds: parseInt(e.target.value) || 2 })}
                          className="w-20 px-2 py-1 text-xs rounded text-right"
                          style={{ backgroundColor: '#1A1D27', color: '#ECEFF4', border: '1px solid #2A2D3E' }}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                        <span className="text-xs" style={{ color: '#ECEFF4' }}>Timeout (sec)</span>
                        <input
                          type="number"
                          min="10"
                          max="60"
                          value={editBuffer.cascade.timeout}
                          onChange={e => updateCascade({ timeout: parseInt(e.target.value) || 25 })}
                          className="w-20 px-2 py-1 text-xs rounded text-right"
                          style={{ backgroundColor: '#1A1D27', color: '#ECEFF4', border: '1px solid #2A2D3E' }}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                        <span className="text-xs" style={{ color: '#ECEFF4' }}>Delay (sec)</span>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={editBuffer.cascade.delay}
                          onChange={e => updateCascade({ delay: parseInt(e.target.value) || 10 })}
                          className="w-20 px-2 py-1 text-xs rounded text-right"
                          style={{ backgroundColor: '#1A1D27', color: '#ECEFF4', border: '1px solid #2A2D3E' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STATUS TAB */}
              {editTab === 'status' && editBuffer.operatorId && (
                <div className="space-y-4">
                  <SectionTitle icon={<Activity size={16} />} title="Stato Operatore" />
                  {statusByOp[editBuffer.operatorId] ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                        <div className="text-xs mb-1" style={{ color: '#8899AA' }}>STATO</div>
                        <div className="text-base font-bold" style={{ color: statusFor(editBuffer.operatorId).color }}>{statusFor(editBuffer.operatorId).label}</div>
                      </div>
                      <div className="p-3 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                        <div className="text-xs mb-1" style={{ color: '#8899AA' }}>BATTERIA</div>
                        <div className="text-base font-bold" style={{ color: batteryColor(statusByOp[editBuffer.operatorId]?.battery_phone) }}>
                          {statusByOp[editBuffer.operatorId]?.battery_phone ?? '—'}%
                        </div>
                      </div>
                      <div className="p-3 rounded-xl col-span-2" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                        <div className="text-xs mb-1" style={{ color: '#8899AA' }}>GPS</div>
                        {statusByOp[editBuffer.operatorId]?.last_lat ? (
                          <div>
                            <a
                              href={`https://maps.google.com/?q=${statusByOp[editBuffer.operatorId]!.last_lat},${statusByOp[editBuffer.operatorId]!.last_lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs underline"
                              style={{ color: '#3B82F6' }}>
                              {statusByOp[editBuffer.operatorId]!.last_lat?.toFixed(5)}, {statusByOp[editBuffer.operatorId]!.last_lng?.toFixed(5)}
                            </a>
                            <div className="text-xs mt-1" style={{ color: '#ECEFF4' }}>
                              {addressByOp[editBuffer.operatorId] || '⟳ Caricamento...'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#8899AA' }}>—</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: '#8899AA' }}>Nessun dato disponibile</p>
                  )}
                </div>
              )}

              {/* PDF TAB */}
              {editTab === 'pdf' && editBuffer.operatorId && (
                <div className="space-y-4">
                  <SectionTitle icon={<FileText size={16} />} title="PDF Onboarding" />
                  <p className="text-xs" style={{ color: '#8899AA' }}>Genera PDF con QR e guida</p>
                  <button
                    onClick={() => {
                      const op = operators.find(o => o.id === editBuffer.operatorId);
                      if (op) {
                        generateOnboardingPdf({
                          name: op.name,
                          companyName: 'Costruzioni Sicure S.r.l.',
                          preset: op.default_preset,
                          configToken: op.id,
                          operatorId: op.id,
                          contacts: (op.emergency_contacts || []).map((c: any) => ({
                            name: c.name,
                            sms: c.sms_enabled !== false,
                            telegram: c.telegram_enabled !== false,
                            call: c.call_enabled !== false,
                          })),
                        });
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold"
                    style={{ backgroundColor: '#3B82F6', color: '#fff' }}>
                    <FileText size={16} /> Scarica PDF
                  </button>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(231,76,60,0.15)', color: '#E74C3C' }}>
                  ❌ {formError}
                </div>
              )}
            </div>

            {/* Save Bar */}
            <div className="sticky bottom-0 px-5 py-4 flex gap-3" style={{ backgroundColor: '#1A1D27', borderTop: '1px solid #2A2D3E' }}>
              {/* FIX D: Hide save button for read-only status tab */}
              {editTab !== 'status' && (
                <button
                  onClick={() => saveTab(editTab)}
                  disabled={!dirtyTabs[editTab] || saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: dirtyTabs[editTab] ? '#E63946' : '#4A5568',
                    color: '#fff',
                    opacity: dirtyTabs[editTab] ? 1 : 0.5,
                    cursor: dirtyTabs[editTab] ? 'pointer' : 'not-allowed',
                  }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salva {editTab}
                </button>
              )}
              <button
                onClick={closePanel}
                className={`${editTab === 'status' ? 'w-full' : ''} px-4 py-2.5 rounded-lg text-sm font-medium`}
                style={{ border: '1px solid #2A2D3E', color: '#8899AA' }}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Dialog */}
      {unsavedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-lg p-6 w-full max-w-sm" style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
            <h3 className="text-base font-bold mb-2" style={{ color: '#ECEFF4' }}>⚠️ Modifiche non salvate</h3>
            <p className="text-sm mb-6" style={{ color: '#8899AA' }}>Hai modifiche in: {Object.entries(dirtyTabs).filter(([_, v]) => v).map(([k]) => k).join(', ')}</p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setSaving(true);
                  await handleSaveAndClose();
                  setUnsavedDialog(null);
                  if (unsavedDialog.nextTab !== 'anagrafica') {
                    setEditTab(unsavedDialog.nextTab);
                  }
                  setSaving(false);
                }}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold"
                style={{ backgroundColor: '#2ECC71', color: '#fff' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {unsavedDialog.nextTab === 'anagrafica' ? 'Salva e chiudi' : 'Salva e continua'}
              </button>
              <button
                onClick={() => {
                  setUnsavedDialog(null);
                  if (unsavedDialog.nextTab === 'anagrafica') {
                    doClosePanel();
                  } else {
                    setEditTab(unsavedDialog.nextTab);
                  }
                }}
                className="flex-1 px-3 py-2.5 rounded-lg text-xs font-bold"
                style={{ border: '1px solid #2A2D3E', color: '#ECEFF4' }}>
                Scarta
              </button>
              <button onClick={() => setUnsavedDialog(null)} className="px-3 py-2.5 rounded-lg text-xs font-bold" style={{ border: '1px solid #2A2D3E', color: '#8899AA' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-4 right-4 px-4 py-3 rounded-lg text-sm font-bold"
          style={{
            backgroundColor: toast.type === 'success' ? '#2ECC71' : '#E74C3C',
            color: '#fff',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out',
          }}>
          {toast.message}
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
