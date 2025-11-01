



'use server'

import { Sale, SalesItem, LoyaltySettings, Customer } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import { FieldValue } from "firebase-admin/firestore";

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

async function updateLoyalty(
  transaction: FirebaseFirestore.Transaction,
  settingsDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  customerDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  saleAmount: number,
  pointsUsed: number = 0
) {
  const loyaltySettings = settingsDoc.data()?.loyalty as LoyaltySettings | undefined;

  if (!loyaltySettings || !loyaltySettings.enabled) return;
  if (!customerDoc.exists) return;

  const customerData = customerDoc.data() as Customer;
  
  // Sale amount used for earning points should be after all discounts
  const earnedPoints = (loyaltySettings.pointsPerAmount > 0) ? Math.floor(saleAmount / loyaltySettings.pointsPerAmount) : 0;
  
  const currentSpendablePoints = customerData.loyaltyPoints || 0;
  const currentLifetimePoints = customerData.lifetimePoints || 0;

  // Calculate new point totals
  const newSpendablePoints = currentSpendablePoints + earnedPoints - pointsUsed;
  const newLifetimePoints = currentLifetimePoints + earnedPoints;
  
  const sortedTiers = loyaltySettings.tiers.sort((a, b) => b.threshold - a.threshold);
  // Tier is based on lifetime points
  const newTier = sortedTiers.find(tier => newLifetimePoints >= tier.threshold);
  const newTierName = newTier?.name || undefined;

  const loyaltyUpdate: { 
    loyaltyPoints: number; 
    lifetimePoints: number;
    loyaltyTier?: Customer['loyaltyTier'] | FieldValue;
  } = {
    loyaltyPoints: newSpendablePoints,
    lifetimePoints: newLifetimePoints
  };

  if (newTierName !== customerData.loyaltyTier) {
    loyaltyUpdate.loyaltyTier = newTierName || FieldValue.delete();
  }

  transaction.update(customerDoc.ref, loyaltyUpdate);
}


