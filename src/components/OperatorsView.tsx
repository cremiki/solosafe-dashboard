import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Save, Loader2, UserPlus,
  Phone, Shield, Smartphone, Clock, Users, AlertCircle, ChevronDown, FileText,
  AlertTriangle, Activity, SlidersHorizontal, Battery, MapPin, RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEVICE_ICONS, ICON_PATHS } from '../lib/markerIcons';
import { generateOnboardingPdf } from '../utils/generateOnboardingPdf';
import { reverseGeocode } from '../lib/geocoding';
import OperatorIcon from './OperatorIcon';

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

// Types
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
  default_session_hours?: number;
  birth_date?: string | null;
  notes?: string | null;
  icon_name?: string;
  app_language?: string;
  email?: string | null;
  phone_number?: string | null;
  badge_number?: string | null;
  shared_device?: boolean;
}

const PRESET_COLORS: Record<string, string> = {
  OFFICE: '#3B82F6', WAREHOUSE: '#9B59B6', CONSTRUCTION: '#F39C12',
  INDUSTRY: '#E74C3C', ALTITUDE: '#1ABC9C', VEHICLE: '#2ECC71',
};

type EditTab = 'anagrafica' | 'turni' | 'alarms' | 'contacts' | 'status' | 'pdf';

type FormMode = null | 'create' | 'edit';

const PRESETS = ['OFFICE', 'WAREHOUSE', 'CONSTRUCTION', 'INDUSTRY', 'VEHICLE', 'ALTITUDE'];
const SESSION_TYPES = [
  { value: 'turno', label: 'Turno' },
  { value: 'intervento', label: 'Intervento' },
  { value: 'continua', label: 'Continua' },
];
const CERTIFICATIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'compatible', label: 'Compatible' },
  { value: 'certified', label: 'Certified' },
];
const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
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

interface FormState {
  name: string;
  locale: string;
  default_preset: string;
  default_session_type: string;
  default_duration_hours: number;
  allow_preset_change: boolean;
  login_pin: string;
  duress_pin: string;
  device: DeviceInfo;
  contacts: EmergencyContact[];
  birth_date: string;
  notes: string;
  icon_name: string;
  app_language: string;
  email: string;
  phone_number: string;
  badge_number: string;
}

const emptyForm = (): FormState => ({
  name: '',
  locale: 'it',
  default_preset: 'WAREHOUSE',
  default_session_type: 'turno',
  default_duration_hours: 8,
  allow_preset_change: false,
  login_pin: '',
  duress_pin: '',
  device: emptyDevice(),
  contacts: [],
  birth_date: '',
  notes: '',
  icon_name: 'shield',
  app_language: 'it',
  email: '',
  phone_number: '',
  badge_number: '',
});

// Styled input components
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

interface OperatorsViewProps {
  pendingOpen?: { id: string; tab: 'status' | 'alarms' } | null;
  onOpenHandled?: () => void;
}

