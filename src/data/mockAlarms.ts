export type AlarmType = 'FALL' | 'IMMOBILITY' | 'SOS' | 'SOS_TAG' | 'MAN_DOWN' | 'SESSION_EXPIRED' | 'DURESS' | 'CONFINED_TIMEOUT';
export type AlarmStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';
export type ConfirmationLevel = 'SINGLE' | 'DUAL' | 'DIRECT';

export interface Alarm {
  id: string;
  operatorId: string;
  operatorName: string;
  group: string;
  type: AlarmType;
  status: AlarmStatus;
  confirmationLevel: ConfirmationLevel;
  lat: number | null;
  lng: number | null;
  locationAccuracy: number | null;
  isTest: boolean;
  isDuress: boolean;
  smsSent: boolean;
  smsCount: number;
  telegramSent: boolean;
  callsAttempted: string[];
  callAnsweredBy: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number, h: number = 0) => new Date(now.getTime() - (d * 86400000 + h * 3600000)).toISOString();

export const mockAlarms: Alarm[] = [
  // ACTIVE alarms
  {
    id: 'alm-001',
    operatorId: 'op-001',
    operatorName: 'Marco Rossi',
    group: 'Cantiere Nord',
    type: 'FALL',
    status: 'ACTIVE',
    confirmationLevel: 'DUAL',
    lat: 45.4642,
    lng: 9.1900,
    locationAccuracy: 8,
    isTest: false,
    isDuress: false,
    smsSent: true,
    smsCount: 5,
    telegramSent: true,
    callsAttempted: ['Mario Rossi', 'Luca Verdi'],
    callAnsweredBy: null,
    resolvedBy: null,
    resolvedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: minutesAgo(1),
  },
  {
    id: 'alm-002',
    operatorId: 'op-010',
    operatorName: 'Luca Fontana',
    group: 'Reparto Presse',
    type: 'IMMOBILITY',
    status: 'ACTIVE',
    confirmationLevel: 'SINGLE',
    lat: 45.4680,
    lng: 9.1850,
    locationAccuracy: 12,
    isTest: false,
    isDuress: false,
    smsSent: true,
    smsCount: 5,
    telegramSent: true,
    callsAttempted: ['Anna Fontana'],
    callAnsweredBy: null,
    resolvedBy: null,
    resolvedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: minutesAgo(3),
  },
  // ACKNOWLEDGED
  {
    id: 'alm-003',
    operatorId: 'op-005',
    operatorName: 'Paolo Ferrari',
    group: 'Cantiere Nord',
    type: 'CONFINED_TIMEOUT',
    status: 'ACKNOWLEDGED',
    confirmationLevel: 'DIRECT',
    lat: 45.4655,
    lng: 9.1920,
    locationAccuracy: 5,
    isTest: false,
    isDuress: false,
    smsSent: true,
    smsCount: 3,
    telegramSent: true,
    callsAttempted: ['Marco Bianchi', 'Luca Verdi'],
    callAnsweredBy: 'Marco Bianchi',
    resolvedBy: null,
    resolvedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: minutesAgo(8),
  },
  // RESOLVED — today
  {
    id: 'alm-004',
    operatorId: 'op-003',
    operatorName: 'Andrea Verdi',
    group: 'Reparto Presse',
    type: 'SOS',
    status: 'RESOLVED',
    confirmationLevel: 'DIRECT',
    lat: 45.4670,
    lng: 9.1870,
    locationAccuracy: 6,
    isTest: false,
    isDuress: false,
    smsSent: true,
    smsCount: 5,
    telegramSent: true,
    callsAttempted: ['Maria Verdi', 'Franco Neri', 'Anna Rossi'],
    callAnsweredBy: 'Maria Verdi',
    resolvedBy: 'Responsabile Turno',
    resolvedAt: hoursAgo(2),
    cancelledAt: null,
    cancelReason: null,
    createdAt: hoursAgo(2.5),
  },
  // FALSE ALARM — today
  {
    id: 'alm-005',
    operatorId: 'op-008',
    operatorName: 'Davide Moretti',
    group: 'Cantiere Nord',
    type: 'FALL',
    status: 'FALSE_ALARM',
    confirmationLevel: 'SINGLE',
    lat: 45.4648,
    lng: 9.1910,
    locationAccuracy: 10,
    isTest: false,
    isDuress: false,
    smsSent: true,
    smsCount: 5,
    telegramSent: false,
    callsAttempted: [],
    callAnsweredBy: null,
    resolvedBy: null,
    resolvedAt: null,
    cancelledAt: hoursAgo(4),
    cancelReason: 'Telefono caduto dalla tasca',
    createdAt: hoursAgo(4),
  },
  // Historical — yesterday
  {
    id: 'alm-006',
    operatorId: 'op-002',
    operatorName: 'Luigi Bianchi',
    group: 'Magazzino A',
    type: 'IMMOBILITY',
    status: 'RESOLVED',
    confirmationLevel: 'SINGLE',
    lat: 45.4690,
    lng: 9.1830,
    locationAccuracy: 15,
    isTest: false,
    isDuress: false,
    smsSent: true,
    smsCount: 5,
    telegramSent: true,
    callsAttempted: ['Giulia Bianchi', 'Marco Rossi'],
    callAnsweredBy: 'Giulia Bianchi',
    resolvedBy: 'Capoturno Magazzino',
    resolvedAt: daysAgo(1, 2),
    cancelledAt: null,
    cancelReason: null,
    createdAt: daysAgo(1, 3),
  },
  // Historical — 2 days ago
  {
    id: 'alm-007',
    operatorId: 'op-011',
    operatorName: 'Roberto Marino',
    group: 'Magazzino A',
    type: 'SOS_TAG',
    status: 'RESOLVED',
    confirmationLevel: 'DIRECT',
    lat: 45.4695,
    lng: 9.1840,
    locationAccuracy: 4,
    isTest: false,
    isDuress: false,
    smsSent: true,
    smsCount: 5,
    telegramSent: true,
    callsAttempted: ['Anna Marino', 'Luca Verdi', 'Franco Neri'],
    callAnsweredBy: 'Anna Marino',
    resolvedBy: 'RSPP',
    resolvedAt: daysAgo(2, 1),
    cancelledAt: null,
    cancelReason: null,
    createdAt: daysAgo(2, 2),
  },
  // TEST alarm — 3 days ago
  {
    id: 'alm-008',
    operatorId: 'op-006',
    operatorName: 'Fabio Colombo',
    group: 'Logistica',
    type: 'SOS',
    status: 'RESOLVED',
    confirmationLevel: 'DIRECT',
    lat: null,
    lng: null,
    locationAccuracy: null,
    isTest: true,
    isDuress: false,
    smsSent: false,
    smsCount: 0,
    telegramSent: false,
    callsAttempted: [],
    callAnsweredBy: null,
    resolvedBy: 'Auto (test)',
    resolvedAt: daysAgo(3, 0),
    cancelledAt: null,
    cancelReason: null,
    createdAt: daysAgo(3, 0),
  },
  // DURESS — 5 days ago
  {
    id: 'alm-009',
    operatorId: 'op-009',
    operatorName: 'Alessio Conti',
    group: 'Ufficio Tecnico',
    type: 'DURESS',
    status: 'RESOLVED',
    confirmationLevel: 'DIRECT',
    lat: 45.4700,
    lng: 9.1880,
    locationAccuracy: 3,
    isTest: false,
    isDuress: true,
    smsSent: true,
    smsCount: 5,
    telegramSent: true,
    callsAttempted: ['Emergenza 112', 'RSPP', 'Direttore'],
    callAnsweredBy: 'RSPP',
    resolvedBy: 'Forze dell\'ordine',
    resolvedAt: daysAgo(5, 0),
    cancelledAt: null,
    cancelReason: null,
    createdAt: daysAgo(5, 1),
  },
];
