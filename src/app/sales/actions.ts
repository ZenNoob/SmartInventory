'use server'

import { Sale, SalesItem } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";

async function getNextInvoiceNumber(firestore: FirebaseFirestore.Firestore, transaction: FirebaseFirestore.Transaction): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const datePrefix = `HD${year}${month}${day}`;

    const salesCollection = firestore.collection('sales_transactions');
    const query = salesCollection
        .where('invoiceNumber', '>=', datePrefix)
        .where('invoiceNumber', '<', datePrefix + 'z') // 'z' is a char that is after all digits
        .orderBy('invoiceNumber', 'desc')
        .limit(1);

    const snapshot = await transaction.get(query);
    
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
  sale: Partial<Omit<Sale, 'id' | 'invoiceNumber'>> & { id?: string }, 
  items: Omit<SalesItem, 'id' | 'salesTransactionId'>[]
): Promise<{ success: boolean; error?: string; saleId?: string }> {
  const { firestore } = await getAdminServices();

  try {
    return await firestore.runTransaction(async (transaction) => {
      let saleRef;
      const isUpdate = !!sale.id;

      if (isUpdate) {
        // --- ALL READS FIRST for UPDATE ---
        saleRef = firestore.collection('sales_transactions').doc(sale.id!);
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
        
        // --- ALL WRITES for UPDATE ---
        oldItemsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
        if (oldPaymentDoc && oldPaymentDoc.exists) {
          transaction.delete(oldPaymentDoc.ref);
        }
        
        // Set/update the main sale document
        const saleDataToUpdate = { 
          ...sale,
          invoiceNumber: oldSaleData.invoiceNumber // Preserve original invoice number
        };
        transaction.set(saleRef, saleDataToUpdate);
        
      } else {
        // --- ALL READS FIRST for CREATE ---
        const invoiceNumber = await getNextInvoiceNumber(firestore, transaction);
        saleRef = firestore.collection('sales_transactions').doc(); // Let Firestore generate ID

        // --- ALL WRITES for CREATE ---
        const saleDataToCreate = { 
            ...sale, 
            id: saleRef.id, 
            invoiceNumber,
            status: sale.status || 'unprinted',
        };
        transaction.set(saleRef, saleDataToCreate);
      }

      // --- WRITES for both CREATE and UPDATE ---
      const saleItemsCollection = saleRef.collection('sales_items');
      for (const item of items) {
        const saleItemRef = saleItemsCollection.doc();
        transaction.set(saleItemRef, { 
          ...item, 
          id: saleItemRef.id,
          salesTransactionId: saleRef.id 
        });
      }
      
      if (sale.customerPayment && sale.customerPayment > 0 && sale.customerId) {
        const paymentRef = firestore.collection('payments').doc();
        const saleDoc = await transaction.get(saleRef); // re-read to get the invoiceNumber
        const saleData = saleDoc.data();

        transaction.set(paymentRef, {
            id: paymentRef.id,
            customerId: sale.customerId,
            paymentDate: sale.transactionDate,
            amount: sale.customerPayment,
            notes: `Thanh toán cho đơn hàng ${saleData?.invoiceNumber}`
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
