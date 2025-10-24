'use server'

import { Payment } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";

export async function addPayment(
    paymentData: Omit<Payment, 'id'>
): Promise<{ success: boolean; error?: string; paymentId?: string }> {
    const { firestore } = await getAdminServices();

    try {
        const paymentRef = firestore.collection('payments').doc();
        const newPayment = {
            ...paymentData,
            id: paymentRef.id,
        };
        await paymentRef.set(newPayment);

        return { success: true, paymentId: paymentRef.id };
    } catch (error: any) {
        console.error("Error adding payment:", error);
        return { success: false, error: error.message || 'Không thể ghi nhận thanh toán.' };
    }
}
