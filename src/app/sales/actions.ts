'use server'

import { Sale, SalesItem } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";

export async function upsertSaleTransaction(
  sale: Omit<Sale, 'id'>, 
  items: Omit<SalesItem, 'id' | 'salesTransactionId'>[]
): Promise<{ success: boolean; error?: string; saleId?: string }> {
  const { firestore } = await getAdminServices();

  try {
    // Create the main sale document first
    const saleRef = firestore.collection('sales_transactions').doc();
    await saleRef.set({ ...sale, id: saleRef.id, finalAmount: sale.finalAmount, totalAmount: sale.totalAmount });

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
    
    // Create a payment document if customerPayment is provided and it's a valid customer
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


export async function deleteSaleTransaction(saleId: string): Promise<{ success: boolean; error?: string }> {
  const { firestore } = await getAdminServices();
  const saleRef = firestore.collection('sales_transactions').doc(saleId);

  try {
    return await firestore.runTransaction(async (transaction) => {
      // 1. Get the sale document
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists) {
        throw new Error("Đơn hàng không tồn tại.");
      }
      const saleData = saleDoc.data() as Sale;

      // 2. Delete all items in the sales_items subcollection
      const itemsQuery = saleRef.collection('sales_items');
      const itemsSnapshot = await transaction.get(itemsQuery);
      itemsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));

      // 3. Find and delete the associated payment, if it exists
      if (saleData.customerId && saleData.customerPayment && saleData.customerPayment > 0) {
        const paymentNote = `Thanh toán cho đơn hàng ${saleId.slice(-6).toUpperCase()}`;
        const paymentsQuery = firestore.collection('payments')
            .where('customerId', '==', saleData.customerId)
            .where('notes', '==', paymentNote);
        
        const paymentsSnapshot = await transaction.get(paymentsQuery);
        // Assuming the note is unique enough, delete the first one found.
        if (!paymentsSnapshot.empty) {
          transaction.delete(paymentsSnapshot.docs[0].ref);
        }
      }

      // 4. Delete the main sale document
      transaction.delete(saleRef);

      return { success: true };
    });
  } catch (error: any) {
    console.error("Error deleting sale transaction:", error);
    return { success: false, error: error.message || 'Không thể xóa đơn hàng.' };
  }
}
