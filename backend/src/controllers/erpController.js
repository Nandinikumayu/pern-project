const db = require('../config/database');
const { calculateQuotationItems } = require('../services/quotationService');
const { reserveStockForOrder, dispatchOrder } = require('../services/inventoryService');

// --- CUSTOMERS ---
async function getCustomers(req, res) {
  try {
    const result = await db.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createCustomer(req, res) {
  try {
    const { company_name, contact_person, mobile, email, city } = req.body;
    if (!company_name || !contact_person || !mobile || !email || !city) {
      return res.status(400).json({ error: 'All customer fields are required' });
    }

    const result = await db.query(
      `INSERT INTO customers (company_name, contact_person, mobile, email, city)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [company_name, contact_person, mobile, email, city]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- PRODUCTS ---
async function getProducts(req, res) {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- INVENTORY ---
async function getInventory(req, res) {
  try {
    const result = await db.query(
      `SELECT i.id, i.product_id, p.product_code, p.product_name, p.category, p.unit, p.base_price,
              i.physical_quantity, i.reserved_quantity,
              (i.physical_quantity - i.reserved_quantity) AS available_quantity,
              i.updated_at
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       ORDER BY p.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- ENQUIRIES ---
async function getEnquiries(req, res) {
  try {
    const result = await db.query(
      `SELECT e.*, c.company_name, c.contact_person,
              (SELECT COUNT(*) FROM enquiry_items ei WHERE ei.enquiry_id = e.id) as item_count
       FROM enquiries e
       JOIN customers c ON e.customer_id = c.id
       ORDER BY e.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getEnquiryById(req, res) {
  try {
    const { id } = req.params;
    const enqRes = await db.query(
      `SELECT e.*, c.company_name, c.contact_person, c.mobile, c.email, c.city
       FROM enquiries e
       JOIN customers c ON e.customer_id = c.id
       WHERE e.id = $1`,
      [id]
    );

    if (enqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    const itemsRes = await db.query(
      `SELECT ei.*, p.product_code, p.product_name, p.category, p.unit, p.base_price
       FROM enquiry_items ei
       JOIN products p ON ei.product_id = p.id
       WHERE ei.enquiry_id = $1`,
      [id]
    );

    res.json({
      ...enqRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createEnquiry(req, res) {
  const client = await db.getClient();
  try {
    const { customer_id, enquiry_date, required_date, notes, items } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and at least one enquiry item are required' });
    }

    await client.query('BEGIN');

    const enquiryNumber = `ENQ-${Date.now().toString().slice(-6)}`;
    const enqRes = await client.query(
      `INSERT INTO enquiries (enquiry_number, customer_id, enquiry_date, required_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'NEW') RETURNING *`,
      [enquiryNumber, customer_id, enquiry_date || new Date().toISOString().split('T')[0], required_date, notes || '']
    );

    const enquiry = enqRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO enquiry_items (enquiry_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [enquiry.id, item.product_id, item.quantity]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(enquiry);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// --- QUOTATIONS ---
async function getQuotations(req, res) {
  try {
    const result = await db.query(
      `SELECT q.*, c.company_name, e.enquiry_number,
              (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) as item_count
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       JOIN enquiries e ON q.enquiry_id = e.id
       ORDER BY q.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getQuotationById(req, res) {
  try {
    const { id } = req.params;
    const quoRes = await db.query(
      `SELECT q.*, c.company_name, c.contact_person, e.enquiry_number
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       JOIN enquiries e ON q.enquiry_id = e.id
       WHERE q.id = $1`,
      [id]
    );

    if (quoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const itemsRes = await db.query(
      `SELECT qi.*, p.product_code, p.product_name, p.unit
       FROM quotation_items qi
       JOIN products p ON qi.product_id = p.id
       WHERE qi.quotation_id = $1`,
      [id]
    );

    res.json({
      ...quoRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createQuotation(req, res) {
  const client = await db.getClient();
  try {
    const { enquiry_id, customer_id, valid_until, items } = req.body;

    if (!enquiry_id || !customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Enquiry, Customer, and items are required' });
    }

    // Check if quotation already exists for this enquiry
    const existingQuo = await client.query(
      'SELECT id FROM quotations WHERE enquiry_id = $1',
      [enquiry_id]
    );
    if (existingQuo.rows.length > 0) {
      return res.status(400).json({ error: 'A quotation already exists for this enquiry.' });
    }

    // Server-side calculation of line amounts and total
    const { items: calculatedItems, totalAmount } = calculateQuotationItems(items);

    await client.query('BEGIN');

    const quotationNumber = `QUO-${Date.now().toString().slice(-6)}`;
    const validUntilDate = valid_until || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const quoRes = await client.query(
      `INSERT INTO quotations (quotation_number, enquiry_id, customer_id, valid_until, status, total_amount)
       VALUES ($1, $2, $3, $4, 'DRAFT', $5) RETURNING *`,
      [quotationNumber, enquiry_id, customer_id, validUntilDate, totalAmount]
    );

    const quotation = quoRes.rows[0];

    for (const item of calculatedItems) {
      await client.query(
        `INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount_percent, gst_percent, line_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [quotation.id, item.product_id, item.quantity, item.unit_price, item.discount_percent, item.gst_percent, item.line_amount]
      );
    }

    // Update enquiry status to QUOTED
    await client.query("UPDATE enquiries SET status = 'QUOTED' WHERE id = $1", [enquiry_id]);

    await client.query('COMMIT');
    res.status(201).json(quotation);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

async function updateQuotationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await db.query(
      'UPDATE quotations SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function convertQuotationToOrder(req, res) {
  const client = await db.getClient();
  try {
    const { id } = req.params;

    // 1. Fetch quotation
    const quoRes = await client.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (quoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const quotation = quoRes.rows[0];

    // Mandatory Rule: Only ACCEPTED quotation can create a Sales Order. DRAFT and REJECTED must fail.
    if (quotation.status !== 'ACCEPTED') {
      return res.status(400).json({
        error: `Cannot convert quotation to Sales Order because status is '${quotation.status}'. Only ACCEPTED quotations can be converted.`,
      });
    }

    // Mandatory Rule: Check for duplicate order (UNIQUE quotation_id in sales_orders)
    const existingOrder = await client.query('SELECT id FROM sales_orders WHERE quotation_id = $1', [id]);
    if (existingOrder.rows.length > 0) {
      return res.status(400).json({
        error: 'A Sales Order has already been generated for this quotation. Duplicate orders are not allowed.',
      });
    }

    await client.query('BEGIN');

    // Fetch quotation items
    const itemsRes = await client.query('SELECT * FROM quotation_items WHERE quotation_id = $1', [id]);
    const items = itemsRes.rows;

    const orderNumber = `SO-${Date.now().toString().slice(-6)}`;
    const orderDate = new Date().toISOString().split('T')[0];

    const orderRes = await client.query(
      `INSERT INTO sales_orders (order_number, quotation_id, customer_id, order_date, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING') RETURNING *`,
      [orderNumber, quotation.id, quotation.customer_id, orderDate, quotation.total_amount]
    );

    const salesOrder = orderRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO sales_order_items (sales_order_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [salesOrder.id, item.product_id, item.quantity]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(salesOrder);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// --- SALES ORDERS ---
async function getSalesOrders(req, res) {
  try {
    const result = await db.query(
      `SELECT so.*, c.company_name, q.quotation_number,
              (SELECT COUNT(*) FROM sales_order_items soi WHERE soi.sales_order_id = so.id) as item_count
       FROM sales_orders so
       JOIN customers c ON so.customer_id = c.id
       JOIN quotations q ON so.quotation_id = q.id
       ORDER BY so.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getSalesOrderById(req, res) {
  try {
    const { id } = req.params;
    const orderRes = await db.query(
      `SELECT so.*, c.company_name, c.contact_person, c.mobile, c.email, c.city, q.quotation_number
       FROM sales_orders so
       JOIN customers c ON so.customer_id = c.id
       JOIN quotations q ON so.quotation_id = q.id
       WHERE so.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sales Order not found' });
    }

    const itemsRes = await db.query(
      `SELECT soi.*, p.product_code, p.product_name, p.unit, i.physical_quantity, i.reserved_quantity,
              (i.physical_quantity - i.reserved_quantity) AS available_quantity
       FROM sales_order_items soi
       JOIN products p ON soi.product_id = p.id
       JOIN inventory i ON soi.product_id = i.product_id
       WHERE soi.sales_order_id = $1`,
      [id]
    );

    const dispatchRes = await db.query(
      `SELECT * FROM dispatches WHERE sales_order_id = $1`,
      [id]
    );

    res.json({
      ...orderRes.rows[0],
      items: itemsRes.rows,
      dispatch: dispatchRes.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function confirmOrder(req, res) {
  try {
    const { id } = req.params;
    const result = await reserveStockForOrder(id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || err });
  }
}

async function dispatchOrderController(req, res) {
  try {
    const { id } = req.params;
    const result = await dispatchOrder(id, req.body);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || err });
  }
}

module.exports = {
  getCustomers,
  createCustomer,
  getProducts,
  getInventory,
  getEnquiries,
  getEnquiryById,
  createEnquiry,
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotationStatus,
  convertQuotationToOrder,
  getSalesOrders,
  getSalesOrderById,
  confirmOrder,
  dispatchOrderController,
};
