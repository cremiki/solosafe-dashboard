import React, { useState, useEffect } from 'react';
import {
  User, Lock, Building2, Monitor, Save, Loader2, CheckCircle,
  AlertCircle, LogOut, Mail, Settings, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

interface CompanyInfo {
  name: string;
  concurrent_slots: number;
  created_at: string;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
      {children}
    </div>
  );
}

function CardTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span style={{ color: '#E63946' }}>{icon}</span>
      <h3 className="text-sm font-semibold" style={{ color: '#ECEFF4' }}>{title}</h3>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #2A2D3E' }}>
      <span className="text-xs" style={{ color: '#8899AA' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: '#ECEFF4' }}>{value}</span>
    </div>
  );
}

type MsgType = 'success' | 'error';

function StatusMsg({ type, text }: { type: MsgType; text: string }) {
  const isErr = type === 'error';
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg mt-3"
         style={{
           backgroundColor: isErr ? 'rgba(231,76,60,0.1)' : 'rgba(46,204,113,0.1)',
           border: `1px solid ${isErr ? 'rgba(231,76,60,0.25)' : 'rgba(46,204,113,0.25)'}`,
         }}>
      {isErr ? <AlertCircle size={14} className="text-red-400" /> : <CheckCircle size={14} style={{ color: '#2ECC71' }} />}
      <span className="text-xs" style={{ color: isErr ? '#fca5a5' : '#86efac' }}>{text}</span>
    </div>
  );
}

interface Props {
  userEmail: string;
  onSignOut: () => void;
}