export default function OperatorsView({ pendingOpen, onOpenHandled }: OperatorsViewProps = {}) {
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<EditTab>('anagrafica');
  const [statusByOp, setStatusByOp] = useState<Record<string, any>>({});
  const [paramsByOp, setParamsByOp] = useState<Record<string, Record<string, string>>>({});
  const [alarmEdits, setAlarmEdits] = useState<Record<string, any>>({});
  const [cascadeEdits, setCascadeEdits] = useState<{ rounds?: number; timeout?: number; delay?: number }>({});
  const [savingAlarms, setSavingAlarms] = useState(false);
  const [iconDropdownOpen, setIconDropdownOpen] = useState(false);
  const [isDirty, setIsDirty] = useState<Record<string, boolean>>({});
  const [unsavedDialog, setUnsavedDialog] = useState<{ tab: EditTab; nextTab: EditTab } | null>(null);
  const [addressByOp, setAddressByOp] = useState<Record<string, string>>({});

  const fetchStatus = useCallback(async () => {
    const { data: hb } = await supabase
      .from('operator_status')
      .select('operator_id, state, battery_phone, is_charging, last_seen, last_lat, last_lng, session_id, updated_at');
    const map: Record<string, any> = {};
    (hb || []).forEach((h: any) => {
      // Normalize column names so the rest of the code stays the same
      map[h.operator_id] = {
        ...h,
        battery_phone: h.battery_phone,
        charging: h.is_charging,
        lat: h.last_lat,
        lng: h.last_lng,
        created_at: h.last_seen || h.updated_at,
      };
    });
    setStatusByOp(map);

    const { data: logs } = await supabase
      .from('app_config_log')
      .select('operator_id, param_name, new_value, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    const pmap: Record<string, Record<string, string>> = {};
    (logs || []).forEach((l: any) => {
      if (!pmap[l.operator_id]) pmap[l.operator_id] = {};
      if (!pmap[l.operator_id][l.param_name]) pmap[l.operator_id][l.param_name] = l.new_value;
    });
    setParamsByOp(pmap);
  }, []);

  const fetchOperators = useCallback(async () => {
    const { data, error } = await supabase
      .from('operators')
      .select('*, devices(*), emergency_contacts(*), config_token_permanent, birth_date, notes, icon_name, app_language, email, phone_number, badge_number, shared_device')
      .eq('company_id', COMPANY_ID)
      .order('name');

    if (!error && data) {
      setOperators(data as OperatorRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOperators(); fetchStatus(); }, [fetchOperators, fetchStatus]);

  // Handle deep-link from FleetView
  useEffect(() => {
    if (!pendingOpen || operators.length === 0) return;
    const op = operators.find(o => o.id === pendingOpen.id);
    if (op) {
      openEditOnTab(op, pendingOpen.tab);
      onOpenHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpen, operators]);

  useEffect(() => {
    const ch = supabase.channel('operators_view_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operator_status' }, () => fetchStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config_log' }, () => fetchStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_contacts' }, () => fetchOperators())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'operators' }, () => fetchOperators())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOperators, fetchStatus]);

  useEffect(() => {
    if (!editId || editTab !== 'status') return;
    const st = statusByOp[editId];
    if (!st || !st.lat) return;
    if (addressByOp[editId]) return; // Already loaded
    (async () => {
      const addr = await reverseGeocode(st.lat, st.lng);
      setAddressByOp(prev => ({ ...prev, [editId]: addr }));
    })();
  }, [editId, editTab, statusByOp]);

  useEffect(() => {
    if (!editId) return;
    const key = `${editId}_${editTab}`;
    // Tab is dirty if contacts has changes or cascade settings have changes
    let dirty = false;
    if (editTab === 'contacts') {
      const op = operators.find(o => o.id === editId);
      if (op) {
        // Check if contacts changed
        const originalContacts = op.emergency_contacts || [];
        if (JSON.stringify(form.contacts) !== JSON.stringify(originalContacts)) {
          dirty = true;
        }
        // Check if cascade settings changed
        if (Object.keys(cascadeEdits).length > 0) {
          dirty = true;
        }
      }
    } else if (editTab === 'anagrafica' || editTab === 'turni') {
      // For other tabs, check if form changed
      const op = operators.find(o => o.id === editId);
      if (op) {
        dirty = JSON.stringify(form) !== JSON.stringify(op);
      }
    }
    setIsDirty(prev => ({ ...prev, [key]: dirty }));
  }, [editId, editTab, form, cascadeEdits, operators]);

  function offlineMin(iso?: string) {
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
  function batteryColor(pct: number | null | undefined) {
    if (pct == null) return '#4A5568';
    if (pct < 20) return '#E74C3C';
    if (pct < 50) return '#F39C12';
    return '#2ECC71';
  }
  function heartbeatColor(min: number | null) {
    if (min == null) return '#4A5568';
    if (min < 10) return '#2ECC71';
    if (min < 30) return '#F39C12';
    return '#E74C3C';
  }
  function disabledAlarmCount(opId: string) {
    const p = paramsByOp[opId] || {};
    return ['fall_enabled', 'immobility_enabled', 'malore_enabled'].filter(k => p[k] === 'false').length;
  }

  function handleTabChange(nextTab: EditTab) {
    const currentTabKey = `${editId}_${editTab}`;
    if (isDirty[currentTabKey]) {
      setUnsavedDialog({ tab: editTab, nextTab });
    } else {
      setEditTab(nextTab);
    }
  }

  const filtered = operators.filter(op =>
    op.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm(emptyForm());
    setEditId(null);
    setFormMode('create');
    setFormError(null);
  }

  function openEdit(op: OperatorRow) {
    setForm({
      name: op.name,
      locale: op.locale || 'it',
      default_preset: op.default_preset || 'WAREHOUSE',
      default_session_type: op.default_session_type || 'turno',
      default_duration_hours: op.default_duration_hours || 8,
      allow_preset_change: op.allow_preset_change || false,
      login_pin: op.login_pin || '',
      duress_pin: op.duress_pin || '',
      birth_date: op.birth_date || '',
      notes: op.notes || '',
      icon_name: op.icon_name || 'shield',
      app_language: op.app_language || op.locale || 'it',
      email: op.email || '',
      phone_number: op.phone_number || '',
      badge_number: op.badge_number || '',
      device: op.devices ? {
        id: op.devices.id,
        model: op.devices.model || '',
        imei: op.devices.imei || '',
        is_shared: op.devices.is_shared || false,
        certification: (op.devices.certification as DeviceInfo['certification']) || 'basic',
        icon_type: op.devices.icon_type || 'shield',
      } : emptyDevice(),
      contacts: (op.emergency_contacts || [])
        .sort((a, b) => a.position - b.position)
        .map(c => ({
          id: c.id,
          position: c.position,
          name: c.name,
          phone: c.phone,
          preferred_channel: c.preferred_channel as EmergencyContact['preferred_channel'],
          dtmf_required: c.dtmf_required,
          sms_enabled: c.sms_enabled ?? true,
          telegram_enabled: c.telegram_enabled ?? true,
          call_enabled: c.call_enabled ?? true,
          relation: c.relation || 'manager',
          telegram_chat_id: c.telegram_chat_id,
        })),
    });
    setEditId(op.id);
    setFormMode('edit');
    setFormError(null);
    setEditTab('anagrafica');
    setAlarmEdits({});
    setCascadeEdits({});
  }

  function openEditOnTab(op: OperatorRow, tab: EditTab) {
    openEdit(op);
    setTimeout(() => setEditTab(tab), 0);
  }

  function closeForm() {
    const key = `${editId}_${editTab}`;
    if (isDirty[key]) {
      setUnsavedDialog({ tab: editTab, nextTab: 'anagrafica' });
    } else {
      setFormMode(null);
      setEditId(null);
      setFormError(null);
      setIsDirty({});
    }
  }

  function doCloseForm() {
    setFormMode(null);
    setEditId(null);
    setFormError(null);
    setIsDirty({});
  }

  function updateForm(patch: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  function updateDevice(patch: Partial<DeviceInfo>) {
    setForm(prev => ({ ...prev, device: { ...prev.device, ...patch } }));
  }

  function addContact() {
    if (form.contacts.length >= 5) return;
    setForm(prev => ({
      ...prev,
      contacts: [...prev.contacts, { ...emptyContact(), position: prev.contacts.length + 1 }],
    }));
  }

  function removeContact(idx: number) {
    setForm(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i + 1 })),
    }));
  }

  function updateContact(idx: number, patch: Partial<EmergencyContact>) {
    setForm(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => i === idx ? { ...c, ...patch } : c),
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Il nome è obbligatorio');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      // Device: create or update
      let deviceId: string | null = null;
      if (form.device.model || form.device.imei) {
        if (form.device.id) {
          await supabase.from('devices').update({
            model: form.device.model || null,
            imei: form.device.imei || null,
            is_shared: form.device.is_shared,
            certification: form.device.certification,
            icon_type: form.device.icon_type,
          }).eq('id', form.device.id);
          deviceId = form.device.id;
        } else {
          const { data: devData, error: devErr } = await supabase.from('devices').insert({
            company_id: COMPANY_ID,
            model: form.device.model || null,
            imei: form.device.imei || null,
            is_shared: form.device.is_shared,
            certification: form.device.certification,
            icon_type: form.device.icon_type,
          }).select('id').single();
          if (devErr) throw devErr;
          deviceId = devData.id;
        }
      }

      const operatorPayload = {
        company_id: COMPANY_ID,
        name: form.name.trim(),
        locale: form.app_language,
        default_preset: form.default_preset,
        default_session_type: form.default_session_type,
        default_duration_hours: form.default_duration_hours,
        allow_preset_change: form.allow_preset_change,
        login_pin: form.login_pin || null,
        duress_pin: form.duress_pin || null,
        device_id: deviceId,
        birth_date: form.birth_date || null,
        notes: form.notes || null,
        icon_name: form.icon_name,
        app_language: form.app_language,
        email: form.email || null,
        phone_number: form.phone_number || null,
        badge_number: form.badge_number || null,
      };

      let operatorId = editId;

      if (formMode === 'create') {
        const { data, error } = await supabase.from('operators').insert(operatorPayload).select('id').single();
        if (error) throw error;
        operatorId = data.id;

        // Create operator_status row
        await supabase.from('operator_status').insert({
          operator_id: operatorId,
          state: 'offline',
          battery_phone: 0,
        });
      } else {
        const { error } = await supabase.from('operators').update(operatorPayload).eq('id', editId);
        if (error) throw error;
      }

      // Emergency contacts: delete existing then re-insert
      if (operatorId) {
        await supabase.from('emergency_contacts').delete().eq('operator_id', operatorId);

        if (form.contacts.length > 0) {
          const contactRowsFull = form.contacts.map((c, i) => ({
            operator_id: operatorId,
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

          if (contactRowsFull.length > 0) {
            const { error: cErr } = await supabase.from('emergency_contacts').insert(contactRowsFull);
            if (cErr) throw cErr;
          }
        }
      }

      // Save cascade settings if in edit mode and tab is contacts
      if (formMode === 'edit' && editTab === 'contacts' && operatorId) {
        const op = operators.find(o => o.id === operatorId);
        if (op) {
          const patch: any = {};
          if (cascadeEdits.rounds !== undefined && cascadeEdits.rounds !== op.cascade_max_rounds) {
            patch.cascade_max_rounds = cascadeEdits.rounds;
          }
          if (cascadeEdits.timeout !== undefined && cascadeEdits.timeout !== op.cascade_timeout_seconds) {
            patch.cascade_timeout_seconds = cascadeEdits.timeout;
          }
          if (cascadeEdits.delay !== undefined && cascadeEdits.delay !== op.cascade_delay_seconds) {
            patch.cascade_delay_seconds = cascadeEdits.delay;
          }
          if (Object.keys(patch).length > 0) {
            const { error: cascadeErr } = await supabase.from('operators').update(patch).eq('id', operatorId);
            if (cascadeErr) throw cascadeErr;
          }
          setCascadeEdits({});
        }
      }

      closeForm();
      await fetchOperators();
    } catch (err: any) {
      setFormError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    // Delete emergency contacts, operator_status, then operator
    await supabase.from('emergency_contacts').delete().eq('operator_id', id);
    await supabase.from('operator_status').delete().eq('operator_id', id);
    await supabase.from('operators').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchOperators();
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid #2A2D3E' }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#ECEFF4' }}>Operatori</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8899AA' }}>
            {operators.length} operatori registrati
          </p>
        </div>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#E63946', color: '#fff' }}>
          <Plus size={16} /> Aggiungi Operatore
        </button>
      </header>

      {/* Search bar */}
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
                  <tr key={op.id} className="cursor-pointer hover:bg-white/5"
                      onClick={() => openEditOnTab(op, 'anagrafica')}
                      style={{ backgroundColor: idx % 2 === 0 ? '#1A1D27' : '#161922', borderTop: '1px solid #2A2D3E' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">
                          <OperatorIcon iconName={op.icon_name || 'shield'} status={sFor.state === 'protected' ? 'PROTETTO' : sFor.state === 'alarm' ? 'ALLARME' : 'STANDBY'} size={28} />
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: '#ECEFF4' }}>{op.name}</div>
                          <span className="text-xs" style={{ color: presetColor }}>{op.default_preset}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded"
                              style={{ color: sFor.color, backgroundColor: `${sFor.color}20` }}>
                          {sFor.label}
                        </span>
                        {sFor.state === 'protected' && st?.protected_since && (
                          <div className="text-xs mt-0.5" style={{ color: '#8899AA' }}>
                            dalle {new Date(st.protected_since).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {st?.battery_phone != null ? (
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: batteryColor(st.battery_phone) }}>
                          <Battery size={12} /> {st.battery_phone}%
                          {st.charging && <span title="In carica">⚡</span>}
                        </span>
                      ) : <span className="text-xs" style={{ color: '#4A5568' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold" style={{ color: heartbeatColor(offMin) }}>
                        {offMin != null ? `${offMin}m fa` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs" style={{ color: '#8899AA' }}>
                          {op.emergency_contacts?.length || 0}/5
                        </span>
                        {(op.emergency_contacts || []).some((c: any) => c.telegram_chat_id) && (
                          <span title="Telegram configurato" className="text-xs" style={{ color: '#2ECC71' }}>✈</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {disabledCount > 0 ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                              style={{ color: '#E74C3C', backgroundColor: 'rgba(231,76,60,0.15)' }}>
                          <AlertTriangle size={10} /> {disabledCount} OFF
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#2ECC71' }}>✓ tutti ON</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEditOnTab(op, 'alarms'); }}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                                style={{ color: '#F39C12' }} title="Allarmi">
                          <SlidersHorizontal size={16} />
                        </button>
                        <button onClick={() => generateOnboardingPdf({
                                  name: op.name,
                                  companyName: 'Costruzioni Sicure S.r.l.',
                                  preset: op.default_preset,
                                  configToken: (op as any).config_token_permanent || op.id,
                                  operatorId: op.id,
                                  contacts: (op.emergency_contacts || []).map((c: any) => ({
                                    name: c.name, sms: c.sms_enabled !== false,
                                    telegram: c.telegram_enabled !== false, call: c.call_enabled !== false,
                                  })),
                                })}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                                style={{ color: '#3B82F6' }} title="PDF Attivazione">
                          <FileText size={16} />
                        </button>
                        {deleteConfirm === op.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(op.id)}
                                    className="px-2 py-1 rounded text-xs font-medium"
                                    style={{ backgroundColor: 'rgba(231,76,60,0.2)', color: '#E74C3C' }}>
                              Conferma
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                                    className="px-2 py-1 rounded text-xs"
                                    style={{ color: '#8899AA' }}>
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(op.id)}
                                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                                  style={{ color: '#8899AA' }} title="Elimina">
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

      {/* Modal form */}
      {formMode && (
        <div className="fixed inset-0 z-50 flex items-start justify-end"
             style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
             onClick={e => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="w-full max-w-lg h-full overflow-y-auto"
               style={{ backgroundColor: '#1A1D27', borderLeft: '1px solid #2A2D3E' }}>
            {/* Panel header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
                 style={{ backgroundColor: '#1A1D27', borderBottom: '1px solid #2A2D3E' }}>
              <h3 className="text-base font-bold" style={{ color: '#ECEFF4' }}>
                {formMode === 'create' ? 'Nuovo Operatore' : form.name || 'Modifica Operatore'}
              </h3>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-white/5"
                      style={{ color: '#8899AA' }}>
                <X size={20} />
              </button>
            </div>

            {/* Tab navigation (only for edit mode — create starts on anagrafica) */}
            {formMode === 'edit' && (
              <div className="flex gap-1 px-5 pt-3 overflow-x-auto" style={{ borderBottom: '1px solid #2A2D3E' }}>
                {([
                  { id: 'anagrafica', label: '👤 Anagrafica' },
                  { id: 'turni', label: '⚙️ Turni & Preset' },
                  { id: 'alarms', label: '🚨 Allarmi' },
                  { id: 'contacts', label: '📞 Contatti' },
                  { id: 'status', label: '📊 Stato' },
                  { id: 'pdf', label: '📄 PDF' },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                    className="px-3 py-2 text-xs font-semibold whitespace-nowrap"
                    style={{
                      color: editTab === tab.id ? '#ECEFF4' : '#8899AA',
                      borderBottom: editTab === tab.id ? '2px solid #E63946' : '2px solid transparent',
                      marginBottom: -1,
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="px-5 py-4 space-y-1">
              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
                     style={{ backgroundColor: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.25)' }}>
                  <AlertCircle size={14} className="text-red-400" />
                  <span className="text-xs text-red-300">{formError}</span>
                </div>
              )}

              {(formMode === 'create' || editTab === 'anagrafica') && (<>
              {/* --- Dati personali --- */}
              <SectionTitle icon={<Users size={16} />} title="Dati personali" />
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input label="Nome completo *" value={form.name}
                         onChange={e => updateForm({ name: e.target.value })} placeholder="Mario Rossi" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>Data di nascita</label>
                  <input type="date" value={form.birth_date}
                    onChange={e => updateForm({ birth_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }} />
                </div>
                <Input label="Email" type="email" value={form.email}
                       onChange={e => updateForm({ email: e.target.value })} placeholder="mario.rossi@azienda.it" />
                <Input label="Telefono" value={form.phone_number}
                       onChange={e => updateForm({ phone_number: e.target.value })} placeholder="+39 333 1234567" />
                <Input label="Matricola / Badge" value={form.badge_number}
                       onChange={e => updateForm({ badge_number: e.target.value })} placeholder="MAT-001" />
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>
                    Note <span style={{ color: '#4A5568' }}>(max 500 caratteri)</span>
                  </label>
                  <textarea value={form.notes} maxLength={500} rows={3}
                    onChange={e => updateForm({ notes: e.target.value })}
                    placeholder="Note libere sull'operatore..."
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }} />
                  <div className="text-right text-xs mt-0.5" style={{ color: '#4A5568' }}>{form.notes.length}/500</div>
                </div>
              </div>

              {/* --- Aspetto --- */}
              <SectionTitle icon={<Shield size={16} />} title="Aspetto" />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#8899AA' }}>Icona operatore</label>
                <div className="relative">
                  <button type="button"
                    onClick={() => setIconDropdownOpen(o => !o)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#E63946">
                      <path d={ICON_PATHS[form.icon_name] || ICON_PATHS.shield} />
                    </svg>
                    <span>{DEVICE_ICONS.find(i => i.key === form.icon_name)?.label || 'Scudo'}</span>
                    <ChevronDown size={14} style={{ color: '#8899AA', marginLeft: 'auto' }} />
                  </button>
                  {iconDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg overflow-hidden"
                         style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      {DEVICE_ICONS.map(ic => (
                        <button key={ic.key} type="button"
                          onClick={() => { updateForm({ icon_name: ic.key }); setIconDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                          style={{
                            color: form.icon_name === ic.key ? '#ECEFF4' : '#8899AA',
                            backgroundColor: form.icon_name === ic.key ? 'rgba(230,57,70,0.1)' : 'transparent',
                          }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={form.icon_name === ic.key ? '#E63946' : '#6B7280'}>
                            <path d={ICON_PATHS[ic.key]} />
                          </svg>
                          <span className="text-sm">{ic.label}</span>
                          {form.icon_name === ic.key && <span className="ml-auto text-xs" style={{ color: '#E63946' }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* --- Documenti (futuro) --- */}
              <SectionTitle icon={<FileText size={16} />} title="Documenti" />
              <div className="rounded-lg px-4 py-3 flex items-center gap-3"
                   style={{ backgroundColor: '#0F1117', border: '1px dashed #2A2D3E' }}>
                <span style={{ color: '#4A5568', fontSize: 20 }}>📎</span>
                <span className="text-xs" style={{ color: '#4A5568' }}>
                  Allegati documenti — funzionalità in arrivo
                </span>
              </div>
              </>)}

              {/* TAB: TURNI & PRESET */}
              {(formMode === 'edit' && editTab === 'turni') && (<>
              {/* --- Preset ambientale --- */}
              <SectionTitle icon={<SlidersHorizontal size={16} />} title="Preset ambientale" />
              {(() => {
                const PRESET_DESC: Record<string, string> = {
                  OFFICE: 'Uffici, bassa attività fisica, soglie conservative',
                  WAREHOUSE: 'Magazzini e logistica — preset default',
                  CONSTRUCTION: 'Cantieri edili, soglie caduta aumentate',
                  INDUSTRY: 'Industria pesante, ambienti ad alto rischio',
                  VEHICLE: 'Guida veicoli — fall detection disabilitata',
                  ALTITUDE: 'Lavori in quota, minima singola fonte 10s',
                };
                return (
                  <div className="space-y-2">
                    {PRESETS.map(p => (
                      <button key={p} type="button"
                        onClick={() => updateForm({ default_preset: p })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left"
                        style={{
                          backgroundColor: form.default_preset === p ? `${PRESET_COLORS[p]}15` : '#0F1117',
                          border: `1px solid ${form.default_preset === p ? PRESET_COLORS[p] : '#2A2D3E'}`,
                        }}>
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PRESET_COLORS[p] }} />
                        <div>
                          <div className="text-xs font-bold" style={{ color: form.default_preset === p ? '#ECEFF4' : '#8899AA' }}>{p}</div>
                          <div className="text-xs" style={{ color: '#4A5568' }}>{PRESET_DESC[p]}</div>
                        </div>
                        {form.default_preset === p && <span className="ml-auto text-xs" style={{ color: PRESET_COLORS[p] }}>✓</span>}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid #2A2D3E' }}>
                      <Checkbox label="Permetti all'operatore di cambiare preset" checked={form.allow_preset_change}
                                onChange={v => updateForm({ allow_preset_change: v })} />
                    </div>
                  </div>
                );
              })()}

              {/* --- Sessione di lavoro --- */}
              <SectionTitle icon={<Clock size={16} />} title="Sessione di lavoro" />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Tipo sessione default" value={form.default_session_type}
                        onChange={e => updateForm({ default_session_type: e.target.value })}
                        options={SESSION_TYPES} />
                <Select label="Durata turno default" value={String(form.default_duration_hours)}
                        onChange={e => updateForm({ default_duration_hours: parseInt(e.target.value) || 8 })}
                        options={[
                          { value: '1', label: '1 ora' },
                          { value: '4', label: '4 ore' },
                          { value: '8', label: '8 ore' },
                          { value: '12', label: '12 ore' },
                        ]} />
              </div>

              {/* --- Lingua app --- */}
              <SectionTitle icon={<Users size={16} />} title="Localizzazione" />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Lingua app" value={form.app_language}
                        onChange={e => updateForm({ app_language: e.target.value })}
                        options={[{ value: 'it', label: 'Italiano' }, { value: 'en', label: 'English' }]} />
              </div>
              </>)}

              {(formMode === 'create' || editTab === 'contacts') && (<>
              {/* Section 5: Emergency contacts */}
              <SectionTitle icon={<Phone size={16} />} title={`Contatti emergenza (${form.contacts.length}/5)`} />

              {/* Telegram invite link */}
              {editId && (
                <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#3B82F6' }}>Link invito Telegram</p>
                      <p className="text-xs font-mono mt-1" style={{ color: '#8899AA' }}>
                        t.me/SoloSafe_bot?start=OP-{editId.substring(0, 8)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        navigator.clipboard.writeText(`https://t.me/SoloSafe_bot?start=OP-${editId.substring(0, 8)}`);
                      }} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#2A2D3E', color: '#ECEFF4' }}>
                        📋 Copia
                      </button>
                      <a href={`sms:?body=Ricevi gli allarmi SoloSafe: https://t.me/SoloSafe_bot?start=OP-${editId.substring(0, 8)}`}
                         className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#2A2D3E', color: '#ECEFF4' }}>
                        📱 SMS
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {form.contacts.map((contact, idx) => (
                <div key={idx} className="rounded-lg p-3 mb-2"
                     style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: '#E63946' }}>
                        Contatto #{contact.position}
                      </span>
                      {contact.telegram_chat_id ? (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#2ECC71', backgroundColor: 'rgba(46,204,113,0.1)' }}>✅ Telegram</span>
                      ) : contact.telegram_enabled ? (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#F39C12', backgroundColor: 'rgba(243,156,18,0.1)' }}>⏳ In attesa</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#4A5568', backgroundColor: 'rgba(74,85,104,0.1)' }}>➖ No Telegram</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => {
                        if (idx === 0) return;
                        setForm(prev => {
                          const arr = [...prev.contacts];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          return { ...prev, contacts: arr.map((c, i) => ({ ...c, position: i + 1 })) };
                        });
                      }} disabled={idx === 0}
                        className="p-1 rounded hover:bg-white/5 disabled:opacity-30"
                        style={{ color: '#8899AA' }} title="Sposta su">↑</button>
                      <button onClick={() => {
                        if (idx === form.contacts.length - 1) return;
                        setForm(prev => {
                          const arr = [...prev.contacts];
                          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                          return { ...prev, contacts: arr.map((c, i) => ({ ...c, position: i + 1 })) };
                        });
                      }} disabled={idx === form.contacts.length - 1}
                        className="p-1 rounded hover:bg-white/5 disabled:opacity-30"
                        style={{ color: '#8899AA' }} title="Sposta giù">↓</button>
                      <button onClick={() => removeContact(idx)}
                              className="p-1 rounded hover:bg-white/5" style={{ color: '#8899AA' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Nome" value={contact.name}
                           onChange={e => updateContact(idx, { name: e.target.value })} placeholder="Nome contatto" />
                    <Input label="Telefono" value={contact.phone}
                           onChange={e => updateContact(idx, { phone: e.target.value })} placeholder="+39 333 1234567" />
                    <Select label="Relazione" value={contact.relation}
                            onChange={e => updateContact(idx, { relation: e.target.value })}
                            options={[{value:'manager',label:'Manager'},{value:'rspp',label:'RSPP'},{value:'familiare',label:'Familiare'},{value:'collega',label:'Collega'}]} />
                    <Input label="Telegram Chat ID" value={contact.telegram_chat_id?.toString() || ''}
                           onChange={e => updateContact(idx, { telegram_chat_id: e.target.value ? parseInt(e.target.value) || null : null })}
                           placeholder="Invia /start a @SoloSafeBot" />
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <Checkbox label="📱 SMS" checked={contact.sms_enabled} onChange={v => updateContact(idx, { sms_enabled: v })} />
                    <Checkbox label="✈️ Telegram" checked={contact.telegram_enabled} onChange={v => updateContact(idx, { telegram_enabled: v })} />
                    <Checkbox label="📞 Chiamata" checked={contact.call_enabled} onChange={v => updateContact(idx, { call_enabled: v })} />
                    <Checkbox label="DTMF" checked={contact.dtmf_required} onChange={v => updateContact(idx, { dtmf_required: v })} />
                  </div>
                </div>
              ))}

              {form.contacts.length < 5 && (
                <button onClick={addContact}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full justify-center"
                        style={{ border: '1px dashed #2A2D3E', color: '#8899AA' }}>
                  <Plus size={14} /> Aggiungi contatto
                </button>
              )}

              {/* Cascade settings inside contacts tab */}
              {formMode === 'edit' && editId && (() => {
                const op = operators.find(o => o.id === editId);
                if (!op) return null;
                const rounds = cascadeEdits.rounds ?? op.cascade_max_rounds ?? 2;
                const timeout = cascadeEdits.timeout ?? op.cascade_timeout_seconds ?? 25;
                const dly = cascadeEdits.delay ?? op.cascade_delay_seconds ?? 10;
                const onSave = async () => {
                  const patch: any = {};
                  if (rounds !== op.cascade_max_rounds) patch.cascade_max_rounds = rounds;
                  if (timeout !== op.cascade_timeout_seconds) patch.cascade_timeout_seconds = timeout;
                  if (dly !== op.cascade_delay_seconds) patch.cascade_delay_seconds = dly;
                  if (Object.keys(patch).length === 0) return;
                  await supabase.from('operators').update(patch).eq('id', op.id);
                  setCascadeEdits({});
                  fetchOperators();
                };
                return (
                  <>
                    <SectionTitle icon={<Phone size={16} />} title="Impostazioni cascata chiamate" />
                    <div className="space-y-2">
                      {[
                        { k: 'rounds', label: 'Round', val: rounds, min: 1, max: 5, suffix: 'cicli', set: (v: number) => setCascadeEdits(c => ({ ...c, rounds: v })) },
                        { k: 'timeout', label: 'Timeout per contatto', val: timeout, min: 10, max: 60, suffix: 'sec', set: (v: number) => setCascadeEdits(c => ({ ...c, timeout: v })) },
                        { k: 'delay', label: 'Ritardo prima chiamata', val: dly, min: 0, max: 30, suffix: 'sec', set: (v: number) => setCascadeEdits(c => ({ ...c, delay: v })) },
                      ].map(f => (
                        <div key={f.k} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                          <span className="text-xs" style={{ color: '#ECEFF4' }}>{f.label}</span>
                          <div className="flex items-center gap-2">
                            <input type="number" value={f.val} min={f.min} max={f.max}
                              onChange={e => f.set(parseInt(e.target.value) || f.val)}
                              className="w-20 px-2 py-1 text-xs rounded text-right"
                              style={{ backgroundColor: '#1A1D27', color: '#ECEFF4', border: '1px solid #2A2D3E' }} />
                            <span className="text-xs" style={{ color: '#8899AA' }}>{f.suffix}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
              </>)}

              {/* TAB: ALARMS */}
              {formMode === 'edit' && editTab === 'alarms' && editId && (() => {
                const params = paramsByOp[editId] || {};
                const alarms = [
                  { name: '🔴 Caduta', enableKey: 'fall_enabled', valKey: 'fall_threshold_g', unit: 'g', def: '2.5', label: 'Soglia G', min: 1.5, max: 4, step: 0.1 },
                  { name: '🟠 Immobilità', enableKey: 'immobility_enabled', valKey: 'immobility_seconds', unit: 's', def: '90', label: 'Tempo', min: 30, max: 300, step: 10 },
                  { name: '🟡 Malore', enableKey: 'malore_enabled', valKey: 'malore_angle', unit: '°', def: '45', label: 'Angolazione', min: 20, max: 90, step: 5 },
                ];
                const onSave = async () => {
                  setSavingAlarms(true);
                  const rows: any[] = [];
                  alarms.forEach(a => {
                    const curEn = params[a.enableKey] !== 'false';
                    const newEn = alarmEdits[a.enableKey] ?? curEn;
                    if (newEn !== curEn) {
                      rows.push({ operator_id: editId, company_id: COMPANY_ID, change_type: 'dashboard', param_name: a.enableKey, old_value: String(curEn), new_value: String(newEn) });
                    }
                    const curVal = params[a.valKey] || a.def;
                    const newVal = String(alarmEdits[a.valKey] ?? curVal);
                    if (newVal !== curVal) {
                      rows.push({ operator_id: editId, company_id: COMPANY_ID, change_type: 'dashboard', param_name: a.valKey, old_value: curVal, new_value: newVal });
                    }
                  });
                  if (rows.length > 0) {
                    await supabase.from('app_config_log').insert(rows);
                    setAlarmEdits({});
                    fetchStatus();
                  }
                  setSavingAlarms(false);
                };
                return (
                  <div className="space-y-3 mt-2">
                    {alarms.map(a => {
                      const curEn = params[a.enableKey] !== 'false';
                      const en = alarmEdits[a.enableKey] ?? curEn;
                      const curVal = params[a.valKey] || a.def;
                      const val = alarmEdits[a.valKey] ?? curVal;
                      return (
                        <div key={a.name} className="flex items-center justify-between p-3 rounded-xl"
                             style={{ backgroundColor: en ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)', border: `1px solid ${en ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)'}` }}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold" style={{ color: '#ECEFF4', minWidth: 110 }}>{a.name}</span>
                            <button onClick={() => setAlarmEdits(e => ({ ...e, [a.enableKey]: !en }))}
                              className="relative inline-flex items-center h-6 w-11 rounded-full"
                              style={{ backgroundColor: en ? '#2ECC71' : '#E74C3C' }}>
                              <span className="inline-block w-4 h-4 rounded-full bg-white"
                                    style={{ transform: en ? 'translateX(24px)' : 'translateX(2px)', transition: 'transform 0.15s' }} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: '#8899AA' }}>{a.label}:</span>
                            <input type="number" value={val} min={a.min} max={a.max} step={a.step} disabled={!en}
                              onChange={e => setAlarmEdits(ed => ({ ...ed, [a.valKey]: e.target.value }))}
                              className="w-20 px-2 py-1 text-xs rounded text-right font-semibold"
                              style={{ backgroundColor: '#0F1117', color: '#ECEFF4', border: '1px solid #2A2D3E', opacity: en ? 1 : 0.5 }} />
                            <span className="text-xs" style={{ color: '#8899AA' }}>{a.unit}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.3)' }}>
                      <span className="text-sm font-bold" style={{ color: '#ECEFF4' }}>🆘 SOS</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#2ECC71', color: '#fff' }}>SEMPRE ON</span>
                    </div>
                    {Object.keys(alarmEdits).length > 0 && (
                      <button onClick={onSave} disabled={savingAlarms}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: '#E63946' }}>
                        {savingAlarms ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Salva modifiche allarmi
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* TAB: STATUS */}
              {formMode === 'edit' && editTab === 'status' && editId && (() => {
                const st = statusByOp[editId];
                const op = operators.find(o => o.id === editId);
                const sFor = statusFor(editId);
                return (
                  <div className="space-y-3 mt-2">
                    {st ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                          <div className="flex items-center gap-1 text-xs mb-1" style={{ color: '#8899AA' }}><Activity size={10} /> STATO</div>
                          <div className="text-base font-bold" style={{ color: sFor.color }}>{sFor.label}</div>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                          <div className="flex items-center gap-1 text-xs mb-1" style={{ color: '#8899AA' }}><Battery size={10} /> BATTERIA</div>
                          <div className="text-base font-bold" style={{ color: batteryColor(st.battery_phone) }}>
                            {st.battery_phone ?? '—'}%
                          </div>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                          <div className="flex items-center gap-1 text-xs mb-1" style={{ color: '#8899AA' }}><Clock size={10} /> ULTIMO HEARTBEAT</div>
                          <div className="text-xs" style={{ color: '#ECEFF4' }}>{new Date(st.created_at).toLocaleString('it-IT')}</div>
                          <div className="text-xs mt-1" style={{ color: '#8899AA' }}>{offlineMin(st.created_at)} min fa</div>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                          <div className="flex items-center gap-1 text-xs mb-1" style={{ color: '#8899AA' }}><MapPin size={10} /> POSIZIONE GPS</div>
                          {st.lat ? (
                            <div>
                              <a href={`https://maps.google.com/?q=${st.lat},${st.lng}`} target="_blank" rel="noreferrer"
                                 className="text-xs underline block" style={{ color: '#3B82F6' }}>
                                {st.lat.toFixed(5)}, {st.lng.toFixed(5)}
                              </a>
                              <div className="text-xs mt-1" style={{ color: '#ECEFF4' }}>
                                {addressByOp[editId] || '⟳ In caricamento...'}
                              </div>
                            </div>
                          ) : <span className="text-xs" style={{ color: '#8899AA' }}>—</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center rounded-xl" style={{ backgroundColor: '#0F1117' }}>
                        <p className="text-xs" style={{ color: '#8899AA' }}>Nessun dato disponibile</p>
                      </div>
                    )}
                    {/* Dispositivo */}
                    <SectionTitle icon={<Smartphone size={16} />} title="Dispositivo" />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Modello', value: op?.devices?.model || '—' },
                        { label: 'IMEI', value: op?.devices?.imei || '—' },
                      ].map(row => (
                        <div key={row.label} className="p-3 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                          <div className="text-xs mb-1" style={{ color: '#8899AA' }}>{row.label.toUpperCase()}</div>
                          <div className="text-xs font-semibold" style={{ color: '#ECEFF4' }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* TAB: PDF */}
              {formMode === 'edit' && editTab === 'pdf' && editId && (() => {
                const op = operators.find(o => o.id === editId);
                if (!op) return null;
                return (
                  <div className="space-y-4 mt-2">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                      <h4 className="text-sm font-bold mb-2" style={{ color: '#ECEFF4' }}>PDF Onboarding</h4>
                      <p className="text-xs mb-3" style={{ color: '#8899AA' }}>
                        Genera la scheda PDF con QR di attivazione, contatti emergenza e guida Telegram per {op.name}.
                      </p>
                      <button onClick={() => generateOnboardingPdf({
                        name: op.name,
                        companyName: 'Costruzioni Sicure S.r.l.',
                        preset: op.default_preset,
                        configToken: (op as any).config_token_permanent || op.id,
                        operatorId: op.id,
                        contacts: (op.emergency_contacts || []).map((c: any) => ({
                          name: c.name, sms: c.sms_enabled !== false,
                          telegram: c.telegram_enabled !== false, call: c.call_enabled !== false,
                        })),
                      })}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: '#E63946' }}>
                        <FileText size={16} /> Genera PDF Onboarding
                      </button>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                      <h4 className="text-xs font-bold mb-2" style={{ color: '#8899AA' }}>ANTEPRIMA DATI</h4>
                      <div className="space-y-1 text-xs">
                        <div><span style={{ color: '#8899AA' }}>Nome:</span> <span style={{ color: '#ECEFF4' }}>{op.name}</span></div>
                        <div><span style={{ color: '#8899AA' }}>Preset:</span> <span style={{ color: '#ECEFF4' }}>{op.default_preset}</span></div>
                        <div><span style={{ color: '#8899AA' }}>Contatti:</span> <span style={{ color: '#ECEFF4' }}>{op.emergency_contacts?.length || 0}</span></div>
                        <div><span style={{ color: '#8899AA' }}>Telegram link:</span> <span className="font-mono" style={{ color: '#3B82F6' }}>t.me/SoloSafe_bot?start=OP-{editId.substring(0, 8)}</span></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Save bar — only for anagrafica/turni/contacts tabs (alarms/cascade have own save) */}
            {(formMode === 'create' || editTab === 'anagrafica' || editTab === 'turni' || editTab === 'contacts') && (
              <div className="sticky bottom-0 px-5 py-4 flex items-center gap-3"
                   style={{ backgroundColor: '#1A1D27', borderTop: '1px solid #2A2D3E' }}>
                <button onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#E63946', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Salvataggio...' : formMode === 'create' ? 'Crea Operatore' : 'Salva Modifiche'}
                </button>
                <button onClick={closeForm}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium"
                        style={{ border: '1px solid #2A2D3E', color: '#8899AA' }}>
                  Annulla
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unsaved changes dialog */}
      {unsavedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="rounded-lg p-6 w-full max-w-sm" style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
            <h3 className="text-base font-bold mb-2" style={{ color: '#ECEFF4' }}>⚠️ Modifiche non salvate</h3>
            <p className="text-sm mb-6" style={{ color: '#8899AA' }}>
              Hai modifiche non salvate in questo tab. Vuoi salvarle prima di continuare?
            </p>
            <div className="flex gap-3">
              <button onClick={async () => {
                setSaving(true);
                try {
                  await handleSave();
                  setUnsavedDialog(null);
                  setEditTab(unsavedDialog.nextTab);
                } finally {
                  setSaving(false);
                }
              }} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: '#2ECC71' }}>
                💾 Salva e continua
              </button>
              <button onClick={() => {
                setIsDirty(prev => ({ ...prev, [`${editId}_${unsavedDialog.tab}`]: false }));
                setUnsavedDialog(null);
                if (unsavedDialog.nextTab === 'anagrafica') {
                  doCloseForm();
                } else {
                  setEditTab(unsavedDialog.nextTab);
                }
              }}
                className="flex-1 px-3 py-2.5 rounded-lg text-xs font-bold"
                style={{ border: '1px solid #2A2D3E', color: '#ECEFF4' }}>
                🚪 Chiudi senza salvare
              </button>
              <button onClick={() => setUnsavedDialog(null)}
                className="px-3 py-2.5 rounded-lg text-xs font-bold"
                style={{ border: '1px solid #2A2D3E', color: '#8899AA' }}>
                ↩ Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
