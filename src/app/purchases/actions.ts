
'use server'

import { PurchaseOrder, PurchaseOrderItem, PurchaseLot, Supplier } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import { FieldValue } from "firebase-admin/firestore";
import * as xlsx from 'xlsx';

async function getNextOrderNumber(firestore: FirebaseFirestore.Firestore, transaction: FirebaseFirestore.Transaction): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const datePrefix = `PN${year}${month}`;

    const collectionRef = firestore.collection('purchase_orders');
    const q = collectionRef
        .where('orderNumber', '>=', datePrefix)
        .where('orderNumber', '<', datePrefix + 'z')
        .orderBy('orderNumber', 'desc')
        .limit(1);

    const snapshot = await transaction.get(q);
    
    let nextSequence = 1;
    if (!snapshot.empty) {
        const lastId = snapshot.docs[0].data().orderNumber;
        const lastSequence = parseInt(lastId.substring(datePrefix.length), 10);
        nextSequence = lastSequence + 1;
    }

    const sequenceString = nextSequence.toString().padStart(4, '0');
    return `${datePrefix}${sequenceString}`;
}


export async function createPurchaseOrder(
  order: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt'>,
  items: PurchaseOrderItem[]
): Promise<{ success: boolean; error?: string; purchaseOrderId?: string }> {
  const { firestore } = await getAdminServices();

  try {
    const purchaseOrderId = await firestore.runTransaction(async (transaction) => {
      // 1. Generate a new order number
      const orderNumber = await getNextOrderNumber(firestore, transaction);
      
      // 2. Create the main purchase_orders document
      const purchaseOrderRef = firestore.collection('purchase_orders').doc();
      const newPurchaseOrder: PurchaseOrder = {
        ...order,
        items: items, // Embed items directly
        id: purchaseOrderRef.id,
        orderNumber,
        createdAt: FieldValue.serverTimestamp(),
      };
      transaction.set(purchaseOrderRef, newPurchaseOrder);

      // 3. Update product lots
      for (const item of items) {
        const productRef = firestore.collection('products').doc(item.productId);
        const newPurchaseLot: PurchaseLot = {
            importDate: order.importDate,
            quantity: item.quantity,
            cost: item.cost,
            unitId: item.unitId
        };
        // Use arrayUnion to atomically add the new lot to the product
        transaction.update(productRef, {
            purchaseLots: FieldValue.arrayUnion(newPurchaseLot)
        });
      }

      return purchaseOrderRef.id;
    });

    return { success: true, purchaseOrderId };

  } catch (error: any) {
    console.error("Error creating purchase order:", error);
    return { success: false, error: error.message || 'Không thể tạo đơn nhập hàng.' };
  }
}