export default function SettingsView({ userEmail, onSignOut }: Props) {
  // Profile state
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: MsgType; text: string } | null>(null);

  // Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: MsgType; text: string } | null>(null);

  // Company state
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [activeSlots, setActiveSlots] = useState(0);

  // Load user metadata + company
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setFullName(data.user?.user_metadata?.full_name || '');
    });

    supabase.from('companies').select('name, concurrent_slots, created_at')
      .eq('id', COMPANY_ID).single()
      .then(({ data }) => { if (data) setCompany(data); });

    supabase.from('operator_status').select('state')
      .in('state', ['protected', 'alarm'])
      .then(({ data }) => { setActiveSlots(data?.length || 0); });
  }, []);

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) {
      setProfileMsg({ type: 'error', text: error.message });
    } else {
      setProfileMsg({ type: 'success', text: 'Profilo aggiornato' });
    }
    setSavingProfile(false);
  }

  async function handleChangePassword() {
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'La nuova password deve avere almeno 8 caratteri' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Le password non coincidono' });
      return;
    }
    if (!currentPw) {
      setPwMsg({ type: 'error', text: 'Inserisci la password attuale' });
      return;
    }

    setSavingPw(true);

    // Verify current password by re-authenticating
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPw,
    });
    if (signInErr) {
      setPwMsg({ type: 'error', text: 'Password attuale non corretta' });
      setSavingPw(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setPwMsg({ type: 'error', text: error.message });
    } else {
      setPwMsg({ type: 'success', text: 'Password aggiornata con successo' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
    setSavingPw(false);
  }

  async function handleSignOutAll() {
    await supabase.auth.signOut({ scope: 'global' });
    onSignOut();
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid #2A2D3E' }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#ECEFF4' }}>Impostazioni</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8899AA' }}>Gestione account e configurazione</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-5">

          {/* Profile */}
          <Card>
            <CardTitle icon={<User size={16} />} title="Profilo Account" />
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                   style={{ backgroundColor: '#E63946', color: '#fff' }}>
                {initials}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>Email</label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                       style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E' }}>
                    <Mail size={14} style={{ color: '#4A5568' }} />
                    <span className="text-sm" style={{ color: '#8899AA' }}>{userEmail}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>Nome visualizzato</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Nome e Cognome"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }}
                  />
                </div>
                <button onClick={handleSaveProfile} disabled={savingProfile}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#E63946', color: '#fff' }}>
                  {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salva modifiche
                </button>
                {profileMsg && <StatusMsg type={profileMsg.type} text={profileMsg.text} />}
              </div>
            </div>
          </Card>

          {/* Change password */}
          <Card>
            <CardTitle icon={<Lock size={16} />} title="Cambio Password" />
            <div className="space-y-3 max-w-sm">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>Password attuale</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                       autoComplete="current-password"
                       className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                       style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>Nuova password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                       placeholder="Minimo 8 caratteri" autoComplete="new-password"
                       className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                       style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8899AA' }}>Conferma nuova password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                       placeholder="Ripeti la nuova password" autoComplete="new-password"
                       className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                       style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }} />
              </div>
              <button onClick={handleChangePassword} disabled={savingPw}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#E63946', color: '#fff' }}>
                {savingPw ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Aggiorna password
              </button>
              {pwMsg && <StatusMsg type={pwMsg.type} text={pwMsg.text} />}
            </div>
          </Card>

          {/* Company info */}
          <Card>
            <CardTitle icon={<Building2 size={16} />} title="Informazioni Azienda" />
            {company ? (
              <div>
                <InfoRow label="Nome azienda" value={company.name} />
                <InfoRow label="Slot concorrenti acquistati" value={String(company.concurrent_slots)} />
                <InfoRow label="Slot attualmente in uso" value={String(activeSlots)} />
                <InfoRow label="Account creato il"
                         value={new Date(company.created_at).toLocaleDateString('it-IT', {
                           day: '2-digit', month: 'long', year: 'numeric'
                         })} />
              </div>
            ) : (
              <p className="text-xs" style={{ color: '#8899AA' }}>Caricamento...</p>
            )}
          </Card>

          {/* Config Log */}
          <ConfigLogSection />

          {/* Session */}
          <Card>
            <CardTitle icon={<Monitor size={16} />} title="Sessione" />
            <div className="space-y-3">
              <InfoRow label="Email sessione corrente" value={userEmail} />
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSignOutAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                        style={{ backgroundColor: 'rgba(231,76,60,0.15)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.3)' }}>
                  <LogOut size={14} /> Esci da tutti i dispositivi
                </button>
                <button onClick={onSignOut}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
                        style={{ border: '1px solid #2A2D3E', color: '#8899AA' }}>
                  <LogOut size={14} /> Esci dalla sessione corrente
                </button>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </>
  );
}

function ConfigLogSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel('config_log_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_config_log' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchLogs() {
    const { data } = await supabase
      .from('app_config_log')
      .select('*, operators(name)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setLogs(data);
    setLoading(false);
  }

  return (
    <Card>
      <CardTitle icon={<Settings size={16} />} title="Log Configurazioni Operatori" />
      {loading ? (
        <p className="text-xs" style={{ color: '#8899AA' }}>Caricamento...</p>
      ) : logs.length === 0 ? (
        <p className="text-xs" style={{ color: '#8899AA' }}>Nessuna modifica registrata</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #2A2D3E' }}>
                <th className="text-left py-2 font-medium" style={{ color: '#8899AA' }}>Data/Ora</th>
                <th className="text-left py-2 font-medium" style={{ color: '#8899AA' }}>Operatore</th>
                <th className="text-left py-2 font-medium" style={{ color: '#8899AA' }}>Parametro</th>
                <th className="text-left py-2 font-medium" style={{ color: '#8899AA' }}>Vecchio</th>
                <th className="text-left py-2 font-medium" style={{ color: '#8899AA' }}>Nuovo</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #1A1D27' }}>
                  <td className="py-1.5" style={{ color: '#8899AA' }}>
                    {new Date(log.created_at).toLocaleString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="py-1.5" style={{ color: '#ECEFF4' }}>{log.operators?.name || '—'}</td>
                  <td className="py-1.5" style={{ color: '#3B82F6' }}>{log.param_name}</td>
                  <td className="py-1.5" style={{ color: '#E74C3C' }}>{log.old_value}</td>
                  <td className="py-1.5" style={{ color: '#2ECC71' }}>{log.new_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
