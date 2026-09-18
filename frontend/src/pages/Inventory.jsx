import React, { useState, useEffect } from 'react';
import { erpAPI } from '../services/api';
import { Box, Layers, Lock, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await erpAPI.getInventory();
      setInventory(res.data);
    } catch (err) {
      setError('Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  const totalPhysical = inventory.reduce((acc, item) => acc + parseInt(item.physical_quantity || 0, 10), 0);
  const totalReserved = inventory.reduce((acc, item) => acc + parseInt(item.reserved_quantity || 0, 10), 0);
  const totalAvailable = totalPhysical - totalReserved;

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="page-title">Real-Time Inventory Monitor</h1>
          <p className="page-subtitle">Track physical stock, reserved quantities, and net available stock live</p>
        </div>
        <button onClick={fetchInventory} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* STATS OVERVIEW */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Box size={22} />
          </div>
          <div>
            <div className="stat-value">{inventory.length}</div>
            <div className="stat-label">Product Categories</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Layers size={22} />
          </div>
          <div>
            <div className="stat-value">{totalPhysical.toLocaleString()}</div>
            <div className="stat-label">Total Physical Stock</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <Lock size={22} />
          </div>
          <div>
            <div className="stat-value">{totalReserved.toLocaleString()}</div>
            <div className="stat-label">Reserved Stock</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{totalAvailable.toLocaleString()}</div>
            <div className="stat-label">Net Available Stock</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Base Price</th>
                <th>Physical Stock</th>
                <th>Reserved Stock</th>
                <th>Net Available Stock</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading inventory...</td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No inventory items found.</td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{item.product_code}</td>
                    <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                    <td>{item.category}</td>
                    <td>{item.unit}</td>
                    <td>₹{Number(item.base_price).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{item.physical_quantity}</td>
                    <td style={{ fontWeight: 600, color: '#d97706' }}>{item.reserved_quantity}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: Number(item.available_quantity) > 20 ? '#16a34a' : Number(item.available_quantity) > 0 ? '#d97706' : '#dc2626',
                        }}
                      >
                        {item.available_quantity} {item.unit}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
