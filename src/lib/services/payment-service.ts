import { query, queryOne } from '../db';
import { withTransaction, transactionQuery, transactionQueryOne } from '../db/transaction';
import type { PaymentStatus, PaymentMethod, OnlineOrder } from '../repositories/online-order-repository';

/**
 * Payment confirmation input for bank transfer
 */
export interface BankTransferConfirmationInput {
  orderId: string;
  onlineStoreId: string;
  transactionReference?: string;
  confirmedBy?: string;
  note?: string;
}

/**
 * COD payment completion input
 */
export interface CODPaymentInput {
  orderId: string;
  onlineStoreId: string;
  collectedAmount: number;
  collectedBy?: string;
  note?: string;
}

/**
 * Payment result
 */
export interface PaymentResult {
  success: boolean;
  order: OnlineOrder;
  previousPaymentStatus: PaymentStatus;
  newPaymentStatus: PaymentStatus;
  timestamp: string;
}

/**
 * Bank account info for display
 */
export interface BankAccountInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
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
 * Payment status error
 */
export class PaymentStatusError extends Error {
  orderId: string;
  currentStatus: PaymentStatus;
  
  constructor(message: string, orderId: string, currentStatus: PaymentStatus) {
    super(message);
    this.name = 'PaymentStatusError';
    this.orderId = orderId;
    this.currentStatus = currentStatus;
  }
}

/**
 * Payment Service
 * Handles payment status updates for different payment methods
 */
