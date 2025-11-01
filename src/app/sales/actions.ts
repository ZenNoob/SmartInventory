

'use server'

import { Sale, SalesItem } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";

async function getNextInvoiceNumber(firestore: FirebaseFirestore.Firestore, transaction?: FirebaseFirestore.Transaction): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const datePrefix = `HD${year}${month}${day}`;

    const salesCollection = firestore.collection('sales_transactions');
    const query = salesCollection
        .where('invoiceNumber', '>=', datePrefix)
        .where('invoiceNumber', '<', datePrefix + 'z')
        .orderBy('invoiceNumber', 'desc')
        .limit(1);

    // This is the fix: check if a transaction is passed.
    const snapshot = transaction ? await transaction.get(query) : await query.get();
    
    let nextSequence = 1;
    if (!snapshot.empty) {
        const lastId = snapshot.docs[0].data().invoiceNumber;
        const lastSequence = parseInt(lastId.substring(datePrefix.length), 10);
        nextSequence = lastSequence + 1;
    }

    const sequenceString = nextSequence.toString().padStart(5, '0');
    return `${datePrefix}${sequenceString}`;
}


export async function upsertSaleTransaction(
  sale: Partial<Omit<Sale, 'id' | 'invoiceNumber'>> & { id?: string; isChangeReturned?: boolean }, 
  items: Omit<SalesItem, 'id' | 'salesTransactionId'>[]
): Promise<{ success: boolean; error?: string; saleId?: string }> {
  const { firestore } = await getAdminServices();
  const isUpdate = !!sale.id;
  
  let finalRemainingDebt = sale.remainingDebt;
  let finalCustomerPayment = sale.customerPayment;

  // If change is returned and there is change (remainingDebt is negative),
  // then the actual payment amount to be recorded is the finalAmount,
  // and the remaining debt should be 0.
  if (sale.isChangeReturned && finalRemainingDebt && finalRemainingDebt < 0) {
    finalCustomerPayment = sale.finalAmount; // Correct the payment amount
    finalRemainingDebt = 0; // Set remaining debt to 0
  }

  const saleDataForDb = { 
    ...sale, 
    remainingDebt: finalRemainingDebt,
    customerPayment: finalCustomerPayment,
  };
  delete saleDataForDb.isChangeReturned; // Don't save this flag to the database


  if (isUpdate) {
    // --- UPDATE LOGIC ---
    try {
      const saleRef = firestore.collection('sales_transactions').doc(sale.id!);
      await firestore.runTransaction(async (transaction) => {
        // --- ALL READS FIRST ---
        const oldSaleDoc = await transaction.get(saleRef);
        if (!oldSaleDoc.exists) {
          throw new Error("Đơn hàng không tồn tại.");
        }
        const oldSaleData = oldSaleDoc.data() as Sale;

        const oldItemsQuery = saleRef.collection('sales_items');
        const oldItemsSnapshot = await transaction.get(oldItemsQuery);

        let oldPaymentDoc: FirebaseFirestore.DocumentSnapshot | undefined;
        if (oldSaleData.customerId && oldSaleData.customerPayment && oldSaleData.customerPayment > 0) {
          const paymentNote = `Thanh toán cho đơn hàng ${oldSaleData.invoiceNumber}`;
          const paymentsQuery = firestore.collection('payments')
            .where('customerId', '==', oldSaleData.customerId)
            .where('notes', '==', paymentNote)
            .limit(1);
          const oldPaymentsSnapshot = await transaction.get(paymentsQuery);
          if (!oldPaymentsSnapshot.empty) {
            oldPaymentDoc = oldPaymentsSnapshot.docs[0];
          }
        }
        
        // --- ALL WRITES AFTER ---
        oldItemsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));

        if (oldPaymentDoc && oldPaymentDoc.exists) {
          transaction.delete(oldPaymentDoc.ref);
        }
        
        const saleDataToUpdate = { ...saleDataForDb, invoiceNumber: oldSaleData.invoiceNumber };
        transaction.set(saleRef, saleDataToUpdate, { merge: true });

        const saleItemsCollection = saleRef.collection('sales_items');
        for (const item of items) {
          const saleItemRef = saleItemsCollection.doc();
          transaction.set(saleItemRef, { ...item, id: saleItemRef.id, salesTransactionId: saleRef.id });
        }
        
        if (saleDataForDb.customerPayment && saleDataForDb.customerPayment > 0 && saleDataForDb.customerId) {
          const paymentRef = firestore.collection('payments').doc();
          transaction.set(paymentRef, {
              id: paymentRef.id,
              customerId: saleDataForDb.customerId,
              paymentDate: saleDataForDb.transactionDate,
              amount: saleDataForDb.customerPayment,
              notes: `Thanh toán cho đơn hàng ${oldSaleData.invoiceNumber}`
          });
        }
      });
      return { success: true, saleId: sale.id };
    } catch (error: any) {
      console.error("Error updating sale transaction:", error);
      return { success: false, error: error.message || 'Không thể cập nhật đơn hàng.' };
    }
  } else {
    // --- CREATE LOGIC ---
    try {
      const invoiceNumber = await getNextInvoiceNumber(firestore); // Get invoice number outside transaction
      const saleRef = firestore.collection('sales_transactions').doc();
      
      await firestore.runTransaction(async (transaction) => {
        // --- ALL WRITES ---
        const saleDataToCreate = { 
            ...saleDataForDb, 
            id: saleRef.id, 
            invoiceNumber,
            status: sale.status || 'unprinted',
        };
        transaction.set(saleRef, saleDataToCreate);

        const saleItemsCollection = saleRef.collection('sales_items');
        for (const item of items) {
          const saleItemRef = saleItemsCollection.doc();
          transaction.set(saleItemRef, { ...item, id: saleItemRef.id, salesTransactionId: saleRef.id });
        }
        
        if (saleDataForDb.customerPayment && saleDataForDb.customerPayment > 0 && saleDataForDb.customerId) {
          const paymentRef = firestore.collection('payments').doc();
          transaction.set(paymentRef, {
              id: paymentRef.id,
              customerId: saleDataForDb.customerId,
              paymentDate: saleDataForDb.transactionDate,
              amount: saleDataForDb.customerPayment,
              notes: `Thanh toán cho đơn hàng ${invoiceNumber}`
          });
        }
      });
      return { success: true, saleId: saleRef.id };
    } catch (error: any) {
      console.error("Error creating sale transaction:", error);
      return { success: false, error: error.message || 'Không thể tạo đơn hàng.' };
    }
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
        const paymentNote = `Thanh toán cho đơn hàng ${saleData.invoiceNumber}`;
        const paymentsQuery = firestore.collection('payments')
            .where('customerId', '==', saleData.customerId)
            .where('notes', '==', paymentNote);
        
        const paymentsSnapshot = await transaction.get(paymentsQuery);
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

export async function updateSaleStatus(saleId: string, status: Sale['status']): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();
    await firestore.collection('sales_transactions').doc(saleId).update({ status });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating sale status:", error);
    return { success: false, error: 'Không thể cập nhật trạng thái đơn hàng.' };
  }
}
