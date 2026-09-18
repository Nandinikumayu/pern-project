import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor to add Authorization header with JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
};

export const erpAPI = {
  // Customers
  getCustomers: () => api.get('/customers'),
  createCustomer: (data) => api.post('/customers', data),

  // Products & Inventory
  getProducts: () => api.get('/products'),
  getInventory: () => api.get('/inventory'),

  // Enquiries
  getEnquiries: () => api.get('/enquiries'),
  getEnquiryById: (id) => api.get(`/enquiries/${id}`),
  createEnquiry: (data) => api.post('/enquiries', data),

  // Quotations
  getQuotations: () => api.get('/quotations'),
  getQuotationById: (id) => api.get(`/quotations/${id}`),
  createQuotation: (data) => api.post('/quotations', data),
  updateQuotationStatus: (id, status) => api.patch(`/quotations/${id}/status`, { status }),
  convertQuotationToOrder: (id) => api.post(`/quotations/${id}/convert`),

  // Sales Orders
  getSalesOrders: () => api.get('/sales-orders'),
  getSalesOrderById: (id) => api.get(`/sales-orders/${id}`),
  confirmOrder: (id) => api.post(`/sales-orders/${id}/confirm`),
  dispatchOrder: (id, dispatchData) => api.post(`/sales-orders/${id}/dispatch`, dispatchData),
};

export default api;
