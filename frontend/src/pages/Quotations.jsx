import React, { useState, useEffect } from 'react';
import { erpAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Eye, Calculator, ArrowRight, AlertCircle, CheckCircle, Check, X } from 'lucide-react';

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Form State
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [quotationItems, setQuotationItems] = useState([]);

  const { isSales } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quoRes, enqRes] = await Promise.all([
        erpAPI.getQuotations(),
        erpAPI.getEnquiries(),
      ]);
      setQuotations(quoRes.data);
      setEnquiries(enqRes.data);
    } catch (err) {
      setError('Failed to fetch quotations data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnquirySelect = async (enquiryId) => {
    setSelectedEnquiryId(enquiryId);
    if (!enquiryId) return;
    try {
      const res = await erpAPI.getEnquiryById(enquiryId);
      const items = res.data.items.map((it) => ({
        product_id: it.product_id,
        product_code: it.product_code,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.base_price,
        discount_percent: 10.0,
        gst_percent: 18.0,
      }));
      setQuotationItems(items);
    } catch (err) {
      setError('Failed to load enquiry details for quotation');
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...quotationItems];
    updated[index][field] = value;
    setQuotationItems(updated);
  };

  const calculatePreviewLineAmount = (item) => {
    const base = (item.quantity || 0) * (item.unit_price || 0);
    const disc = base * ((item.discount_percent || 0) / 100);
    const afterDisc = base - disc;
    const gst = afterDisc * ((item.gst_percent || 18) / 100);
    return (afterDisc + gst).toFixed(2);
  };

  const calculatePreviewTotal = () => {
    return quotationItems
      .reduce((sum, item) => sum + parseFloat(calculatePreviewLineAmount(item)), 0)
      .toFixed(2);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const enq = enquiries.find((e) => e.id == selectedEnquiryId);
    if (!enq) return;

    try {
      await erpAPI.createQuotation({
        enquiry_id: selectedEnquiryId,
        customer_id: enq.customer_id,
        valid_until: validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        items: quotationItems,
      });
      setSuccess('Quotation created successfully!');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create quotation');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setError('');
    try {
      await erpAPI.updateQuotationStatus(id, newStatus);
      setSuccess(`Quotation status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update quotation status');
    }
  };

  const handleConvertToOrder = async (id) => {
    setError('');
    try {
      const res = await erpAPI.convertQuotationToOrder(id);
      setSuccess(`Quotation converted to Sales Order ${res.data.order_number} successfully!`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to convert quotation to order');
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await erpAPI.getQuotationById(id);
      setSelectedQuotation(res.data);
      setShowDetailsModal(true);
    } catch (err) {
      setError('Failed to fetch quotation details');
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedEnquiryId('');
    setQuotationItems([]);
    setValidUntil(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setShowCreateModal(true);
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">Server-side calculated pricing, discounts, GST & conversion to Sales Order</p>
        </div>
        {isSales && (
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Quotation</span>
          </button>
        )}
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
                <th>Quotation #</th>
                <th>Enquiry #</th>
                <th>Customer Company</th>
                <th>Valid Until</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading quotations...</td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No quotations created yet.</td>
                </tr>
              ) : (
                quotations.map((quo) => (
                  <tr key={quo.id}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{quo.quotation_number}</td>
                    <td style={{ color: '#6d28d9', fontWeight: 500 }}>{quo.enquiry_number}</td>
                    <td style={{ fontWeight: 600 }}>{quo.company_name}</td>
                    <td>{quo.valid_until ? new Date(quo.valid_until).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{Number(quo.total_amount).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${quo.status.toLowerCase()}`}>
                        {quo.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button onClick={() => handleViewDetails(quo.id)} className="btn btn-secondary btn-sm">
                          <Eye size={14} />
                        </button>

                        {isSales && quo.status === 'DRAFT' && (
                          <button onClick={() => handleStatusUpdate(quo.id, 'SENT')} className="btn btn-primary btn-sm">
                            Send
                          </button>
                        )}

                        {isSales && (quo.status === 'DRAFT' || quo.status === 'SENT') && (
                          <>
                            <button onClick={() => handleStatusUpdate(quo.id, 'ACCEPTED')} className="btn btn-success btn-sm">
                              <Check size={14} /> Accept
                            </button>
                            <button onClick={() => handleStatusUpdate(quo.id, 'REJECTED')} className="btn btn-danger btn-sm">
                              <X size={14} /> Reject
                            </button>
                          </>
                        )}

                        {isSales && quo.status === 'ACCEPTED' && (
                          <button onClick={() => handleConvertToOrder(quo.id)} className="btn btn-success btn-sm">
                            <ArrowRight size={14} /> Convert to Order
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

      {/* CREATE QUOTATION MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Create Quotation Against Enquiry</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Select Customer Enquiry</label>
                <select
                  className="form-select"
                  value={selectedEnquiryId}
                  onChange={(e) => handleEnquirySelect(e.target.value)}
                  required
                >
                  <option value="">-- Choose Enquiry --</option>
                  {enquiries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.enquiry_number} - {e.company_name} ({e.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quotation Valid Until</label>
                <input
                  type="date"
                  className="form-input"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                />
              </div>

              {quotationItems.length > 0 && (
                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                  <label className="form-label">Line Item Pricing & Taxes</label>
                  <div className="table-container">
                    <table className="data-table" style={{ fontSize: '0.825rem' }}>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Unit Price (₹)</th>
                          <th>Discount %</th>
                          <th>GST %</th>
                          <th>Estimated Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotationItems.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.product_code} - {item.product_name}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-input"
                                style={{ padding: '0.35rem', width: '70px' }}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-input"
                                style={{ padding: '0.35rem', width: '100px' }}
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="form-input"
                                style={{ padding: '0.35rem', width: '70px' }}
                                value={item.discount_percent}
                                onChange={(e) => handleItemChange(idx, 'discount_percent', e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="form-input"
                                style={{ padding: '0.35rem', width: '70px' }}
                                value={item.gst_percent}
                                onChange={(e) => handleItemChange(idx, 'gst_percent', e.target.value)}
                                required
                              />
                            </td>
                            <td style={{ fontWeight: 700, color: '#16a34a' }}>
                              ₹{Number(calculatePreviewLineAmount(item)).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ textAlign: 'right', marginTop: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', borderRadius: '0.375rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem', marginRight: '1rem' }}>Total Quotation Preview:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>₹{Number(calculatePreviewTotal()).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={quotationItems.length === 0}>
                  Generate Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW QUOTATION DETAILS MODAL */}
      {showDetailsModal && selectedQuotation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{selectedQuotation.quotation_number}</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Enquiry: {selectedQuotation.enquiry_number}</p>
              </div>
              <span className={`badge badge-${selectedQuotation.status.toLowerCase()}`}>
                {selectedQuotation.status}
              </span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div><strong>Customer:</strong> {selectedQuotation.company_name}</div>
              <div><strong>Contact Person:</strong> {selectedQuotation.contact_person}</div>
              <div><strong>Valid Until:</strong> {new Date(selectedQuotation.valid_until).toLocaleDateString()}</div>
              <div><strong>Total Amount:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>₹{Number(selectedQuotation.total_amount).toLocaleString()}</span></div>
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Calculated Line Breakdown</h3>
            <table className="data-table" style={{ fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount %</th>
                  <th>GST %</th>
                  <th>Line Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuotation.items?.map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.product_code} - {it.product_name}</td>
                    <td>{it.quantity}</td>
                    <td>₹{Number(it.unit_price).toLocaleString()}</td>
                    <td>{it.discount_percent}%</td>
                    <td>{it.gst_percent}%</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{Number(it.line_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setShowDetailsModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
