const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');
const { seedData } = require('../src/models/seed');

let salesToken = '';
let adminToken = '';
let customerId = null;
let productId = null;
let enquiryId = null;
let quotationId = null;
let salesOrderId = null;

beforeAll(async () => {
  await db.runSchema();
  await seedData();

  // Obtain Sales Token
  const salesLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sales@erp.com', password: 'sales123' });
  salesToken = salesLogin.body.token;

  // Obtain Admin Token
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@erp.com', password: 'admin123' });
  adminToken = adminLogin.body.token;

  // Get first seeded customer and product
  const custRes = await db.query('SELECT id FROM customers LIMIT 1');
  customerId = custRes.rows[0].id;

  const prodRes = await db.query('SELECT id FROM products WHERE product_code = $1', ['IND-001']);
  productId = prodRes.rows[0].id;
});

describe('PERN Industrial ERP Mandatory Technical Case Study Tests', () => {
  test('1. Quotation total is calculated correctly on the backend', async () => {
    // Step A: Create enquiry
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: customerId,
        enquiry_date: '2026-09-17',
        required_date: '2026-09-25',
        notes: 'Need 100 industrial pumps',
        items: [{ product_id: productId, quantity: 100 }],
      });
    expect(enqRes.status).toBe(201);
    enquiryId = enqRes.body.id;

    // Step B: Create quotation with 100 pumps @ 5000 unit price, 10% discount, 18% GST
    // Expected:
    // Base: 100 * 5000 = 500,000
    // 10% Discount = 50,000 => After discount = 450,000
    // 18% GST = 81,000
    // Final Line & Total Amount = 531,000
    const quoRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enquiryId,
        customer_id: customerId,
        valid_until: '2026-10-15',
        items: [
          {
            product_id: productId,
            quantity: 100,
            unit_price: 5000,
            discount_percent: 10,
            gst_percent: 18,
          },
        ],
      });

    expect(quoRes.status).toBe(201);
    quotationId = quoRes.body.id;
    expect(Number(quoRes.body.total_amount)).toBe(531000);
  });

  test('2. DRAFT/REJECTED quotation cannot create a Sales Order', async () => {
    // Current quotation status is DRAFT
    const draftConvertRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    
    expect(draftConvertRes.status).toBe(400);
    expect(draftConvertRes.body.error).toMatch(/Only ACCEPTED quotations can be converted/);

    // Set to REJECTED
    await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'REJECTED' });

    const rejectedConvertRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(rejectedConvertRes.status).toBe(400);
    expect(rejectedConvertRes.body.error).toMatch(/Only ACCEPTED quotations can be converted/);
  });

  test('3. Accepted quotation creates Sales Order & Duplicate conversion is prevented', async () => {
    // Change status to ACCEPTED
    await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    // Convert to Sales Order
    const convertRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(convertRes.status).toBe(201);
    expect(convertRes.body.status).toBe('PENDING');
    salesOrderId = convertRes.body.id;

    // Attempt duplicate conversion
    const duplicateRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.error).toMatch(/Duplicate orders are not allowed/);
  });

  test('4. Unauthorized user (Sales User) cannot perform Admin-only operation', async () => {
    // Sales user attempts to confirm order (reserve stock)
    const salesConfirmRes = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(salesConfirmRes.status).toBe(403);
    expect(salesConfirmRes.body.error).toMatch(/Forbidden/);

    // Sales user attempts to dispatch order
    const salesDispatchRes = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/dispatch`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ vehicle_number: 'MH-12-AB-1234', driver_name: 'John' });

    expect(salesDispatchRes.status).toBe(403);
    expect(salesDispatchRes.body.error).toMatch(/Forbidden/);
  });

  test('5. Admin confirms order & reserves stock, Cannot reserve more inventory than available', async () => {
    // Admin confirms order (requiring 100 pumps, physical stock is 100)
    const adminConfirmRes = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminConfirmRes.status).toBe(200);
    expect(adminConfirmRes.body.status).toBe('CONFIRMED');

    // Check inventory: physical=100, reserved=100, available=0
    const invRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    const pumpInv = invRes.body.find((item) => item.product_code === 'IND-001');
    expect(pumpInv.physical_quantity).toBe(100);
    expect(pumpInv.reserved_quantity).toBe(100);
    expect(Number(pumpInv.available_quantity)).toBe(0);

    // Create another enquiry, quotation, accept it, try to convert & confirm
    const enq2 = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: customerId,
        enquiry_date: '2026-09-17',
        required_date: '2026-09-25',
        items: [{ product_id: productId, quantity: 10 }],
      });

    const quo2 = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enq2.body.id,
        customer_id: customerId,
        valid_until: '2026-10-15',
        items: [{ product_id: productId, quantity: 10, unit_price: 5000 }],
      });

    await request(app)
      .patch(`/api/quotations/${quo2.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    const order2 = await request(app)
      .post(`/api/quotations/${quo2.body.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    // Try to confirm order 2 when available stock is 0 (requested 10)
    const overReserveRes = await request(app)
      .post(`/api/sales-orders/${order2.body.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(overReserveRes.status).toBe(400);
    expect(overReserveRes.body.error).toMatch(/Insufficient available stock/);
  });

  test('6. Admin dispatches order and inventory is updated correctly', async () => {
    // Dispatch salesOrderId (100 units)
    const dispatchRes = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicle_number: 'MH-04-ER-9999',
        driver_name: 'Suresh Kumar',
      });

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.status).toBe('DISPATCHED');

    // Check inventory: physical = 100 - 100 = 0, reserved = 100 - 100 = 0, available = 0
    const invRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    const pumpInv = invRes.body.find((item) => item.product_code === 'IND-001');
    expect(pumpInv.physical_quantity).toBe(0);
    expect(pumpInv.reserved_quantity).toBe(0);
    expect(Number(pumpInv.available_quantity)).toBe(0);

    // Verify duplicate dispatch fails
    const dupDispatchRes = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vehicle_number: 'MH-04-ER-9999', driver_name: 'Suresh Kumar' });

    expect(dupDispatchRes.status).toBe(400);
    expect(dupDispatchRes.body.error).toMatch(/already been dispatched/);
  });
});
