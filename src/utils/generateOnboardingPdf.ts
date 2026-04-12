import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface ContactInfo {
  name: string;
  phone?: string;
  sms: boolean;
  telegram: boolean;
  call: boolean;
}

interface OperatorInfo {
  name: string;
  companyName: string;
  preset: string;
  configToken: string;
  operatorId?: string;
  matricola?: string;
  contacts?: ContactInfo[];
}

const RED: [number, number, number] = [230, 57, 70];
const DARK: [number, number, number] = [43, 45, 66];
const GRAY_BG: [number, number, number] = [248, 249, 250];
const TEXT: [number, number, number] = [50, 50, 50];
const MUTED: [number, number, number] = [130, 130, 130];

function presetColor(p: string): [number, number, number] {
  const map: Record<string, [number, number, number]> = {
    CONSTRUCTION: [243, 156, 18],
    WAREHOUSE: [52, 152, 219],
    LOGISTICS: [155, 89, 182],
    SECURITY: [231, 76, 60],
    GENERIC: [127, 140, 141],
  };
  return map[p] || [127, 140, 141];
}

export async function generateOnboardingPdf(op: OperatorInfo) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // ===== PAGE 1 =====

  // Header (red full-width)
  doc.setFillColor(...RED);
  doc.rect(0, 0, w, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('SOLOSAFE', 15, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Worker Safety Platform', 15, 28);
  doc.setFontSize(9);
  const dateStr = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(dateStr, w - 15, 20, { align: 'right' });

  // Operator info box (gray with red left border)
  let y = 45;
  doc.setFillColor(...GRAY_BG);
  doc.rect(15, y, w - 30, 38, 'F');
  doc.setFillColor(...RED);
  doc.rect(15, y, 3, 38, 'F');

  doc.setTextColor(...RED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SCHEDA ATTIVAZIONE OPERATORE', 22, y + 8);

  doc.setTextColor(...TEXT);
  doc.setFontSize(16);
  doc.text(op.name, 22, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Azienda: ${op.companyName}`, 22, y + 26);
  if (op.matricola) doc.text(`Matricola: ${op.matricola}`, 22, y + 32);

  // Preset badge
  const [pr, pg, pb] = presetColor(op.preset);
  doc.setFillColor(pr, pg, pb);
  const badgeW = doc.getTextWidth(op.preset) + 8;
  doc.roundedRect(w - 15 - badgeW, y + 22, badgeW, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(op.preset, w - 15 - badgeW / 2, y + 27.5, { align: 'center' });

  // 2-column section: instructions left, QR right
  y = 92;
  const colLeftW = (w - 30) * 0.58;
  const colRightX = 15 + colLeftW + 5;
  const colRightW = (w - 30) - colLeftW - 5;

  doc.setTextColor(...RED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ISTRUZIONI DI ATTIVAZIONE', 15, y);

  const steps = [
    ['1.', 'Scarica SoloSafe da Google Play Store', "Cerca 'SoloSafe Worker Safety'"],
    ['2.', "Apri l'app e tocca 'Scansiona QR'", ''],
    ['3.', 'Inquadra il QR code qui a destra', ''],
    ['4.', 'Configurazione automatica', ''],
    ['5.', 'Prima del turno: attiva la protezione', ''],
  ];
  doc.setTextColor(...TEXT);
  let sy = y + 8;
  steps.forEach(([num, title, sub]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...RED);
    doc.text(num, 15, sy);
    doc.setTextColor(...TEXT);
    doc.text(title, 22, sy);
    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(sub, 22, sy + 4);
      sy += 4;
    }
    sy += 9;
  });

  // QR box (right column)
  doc.setDrawColor(...RED);
  doc.setLineWidth(1);
  doc.roundedRect(colRightX, y - 4, colRightW, 78, 3, 3, 'S');

  doc.setTextColor(...RED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('QR ATTIVAZIONE', colRightX + colRightW / 2, y + 3, { align: 'center' });

  const qrUrl = `solosafe://config/${op.configToken}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 400, margin: 1 });
  const qrSize = colRightW - 14;
  doc.addImage(qrDataUrl, 'PNG', colRightX + 7, y + 6, qrSize, qrSize);

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text("Scansiona con l'app SoloSafe", colRightX + colRightW / 2, y + qrSize + 12, { align: 'center' });

  // Contacts section
  y = 180;
  if (op.contacts && op.contacts.length > 0) {
    const ch = 8 + Math.ceil(op.contacts.length / 2) * 8;
    doc.setFillColor(...GRAY_BG);
    doc.rect(15, y, w - 30, ch, 'F');
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CONTATTI DI EMERGENZA', 20, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    op.contacts.slice(0, 6).forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 20 + col * ((w - 40) / 2);
      const cy = y + 13 + row * 8;
      const ch = [c.sms && 'SMS', c.call && 'TEL', c.telegram && 'TG'].filter(Boolean).join(' ');
      doc.text(`${c.name}${c.phone ? ' — ' + c.phone : ''}  [${ch}]`, cx, cy);
    });
    y += ch + 4;
  }

  // Telegram add section
  doc.setFillColor(...GRAY_BG);
  doc.rect(15, y, w - 30, 38, 'F');
  doc.setTextColor(...RED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('AGGIUNGI UN CONTATTO TELEGRAM', 20, y + 7);

  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Per ricevere notifiche di emergenza su Telegram:', 20, y + 14);
  doc.text('1. Installa Telegram', 20, y + 20);
  doc.text('2. Cerca @SoloSafe_bot', 20, y + 26);
  doc.text('3. Premi Start e segui le istruzioni', 20, y + 32);

  if (op.operatorId) {
    const tgLink = `https://t.me/SoloSafe_bot?start=OP-${op.operatorId.substring(0, 8)}`;
    const tgQr = await QRCode.toDataURL(tgLink, { width: 200, margin: 1 });
    doc.addImage(tgQr, 'PNG', w - 50, y + 4, 30, 30);
  }

  // Footer
  doc.setFillColor(...RED);
  doc.rect(0, h - 18, w, 1, 'F');
  doc.setFillColor(...DARK);
  doc.rect(0, h - 17, w, 17, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SoloSafe Worker Safety Platform', 15, h - 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('support@solosafe.it  |  solosafe.it', w - 15, h - 7, { align: 'right' });

  // ===== PAGE 2: Telegram guide =====
  if (op.operatorId) {
    doc.addPage();

    // Header
    doc.setFillColor(...RED);
    doc.rect(0, 0, w, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('COME RICEVERE NOTIFICHE', 15, 18);
    doc.setFontSize(20);
    doc.text('SU TELEGRAM', 15, 28);

    // Section 1 - For worker
    let py = 50;
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PER IL LAVORATORE', 15, py);

    doc.setTextColor(...TEXT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Condividi questo link con i tuoi contatti di emergenza:', 15, py + 8);

    const tgLink = `https://t.me/SoloSafe_bot?start=OP-${op.operatorId.substring(0, 8)}`;
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(tgLink, 15, py + 18);

    const tgQr = await QRCode.toDataURL(tgLink, { width: 400, margin: 2 });
    doc.addImage(tgQr, 'PNG', (w - 60) / 2, py + 24, 60, 60);

    // Section 2 - For emergency contact
    py = 155;
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PER IL CONTATTO DI EMERGENZA', 15, py);

    const guideSteps = [
      'Apri Telegram sul tuo smartphone',
      'Scansiona il QR code qui sopra OPPURE clicca il link inviato dal lavoratore',
      'Si aprirà la chat con @SoloSafe_bot',
      'Premi il pulsante "START" in basso',
      'Riceverai conferma: "Sei registrato come contatto di [nome operatore]"',
      'Da questo momento riceverai notifiche per ogni allarme',
    ];
    doc.setTextColor(...TEXT);
    doc.setFontSize(10);
    guideSteps.forEach((s, i) => {
      const ly = py + 8 + i * 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...RED);
      doc.text(`${i + 1}.`, 15, ly);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT);
      doc.text(s, 22, ly);
    });

    // Yellow important box
    py = 215;
    doc.setFillColor(255, 248, 220);
    doc.setDrawColor(243, 156, 18);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, py, w - 30, 30, 2, 2, 'FD');
    doc.setTextColor(243, 156, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('NOTE IMPORTANTI', 20, py + 7);
    doc.setTextColor(...TEXT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('• Assicurati di avere Telegram installato e le notifiche abilitate', 20, py + 14);
    doc.text('• Non disinstallare Telegram o disabilitare le notifiche', 20, py + 20);
    doc.text('• Per problemi: support@solosafe.it', 20, py + 26);

    // Footer
    doc.setFillColor(...RED);
    doc.rect(0, h - 18, w, 1, 'F');
    doc.setFillColor(...DARK);
    doc.rect(0, h - 17, w, 17, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SoloSafe Worker Safety Platform', 15, h - 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('support@solosafe.it  |  solosafe.it', w - 15, h - 7, { align: 'right' });
  }

  doc.save(`SoloSafe_${op.name.replace(/\s+/g, '_')}.pdf`);
}