export async function upsertSaleTransaction(
  sale: Partial<Omit<Sale, 'id' | 'invoiceNumber'>> & { id?: string; isChangeReturned?: boolean }, 
  items: Omit<SalesItem, 'id' | 'salesTransactionId'>[]
): Promise<{ success: boolean; error?: string; saleId?: string }> {
  const { firestore } = await getAdminServices();
  const isUpdate = !!sale.id;
  
  try {
    const saleId = await firestore.runTransaction(async (transaction) => {
        // --- READS ---
        const settingsDoc = await transaction.get(firestore.collection('settings').doc('theme'));
        const customerRef = (sale.customerId && sale.customerId !== 'walk-in-customer') ? firestore.collection('customers').doc(sale.customerId) : null;
        const customerDoc = customerRef ? await transaction.get(customerRef) : null;

        // Recalculate tier discount on server to ensure accuracy
        const loyaltySettings = settingsDoc.data()?.loyalty as LoyaltySettings | undefined;
        let tierDiscountPercentage = 0;
        let tierDiscountAmount = 0;

        if (customerDoc?.exists && loyaltySettings?.enabled) {
            const customerData = customerDoc.data() as Customer;
            const customerTier = loyaltySettings.tiers.find(t => t.name === customerData.loyaltyTier);
            if (customerTier && customerTier.discountPercentage > 0) {
                tierDiscountPercentage = customerTier.discountPercentage;
                tierDiscountAmount = (sale.totalAmount || 0) * (tierDiscountPercentage / 100);
            }
        }
        
        const calculatedDiscount = sale.discountType === 'percentage' 
          ? ((sale.totalAmount || 0) * (sale.discountValue || 0)) / 100 
          : (sale.discountValue || 0);

        const amountAfterDiscount = (sale.totalAmount || 0) - tierDiscountAmount - calculatedDiscount - (sale.pointsDiscount || 0);
        const vatAmount = (amountAfterDiscount * (settingsDoc.data()?.vatRate || 0)) / 100;
        const finalAmount = amountAfterDiscount + vatAmount;


        let finalRemainingDebt = sale.previousDebt !== undefined ? (sale.previousDebt + finalAmount) - (sale.customerPayment || 0) : undefined;
        let finalCustomerPayment = sale.customerPayment;

        if (sale.isChangeReturned && finalRemainingDebt !== undefined && finalRemainingDebt < 0) {
            finalCustomerPayment = (sale.previousDebt || 0) + finalAmount;
            finalRemainingDebt = 0;
        }

        const saleDataForDb: Partial<Sale> = { 
            ...sale, 
            tierDiscountPercentage,
            tierDiscountAmount,
            discount: calculatedDiscount, // Save the calculated amount
            finalAmount,
            vatAmount,
            remainingDebt: finalRemainingDebt,
            customerPayment: finalCustomerPayment,
        };
        delete (saleDataForDb as any).isChangeReturned;

        // --- WRITES ---
        if (isUpdate) {
            const saleRef = firestore.collection('sales_transactions').doc(sale.id!);
            const oldSaleDoc = await transaction.get(saleRef);
            if (!oldSaleDoc.exists) throw new Error("Đơn hàng không tồn tại.");
            
            const oldItemsQuery = saleRef.collection('sales_items');
            const oldItemsSnapshot = await transaction.get(oldItemsQuery);
            oldItemsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));

            // Revert points from old sale
            if (customerDoc && customerDoc.exists) {
                await updateLoyalty(transaction, settingsDoc, customerDoc, -(oldSaleDoc.data() as Sale).finalAmount, -((oldSaleDoc.data() as Sale).pointsUsed || 0));
            }

            transaction.set(saleRef, saleDataForDb, { merge: true });

            items.forEach(item => {
                const saleItemRef = saleRef.collection('sales_items').doc();
                transaction.set(saleItemRef, { ...item, id: saleItemRef.id, salesTransactionId: saleRef.id });
            });

            // Apply new points
            if (customerDoc && customerDoc.exists && saleDataForDb.finalAmount) {
                const freshCustomerDoc = await transaction.get(customerDoc.ref);
                await updateLoyalty(transaction, settingsDoc, freshCustomerDoc, saleDataForDb.finalAmount, saleDataForDb.pointsUsed);
            }
            return sale.id!;
        } else {
            const saleRef = firestore.collection('sales_transactions').doc();
            const invoiceNumber = await getNextInvoiceNumber(firestore, transaction);
            
            const saleDataToCreate = { 
                ...saleDataForDb, 
                id: saleRef.id, 
                invoiceNumber,
                status: sale.status || 'unprinted',
            };
            transaction.set(saleRef, saleDataToCreate);

            for (const item of items) {
                const saleItemRef = saleRef.collection('sales_items').doc();
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
            if (customerDoc && customerDoc.exists && saleDataForDb.finalAmount) {
                await updateLoyalty(transaction, settingsDoc, customerDoc, saleDataForDb.finalAmount, saleDataForDb.pointsUsed);
            }
            return saleRef.id;
        }
    });

    return { success: true, saleId };
    
  } catch (error: any) {
    console.error(`Error ${isUpdate ? 'updating' : 'creating'} sale transaction:`, error);
    return { success: false, error: error.message || `Không thể ${isUpdate ? 'cập nhật' : 'tạo'} đơn hàng.` };
  }
}


export async function deleteSaleTransaction(saleId: string): Promise<{ success: boolean; error?: string }> {
  const { firestore } = await getAdminServices();
  const saleRef = firestore.collection('sales_transactions').doc(saleId);

  try {
    return await firestore.runTransaction(async (transaction) => {
        // --- READS FIRST ---
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists) throw new Error("Đơn hàng không tồn tại.");
      
      const saleData = saleDoc.data() as Sale;
      const itemsQuery = saleRef.collection('sales_items');
      const itemsSnapshot = await transaction.get(itemsQuery);
      
      let paymentsSnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = null;
      if (saleData.customerId && saleData.customerPayment && saleData.customerPayment > 0) {
        const paymentNote = `Thanh toán cho đơn hàng ${saleData.invoiceNumber}`;
        const paymentsQuery = firestore.collection('payments')
            .where('customerId', '==', saleData.customerId)
            .where('notes', '==', paymentNote);
        paymentsSnapshot = await transaction.get(paymentsQuery);
      }
      
      const settingsDoc = await transaction.get(firestore.collection('settings').doc('theme'));
      const customerRef = (saleData.customerId && saleData.customerId !== 'walk-in-customer') ? firestore.collection('customers').doc(saleData.customerId) : null;
      const customerDoc = customerRef ? await transaction.get(customerRef) : null;

        // --- THEN WRITES ---
      itemsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));

      if (paymentsSnapshot && !paymentsSnapshot.empty) {
        transaction.delete(paymentsSnapshot.docs[0].ref);
      }
       if (customerDoc && customerDoc.exists && saleData.finalAmount && saleData.finalAmount > 0) {
        await updateLoyalty(transaction, settingsDoc, customerDoc, -saleData.finalAmount, -(saleData.pointsUsed || 0));
      }

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
