// Device icon SVG paths (24x24 viewBox)
export const ICON_PATHS: Record<string, string> = {
  shield:    'M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z',
  hardhat:   'M12 2C8.13 2 5 5.13 5 9h2c0-2.76 2.24-5 5-5s5 2.24 5 5h2c0-3.87-3.13-7-7-7zM3 12v2h18v-2H3zm1 4v2h16v-2H4zm3 4v1h10v-1H7z',
  factory:   'M22 10V2L17 7l-5-5-5 5L2 2v20h20V10zM10 18H6v-4h4v4zm8 0h-4v-4h4v4z',
  warehouse: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  truck:     'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  wrench:    'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  medical:   'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  office:    'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z',
};

export const DEVICE_ICONS = [
  { key: 'shield', label: 'Scudo' },
  { key: 'hardhat', label: 'Elmetto' },
  { key: 'factory', label: 'Fabbrica' },
  { key: 'warehouse', label: 'Magazzino' },
  { key: 'truck', label: 'Camion' },
  { key: 'wrench', label: 'Chiave inglese' },
  { key: 'medical', label: 'Medico' },
  { key: 'office', label: 'Ufficio' },
];

export function createMarkerSvgUrl(
  iconType: string,
  statusColor: string,
  size: number,
  isAlarm: boolean = false,
): string {
  const path = ICON_PATHS[iconType] || ICON_PATHS.shield;
  const outerSize = size;
  const padding = size * 0.25;
  const iconScale = (size - padding * 2) / 24;

  const pulseRing = isAlarm
    ? `<circle cx="${outerSize/2}" cy="${outerSize/2}" r="${outerSize/2 - 1}" fill="none" stroke="${statusColor}" stroke-width="2" opacity="0.5">
         <animate attributeName="r" values="${outerSize/2 - 4};${outerSize/2 + 4};${outerSize/2 - 4}" dur="1.5s" repeatCount="indefinite"/>
         <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite"/>
       </circle>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerSize + 10}" height="${outerSize + 10}" viewBox="-5 -5 ${outerSize + 10} ${outerSize + 10}">
    ${pulseRing}
    <circle cx="${outerSize/2}" cy="${outerSize/2}" r="${outerSize/2 - 2}" fill="${statusColor}" stroke="#fff" stroke-width="2.5"/>
    <g transform="translate(${padding}, ${padding}) scale(${iconScale})">
      <path d="${path}" fill="white" fill-opacity="0.9"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Simple circle for backward compat
export function simpleCircleSvgUrl(color: string, size: number): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${color}" stroke="white" stroke-width="2"/></svg>`
  )}`;
}
