const db = require('../config/database');

/**
 * Confirms order and reserves stock atomically using a database transaction and row-level locks.
 */
async function reserveStockForOrder(salesOrderId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch Sales Order and check status
    const orderRes = await client.query(
      'SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE',
      [salesOrderId]
    );

    if (orderRes.rows.length === 0) {
      throw { status: 404, message: 'Sales order not found' };
    }

    const order = orderRes.rows[0];
    if (order.status !== 'PENDING') {
      throw { status: 400, message: `Sales order cannot be confirmed because it is in '${order.status}' status.` };
    }

    // 2. Fetch sales order items
    const itemsRes = await client.query(
      'SELECT * FROM sales_order_items WHERE sales_order_id = $1',
      [salesOrderId]
    );
    const items = itemsRes.rows;

    // 3. For each item, lock inventory row and check stock availability
    for (const item of items) {
      const invRes = await client.query(
        'SELECT id, physical_quantity, reserved_quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
        [item.product_id]
      );

      if (invRes.rows.length === 0) {
        throw { status: 400, message: `Inventory record not found for product ID ${item.product_id}` };
      }

      const inv = invRes.rows[0];
      const availableStock = inv.physical_quantity - inv.reserved_quantity;

      if (item.quantity > availableStock) {
        throw {
          status: 400,
          message: `Insufficient available stock for product ID ${item.product_id}. Requested: ${item.quantity}, Available: ${availableStock} (Physical: ${inv.physical_quantity}, Reserved: ${inv.reserved_quantity}).`,
        };
      }
    }

    // 4. Reserve stock for each item
    for (const item of items) {
      await client.query(
        'UPDATE inventory SET reserved_quantity = reserved_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
        [item.quantity, item.product_id]
      );
    }

    // 5. Update order status to CONFIRMED
    await client.query(
      "UPDATE sales_orders SET status = 'CONFIRMED' WHERE id = $1",
      [salesOrderId]
    );

    await client.query('COMMIT');
    return { success: true, orderId: salesOrderId, status: 'CONFIRMED' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Dispatches a confirmed sales order.
 * Reduces both physical_quantity and reserved_quantity by the dispatched amount.
 */
async function dispatchOrder(salesOrderId, dispatchData) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch Sales Order
    const orderRes = await client.query(
      'SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE',
      [salesOrderId]
    );

    if (orderRes.rows.length === 0) {
      throw { status: 404, message: 'Sales order not found' };
    }

    const order = orderRes.rows[0];
    if (order.status === 'CANCELLED') {
      throw { status: 400, message: 'Cancelled orders cannot be dispatched.' };
    }
    if (order.status === 'DISPATCHED') {
      throw { status: 400, message: 'Order has already been dispatched. Duplicate dispatch prevented.' };
    }
    if (order.status !== 'CONFIRMED') {
      throw { status: 400, message: `Order must be CONFIRMED before dispatch. Current status: ${order.status}` };
    }

    // 2. Fetch order items
    const itemsRes = await client.query(
      'SELECT * FROM sales_order_items WHERE sales_order_id = $1',
      [salesOrderId]
    );
    const items = itemsRes.rows;

    // 3. Generate dispatch number (e.g. DSP-1001)
    const dispatchNum = `DSP-${Date.now().toString().slice(-6)}`;
    const dispatchDate = dispatchData.dispatch_date || new Date().toISOString().split('T')[0];

    const dispatchInsertRes = await client.query(
      `INSERT INTO dispatches (dispatch_number, sales_order_id, dispatch_date, vehicle_number, driver_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        dispatchNum,
        salesOrderId,
        dispatchDate,
        dispatchData.vehicle_number || 'N/A',
        dispatchData.driver_name || 'N/A',
      ]
    );
    const dispatchId = dispatchInsertRes.rows[0].id;

    // 4. For each item, update inventory and insert dispatch item
    for (const item of items) {
      // Lock inventory
      const invRes = await client.query(
        'SELECT physical_quantity, reserved_quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
        [item.product_id]
      );
      if (invRes.rows.length === 0) {
        throw { status: 400, message: `Inventory not found for product ID ${item.product_id}` };
      }

      const inv = invRes.rows[0];
      if (item.quantity > inv.reserved_quantity) {
        throw {
          status: 400,
          message: `Dispatch quantity (${item.quantity}) cannot exceed reserved quantity (${inv.reserved_quantity}) for product ID ${item.product_id}.`,
        };
      }

      const newPhysical = inv.physical_quantity - item.quantity;
      const newReserved = inv.reserved_quantity - item.quantity;

      // Deduct from both physical and reserved quantity
      await client.query(
        `UPDATE inventory 
         SET physical_quantity = $1,
             reserved_quantity = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $3`,
        [newPhysical, newReserved, item.product_id]
      );

      // Record dispatch item
      await client.query(
        `INSERT INTO dispatch_items (dispatch_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [dispatchId, item.product_id, item.quantity]
      );
    }

    // 5. Update order status to DISPATCHED
    await client.query(
      "UPDATE sales_orders SET status = 'DISPATCHED' WHERE id = $1",
      [salesOrderId]
    );

    await client.query('COMMIT');
    return {
      success: true,
      dispatchId,
      dispatchNumber: dispatchNum,
      salesOrderId,
      status: 'DISPATCHED',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  reserveStockForOrder,
  dispatchOrder,
};
