const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function seedData() {
  const client = await db.getClient();
  try {
    // Check if users already seeded
    const userRes = await client.query('SELECT COUNT(*) AS cnt FROM users');
    const userCount = parseInt(userRes.rows[0]?.cnt || userRes.rows[0]?.['COUNT(*)'] || userRes.rows[0]?.count || 0, 10);
    if (userCount > 0) {
      console.log('[Seed] Database already contains data. Skipping seed.');
      return;
    }

    console.log('[Seed] Seeding database initial data...');

    // 1. Users
    const salesPassword = await bcrypt.hash('sales123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES 
      ($1, $2, $3, $4),
      ($5, $6, $7, $8)`,
      [
        'Sales Representative',
        'sales@erp.com',
        salesPassword,
        'sales',
        'System Administrator',
        'admin@erp.com',
        adminPassword,
        'admin',
      ]
    );

    // 2. Customers
    await client.query(
      `INSERT INTO customers (company_name, contact_person, mobile, email, city) VALUES
      ('ABC Engineering Pvt. Ltd.', 'Rahul Sharma', '9876543210', 'rahul@abceng.com', 'Mumbai'),
      ('XYZ Industrial Solutions', 'Anita Desai', '9812345678', 'anita@xyzind.com', 'Pune'),
      ('Global Tech Components', 'Vikram Malhotra', '9988776655', 'vikram@globaltech.com', 'Bangalore')`
    );

    // 3. Products
    const productsSeed = [
      ['IND-001', 'Industrial Pump', 'Pump', 'Piece', 5000.00],
      ['IND-002', 'Hydraulic Valve', 'Valve', 'Piece', 2500.00],
      ['IND-003', 'Steel Bearing', 'Bearing', 'Piece', 1200.00],
      ['IND-004', 'Pressure Gauge', 'Instrument', 'Piece', 800.00],
      ['IND-005', 'Conveyor Belt', 'Conveyor', 'Meter', 1500.00],
      ['IND-006', 'Electric Motor', 'Motor', 'Piece', 8000.00],
    ];

    for (const prod of productsSeed) {
      const prodRes = await client.query(
        `INSERT INTO products (product_code, product_name, category, unit, base_price)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        prod
      );
      const prodId = prodRes.rows[0].id;

      // Initial inventory: physical=100, reserved=0
      await client.query(
        `INSERT INTO inventory (product_id, physical_quantity, reserved_quantity)
         VALUES ($1, $2, $3)`,
        [prodId, 100, 0]
      );
    }

    console.log('[Seed] Database seeded successfully.');
  } catch (err) {
    console.error('[Seed] Error seeding database:', err);
  } finally {
    client.release();
  }
}

module.exports = { seedData };
