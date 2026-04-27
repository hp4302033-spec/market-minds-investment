'use client';

import { useState, useEffect } from 'react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  investment_type: string;
  amount: number;
  period_years: number;
  expected_return: number;
  total_invested: number;
  estimated_returns: number;
  final_value: number;
  cagr: number;
  wealth_multiplier: number;
  created_at: string;
}

interface Stats {
  total: number;
  totalAUM: number;
  sipCount: number;
  lumpSumCount: number;
}

function formatCurrency(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [key, setKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof Lead>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [error, setError] = useState('');

  const fetchLeads = async (adminKey: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads(data.leads);
        setStats(data.stats);
        setAuth(true);
      } else {
        setAuthError(data.error || 'Invalid admin key');
      }
    } catch {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    await fetchLeads(key);
  };

  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filtered = leads
    .filter(l =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
    )
    .sort((a, b) => {
      const aVal = a[sortField] as string | number;
      const bVal = b[sortField] as string | number;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  if (!auth) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="glass-card rounded-2xl p-8 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg,#22C55E,#16A34A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff', fontSize: 16,
            }}>M</div>
            <div>
              <p className="font-bold text-text-primary text-sm">Market Minds</p>
              <p className="text-xs text-text-muted">Admin Dashboard</p>
            </div>
          </div>

          <h1 className="text-xl font-bold text-text-primary mb-1">Admin Access</h1>
          <p className="text-text-muted text-sm mb-6">Enter your admin secret key to continue.</p>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="form-label" htmlFor="admin-key">Admin Secret Key</label>
              <input
                id="admin-key"
                type="password"
                className={`input-field ${authError ? 'error' : ''}`}
                placeholder="Enter admin key..."
                value={key}
                onChange={e => { setKey(e.target.value); setAuthError(''); }}
                autoFocus
              />
              {authError && <p className="error-msg mt-1">{authError}</p>}
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading || !key}>
              {loading ? <><span className="spinner" /> Verifying...</> : 'Access Dashboard'}
            </button>
          </form>

          <p className="text-xs text-text-muted text-center mt-4">
            Default key is set in <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>ADMIN_SECRET_KEY</code> env variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'rgba(248,250,252,0.08)', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#22C55E,#16A34A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 15 }}>M</div>
            <div>
              <p className="font-bold text-text-primary text-sm">Admin Dashboard</p>
              <p className="text-xs text-text-muted">Market Minds Investment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn-secondary text-xs py-2 px-3"
              onClick={() => fetchLeads(key)}
              disabled={loading}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" />
              </svg>
              Refresh
            </button>
            <a href="/" className="btn-secondary text-xs py-2 px-3" style={{ textDecoration: 'none' }}>
              ← Back to Site
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="stat-card rounded-xl">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-2">Total Leads</p>
              <p className="text-2xl font-bold text-text-primary">{stats.total.toLocaleString('en-IN')}</p>
            </div>
            <div className="stat-card rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.04))', borderColor: 'rgba(34,197,94,0.2)' }}>
              <p className="text-xs text-text-muted uppercase tracking-widest mb-2">Total AUM Planned</p>
              <p className="text-2xl font-bold text-brand-green">{formatCurrency(stats.totalAUM)}</p>
            </div>
            <div className="stat-card rounded-xl">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-2">SIP Clients</p>
              <p className="text-2xl font-bold text-blue-400">{stats.sipCount}</p>
            </div>
            <div className="stat-card rounded-xl">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-2">Lump Sum Clients</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.lumpSumCount}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <p className="text-text-muted text-sm self-center whitespace-nowrap">
            Showing {filtered.length} of {leads.length} leads
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl mb-6 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <svg className="mx-auto mb-4 text-text-muted" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-text-muted">{search ? 'No results match your search.' : 'No leads yet. Share your calculator link!'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {[
                      { key: 'name', label: 'Client' },
                      { key: 'investment_type', label: 'Type' },
                      { key: 'amount', label: 'Amount' },
                      { key: 'period_years', label: 'Period' },
                      { key: 'expected_return', label: 'Return' },
                      { key: 'total_invested', label: 'Invested' },
                      { key: 'final_value', label: 'Final Value' },
                      { key: 'wealth_multiplier', label: 'Multiplier' },
                      { key: 'created_at', label: 'Date' },
                    ].map(col => (
                      <th
                        key={col.key}
                        className="cursor-pointer hover:text-text-secondary transition-colors"
                        onClick={() => handleSort(col.key as keyof Lead)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortField === col.key && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              {sortAsc
                                ? <polyline points="18 15 12 9 6 15" />
                                : <polyline points="6 9 12 15 18 9" />}
                            </svg>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <p className="font-medium text-text-primary">{lead.name}</p>
                        <p className="text-xs text-text-muted">{lead.email}</p>
                        <p className="text-xs text-text-muted">{lead.phone}</p>
                      </td>
                      <td>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={lead.investment_type === 'SIP'
                            ? { background: 'rgba(59,130,246,0.12)', color: '#60A5FA' }
                            : { background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }
                          }>
                          {lead.investment_type}
                        </span>
                      </td>
                      <td>{formatCurrency(lead.amount)}{lead.investment_type === 'SIP' ? '/mo' : ''}</td>
                      <td>{lead.period_years} yrs</td>
                      <td>{lead.expected_return}%</td>
                      <td>{formatCurrency(lead.total_invested)}</td>
                      <td className="font-medium" style={{ color: '#22C55E' }}>{formatCurrency(lead.final_value)}</td>
                      <td>
                        <span className="text-xs font-bold" style={{ color: '#4ADE80' }}>{lead.wealth_multiplier}x</span>
                      </td>
                      <td className="text-xs text-text-muted">
                        {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
