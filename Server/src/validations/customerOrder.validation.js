import { z } from 'zod';

export const createOrderSchema = {
  body: z
    .object({
      scheduledDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Scheduled date must be YYYY-MM-DD')
        .optional(),
      collectionSlot: z
        .enum(['MORNING', 'EVENING'])
        .optional()
        .default('MORNING'),
      fulfillmentType: z.enum(['PICKUP', 'DELIVERY'], {
        required_error: 'Fulfillment type must be PICKUP or DELIVERY',
      }),
      deliveryBracket: z
        .enum(['NONE', 'M0_500', 'M501_1000', 'M1001_2000', 'M0_1000'])
        .optional()
        .default('NONE'),
      deliveryAddress: z.string().trim().optional().nullable(),
      deliveryLat: z.number().optional().nullable(),
      deliveryLng: z.number().optional().nullable(),
      paymentMethod: z.enum(['PAY_AT_STALL', 'UPI_DIRECT', 'RAZORPAY'], {
        required_error: 'Payment method is required',
      }),
      items: z
        .array(
          z.object({
            productId: z.string().min(1, 'Product ID is required'),
            name: z.string().min(1, 'Product name is required'),
            flavor: z.string().optional().nullable(),
            quantity: z.number().int().positive('Quantity must be at least 1'),
            pricePaise: z.number().int().nonnegative().optional(),
          })
        )
        .min(1, 'Order must contain at least one item'),
    })
    .refine(
      (data) => {
        if (data.fulfillmentType === 'DELIVERY') {
          return Boolean(data.deliveryAddress && data.deliveryAddress.trim().length > 3);
        }
        return true;
      },
      {
        message: 'Delivery address is required for doorstep delivery',
        path: ['deliveryAddress'],
      }
    ),
};

export const updateOrderStatusSchema = {
  body: z
    .object({
      orderStatus: z
        .enum(['RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'])
        .optional(),
      paymentStatus: z
        .enum(['PENDING', 'PAID', 'FAILED'])
        .optional(),
    })
    .refine((data) => data.orderStatus || data.paymentStatus, {
      message: 'At least one of orderStatus or paymentStatus must be provided',
    }),
};

export default {
  createOrderSchema,
  updateOrderStatusSchema,
};
