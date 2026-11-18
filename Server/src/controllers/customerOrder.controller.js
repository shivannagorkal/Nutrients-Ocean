import * as customerOrderService from '../services/customerOrder.service.js';
import { query } from '../db/index.js';
import { AppError } from '../utils/appError.js';

export async function createOrder(req, res, next) {
  try {
    const customerId = req.customer?.id;
    const customerPhone = req.customer?.phone;

    // Fetch customer full name
    let customerName = 'Customer';
    if (customerId) {
      const { rows } = await query('SELECT full_name FROM customers WHERE id = $1;', [customerId]);
      if (rows.length > 0 && rows[0].full_name) {
        customerName = rows[0].full_name;
      }
    }

    const order = await customerOrderService.createCustomerOrder(
      customerId,
      customerPhone,
      customerName,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerOrders(req, res, next) {
  try {
    const customerId = req.customer?.id;
    const customerPhone = req.customer?.phone;

    const orders = await customerOrderService.getCustomerOrders(customerId, customerPhone);

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerOrderById(req, res, next) {
  try {
    const customerId = req.customer?.id;
    const customerPhone = req.customer?.phone;
    const { id } = req.params;

    const order = await customerOrderService.getCustomerOrderById(id, customerId, customerPhone);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminOrders(req, res, next) {
  try {
    const { date, status, slot, limit, offset } = req.query;

    const orders = await customerOrderService.getAdminOrders({
      date,
      status,
      slot,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await customerOrderService.updateOrderStatus(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  createOrder,
  getCustomerOrders,
  getCustomerOrderById,
  getAdminOrders,
  updateOrderStatus,
};
