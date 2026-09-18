import React, { useState, useEffect } from 'react';
import { erpAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Eye, FileText, UserPlus, Users, AlertCircle, CheckCircle } from 'lucide-react';

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showCreateEnquiryModal, setShowCreateEnquiryModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEnquiryDetails, setSelectedEnquiryDetails] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [enquiryItems, setEnquiryItems] = useState([{ product_id: '', quantity: 1 }]);

  // Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    company_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    city: '',
  });

  const { isSales } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [enqRes, custRes, prodRes] = await Promise.all([
        erpAPI.getEnquiries(),
        erpAPI.getCustomers(),
        erpAPI.getProducts(),
      ]);
      setEnquiries(enqRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
      if (custRes.data.length > 0) setCustomerId(custRes.data[0].id);
      if (prodRes.data.length > 0) setEnquiryItems([{ product_id: prodRes.data[0].id, quantity: 10 }]);
    } catch (err) {
      setError('Failed to fetch enquiries data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateCustomerModal = () => {
    setNewCustomer({
      company_name: '',
      contact_person: '',
      mobile: '',
      email: '',
      city: '',
    });
    setShowCreateCustomerModal(true);
  };

  const handleOpenCreateEnquiryModal = () => {
    setRequiredDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setNotes('');
    if (customers.length > 0) {
      setCustomerId(customers[0].id);
    } else {
      setCustomerId('');
    }
    if (products.length > 0) {
      setEnquiryItems([{ product_id: products[0].id, quantity: 10 }]);
    } else {
      setEnquiryItems([{ product_id: '', quantity: 1 }]);
    }
    setShowCreateEnquiryModal(true);
  };

  const handleAddItemRow = () => {
    const defaultProdId = products.length > 0 ? products[0].id : '';
    setEnquiryItems([...enquiryItems, { product_id: defaultProdId, quantity: 1 }]);
  };

  const handleRemoveItemRow = (index) => {
    setEnquiryItems(enquiryItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...enquiryItems];
    updated[index][field] = value;
    setEnquiryItems(updated);
  };

  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await erpAPI.createCustomer(newCustomer);
      setSuccess('Customer created successfully!');
      setCustomers([res.data, ...customers]);
      setCustomerId(res.data.id);
      setShowCreateCustomerModal(false);
      setNewCustomer({ company_name: '', contact_person: '', mobile: '', email: '', city: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create customer');
    }
  };

  const handleCreateEnquirySubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!customerId) {
      setError('Please select a customer from the dropdown');
      return;
    }
    try {
      await erpAPI.createEnquiry({
        customer_id: customerId,
        required_date: requiredDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes,
        items: enquiryItems,
      });
      setSuccess('Customer Enquiry created successfully!');
      setShowCreateEnquiryModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create enquiry');
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await erpAPI.getEnquiryById(id);
      setSelectedEnquiryDetails(res.data);
      setShowDetailsModal(true);
    } catch (err) {
      setError('Failed to load enquiry details');
    }
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="page-title">Customer Enquiries</h1>
          <p className="page-subtitle">Manage customer product enquiries and specifications</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/customers" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <Users size={16} />
            <span>View All Customers</span>
          </a>
          {isSales && (
            <>
              <button onClick={handleOpenCreateCustomerModal} className="btn btn-secondary">
                <UserPlus size={16} />
                <span>Add Customer</span>
              </button>
              <button onClick={handleOpenCreateEnquiryModal} className="btn btn-primary">
                <Plus size={16} />
                <span>New Enquiry</span>
              </button>
            </>
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

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Enquiry #</th>
                <th>Customer Company</th>
                <th>Enquiry Date</th>
                <th>Required Date</th>
                <th>Item Count</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading enquiries...</td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No enquiries found. Click 'New Enquiry' to create one.</td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr key={enq.id}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{enq.enquiry_number}</td>
                    <td style={{ fontWeight: 600 }}>{enq.company_name}</td>
                    <td>{enq.enquiry_date ? new Date(enq.enquiry_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{enq.required_date ? new Date(enq.required_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{enq.item_count} items</td>
                    <td>
                      <span className={`badge ${enq.status === 'QUOTED' ? 'badge-quoted' : 'badge-new'}`}>
                        {enq.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleViewDetails(enq.id)} className="btn btn-secondary btn-sm">
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {showCreateCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Create New Customer</h2>
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
                <label className="form-label">Contact Person</label>
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
                <button type="button" onClick={() => setShowCreateCustomerModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ENQUIRY MODAL */}
      {showCreateEnquiryModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Create Customer Enquiry</h2>
            <form onSubmit={handleCreateEnquirySubmit}>
              <div className="form-group">
                <label className="form-label">Select Customer</label>
                <select
                  className="form-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.contact_person} - {c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Required Delivery Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Customer Requirements</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Urgent delivery required within 10 days..."
                />
              </div>

              <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Enquiry Items</label>
                  <button type="button" onClick={handleAddItemRow} className="btn btn-secondary btn-sm">
                    + Add Product Line
                  </button>
                </div>

                {enquiryItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 40px', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                    <select
                      className="form-select"
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      required
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.product_code} - {p.product_name} (₹{Number(p.base_price).toLocaleString()}/{p.unit})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      required
                    />

                    {enquiryItems.length > 1 && (
                      <button type="button" onClick={() => handleRemoveItemRow(idx)} className="btn btn-danger btn-sm" style={{ padding: '0.5rem' }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateEnquiryModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ENQUIRY DETAILS MODAL */}
      {showDetailsModal && selectedEnquiryDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{selectedEnquiryDetails.enquiry_number}</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Enquiry Details & Product Requirements</p>
              </div>
              <span className={`badge ${selectedEnquiryDetails.status === 'QUOTED' ? 'badge-quoted' : 'badge-new'}`}>
                {selectedEnquiryDetails.status}
              </span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div><strong>Customer:</strong> {selectedEnquiryDetails.company_name}</div>
              <div><strong>Contact:</strong> {selectedEnquiryDetails.contact_person} ({selectedEnquiryDetails.mobile})</div>
              <div><strong>City:</strong> {selectedEnquiryDetails.city}</div>
              <div><strong>Enquiry Date:</strong> {new Date(selectedEnquiryDetails.enquiry_date).toLocaleDateString()}</div>
              <div><strong>Required Date:</strong> {new Date(selectedEnquiryDetails.required_date).toLocaleDateString()}</div>
              <div><strong>Notes:</strong> {selectedEnquiryDetails.notes || 'None'}</div>
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Requested Products</h3>
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {selectedEnquiryDetails.items?.map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{it.product_code}</td>
                    <td>{it.product_name}</td>
                    <td>{it.category}</td>
                    <td>₹{Number(it.base_price).toLocaleString()} / {it.unit}</td>
                    <td style={{ fontWeight: 700 }}>{it.quantity}</td>
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
