import React, { useState, useEffect } from 'react';
import { erpAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Eye, ShieldAlert, Truck, Lock, AlertCircle, CheckCircle, PackageCheck } from 'lucide-react';

export default function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Details
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Dispatch Form State
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);

  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await erpAPI.getSalesOrders();
      setOrders(res.data);
    } catch (err) {
      setError('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndReserve = async (orderId) => {
    setError('');
    try {
      await erpAPI.confirmOrder(orderId);
      setSuccess(`Order ${orderId} confirmed and stock reserved successfully!`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm order and reserve stock');
    }
  };

  const handleOpenDispatchModal = (orderId) => {
    setSelectedOrderId(orderId);
    setVehicleNumber('MH-04-ER-1234');
    setDriverName('Ramesh Patel');
    setShowDispatchModal(true);
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await erpAPI.dispatchOrder(selectedOrderId, {
        vehicle_number: vehicleNumber,
        driver_name: driverName,
        dispatch_date: dispatchDate,
      });
      setSuccess(`Order dispatched! Dispatch #${res.data.dispatchNumber}`);
      setShowDispatchModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispatch order');
    }
  };

  const handleViewOrderDetails = async (id) => {
    try {
      const res = await erpAPI.getSalesOrderById(id);
      setSelectedOrderDetails(res.data);
      setShowOrderDetailsModal(true);
    } catch (err) {
      setError('Failed to load sales order details');
    }
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="page-title">Sales Orders & Stock Reservation</h1>
          <p className="page-subtitle">Admin confirmation, row-level inventory locks & atomic dispatches</p>
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

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Quotation #</th>
                <th>Customer Company</th>
                <th>Order Date</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading sales orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No sales orders generated yet.</td>
                </tr>
              ) : (
                orders.map((so) => (
                  <tr key={so.id}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{so.order_number}</td>
                    <td style={{ color: '#6d28d9', fontWeight: 500 }}>{so.quotation_number}</td>
                    <td style={{ fontWeight: 600 }}>{so.company_name}</td>
                    <td>{so.order_date ? new Date(so.order_date).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{Number(so.total_amount).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${so.status.toLowerCase()}`}>
                        {so.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => handleViewOrderDetails(so.id)} className="btn btn-secondary btn-sm">
                          <Eye size={14} />
                        </button>

                        {isAdmin && so.status === 'PENDING' && (
                          <button onClick={() => handleConfirmAndReserve(so.id)} className="btn btn-primary btn-sm">
                            <Lock size={14} /> Confirm & Reserve
                          </button>
                        )}

                        {isAdmin && so.status === 'CONFIRMED' && (
                          <button onClick={() => handleOpenDispatchModal(so.id)} className="btn btn-success btn-sm">
                            <Truck size={14} /> Dispatch Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH MODAL */}
      {showDispatchModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
              <Truck size={22} /> Dispatch Order & Update Inventory
            </h2>
            <form onSubmit={handleDispatchSubmit}>
              <div className="form-group">
                <label className="form-label">Dispatch Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Registration Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. MH-04-AB-1234"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Driver Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  required
                />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', borderRadius: '0.375rem', marginBottom: '1.25rem', fontSize: '0.825rem', color: '#475569' }}>
                <PackageCheck size={16} color="#16a34a" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                <span>Submitting dispatch will deduct the ordered quantity from both <strong>Physical Stock</strong> and <strong>Reserved Stock</strong>.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowDispatchModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {showOrderDetailsModal && selectedOrderDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{selectedOrderDetails.order_number}</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Quotation: {selectedOrderDetails.quotation_number}</p>
              </div>
              <span className={`badge badge-${selectedOrderDetails.status.toLowerCase()}`}>
                {selectedOrderDetails.status}
              </span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div><strong>Customer:</strong> {selectedOrderDetails.company_name}</div>
              <div><strong>Contact Person:</strong> {selectedOrderDetails.contact_person} ({selectedOrderDetails.mobile})</div>
              <div><strong>Order Date:</strong> {new Date(selectedOrderDetails.order_date).toLocaleDateString()}</div>
              <div><strong>Total Amount:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>₹{Number(selectedOrderDetails.total_amount).toLocaleString()}</span></div>
            </div>

            {selectedOrderDetails.dispatch && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem 1rem', borderRadius: '0.375rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#166534' }}>
                <h4 style={{ color: '#15803d', marginBottom: '0.4rem', fontWeight: 700 }}>Dispatch Information</h4>
                <div><strong>Dispatch #:</strong> {selectedOrderDetails.dispatch.dispatch_number}</div>
                <div><strong>Vehicle Number:</strong> {selectedOrderDetails.dispatch.vehicle_number}</div>
                <div><strong>Driver Name:</strong> {selectedOrderDetails.dispatch.driver_name}</div>
                <div><strong>Dispatch Date:</strong> {new Date(selectedOrderDetails.dispatch.dispatch_date).toLocaleDateString()}</div>
              </div>
            )}

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Ordered Products & Stock Check</h3>
            <table className="data-table" style={{ fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Order Qty</th>
                  <th>Physical Stock</th>
                  <th>Reserved Stock</th>
                  <th>Net Available</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrderDetails.items?.map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.product_code} - {it.product_name}</td>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{it.quantity}</td>
                    <td>{it.physical_quantity} {it.unit}</td>
                    <td>{it.reserved_quantity} {it.unit}</td>
                    <td style={{ fontWeight: 700, color: it.available_quantity >= it.quantity ? '#16a34a' : '#dc2626' }}>
                      {it.available_quantity} {it.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setShowOrderDetailsModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
