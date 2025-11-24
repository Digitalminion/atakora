/**
 * Order Processor Function
 *
 * Processes orders from the Service Bus queue with session support
 * for guaranteed FIFO processing per customer.
 */

import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const orderProcessor = defineFunctions({
  OrderProcessor: configureFunction('order-processor')
    .timeout(300000)
    .withHandler(async (context, message) => {
      const order = message;
      const sessionId = context.bindingData?.sessionId; // Customer ID

      context.log(`Processing order ${order.orderId} for customer ${sessionId}`);

      try {
        // Validate order
        if (!order.items || order.items.length === 0) {
          throw new Error('Order must contain at least one item');
        }

        // Check inventory
        for (const item of order.items) {
          context.log(`Checking inventory for ${item.productId}: ${item.quantity} units`);
          // Inventory check logic here
        }

        // Process payment
        context.log(`Processing payment: $${order.totalAmount}`);
        // Payment processing logic here

        // Update order status
        order.status = 'processed';
        order.processedAt = new Date().toISOString();

        // Send confirmation
        context.log(`Sending confirmation to ${order.customerEmail}`);

        return {
          success: true,
          orderId: order.orderId,
          status: 'processed',
        };
      } catch (error) {
        context.log.error(`Failed to process order ${order.orderId}:`, error);
        throw error; // Message will be retried or dead-lettered
      }
    }),
});