export class PaymentService {
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
      status: record.status as OnlineOrder['status'],
      paymentStatus: record.payment_status as PaymentStatus,
      paymentMethod: record.payment_method as PaymentMethod,
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
   * Confirm bank transfer payment
   * Updates payment status to 'paid' after store owner confirms receipt
   */
  async confirmBankTransfer(input: BankTransferConfirmationInput): Promise<PaymentResult> {
    return withTransaction(async (transaction) => {
      // Get current order
      const orderRecord = await transactionQueryOne<OnlineOrderRecord>(
        transaction,
        `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        { orderId: input.orderId, onlineStoreId: input.onlineStoreId }
      );

      if (!orderRecord) {
        throw new Error('Order not found');
      }

      const currentPaymentStatus = orderRecord.payment_status as PaymentStatus;

      // Validate payment method
      if (orderRecord.payment_method !== 'bank_transfer') {
        throw new PaymentStatusError(
          'This order does not use bank transfer payment method',
          input.orderId,
          currentPaymentStatus
        );
      }

      // Validate current payment status
      if (currentPaymentStatus !== 'pending') {
        throw new PaymentStatusError(
          `Cannot confirm payment for order with status '${currentPaymentStatus}'`,
          input.orderId,
          currentPaymentStatus
        );
      }

      // Validate order status (should not be cancelled)
      if (orderRecord.status === 'cancelled') {
        throw new PaymentStatusError(
          'Cannot confirm payment for cancelled order',
          input.orderId,
          currentPaymentStatus
        );
      }

      const now = new Date();
      
      // Build internal note
      let internalNote = orderRecord.internal_note || '';
      const confirmationNote = `[${now.toISOString()}] Bank transfer confirmed`;
      if (input.transactionReference) {
        internalNote += `\n${confirmationNote} - Ref: ${input.transactionReference}`;
      } else {
        internalNote += `\n${confirmationNote}`;
      }
      if (input.confirmedBy) {
        internalNote += ` by ${input.confirmedBy}`;
      }
      if (input.note) {
        internalNote += ` - ${input.note}`;
      }

      // Update payment status
      await transactionQuery(
        transaction,
        `UPDATE OnlineOrders 
         SET payment_status = 'paid', 
             internal_note = @internalNote,
             updated_at = @timestamp
         WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        {
          orderId: input.orderId,
          onlineStoreId: input.onlineStoreId,
          internalNote: internalNote.trim(),
          timestamp: now,
        }
      );

      // Fetch updated order
      const updatedRecord = await transactionQueryOne<OnlineOrderRecord>(
        transaction,
        `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        { orderId: input.orderId, onlineStoreId: input.onlineStoreId }
      );

      if (!updatedRecord) {
        throw new Error('Failed to fetch updated order');
      }

      return {
        success: true,
        order: this.mapOrderToEntity(updatedRecord),
        previousPaymentStatus: currentPaymentStatus,
        newPaymentStatus: 'paid',
        timestamp: now.toISOString(),
      };
    });
  }

  /**
   * Complete COD payment
   * Updates payment status to 'paid' when delivery person collects payment
   */
  async completeCODPayment(input: CODPaymentInput): Promise<PaymentResult> {
    return withTransaction(async (transaction) => {
      // Get current order
      const orderRecord = await transactionQueryOne<OnlineOrderRecord>(
        transaction,
        `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        { orderId: input.orderId, onlineStoreId: input.onlineStoreId }
      );

      if (!orderRecord) {
        throw new Error('Order not found');
      }

      const currentPaymentStatus = orderRecord.payment_status as PaymentStatus;

      // Validate payment method
      if (orderRecord.payment_method !== 'cod') {
        throw new PaymentStatusError(
          'This order does not use COD payment method',
          input.orderId,
          currentPaymentStatus
        );
      }

      // Validate current payment status
      if (currentPaymentStatus !== 'pending') {
        throw new PaymentStatusError(
          `Cannot complete COD payment for order with status '${currentPaymentStatus}'`,
          input.orderId,
          currentPaymentStatus
        );
      }

      // Validate order status (should be shipped or delivered for COD)
      if (!['shipped', 'delivered'].includes(orderRecord.status)) {
        throw new PaymentStatusError(
          'COD payment can only be completed for shipped or delivered orders',
          input.orderId,
          currentPaymentStatus
        );
      }

      // Validate collected amount matches order total
      if (input.collectedAmount !== orderRecord.total) {
        throw new PaymentStatusError(
          `Collected amount (${input.collectedAmount}) does not match order total (${orderRecord.total})`,
          input.orderId,
          currentPaymentStatus
        );
      }

      const now = new Date();
      
      // Build internal note
      let internalNote = orderRecord.internal_note || '';
      const codNote = `[${now.toISOString()}] COD payment collected: ${input.collectedAmount}`;
      internalNote += `\n${codNote}`;
      if (input.collectedBy) {
        internalNote += ` by ${input.collectedBy}`;
      }
      if (input.note) {
        internalNote += ` - ${input.note}`;
      }

      // Update payment status
      await transactionQuery(
        transaction,
        `UPDATE OnlineOrders 
         SET payment_status = 'paid', 
             internal_note = @internalNote,
             updated_at = @timestamp
         WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        {
          orderId: input.orderId,
          onlineStoreId: input.onlineStoreId,
          internalNote: internalNote.trim(),
          timestamp: now,
        }
      );

      // Fetch updated order
      const updatedRecord = await transactionQueryOne<OnlineOrderRecord>(
        transaction,
        `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        { orderId: input.orderId, onlineStoreId: input.onlineStoreId }
      );

      if (!updatedRecord) {
        throw new Error('Failed to fetch updated order');
      }

      return {
        success: true,
        order: this.mapOrderToEntity(updatedRecord),
        previousPaymentStatus: currentPaymentStatus,
        newPaymentStatus: 'paid',
        timestamp: now.toISOString(),
      };
    });
  }

