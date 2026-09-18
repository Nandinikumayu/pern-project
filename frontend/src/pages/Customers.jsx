import React, { useState, useEffect } from 'react';
import { erpAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Users, Phone, Mail, MapPin, Building, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    company_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    city: '',
  });

  const { isSales } = useAuth();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await erpAPI.getCustomers();
      setCustomers(res.data);
    } catch (err) {
      setError('Failed to fetch customers list');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await erpAPI.createCustomer(newCustomer);
      setSuccess(`Customer '${res.data.company_name}' created successfully!`);
      setCustomers([res.data, ...customers]);
      setShowCreateModal(false);
      setNewCustomer({ company_name: '', contact_person: '', mobile: '', email: '', city: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create customer');
    }
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="page-title">Customer Directory</h1>
          <p className="page-subtitle">Manage client profiles, contact persons, and corporate details</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchCustomers} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          {isSales && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <UserPlus size={16} />
              <span>Add New Customer</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* STATS */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="stat-value">{customers.length}</div>
            <div className="stat-label">Total Registered Customers</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th># ID</th>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Mobile Number</th>
                <th>Email Address</th>
                <th>City / Location</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    No customers found. Click 'Add New Customer' to register one.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: '#64748b' }}>#{c.id}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building size={16} color="#2563eb" />
                        <span>{c.company_name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.contact_person}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}>
                        <Phone size={14} />
                        <span>{c.mobile}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb' }}>
                        <Mail size={14} />
                        <span>{c.email}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b' }}>
                        <MapPin size={14} color="#dc2626" />
                        <span>{c.city}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#64748b' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} color="#2563eb" /> Add New Customer Profile
            </h2>
            <form onSubmit={handleCreateCustomerSubmit}>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCustomer.company_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                  placeholder="e.g. ABC Engineering Pvt. Ltd."
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Person Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCustomer.contact_person}
                  onChange={(e) => setNewCustomer({ ...newCustomer, contact_person: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCustomer.mobile}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                    placeholder="9876543210"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    placeholder="Mumbai"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="rahul@abceng.com"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
