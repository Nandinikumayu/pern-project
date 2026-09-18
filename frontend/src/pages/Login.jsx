import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Factory, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/enquiries');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail, userPassword) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setError('');
    setLoading(true);
    try {
      await login(userEmail, userPassword);
      navigate('/enquiries');
    } catch (err) {
      setError(err.response?.data?.error || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f1f5f9' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.25rem', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '0.5rem', background: '#2563eb', color: 'white', marginBottom: '0.75rem' }}>
            <Factory size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Industrial ERP</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Management System Authentication</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sales@erp.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '1.75rem 0 0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Quick Demo Access
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => handleQuickLogin('sales@erp.com', 'sales123')}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              disabled={loading}
            >
              <UserCheck size={16} color="#2563eb" />
              <span>Sales User</span>
            </button>

            <button
              onClick={() => handleQuickLogin('admin@erp.com', 'admin123')}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              disabled={loading}
            >
              <ShieldCheck size={16} color="#dc2626" />
              <span>Admin User</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
