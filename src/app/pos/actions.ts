
'use server'

import { Shift } from '@/lib/types';
import { getAdminServices } from '@/lib/admin-actions';
import { FieldValue } from 'firebase-admin/firestore';

export async function startShift(
  userId: string,
  userName: string,
  startingCash: number
): Promise<{ success: boolean; error?: string; shiftId?: string }> {
  try {
    const { firestore } = await getAdminServices();

    // Check for existing active shift for this user
    const existingShiftQuery = firestore
      .collection('shifts')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1);
    
    const existingShiftSnapshot = await existingShiftQuery.get();
    if (!existingShiftSnapshot.empty) {
      return { success: false, error: "Bạn đã có một ca làm việc đang hoạt động." };
    }

    const shiftRef = firestore.collection('shifts').doc();
    const newShift: Shift = {
      id: shiftRef.id,
      userId,
      userName,
      startingCash,
      startTime: new Date().toISOString(),
      status: 'active',
      totalRevenue: 0,
      salesCount: 0,
    };

    await shiftRef.set(newShift);

    return { success: true, shiftId: shiftRef.id };
  } catch (error: any) {
    console.error("Error starting shift:", error);
    return { success: false, error: error.message || 'Không thể bắt đầu ca làm việc.' };
  }
}

export async function closeShift(
  shiftId: string,
  endingCash: number
): Promise<{ success: boolean; error?: string }> {
   try {
    const { firestore } = await getAdminServices();
    const shiftRef = firestore.collection('shifts').doc(shiftId);
    const salesSnapshot = await firestore.collection('sales_transactions').where('shiftId', '==', shiftId).get();
    
    let totalRevenue = 0;
    let cashSales = 0;
    salesSnapshot.forEach(doc => {
      const sale = doc.data();
      totalRevenue += sale.finalAmount || 0;
      // This is a simplification. A real implementation would need payment method tracking.
      // For now, we assume any customer payment on the sale is cash.
      cashSales += sale.customerPayment || 0;
    });

    const shiftDoc = await shiftRef.get();
    if (!shiftDoc.exists) {
      return { success: false, error: 'Không tìm thấy ca làm việc.' };
    }
    const shiftData = shiftDoc.data() as Shift;

    const totalCashInDrawer = (shiftData.startingCash || 0) + cashSales;
    const cashDifference = endingCash - totalCashInDrawer;

    await shiftRef.update({
      status: 'closed',
      endTime: new Date().toISOString(),
      endingCash,
      totalRevenue,
      salesCount: salesSnapshot.size,
      cashSales,
      totalCashInDrawer,
      cashDifference,
    });

    return { success: true };
  } catch (error: any)    {
    console.error("Error closing shift:", error);
    return { success: false, error: error.message || 'Không thể đóng ca làm việc.' };
  }
}
