// Note: nodemailer is optional - install with: npm install nodemailer @types/nodemailer
// import * as nodemailer from 'nodemailer';
// import type { Transporter } from 'nodemailer';
import type { OnlineOrderWithItems, OrderStatus } from '../repositories/online-order-repository';
import type { OnlineStore } from '../repositories/online-store-repository';

// Placeholder types when nodemailer is not installed
type Transporter = {
  sendMail: (options: unknown) => Promise<{ messageId: string }>;
};

let nodemailer: { createTransport: (config: unknown) => Transporter } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nodemailer = require('nodemailer');
} catch {
  console.warn('nodemailer not installed - email notifications will be disabled');
}

/**
 * Email configuration interface
 */
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Email template data for order confirmation
 */
interface OrderConfirmationData {
  order: OnlineOrderWithItems;
  store: OnlineStore;
}

/**
 * Email template data for status update
 */
interface StatusUpdateData {
  order: OnlineOrderWithItems;
  store: OnlineStore;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
}

/**
 * Email template data for new order alert
 */
interface NewOrderAlertData {
  order: OnlineOrderWithItems;
  store: OnlineStore;
}

/**
 * Status labels in Vietnamese
 */
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipped: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  cancelled: 'Đã hủy',
};

/**
 * Payment method labels in Vietnamese
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng',
  momo: 'Ví MoMo',
  vnpay: 'VNPay',
  zalopay: 'ZaloPay',
};

/**
 * Format currency in VND
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Format date in Vietnamese locale
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


/**
 * Email Notification Service
 * Handles sending email notifications for online store orders
 */