  /**
   * Mark payment as failed
   */
  async markPaymentFailed(
    orderId: string,
    onlineStoreId: string,
    reason?: string
  ): Promise<PaymentResult> {
    return withTransaction(async (transaction) => {
      // Get current order
      const orderRecord = await transactionQueryOne<OnlineOrderRecord>(
        transaction,
        `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        { orderId, onlineStoreId }
      );

      if (!orderRecord) {
        throw new Error('Order not found');
      }

      const currentPaymentStatus = orderRecord.payment_status as PaymentStatus;

      // Can only mark as failed from pending status
      if (currentPaymentStatus !== 'pending') {
        throw new PaymentStatusError(
          `Cannot mark payment as failed for order with status '${currentPaymentStatus}'`,
          orderId,
          currentPaymentStatus
        );
      }

      const now = new Date();
      
      // Build internal note
      let internalNote = orderRecord.internal_note || '';
      const failedNote = `[${now.toISOString()}] Payment failed`;
      internalNote += `\n${failedNote}`;
      if (reason) {
        internalNote += `: ${reason}`;
      }

      // Update payment status
      await transactionQuery(
        transaction,
        `UPDATE OnlineOrders 
         SET payment_status = 'failed', 
             internal_note = @internalNote,
             updated_at = @timestamp
         WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        {
          orderId,
          onlineStoreId,
          internalNote: internalNote.trim(),
          timestamp: now,
        }
      );

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
        previousPaymentStatus: currentPaymentStatus,
        newPaymentStatus: 'failed',
        timestamp: now.toISOString(),
      };
    });
  }

  /**
   * Process refund
   */
  async processRefund(
    orderId: string,
    onlineStoreId: string,
    refundAmount: number,
    reason?: string
  ): Promise<PaymentResult> {
    return withTransaction(async (transaction) => {
      // Get current order
      const orderRecord = await transactionQueryOne<OnlineOrderRecord>(
        transaction,
        `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        { orderId, onlineStoreId }
      );

      if (!orderRecord) {
        throw new Error('Order not found');
      }

      const currentPaymentStatus = orderRecord.payment_status as PaymentStatus;

      // Can only refund from paid status
      if (currentPaymentStatus !== 'paid') {
        throw new PaymentStatusError(
          `Cannot refund order with payment status '${currentPaymentStatus}'`,
          orderId,
          currentPaymentStatus
        );
      }

      // Validate refund amount
      if (refundAmount > orderRecord.total) {
        throw new PaymentStatusError(
          `Refund amount (${refundAmount}) exceeds order total (${orderRecord.total})`,
          orderId,
          currentPaymentStatus
        );
      }

      const now = new Date();
      
      // Build internal note
      let internalNote = orderRecord.internal_note || '';
      const refundNote = `[${now.toISOString()}] Refund processed: ${refundAmount}`;
      internalNote += `\n${refundNote}`;
      if (reason) {
        internalNote += ` - Reason: ${reason}`;
      }

      // Update payment status
      await transactionQuery(
        transaction,
        `UPDATE OnlineOrders 
         SET payment_status = 'refunded', 
             internal_note = @internalNote,
             updated_at = @timestamp
         WHERE id = @orderId AND online_store_id = @onlineStoreId`,
        {
          orderId,
          onlineStoreId,
          internalNote: internalNote.trim(),
          timestamp: now,
        }
      );

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
        previousPaymentStatus: currentPaymentStatus,
        newPaymentStatus: 'refunded',
        timestamp: now.toISOString(),
      };
    });
  }

  /**
   * Get bank transfer payment instructions for an order
   */
  async getBankTransferInstructions(
    orderId: string,
    onlineStoreId: string
  ): Promise<{
    orderNumber: string;
    total: number;
    bankInfo: BankAccountInfo;
    transferContent: string;
    expiresAt: string;
  }> {
    const orderRecord = await queryOne<OnlineOrderRecord>(
      `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
      { orderId, onlineStoreId }
    );

    if (!orderRecord) {
      throw new Error('Order not found');
    }

    if (orderRecord.payment_method !== 'bank_transfer') {
      throw new Error('This order does not use bank transfer payment method');
    }

    // Get store's bank info (this would typically come from store settings)
    // For now, return placeholder info - in production, this should be fetched from store config
    const bankInfo: BankAccountInfo = {
      bankName: 'Vietcombank',
      accountNumber: '1234567890',
      accountHolder: 'CONG TY TNHH ABC',
      branch: 'Chi nhánh Hà Nội',
    };

    // Transfer content should include order number for easy identification
    const transferContent = `Thanh toan don hang ${orderRecord.order_number}`;

    // Payment expires 24 hours after order creation
    const createdAt = orderRecord.created_at instanceof Date 
      ? orderRecord.created_at 
      : new Date(orderRecord.created_at);
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    return {
      orderNumber: orderRecord.order_number,
      total: orderRecord.total,
      bankInfo,
      transferContent,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Check if payment is expired (for bank transfer orders)
   */
  async isPaymentExpired(orderId: string, onlineStoreId: string): Promise<boolean> {
    const orderRecord = await queryOne<OnlineOrderRecord>(
      `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`,
      { orderId, onlineStoreId }
    );

    if (!orderRecord) {
      throw new Error('Order not found');
    }

    // Only check expiration for pending bank transfer payments
    if (orderRecord.payment_method !== 'bank_transfer' || orderRecord.payment_status !== 'pending') {
      return false;
    }

    const createdAt = orderRecord.created_at instanceof Date 
      ? orderRecord.created_at 
      : new Date(orderRecord.created_at);
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    return new Date() > expiresAt;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
