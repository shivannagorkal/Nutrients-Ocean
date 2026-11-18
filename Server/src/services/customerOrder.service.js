import { pool, query } from '../db/index.js';
import { AppError } from '../utils/appError.js';

// Nutrients Ocean Stall Coordinates (Opposite Gym, Mangalore)
const STALL_LAT = 12.8708;
const STALL_LNG = 74.8427;

/**
 * Operating Hours Validation (IST UTC+5:30):
 * - Morning Session: 6:30 AM to 8:20 AM (390m - 500m)
 * - Evening Session: 5:00 PM to 9:30 PM (1020m - 1290m)
 */
export function isKitchenOpenNow() {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
  });
  const parts = istFormatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const currentMinutes = hour * 60 + minute;

  const isMorning = currentMinutes >= 390 && currentMinutes <= 500;
  const isEvening = currentMinutes >= 1020 && currentMinutes <= 1290;

  return {
    isOpen: isMorning || isEvening,
    session: isMorning ? 'MORNING' : isEvening ? 'EVENING' : null,
    currentMinutes,
  };
}

/**
 * Compute Haversine distance in meters between two lat/lng pairs
 */
function computeDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate delivery fee based on approved distance rules and free delivery thresholds:
 * - < 1 km: Base fee ₹5 (0-500m) or ₹10 (500m-1km); FREE if subtotal > ₹159
 * - 1 km to 2 km: Base fee ₹15; FREE if subtotal > ₹359
 * - > 2 km: Out of delivery range
 */
export function calculateDeliveryFeePaise(fulfillmentType, deliveryBracket, subtotalPaise, lat = null, lng = null) {
  if (fulfillmentType === 'PICKUP') {
    return 0;
  }

  let distanceMeters = null;
  if (lat && lng) {
    distanceMeters = computeDistanceMeters(STALL_LAT, STALL_LNG, Number(lat), Number(lng));
    if (distanceMeters > 2200) {
      throw new AppError(
        'Delivery is only available within 2 km of our stall. Please select Stall Pickup to place your order.',
        400,
        'OUT_OF_DELIVERY_RANGE'
      );
    }
  }

  const isUnder1Km = distanceMeters !== null ? distanceMeters <= 1000 : ['M0_500', 'M501_1000', 'M0_1000'].includes(deliveryBracket);
  const is1to2Km = distanceMeters !== null ? distanceMeters > 1000 && distanceMeters <= 2000 : deliveryBracket === 'M1001_2000';

  if (isUnder1Km) {
    // Free delivery if subtotal > ₹159 (15900 paise)
    if (subtotalPaise > 15900) {
      return 0;
    }
    const isUnder500m = distanceMeters !== null ? distanceMeters <= 500 : deliveryBracket === 'M0_500';
    return isUnder500m ? 500 : 1000; // ₹5 or ₹10
  }

  if (is1to2Km) {
    // Free delivery if subtotal > ₹359 (35900 paise)
    if (subtotalPaise > 35900) {
      return 0;
    }
    return 1500; // ₹15
  }

  // Fallback for doorstep delivery without coordinates
  return subtotalPaise > 15900 ? 0 : 1000;
}

/**
 * Generate human-friendly order number: e.g. NO-261118-842
 */
function generateOrderNumber() {
  const d = new Date();
  const datePart = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `NO-${datePart}-${rand}`;
}

