

'use server'

import { Payment, Customer, LoyaltySettings } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import { FieldValue } from "firebase-admin/firestore";


async function updateLoyaltyOnPayment(
  transaction: FirebaseFirestore.Transaction,
  firestore: FirebaseFirestore.Firestore,
  customerId: string,
  paymentAmount: number,
) {
  if (customerId === 'walk-in-customer') return;

  // --- READS FIRST ---
  const settingsDoc = await transaction.get(firestore.collection('settings').doc('theme'));
  const loyaltySettings = settingsDoc.data()?.loyalty as LoyaltySettings | undefined;

  if (!loyaltySettings || !loyaltySettings.enabled || !loyaltySettings.pointsPerAmount || loyaltySettings.pointsPerAmount <= 0) {
    return;
  }

  const customerRef = firestore.collection('customers').doc(customerId);
  const customerDoc = await transaction.get(customerRef);

  if (!customerDoc.exists) {
    console.warn(`Customer ${customerId} not found for loyalty update.`);
    return;
  }

  // --- THEN WRITES ---
  const customerData = customerDoc.data() as Customer;
  
  const earnedPoints = Math.floor(paymentAmount / loyaltySettings.pointsPerAmount);
  
  if (earnedPoints <= 0) {
    return;
  }

  const currentSpendablePoints = customerData.loyaltyPoints || 0;
  const currentLifetimePoints = customerData.lifetimePoints || 0;

  const newSpendablePoints = currentSpendablePoints + earnedPoints;
  const newLifetimePoints = currentLifetimePoints + earnedPoints;
  
  const sortedTiers = loyaltySettings.tiers.sort((a, b) => b.threshold - a.threshold);
  const newTier = sortedTiers.find(tier => newLifetimePoints >= tier.threshold);
  
  const loyaltyUpdate: { 
    loyaltyPoints: number; 
    lifetimePoints: number;
    loyaltyTier?: Customer['loyaltyTier'] | FieldValue;
  } = {
    loyaltyPoints: newSpendablePoints,
    lifetimePoints: newLifetimePoints,
  };

  if (newTier) {
    if (newTier.name !== customerData.loyaltyTier) {
        loyaltyUpdate.loyaltyTier = newTier.name;
    }
  } else {
    if (customerData.loyaltyTier) {
        loyaltyUpdate.loyaltyTier = FieldValue.delete();
    }
  }

  transaction.update(customerRef, loyaltyUpdate);
}


export async function addPayment(
    paymentData: Omit<Payment, 'id'>
): Promise<{ success: boolean; error?: string; paymentId?: string }> {
    const { firestore } = await getAdminServices();

    try {
       const paymentId = await firestore.runTransaction(async (transaction) => {
            const paymentRef = firestore.collection('payments').doc();
            
            // We pass the transaction object to the loyalty update function.
            // It will perform its own reads and writes within this transaction.
            await updateLoyaltyOnPayment(transaction, firestore, paymentData.customerId, paymentData.amount);

            // Now, perform the write for the payment itself.
            const newPayment = {
                ...paymentData,
                id: paymentRef.id,
            };
            transaction.set(paymentRef, newPayment);
            
            return paymentRef.id;
        });

        return { success: true, paymentId };
    } catch (error: any) {
        console.error("Error adding payment and updating loyalty:", error);
        return { success: false, error: error.message || 'Không thể ghi nhận thanh toán.' };
    }
}
