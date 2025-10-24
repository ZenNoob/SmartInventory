'use server'

import { Sale, SalesItem } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";

export async function upsertSaleTransaction(
  sale: Omit<Sale, 'id' | 'totalAmount' > & { totalAmount: number }, 
  // The items passed here have their quantity in the base unit
  items: Omit<SalesItem, 'id' | 'salesTransactionId'>[]
): Promise<{ success: boolean; error?: string; saleId?: string }> {
  const { firestore } = await getAdminServices();

  try {
    // Create the main sale document first
    const saleRef = firestore.collection('sales_transactions').doc();
    await saleRef.set({ ...sale, id: saleRef.id });

    // Sequentially create the sales_item documents
    const saleItemsCollection = saleRef.collection('sales_items');
    for (const item of items) {
      const saleItemRef = saleItemsCollection.doc();
      await saleItemRef.set({ 
        ...item, 
        id: saleItemRef.id,
        salesTransactionId: saleRef.id 
      });
    }
    
    // Create a payment document if customerPayment is provided
    if (sale.customerPayment && sale.customerPayment > 0 && sale.customerId) {
      const paymentRef = firestore.collection('payments').doc();
      await paymentRef.set({
          id: paymentRef.id,
          customerId: sale.customerId,
          paymentDate: sale.transactionDate,
          amount: sale.customerPayment,
          notes: `Thanh toán cho đơn hàng ${saleRef.id.slice(-6).toUpperCase()}`
      });
    }

    return { success: true, saleId: saleRef.id };
  } catch (error: any) {
    console.error("Error creating sale transaction:", error);
    return { success: false, error: error.message || 'Không thể tạo đơn hàng.' };
  }
}