export async function createCustomerOrder(customerId, customerPhone, customerName, orderData) {
  const {
    scheduledDate = new Date().toISOString().slice(0, 10),
    collectionSlot,
    fulfillmentType,
    deliveryBracket = 'NONE',
    deliveryAddress = null,
    deliveryLat = null,
    deliveryLng = null,
    paymentMethod,
    items,
  } = orderData;

  // Operating hours enforcement (IST 6:30-8:20 AM and 5:00-9:30 PM)
  const kitchen = isKitchenOpenNow();
  const allowOffHours =
    process.env.ALLOW_OFFHOURS_ORDERS === 'true' ||
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development';
  if (!kitchen.isOpen && !allowOffHours) {
    throw new AppError(
      'Our kitchen is currently closed for live ordering. Orders are only accepted from 6:30 AM – 8:20 AM and 5:00 PM – 9:30 PM.',
      400,
      'KITCHEN_CLOSED'
    );
  }

  const effectiveSlot = kitchen.session || collectionSlot || 'MORNING';

  // 1. Calculate items subtotal
  let subtotalPaise = 0;
  const processedItems = items.map((it) => {
    const unitPricePaise = it.pricePaise || 0;
    const qty = it.quantity || 1;
    const totalPricePaise = unitPricePaise * qty;
    subtotalPaise += totalPricePaise;
    return {
      productId: it.productId,
      name: it.name,
      flavor: it.flavor || null,
      quantity: qty,
      unitPricePaise,
      totalPricePaise,
    };
  });

  // 2. Compute delivery fee with approved threshold rules
  const deliveryFeePaise = calculateDeliveryFeePaise(
    fulfillmentType,
    deliveryBracket,
    subtotalPaise,
    deliveryLat,
    deliveryLng
  );

  const totalPaise = subtotalPaise + deliveryFeePaise;
  const orderNumber = generateOrderNumber();

  // 3. Insert transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertOrderQuery = `
      INSERT INTO orders (
        order_number,
        customer_id,
        customer_name,
        customer_phone,
        subtotal_paise,
        delivery_fee_paise,
        total_paise,
        fulfillment_type,
        delivery_bracket,
        delivery_address,
        delivery_lat,
        delivery_lng,
        collection_slot,
        scheduled_date,
        payment_method,
        payment_status,
        order_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *;
    `;

    const orderValues = [
      orderNumber,
      customerId || null,
      customerName,
      customerPhone,
      subtotalPaise,
      deliveryFeePaise,
      totalPaise,
      fulfillmentType,
      deliveryBracket || 'NONE',
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      effectiveSlot,
      scheduledDate,
      paymentMethod,
      paymentMethod === 'RAZORPAY' ? 'PENDING' : 'PENDING',
      'RECEIVED',
    ];

    const { rows: orderRows } = await client.query(insertOrderQuery, orderValues);
    const createdOrder = orderRows[0];

    // Insert order items
    for (const it of processedItems) {
      await client.query(
        `INSERT INTO order_items (
          order_id,
          product_id,
          product_name,
          flavor,
          quantity,
          unit_price_paise,
          total_price_paise
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          createdOrder.id,
          it.productId,
          it.name,
          it.flavor,
          it.quantity,
          it.unitPricePaise,
          it.totalPricePaise,
        ]
      );
    }

    await client.query('COMMIT');

    return {
      ...createdOrder,
      items: processedItems,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getCustomerOrders(customerId, customerPhone) {
  const { rows: orders } = await query(
    `SELECT * FROM orders
     WHERE customer_id = $1 OR customer_phone = $2
     ORDER BY created_at DESC;`,
    [customerId, customerPhone]
  );

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { rows: items } = await query(
    `SELECT * FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY created_at ASC;`,
    [orderIds]
  );

  return orders.map((o) => ({
    ...o,
    items: items.filter((it) => it.order_id === o.id),
  }));
}

export async function getCustomerOrderById(orderId, customerId, customerPhone) {
  const { rows: orders } = await query(
    `SELECT * FROM orders
     WHERE id = $1 AND (customer_id = $2 OR customer_phone = $3);`,
    [orderId, customerId, customerPhone]
  );

  if (orders.length === 0) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  const order = orders[0];
  const { rows: items } = await query(
    `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC;`,
    [order.id]
  );

  return {
    ...order,
    items,
  };
}

export async function getAdminOrders({ date, status, slot, limit = 50, offset = 0 }) {
  const conditions = [];
  const params = [];

  if (date) {
    params.push(date);
    conditions.push(`scheduled_date = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`order_status = $${params.length}`);
  }

  if (slot) {
    params.push(slot);
    conditions.push(`collection_slot = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  const limitClause = `LIMIT $${params.length}`;

  params.push(offset);
  const offsetClause = `OFFSET $${params.length}`;

  const { rows: orders } = await query(
    `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC ${limitClause} ${offsetClause};`,
    params
  );

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { rows: items } = await query(
    `SELECT * FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY created_at ASC;`,
    [orderIds]
  );

  return orders.map((o) => ({
    ...o,
    items: items.filter((it) => it.order_id === o.id),
  }));
}

export async function updateOrderStatus(orderId, { orderStatus, paymentStatus }) {
  const updates = [];
  const params = [orderId];

  if (orderStatus) {
    params.push(orderStatus);
    updates.push(`order_status = $${params.length}`);
  }

  if (paymentStatus) {
    params.push(paymentStatus);
    updates.push(`payment_status = $${params.length}`);
  }

  updates.push(`updated_at = NOW()`);

  const { rows } = await query(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`,
    params
  );

  if (rows.length === 0) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  const updatedOrder = rows[0];
  const { rows: items } = await query(
    `SELECT * FROM order_items WHERE order_id = $1;`,
    [orderId]
  );

  return {
    ...updatedOrder,
    items,
  };
}

export default {
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
  getAdminOrders,
  updateOrderStatus,
  calculateDeliveryFeePaise,
};
