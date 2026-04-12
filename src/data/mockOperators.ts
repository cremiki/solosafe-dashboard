export type OperatorStatus = 'PROTETTO' | 'STANDBY' | 'ALLARME' | 'OFFLINE';
export type SessionType = 'TURNO' | 'CONTINUA' | 'INTERVENTO' | 'SPAZIO_CONFINATO' | null;
export type PresetType = 'OFFICE' | 'WAREHOUSE' | 'CONSTRUCTION' | 'INDUSTRY' | 'VEHICLE' | 'ALTITUDE';

export interface Operator {
  id: string;
  name: string;
  status: OperatorStatus;
  preset: PresetType;
  batteryPhone: number;
  batteryTag: number | null;
  lastHeartbeat: string;
  sessionType: SessionType;
  sessionStart: string | null;
  sessionEnd: string | null;
  group: string;
  iconName: string;
  alarmType?: string;
  alarmTimestamp?: string;
}

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

export const mockOperators: Operator[] = [
  {
    id: 'op-001',
    name: 'Marco Rossi',
    status: 'ALLARME',
    preset: 'CONSTRUCTION',
    batteryPhone: 72,
    batteryTag: 85,
    lastHeartbeat: minutesAgo(0),
    sessionType: 'TURNO',
    sessionStart: minutesAgo(180),
    sessionEnd: new Date(now.getTime() + 120 * 60000).toISOString(),
    group: 'Cantiere Nord',
    iconName: 'hardhat',
    alarmType: 'CADUTA',
    alarmTimestamp: minutesAgo(1),
  },
  {
    id: 'op-002',
    name: 'Luigi Bianchi',
    status: 'PROTETTO',
    preset: 'WAREHOUSE',
    batteryPhone: 91,
    batteryTag: 78,
    lastHeartbeat: minutesAgo(2),
    sessionType: 'TURNO',
    sessionStart: minutesAgo(240),
    sessionEnd: new Date(now.getTime() + 60 * 60000).toISOString(),
    group: 'Magazzino A',
    iconName: 'warehouse',
  },
  {
    id: 'op-003',
    name: 'Andrea Verdi',
    status: 'PROTETTO',
    preset: 'INDUSTRY',
    batteryPhone: 65,
    batteryTag: 92,
    lastHeartbeat: minutesAgo(1),
    sessionType: 'CONTINUA',
    sessionStart: minutesAgo(360),
    sessionEnd: null,
    group: 'Reparto Presse',
    iconName: 'factory',
  },
  {
    id: 'op-004',
    name: 'Giuseppe Neri',
    status: 'STANDBY',
    preset: 'WAREHOUSE',
    batteryPhone: 88,
    batteryTag: null,
    lastHeartbeat: minutesAgo(25),
    sessionType: null,
    sessionStart: null,
    sessionEnd: null,
    group: 'Magazzino A',
    iconName: 'warehouse',
  },
  {
    id: 'op-005',
    name: 'Paolo Ferrari',
    status: 'PROTETTO',
    preset: 'ALTITUDE',
    batteryPhone: 54,
    batteryTag: 67,
    lastHeartbeat: minutesAgo(3),
    sessionType: 'SPAZIO_CONFINATO',
    sessionStart: minutesAgo(45),
    sessionEnd: new Date(now.getTime() + 15 * 60000).toISOString(),
    group: 'Cantiere Nord',
    iconName: 'shield',
  },
  {
    id: 'op-006',
    name: 'Fabio Colombo',
    status: 'PROTETTO',
    preset: 'VEHICLE',
    batteryPhone: 79,
    batteryTag: null,
    lastHeartbeat: minutesAgo(1),
    sessionType: 'INTERVENTO',
    sessionStart: minutesAgo(15),
    sessionEnd: new Date(now.getTime() + 45 * 60000).toISOString(),
    group: 'Logistica',
    iconName: 'truck',
  },
  {
    id: 'op-007',
    name: 'Stefano Ricci',
    status: 'OFFLINE',
    preset: 'WAREHOUSE',
    batteryPhone: 12,
    batteryTag: 45,
    lastHeartbeat: minutesAgo(120),
    sessionType: null,
    sessionStart: null,
    sessionEnd: null,
    group: 'Magazzino A',
    iconName: 'warehouse',
  },
  {
    id: 'op-008',
    name: 'Davide Moretti',
    status: 'PROTETTO',
    preset: 'CONSTRUCTION',
    batteryPhone: 83,
    batteryTag: 90,
    lastHeartbeat: minutesAgo(2),
    sessionType: 'TURNO',
    sessionStart: minutesAgo(200),
    sessionEnd: new Date(now.getTime() + 100 * 60000).toISOString(),
    group: 'Cantiere Nord',
    iconName: 'hardhat',
  },
  {
    id: 'op-009',
    name: 'Alessio Conti',
    status: 'STANDBY',
    preset: 'OFFICE',
    batteryPhone: 95,
    batteryTag: null,
    lastHeartbeat: minutesAgo(18),
    sessionType: null,
    sessionStart: null,
    sessionEnd: null,
    group: 'Ufficio Tecnico',
    iconName: 'office',
  },
  {
    id: 'op-010',
    name: 'Luca Fontana',
    status: 'ALLARME',
    preset: 'INDUSTRY',
    batteryPhone: 41,
    batteryTag: 33,
    lastHeartbeat: minutesAgo(0),
    sessionType: 'TURNO',
    sessionStart: minutesAgo(300),
    sessionEnd: new Date(now.getTime() + 60 * 60000).toISOString(),
    group: 'Reparto Presse',
    iconName: 'factory',
    alarmType: 'IMMOBILITÀ',
    alarmTimestamp: minutesAgo(3),
  },
  {
    id: 'op-011',
    name: 'Roberto Marino',
    status: 'PROTETTO',
    preset: 'WAREHOUSE',
    batteryPhone: 67,
    batteryTag: 81,
    lastHeartbeat: minutesAgo(4),
    sessionType: 'TURNO',
    sessionStart: minutesAgo(150),
    sessionEnd: new Date(now.getTime() + 90 * 60000).toISOString(),
    group: 'Magazzino A',
    iconName: 'warehouse',
  },
  {
    id: 'op-012',
    name: 'Antonio Greco',
    status: 'OFFLINE',
    preset: 'CONSTRUCTION',
    batteryPhone: 0,
    batteryTag: null,
    lastHeartbeat: minutesAgo(480),
    sessionType: null,
    sessionStart: null,
    sessionEnd: null,
    group: 'Cantiere Nord',
    iconName: 'hardhat',
  },
];

export const companyInfo = {
  name: 'Costruzioni Sicure S.r.l.',
  slotsUsed: 8,
  slotsTotal: 12,
};