export class EmailNotificationService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter from environment variables
   */
  private initializeTransporter(): void {
    if (!nodemailer) {
      console.warn('nodemailer not installed. Email notifications will be disabled.');
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
      console.warn('Email configuration not complete. Email notifications will be disabled.');
      return;
    }

    this.config = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      from: from || user,
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });
  }

  /**
   * Check if email service is configured and available
   */
  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  /**
   * Send an email
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Email service not configured. Skipping email to:', to);
      return false;
    }

    try {
      await this.transporter!.sendMail({
        from: this.config!.from,
        to,
        subject,
        html,
      });
      console.log('Email sent successfully to:', to);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Generate order items HTML table
   */
  private generateOrderItemsTable(items: OnlineOrderWithItems['items']): string {
    const rows = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.productName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.totalPrice)}</td>
      </tr>
    `).join('');

    return `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Sản phẩm</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">SL</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Đơn giá</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }


  /**
   * Generate base email template
   */
  private generateEmailTemplate(store: OnlineStore, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: ${store.primaryColor}; padding: 24px; text-align: center;">
            ${store.logo 
              ? `<img src="${store.logo}" alt="${store.storeName}" style="max-height: 60px; max-width: 200px;">`
              : `<h1 style="color: #ffffff; margin: 0; font-size: 24px;">${store.storeName}</h1>`
            }
          </div>
          
          <!-- Content -->
          <div style="padding: 32px 24px;">
            ${content}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 14px; color: #6b7280;">
            <p style="margin: 0 0 8px 0;"><strong>${store.storeName}</strong></p>
            ${store.address ? `<p style="margin: 0 0 8px 0;">${store.address}</p>` : ''}
            ${store.contactPhone ? `<p style="margin: 0 0 8px 0;">Điện thoại: ${store.contactPhone}</p>` : ''}
            ${store.contactEmail ? `<p style="margin: 0;">Email: ${store.contactEmail}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send order confirmation email to customer
   */
  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    const { order, store } = data;
    const address = order.shippingAddress;

    const content = `
      <h2 style="color: #111827; margin: 0 0 16px 0;">Xác nhận đơn hàng</h2>
      <p style="color: #374151; margin: 0 0 24px 0;">
        Cảm ơn bạn đã đặt hàng tại <strong>${store.storeName}</strong>!
      </p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #166534;">
          <strong>Mã đơn hàng:</strong> ${order.orderNumber}
        </p>
        <p style="margin: 8px 0 0 0; color: #166534;">
          <strong>Ngày đặt:</strong> ${formatDate(order.createdAt || new Date().toISOString())}
        </p>
      </div>

      <h3 style="color: #111827; margin: 0 0 12px 0;">Chi tiết đơn hàng</h3>
      ${this.generateOrderItemsTable(order.items)}
      
      <div style="text-align: right; margin-bottom: 24px;">
        <p style="margin: 4px 0; color: #6b7280;">Tạm tính: ${formatCurrency(order.subtotal)}</p>
        ${order.discountAmount > 0 ? `<p style="margin: 4px 0; color: #059669;">Giảm giá: -${formatCurrency(order.discountAmount)}</p>` : ''}
        <p style="margin: 4px 0; color: #6b7280;">Phí vận chuyển: ${formatCurrency(order.shippingFee)}</p>
        <p style="margin: 8px 0 0 0; font-size: 18px; color: #111827;"><strong>Tổng cộng: ${formatCurrency(order.total)}</strong></p>
      </div>

      <h3 style="color: #111827; margin: 0 0 12px 0;">Địa chỉ giao hàng</h3>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px 0;"><strong>${address.fullName}</strong></p>
        <p style="margin: 0 0 4px 0; color: #6b7280;">${address.phone}</p>
        <p style="margin: 0; color: #6b7280;">${address.addressLine}, ${address.ward}, ${address.district}, ${address.province}</p>
      </div>

      <h3 style="color: #111827; margin: 0 0 12px 0;">Phương thức thanh toán</h3>
      <p style="color: #374151; margin: 0 0 24px 0;">${PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</p>

      ${order.paymentMethod === 'bank_transfer' ? `
        <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #92400e;">
            <strong>Lưu ý:</strong> Vui lòng chuyển khoản với nội dung: <strong>${order.orderNumber}</strong>
          </p>
        </div>
      ` : ''}

      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email ${store.contactEmail}${store.contactPhone ? ` hoặc số điện thoại ${store.contactPhone}` : ''}.
      </p>
    `;

    return this.sendEmail(
      order.customerEmail,
      `[${store.storeName}] Xác nhận đơn hàng #${order.orderNumber}`,
      this.generateEmailTemplate(store, content)
    );
  }


  /**
   * Send new order alert to store owner
   */
  async sendNewOrderAlert(data: NewOrderAlertData): Promise<boolean> {
    const { order, store } = data;
    const address = order.shippingAddress;

    const content = `
      <h2 style="color: #111827; margin: 0 0 16px 0;">🛒 Đơn hàng mới!</h2>
      
      <div style="background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>Mã đơn hàng:</strong> ${order.orderNumber}
        </p>
        <p style="margin: 8px 0 0 0; color: #1e40af;">
          <strong>Thời gian:</strong> ${formatDate(order.createdAt || new Date().toISOString())}
        </p>
      </div>

      <h3 style="color: #111827; margin: 0 0 12px 0;">Thông tin khách hàng</h3>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px 0;"><strong>${order.customerName}</strong></p>
        <p style="margin: 0 0 4px 0; color: #6b7280;">Email: ${order.customerEmail}</p>
        <p style="margin: 0; color: #6b7280;">Điện thoại: ${order.customerPhone}</p>
      </div>

      <h3 style="color: #111827; margin: 0 0 12px 0;">Địa chỉ giao hàng</h3>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px 0;"><strong>${address.fullName}</strong></p>
        <p style="margin: 0 0 4px 0; color: #6b7280;">${address.phone}</p>
        <p style="margin: 0; color: #6b7280;">${address.addressLine}, ${address.ward}, ${address.district}, ${address.province}</p>
        ${address.note ? `<p style="margin: 8px 0 0 0; color: #6b7280;"><em>Ghi chú: ${address.note}</em></p>` : ''}
      </div>

      <h3 style="color: #111827; margin: 0 0 12px 0;">Chi tiết đơn hàng</h3>
      ${this.generateOrderItemsTable(order.items)}
      
      <div style="text-align: right; margin-bottom: 24px;">
        <p style="margin: 4px 0; color: #6b7280;">Tạm tính: ${formatCurrency(order.subtotal)}</p>
        ${order.discountAmount > 0 ? `<p style="margin: 4px 0; color: #059669;">Giảm giá: -${formatCurrency(order.discountAmount)}</p>` : ''}
        <p style="margin: 4px 0; color: #6b7280;">Phí vận chuyển: ${formatCurrency(order.shippingFee)}</p>
        <p style="margin: 8px 0 0 0; font-size: 18px; color: #111827;"><strong>Tổng cộng: ${formatCurrency(order.total)}</strong></p>
      </div>

      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px;">
        <p style="margin: 0 0 8px 0;"><strong>Phương thức thanh toán:</strong> ${PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</p>
        ${order.customerNote ? `<p style="margin: 0;"><strong>Ghi chú của khách:</strong> ${order.customerNote}</p>` : ''}
      </div>
    `;

    return this.sendEmail(
      store.contactEmail,
      `[${store.storeName}] Đơn hàng mới #${order.orderNumber} - ${formatCurrency(order.total)}`,
      this.generateEmailTemplate(store, content)
    );
  }

  /**
   * Send order status update notification to customer
   */
  async sendStatusUpdateNotification(data: StatusUpdateData): Promise<boolean> {
    const { order, store, previousStatus, newStatus } = data;

    // Determine status-specific content
    let statusMessage = '';
    let statusColor = '#3b82f6';
    let additionalInfo = '';

    switch (newStatus) {
      case 'confirmed':
        statusMessage = 'Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị.';
        statusColor = '#10b981';
        break;
      case 'processing':
        statusMessage = 'Đơn hàng của bạn đang được xử lý và đóng gói.';
        statusColor = '#f59e0b';
        break;
      case 'shipped':
        statusMessage = 'Đơn hàng của bạn đã được giao cho đơn vị vận chuyển.';
        statusColor = '#8b5cf6';
        if (order.trackingNumber) {
          additionalInfo = `
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Mã vận đơn:</strong> ${order.trackingNumber}</p>
              ${order.carrier ? `<p style="margin: 0 0 8px 0;"><strong>Đơn vị vận chuyển:</strong> ${order.carrier}</p>` : ''}
              ${order.estimatedDelivery ? `<p style="margin: 0;"><strong>Dự kiến giao:</strong> ${formatDate(order.estimatedDelivery)}</p>` : ''}
            </div>
          `;
        }
        break;
      case 'delivered':
        statusMessage = 'Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã mua hàng!';
        statusColor = '#059669';
        break;
      case 'cancelled':
        statusMessage = 'Đơn hàng của bạn đã bị hủy.';
        statusColor = '#ef4444';
        if (order.internalNote) {
          additionalInfo = `
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Lý do:</strong> ${order.internalNote}</p>
            </div>
          `;
        }
        break;
      default:
        statusMessage = `Trạng thái đơn hàng đã được cập nhật thành "${STATUS_LABELS[newStatus]}".`;
    }

    const content = `
      <h2 style="color: #111827; margin: 0 0 16px 0;">Cập nhật đơn hàng</h2>
      
      <div style="background-color: #f9fafb; border-left: 4px solid ${statusColor}; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #6b7280;">Mã đơn hàng: <strong>${order.orderNumber}</strong></p>
        <p style="margin: 0; font-size: 18px; color: ${statusColor};"><strong>${STATUS_LABELS[newStatus]}</strong></p>
      </div>

      <p style="color: #374151; margin: 0 0 16px 0;">${statusMessage}</p>
      
      ${additionalInfo}

      <h3 style="color: #111827; margin: 24px 0 12px 0;">Tóm tắt đơn hàng</h3>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
        <p style="margin: 0 0 8px 0;"><strong>Tổng tiền:</strong> ${formatCurrency(order.total)}</p>
        <p style="margin: 0 0 8px 0;"><strong>Phương thức thanh toán:</strong> ${PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</p>
        <p style="margin: 0;"><strong>Số sản phẩm:</strong> ${order.items.length}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
        Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email ${store.contactEmail}${store.contactPhone ? ` hoặc số điện thoại ${store.contactPhone}` : ''}.
      </p>
    `;

    return this.sendEmail(
      order.customerEmail,
      `[${store.storeName}] Đơn hàng #${order.orderNumber} - ${STATUS_LABELS[newStatus]}`,
      this.generateEmailTemplate(store, content)
    );
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService();

