import React from 'react';
import { ICON_PATHS } from '../lib/markerIcons';
import { OperatorStatus } from '../data/mockOperators';

interface Props {
  iconName: string;
  status?: OperatorStatus;
  size?: number;
}

export default function OperatorIcon({ iconName, status, size = 32 }: Props) {
  const path = ICON_PATHS[iconName] || ICON_PATHS.shield;

  const statusColor: Record<OperatorStatus, string> = {
    'PROTETTO': '#2ECC71',
    'ALLARME': '#E74C3C',
    'STANDBY': '#95A5A6',
    'OFFLINE': '#4A5568',
  };

  const color = status ? statusColor[status] : '#95A5A6';
  const isAlarm = status === 'ALLARME';

  // Generate SVG inline
  const iconScale = (size - 8) / 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${isAlarm ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5">
      <animate attributeName="r" values="${size/2 - 3};${size/2 + 1};${size/2 - 3}" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite"/>
    </circle>` : ''}
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="white" stroke-width="1.5"/>
    <g transform="translate(${4 + (size - 8 - 24 * iconScale) / 2}, ${4 + (size - 8 - 24 * iconScale) / 2}) scale(${iconScale})">
      <path d="${path}" fill="white" fill-opacity="0.9"/>
    </g>
  </svg>`;

  return (
    <img
      src={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`}
      alt={iconName}
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  );
}