export async function updatePurchaseOrder(
  orderId: string,
  orderUpdate: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt'>,
  itemsUpdate: PurchaseOrderItem[]
): Promise<{ success: boolean; error?: string }> {
  const { firestore } = await getAdminServices();
  const purchaseOrderRef = firestore.collection('purchase_orders').doc(orderId);

  try {
    await firestore.runTransaction(async (transaction) => {
      // 1. Get the original purchase order
      const originalOrderDoc = await transaction.get(purchaseOrderRef);
      if (!originalOrderDoc.exists) {
        throw new Error("Không tìm thấy đơn nhập hàng để cập nhật.");
      }
      const originalOrder = originalOrderDoc.data() as PurchaseOrder;

      // 2. Remove the old purchase lots from each affected product
      for (const originalItem of originalOrder.items) {
        const productRef = firestore.collection('products').doc(originalItem.productId);
        const oldPurchaseLot: PurchaseLot = {
          importDate: originalOrder.importDate,
          quantity: originalItem.quantity,
          cost: originalItem.cost,
          unitId: originalItem.unitId,
        };
        transaction.update(productRef, {
          purchaseLots: FieldValue.arrayRemove(oldPurchaseLot),
        });
      }

      // 3. Add the new purchase lots to each affected product
      for (const updatedItem of itemsUpdate) {
        const productRef = firestore.collection('products').doc(updatedItem.productId);
        const newPurchaseLot: PurchaseLot = {
          importDate: orderUpdate.importDate,
          quantity: updatedItem.quantity,
          cost: updatedItem.cost,
          unitId: updatedItem.unitId,
        };
        transaction.update(productRef, {
          purchaseLots: FieldValue.arrayUnion(newPurchaseLot),
        });
      }

      // 4. Update the main purchase order document
      transaction.update(purchaseOrderRef, {
        ...orderUpdate,
        items: itemsUpdate, // Update the embedded items
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating purchase order:", error);
    return { success: false, error: error.message || 'Không thể cập nhật đơn nhập hàng.' };
  }
}


export async function deletePurchaseOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  const { firestore } = await getAdminServices();
  const purchaseOrderRef = firestore.collection('purchase_orders').doc(orderId);

  try {
    await firestore.runTransaction(async (transaction) => {
      // 1. Get the original purchase order
      const orderDoc = await transaction.get(purchaseOrderRef);
      if (!orderDoc.exists) {
        throw new Error("Không tìm thấy đơn nhập hàng để xóa.");
      }
      const order = orderDoc.data() as PurchaseOrder;

      // 2. Remove the purchase lots from each affected product
      for (const item of order.items) {
        const productRef = firestore.collection('products').doc(item.productId);
        const purchaseLotToRemove: PurchaseLot = {
          importDate: order.importDate,
          quantity: item.quantity,
          cost: item.cost,
          unitId: item.unitId,
        };
        transaction.update(productRef, {
          purchaseLots: FieldValue.arrayRemove(purchaseLotToRemove),
        });
      }
      
      // Also delete any associated supplier payments
      const paymentsQuery = firestore.collection('supplier_payments').where('notes', '==', `Thanh toán cho đơn nhập ${order.orderNumber}`);
      const paymentsSnapshot = await transaction.get(paymentsQuery);
      paymentsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));

      // 3. Delete the main purchase order document
      transaction.delete(purchaseOrderRef);
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting purchase order:", error);
    return { success: false, error: error.message || 'Không thể xóa đơn nhập hàng.' };
  }
}

export async function generatePurchaseOrdersExcel(orders: PurchaseOrder[], suppliers: Supplier[]): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const suppliersMap = new Map(suppliers.map(s => [s.id, s.name]));
    const dataToExport = orders.map((order, index) => ({
      'STT': index + 1,
      'Mã đơn': order.orderNumber,
      'Ngày nhập': new Date(order.importDate).toLocaleDateString('vi-VN'),
      'Nhà cung cấp': suppliersMap.get(order.supplierId) || 'N/A',
      'Số SP': order.items.length,
      'Tổng tiền': order.totalAmount,
      'Ghi chú': order.notes || '',
    }));

    const totalAmount = orders.reduce((acc, order) => acc + order.totalAmount, 0);

    const totalRow = {
      'STT': '',
      'Mã đơn': 'Tổng cộng',
      'Ngày nhập': '',
      'Nhà cung cấp': '',
      'Số SP': '',
      'Tổng tiền': totalAmount,
      'Ghi chú': '',
    };
    
    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRow]);

    worksheet['!cols'] = [
      { wch: 5 },  // STT
      { wch: 20 }, // Mã đơn
      { wch: 15 }, // Ngày nhập
      { wch: 25 }, // Nhà cung cấp
      { wch: 10 }, // Số SP
      { wch: 20 }, // Tổng tiền
      { wch: 40 }, // Ghi chú
    ];

    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
        const rowIndex = index + 2; // 1-based index, +1 for header
        worksheet[`F${rowIndex}`].z = numberFormat;
    });

    const totalRowIndex = dataToExport.length + 2;
    worksheet[`F${totalRowIndex}`].z = numberFormat;
    worksheet[`B${totalRowIndex}`].s = { font: { bold: true } };
    worksheet[`F${totalRowIndex}`].s = { font: { bold: true } };


    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'DonNhapHang');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return { success: true, data: buffer.toString('base64') };
  } catch (error: any) {
    console.error("Error generating purchase orders excel:", error);
    return { success: false, error: 'Không thể tạo file excel.' };
  }
}
