const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const erpController = require('../controllers/erpController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// --- AUTHENTICATION ---
router.post('/auth/login', authController.login);

// Protected routes below
router.use(authenticateToken);

// --- CUSTOMERS ---
router.get('/customers', erpController.getCustomers);
router.post('/customers', requireRole('sales'), erpController.createCustomer);

// --- PRODUCTS & INVENTORY ---
router.get('/products', erpController.getProducts);
router.get('/inventory', erpController.getInventory);

// --- ENQUIRIES ---
router.get('/enquiries', erpController.getEnquiries);
router.get('/enquiries/:id', erpController.getEnquiryById);
router.post('/enquiries', requireRole('sales'), erpController.createEnquiry);

// --- QUOTATIONS ---
router.get('/quotations', erpController.getQuotations);
router.get('/quotations/:id', erpController.getQuotationById);
router.post('/quotations', requireRole('sales'), erpController.createQuotation);
router.patch('/quotations/:id/status', requireRole('sales'), erpController.updateQuotationStatus);
router.post('/quotations/:id/convert', requireRole('sales'), erpController.convertQuotationToOrder);

// --- SALES ORDERS ---
router.get('/sales-orders', erpController.getSalesOrders);
router.get('/sales-orders/:id', erpController.getSalesOrderById);
router.post('/sales-orders/:id/confirm', requireRole('admin'), erpController.confirmOrder);
router.post('/sales-orders/:id/dispatch', requireRole('admin'), erpController.dispatchOrderController);

module.exports = router;
