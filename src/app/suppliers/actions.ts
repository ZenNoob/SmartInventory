
'use server'

import { Supplier, SupplierPayment } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import { FieldValue } from "firebase-admin/firestore";

export async function upsertSupplier(supplier: Partial<Supplier>): Promise<{ success: boolean; error?: string; supplierId?: string }> {
  try {
    const { firestore } = await getAdminServices();
    let supplierId: string;

    if (supplier.id) {
      supplierId = supplier.id;
      const supplierRef = firestore.collection('suppliers').doc(supplierId);
      await supplierRef.set({
        ...supplier,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      const supplierRef = firestore.collection('suppliers').doc();
      supplierId = supplierRef.id;
      await supplierRef.set({ 
        ...supplier, 
        id: supplierId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true, supplierId };
  } catch (error: any) {
    console.error("Error upserting supplier:", error);
    return { success: false, error: error.message || 'Không thể tạo hoặc cập nhật nhà cung cấp.' };
  }
}

export async function deleteSupplier(supplierId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();
    
    const purchaseOrdersSnapshot = await firestore.collection('purchase_orders').where('supplierId', '==', supplierId).limit(1).get();
    if (!purchaseOrdersSnapshot.empty) {
        return { success: false, error: "Không thể xóa nhà cung cấp đã có đơn nhập hàng." };
    }

    await firestore.collection('suppliers').doc(supplierId).delete();
    
    return { success: true };
  } catch (error: any) {
      console.error("Error deleting supplier:", error);
      return { success: false, error: error.message || 'Không thể xóa nhà cung cấp.' };
  }
}

export async function addSupplierPayment(
    paymentData: Omit<SupplierPayment, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string; paymentId?: string }> {
    const { firestore } = await getAdminServices();

    try {
        const paymentRef = firestore.collection('supplier_payments').doc();
        const newPayment = {
            ...paymentData,
            id: paymentRef.id,
            createdAt: FieldValue.serverTimestamp()
        };
        await paymentRef.set(newPayment);
        return { success: true, paymentId: paymentRef.id };
    } catch (error: any) {
        console.error("Error adding supplier payment:", error);
        return { success: false, error: error.message || 'Không thể ghi nhận thanh toán cho nhà cung cấp.' };
    }
}
