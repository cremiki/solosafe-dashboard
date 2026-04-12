import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: (email: string, password: string) => Promise<string | null>;
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const err = await onLogin(email, password);
    if (err) {
      setError(err === 'Invalid login credentials' ? 'Email o password non validi' : err);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0F1117' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
               style={{ backgroundColor: '#E63946' }}>
            <Shield size={32} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#ECEFF4' }}>SoloSafe</h1>
          <p className="text-sm mt-1" style={{ color: '#8899AA' }}>Worker Safety Platform</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="rounded-xl p-6"
              style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3E' }}>
          <h2 className="text-base font-semibold mb-5" style={{ color: '#ECEFF4' }}>Accedi alla dashboard</h2>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg"
                 style={{ backgroundColor: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.25)' }}>
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-300">{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8899AA' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@solosafe.it"
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }}
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8899AA' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ backgroundColor: '#0F1117', border: '1px solid #2A2D3E', color: '#ECEFF4' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#E63946', color: '#fff' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: '#4A5568' }}>
          SoloSafe v1.0 — Worker Safety Platform
        </p>
      </div>
    </div>
  );
}
