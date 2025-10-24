'use server'

import { Sale, SalesItem } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";

export async function upsertSaleTransaction(
  sale: Partial<Omit<Sale, 'id'>> & { id?: string }, 
  items: Omit<SalesItem, 'id' | 'salesTransactionId'>[]
): Promise<{ success: boolean; error?: string; saleId?: string }> {
  const { firestore } = await getAdminServices();

  try {
    return await firestore.runTransaction(async (transaction) => {
      let saleRef;
      
      // If it's an update, delete old items and payments first
      if (sale.id) {
        saleRef = firestore.collection('sales_transactions').doc(sale.id);

        // Delete all old items in the sales_items subcollection
        const oldItemsQuery = saleRef.collection('sales_items');
        const oldItemsSnapshot = await transaction.get(oldItemsQuery);
        oldItemsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));

        // Delete the associated old payment, if it exists
        const saleDocBeforeUpdate = await transaction.get(saleRef);
        const oldSaleData = saleDocBeforeUpdate.data() as Sale | undefined;

        if (oldSaleData?.customerId && oldSaleData.customerPayment && oldSaleData.customerPayment > 0) {
          const paymentNote = `Thanh toán cho đơn hàng ${oldSaleData.id.slice(-6).toUpperCase()}`;
          const paymentsQuery = firestore.collection('payments')
              .where('customerId', '==', oldSaleData.customerId)
              .where('notes', '==', paymentNote);
          
          const oldPaymentsSnapshot = await transaction.get(paymentsQuery);
          if (!oldPaymentsSnapshot.empty) {
            transaction.delete(oldPaymentsSnapshot.docs[0].ref);
          }
        }
      } else {
        // It's a new sale, create a new document reference
        saleRef = firestore.collection('sales_transactions').doc();
      }

      // Set/update the main sale document
      const saleDataWithId = { ...sale, id: saleRef.id };
      transaction.set(saleRef, saleDataWithId);

      // Create the new sales_item documents
      const saleItemsCollection = saleRef.collection('sales_items');
      for (const item of items) {
        const saleItemRef = saleItemsCollection.doc();
        transaction.set(saleItemRef, { 
          ...item, 
          id: saleItemRef.id,
          salesTransactionId: saleRef.id 
        });
      }
      
      // Create a new payment document if customerPayment is provided
      if (sale.customerPayment && sale.customerPayment > 0 && sale.customerId) {
        const paymentRef = firestore.collection('payments').doc();
        transaction.set(paymentRef, {
            id: paymentRef.id,
            customerId: sale.customerId,
            paymentDate: sale.transactionDate,
            amount: sale.customerPayment,
            notes: `Thanh toán cho đơn hàng ${saleRef.id.slice(-6).toUpperCase()}`
        });
      }

      return { success: true, saleId: saleRef.id };
    });
  } catch (error: any) {
    console.error("Error creating or updating sale transaction:", error);
    return { success: false, error: error.message || 'Không thể tạo hoặc cập nhật đơn hàng.' };
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
