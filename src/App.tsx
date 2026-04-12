import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAlarmNotifications } from './hooks/useAlarmNotifications';
import LoginPage from './components/LoginPage';
import Layout, { Page } from './components/Layout';
import FleetView from './components/FleetView';
import AlarmsView from './components/AlarmsView';
import OperatorsView from './components/OperatorsView';
import SettingsView from './components/SettingsView';
import MapView from './components/MapView';
import SessionsView from './components/SessionsView';
import IncidentReportView from './components/IncidentReportView';
import AlarmToast from './components/AlarmToast';
import { Loader2 } from 'lucide-react';

function App() {
  const { user, loading, signIn, signOut } = useAuth();
  const [page, setPage] = useState<Page>('fleet');
  const [pendingOperator, setPendingOperator] = useState<{ id: string; tab: 'status' | 'alarms' } | null>(null);
  const alarm = useAlarmNotifications();

  function openOperatorFromFleet(id: string, tab: 'status' | 'alarms' = 'status') {
    setPendingOperator({ id, tab });
    setPage('operators');
  }

  // Auth loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F1117' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#E63946' }} />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <LoginPage onLogin={signIn} />;
  }

  // Authenticated
  return (
    <>
      <Layout currentPage={page} onNavigate={setPage} userEmail={user.email || ''} onSignOut={signOut}>
        {page === 'fleet' && <FleetView onOpenOperator={openOperatorFromFleet} />}
        {page === 'alarms' && <AlarmsView />}
      {page === 'incidents' && <IncidentReportView />}
        {page === 'map' && (
          <MapView
            latestAlarm={alarm.latestAlarm}
            hasActiveAlarms={alarm.hasActiveAlarms}
            onAlarmShown={alarm.clearLatest}
            audioEnabled={alarm.audioEnabled}
            onEnableAudio={alarm.enableAudio}
            onSimulateAlarm={alarm.simulateAlarm}
          />
        )}
        {page === 'operators' && <OperatorsView pendingOpen={pendingOperator} onOpenHandled={() => setPendingOperator(null)} />}
        {page === 'sessions' && <SessionsView />}
        {page === 'settings' && <SettingsView userEmail={user.email || ''} onSignOut={signOut} />}
      </Layout>

      {/* Toast notifications — always visible regardless of page */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none" style={{ width: 360 }}>
        {alarm.notifications.map((n, i) => (
          <AlarmToast
            key={n.id}
            notification={n}
            index={i}
            onDismiss={alarm.dismiss}
            onNavigate={() => { alarm.dismiss(n.id); setPage('alarms'); }}
          />
        ))}
      </div>
    </>
  );
}

function PlaceholderPage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold" style={{ color: '#ECEFF4' }}>{title}</h2>
      <p className="mt-2 text-sm" style={{ color: '#8899AA' }}>{desc}</p>
    </div>
  );
}

export default App;
