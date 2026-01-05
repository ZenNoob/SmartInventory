import { query, queryOne } from '../db';
import { withTransaction, transactionQuery, transactionQueryOne } from '../db/transaction';
import type { OrderStatus, PaymentStatus, OnlineOrder } from '../repositories/online-order-repository';
import { orderProcessingService } from './order-processing-service';

/**
 * Valid status transitions map
 * Defines which status transitions are allowed from each status
 */
const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Status transition error
 */
export class InvalidStatusTransitionError extends Error {
  currentStatus: OrderStatus;
  targetStatus: OrderStatus;
  
  constructor(currentStatus: OrderStatus, targetStatus: OrderStatus) {
    super(`Invalid status transition from '${currentStatus}' to '${targetStatus}'`);
    this.name = 'InvalidStatusTransitionError';
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

/**
 * Order not found error
 */
export class OrderNotFoundError extends Error {
  orderId: string;
  
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`);
    this.name = 'OrderNotFoundError';
    this.orderId = orderId;
  }
}

/**
 * Status transition result
 */
export interface StatusTransitionResult {
  success: boolean;
  order: OnlineOrder;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  timestamp: string;
}

/**
 * Order record from database
 */
interface OnlineOrderRecord {
  id: string;
  order_number: string;
  online_store_id: string;
  customer_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_method: string | null;
  shipping_fee: number;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery: Date | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_note: string | null;
  internal_note: string | null;
  created_at: Date;
  updated_at: Date;
  confirmed_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
}

/**
 * Order Status Service
 * Handles order status transitions with validation and side effects
 */
export class OrderStatusService {
  /**
   * Check if a status transition is valid
   */
  isValidTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
    return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  }

  /**
   * Get allowed next statuses for a given status
   */
  getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
    return VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
  }

  /**
   * Map database record to OnlineOrder entity
   */
  private mapOrderToEntity(record: OnlineOrderRecord): OnlineOrder {
    let shippingAddress;
    try {
      shippingAddress = JSON.parse(record.shipping_address);
    } catch {
      shippingAddress = {
        fullName: '',
        phone: '',
        province: '',
        district: '',
        ward: '',
        addressLine: record.shipping_address,
      };
    }

    return {
      id: record.id,
      orderNumber: record.order_number,
      onlineStoreId: record.online_store_id,
      customerId: record.customer_id || undefined,
      customerEmail: record.customer_email,
      customerName: record.customer_name,
      customerPhone: record.customer_phone,
      shippingAddress,
      shippingMethod: record.shipping_method || undefined,
      shippingFee: record.shipping_fee,
      trackingNumber: record.tracking_number || undefined,
      carrier: record.carrier || undefined,
      estimatedDelivery: record.estimated_delivery instanceof Date
        ? record.estimated_delivery.toISOString()
        : record.estimated_delivery ? String(record.estimated_delivery) : undefined,
      subtotal: record.subtotal,
      discountAmount: record.discount_amount,
      total: record.total,
      status: record.status as OrderStatus,
      paymentStatus: record.payment_status as PaymentStatus,
      paymentMethod: record.payment_method as OnlineOrder['paymentMethod'],
      customerNote: record.customer_note || undefined,
      internalNote: record.internal_note || undefined,
      createdAt: record.created_at instanceof Date
        ? record.created_at.toISOString()
        : String(record.created_at),
      updatedAt: record.updated_at instanceof Date
        ? record.updated_at.toISOString()
        : String(record.updated_at),
      confirmedAt: record.confirmed_at instanceof Date
        ? record.confirmed_at.toISOString()
        : record.confirmed_at ? String(record.confirmed_at) : undefined,
      shippedAt: record.shipped_at instanceof Date
        ? record.shipped_at.toISOString()
        : record.shipped_at ? String(record.shipped_at) : undefined,
      deliveredAt: record.delivered_at instanceof Date
        ? record.delivered_at.toISOString()
        : record.delivered_at ? String(record.delivered_at) : undefined,
      cancelledAt: record.cancelled_at instanceof Date
        ? record.cancelled_at.toISOString()
        : record.cancelled_at ? String(record.cancelled_at) : undefined,
    };
  }


  /**
   * Update order status with validation and side effects
   * Handles inventory restoration for cancelled orders
   */
  async updateStatus(
    orderId: string,
    targetStatus: OrderStatus,
    onlineStoreId: string,
    options?: {
      internalNote?: string;
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: Date;
    }
  ): Promise<StatusTransitionResult> {
    return withTransaction(async (transaction) => {
      // Get current order
      const orderRecord = await transactionQueryOne<OnlineOrderRecord>(
        transaction,
        `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        { orderId, onlineStoreId }
      );

      if (!orderRecord) {
        throw new OrderNotFoundError(orderId);
      }

      const currentStatus = orderRecord.status as OrderStatus;

      // Validate transition
      if (!this.isValidTransition(currentStatus, targetStatus)) {
        throw new InvalidStatusTransitionError(currentStatus, targetStatus);
      }

      // Build update query with appropriate timestamp
      let timestampField = '';
      const now = new Date();
      
      switch (targetStatus) {
        case 'confirmed':
          timestampField = ', confirmed_at = @timestamp';
          break;
        case 'shipped':
          timestampField = ', shipped_at = @timestamp';
          break;
        case 'delivered':
          timestampField = ', delivered_at = @timestamp';
          break;
        case 'cancelled':
          timestampField = ', cancelled_at = @timestamp';
          break;
      }

      // Build additional fields for shipping info
      let additionalFields = '';
      const params: Record<string, unknown> = {
        orderId,
        onlineStoreId,
        status: targetStatus,
        timestamp: now,
      };

      if (options?.trackingNumber !== undefined) {
        additionalFields += ', tracking_number = @trackingNumber';
        params.trackingNumber = options.trackingNumber;
      }

      if (options?.carrier !== undefined) {
        additionalFields += ', carrier = @carrier';
        params.carrier = options.carrier;
      }

      if (options?.estimatedDelivery !== undefined) {
        additionalFields += ', estimated_delivery = @estimatedDelivery';
        params.estimatedDelivery = options.estimatedDelivery;
      }

      if (options?.internalNote !== undefined) {
        additionalFields += ', internal_note = @internalNote';
        params.internalNote = options.internalNote;
      }

      // Update the order
      await transactionQuery(
        transaction,
        `UPDATE OnlineOrders 
         SET status = @status, updated_at = @timestamp${timestampField}${additionalFields}
         WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        params
      );

      // Handle side effects for cancellation - restore inventory
      if (targetStatus === 'cancelled') {
        await this.restoreInventoryForCancellation(transaction, orderId, onlineStoreId);
      }

      // Fetch updated order
      const updatedRecord = await transactionQueryOne<OnlineOrderRecord>(
        transaction,
        `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        { orderId, onlineStoreId }
      );

      if (!updatedRecord) {
        throw new Error('Failed to fetch updated order');
      }

      return {
        success: true,
        order: this.mapOrderToEntity(updatedRecord),
        previousStatus: currentStatus,
        newStatus: targetStatus,
        timestamp: now.toISOString(),
      };
    });
  }

  /**
   * Restore inventory when order is cancelled
   */
  private async restoreInventoryForCancellation(
    transaction: import('../db/transaction').sql.Transaction,
    orderId: string,
    onlineStoreId: string
  ): Promise<void> {
    // Get the parent store ID
    const storeResult = await transactionQueryOne<{ store_id: string }>(
      transaction,
      `SELECT store_id FROM OnlineStores WHERE id = @onlineStoreId`,
      { onlineStoreId }
    );

    if (!storeResult) {
      throw new Error('Online store not found');
    }

    const storeId = storeResult.store_id;

    // Get order items
    const orderItems = await transactionQuery<{
      online_product_id: string;
      quantity: number;
    }>(
      transaction,
      `SELECT online_product_id, quantity FROM OnlineOrderItems WHERE order_id = @orderId`,
      { orderId }
    );

    // Restore inventory for each item
    for (const item of orderItems) {
      // Get product ID from online product
      const productResult = await transactionQueryOne<{ product_id: string }>(
        transaction,
        `SELECT product_id FROM OnlineProducts 
         WHERE id = @onlineProductId AND online_store_id = @onlineStoreId`,
        { onlineProductId: item.online_product_id, onlineStoreId }
      );

      if (!productResult) continue;

      // Find the most recent lot for this product to restore inventory
      const lot = await transactionQueryOne<{ id: string }>(
        transaction,
        `SELECT TOP 1 id FROM PurchaseLots 
         WHERE product_id = @productId AND store_id = @storeId
         ORDER BY import_date DESC`,
        { productId: productResult.product_id, storeId }
      );

      if (lot) {
        // Add the quantity back to this lot
        await transactionQuery(
          transaction,
          `UPDATE PurchaseLots 
           SET remaining_quantity = remaining_quantity + @quantity 
           WHERE id = @lotId`,
          { lotId: lot.id, quantity: item.quantity }
        );
      }
    }
  }

  /**
   * Confirm an order (pending -> confirmed)
   */
  async confirmOrder(
    orderId: string,
    onlineStoreId: string,
    internalNote?: string
  ): Promise<StatusTransitionResult> {
    return this.updateStatus(orderId, 'confirmed', onlineStoreId, { internalNote });
  }

  /**
   * Start processing an order (confirmed -> processing)
   */
  async startProcessing(
    orderId: string,
    onlineStoreId: string,
    internalNote?: string
  ): Promise<StatusTransitionResult> {
    return this.updateStatus(orderId, 'processing', onlineStoreId, { internalNote });
  }

  /**
   * Ship an order (processing -> shipped)
   */
  async shipOrder(
    orderId: string,
    onlineStoreId: string,
    shippingInfo: {
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: Date;
      internalNote?: string;
    }
  ): Promise<StatusTransitionResult> {
    return this.updateStatus(orderId, 'shipped', onlineStoreId, shippingInfo);
  }

  /**
   * Mark order as delivered (shipped -> delivered)
   */
  async markDelivered(
    orderId: string,
    onlineStoreId: string,
    internalNote?: string
  ): Promise<StatusTransitionResult> {
    return this.updateStatus(orderId, 'delivered', onlineStoreId, { internalNote });
  }

  /**
   * Cancel an order (pending/confirmed/processing -> cancelled)
   * This will restore inventory
   */
  async cancelOrder(
    orderId: string,
    onlineStoreId: string,
    reason?: string
  ): Promise<StatusTransitionResult> {
    return this.updateStatus(orderId, 'cancelled', onlineStoreId, { 
      internalNote: reason ? `Cancelled: ${reason}` : 'Order cancelled' 
    });
  }

  /**
   * Get order status history (based on timestamps)
   */
  async getStatusHistory(
    orderId: string,
    onlineStoreId: string
  ): Promise<Array<{ status: OrderStatus; timestamp: string }>> {
    const order = await queryOne<OnlineOrderRecord>(
      `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
      { orderId, onlineStoreId }
    );

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    const history: Array<{ status: OrderStatus; timestamp: string }> = [];

    // Add created (pending) status
    history.push({
      status: 'pending',
      timestamp: order.created_at instanceof Date 
        ? order.created_at.toISOString() 
        : String(order.created_at),
    });

    // Add confirmed if exists
    if (order.confirmed_at) {
      history.push({
        status: 'confirmed',
        timestamp: order.confirmed_at instanceof Date 
          ? order.confirmed_at.toISOString() 
          : String(order.confirmed_at),
      });
    }

    // Add shipped if exists
    if (order.shipped_at) {
      history.push({
        status: 'shipped',
        timestamp: order.shipped_at instanceof Date 
          ? order.shipped_at.toISOString() 
          : String(order.shipped_at),
      });
    }

    // Add delivered if exists
    if (order.delivered_at) {
      history.push({
        status: 'delivered',
        timestamp: order.delivered_at instanceof Date 
          ? order.delivered_at.toISOString() 
          : String(order.delivered_at),
      });
    }

    // Add cancelled if exists
    if (order.cancelled_at) {
      history.push({
        status: 'cancelled',
        timestamp: order.cancelled_at instanceof Date 
          ? order.cancelled_at.toISOString() 
          : String(order.cancelled_at),
      });
    }

    return history.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
}

// Export singleton instance
export const orderStatusService = new OrderStatusService();
