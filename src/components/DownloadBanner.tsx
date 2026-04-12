import React, { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';

const APK_URL = '/apk/latest';
const INFO_URL = '/apk/info';

interface BuildInfo {
  version: string;
  built_at: string;
  downloads: number;
  size_mb?: number;
}

export default function DownloadBanner() {
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    fetchInfo();
    const id = setInterval(fetchInfo, 300000); // 5 min
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fullUrl = `${window.location.origin}/apk/latest`;
    QRCode.toDataURL(fullUrl, { width: 200, margin: 1 }).then(setQrUrl);
  }, []);

  async function fetchInfo() {
    try {
      const res = await fetch(INFO_URL);
      const data = await res.json();
      if (data.version && data.version !== 'init' && data.version !== 'none') setInfo(data);
    } catch (_) {}
  }

  if (!info) return null;

  const buildDate = info.built_at
    ? new Date(info.built_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="px-6 py-2 flex items-center justify-between flex-shrink-0"
         style={{ backgroundColor: '#1A2332', borderBottom: '1px solid #2A2D3E' }}>
      <div className="flex items-center gap-3">
        <Smartphone size={16} style={{ color: '#3B82F6' }} />
        <span className="text-xs" style={{ color: '#8899AA' }}>
          App build: <strong style={{ color: '#ECEFF4' }}>{info.version}</strong>
          {buildDate && <> — {buildDate}</>}
          {info.size_mb && <> — {info.size_mb}MB</>}
          {info.downloads > 0 && <> — {info.downloads} download</>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setShowQr(!showQr)}
          className="text-xs px-2 py-1 rounded" style={{ color: '#8899AA', backgroundColor: '#2A2D3E' }}>
          QR
        </button>
        <a href={APK_URL} download
          className="flex items-center gap-1 text-xs px-3 py-1 rounded font-medium"
          style={{ backgroundColor: '#3B82F6', color: '#fff' }}>
          <Download size={12} /> Scarica APK
        </a>
      </div>
      {showQr && qrUrl && (
        <div className="absolute right-6 top-16 z-50 p-3 rounded-lg shadow-lg" style={{ backgroundColor: '#fff' }}>
          <img src={qrUrl} alt="QR APK" width={150} height={150} />
          <p className="text-xs text-center mt-1" style={{ color: '#333' }}>Scansiona per scaricare</p>
        </div>
      )}
    </div>
  );
}
