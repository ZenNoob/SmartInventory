'use server'

import { Product, PurchaseLot } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import { FieldValue } from "firebase-admin/firestore";
import * as xlsx from 'xlsx';

export async function upsertProduct(product: Partial<Product>): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();

    if (product.id) {
      // Update existing product
      const productRef = firestore.collection('products').doc(product.id);
      
      // Special handling for inventory adjustments (cost = 0)
      if (product.purchaseLots) {
        const adjustmentLots = product.purchaseLots.filter(lot => lot.cost === 0 && lot.quantity !== 0);
        if (adjustmentLots.length > 0) {
            await productRef.update({
                purchaseLots: FieldValue.arrayUnion(...adjustmentLots)
            });
            // remove purchaseLots from the object to avoid double-adding or other fields being overwritten
            delete product.purchaseLots;
        }
      }

      await productRef.set(product, { merge: true });

    } else {
      // Create new product
      const productRef = firestore.collection('products').doc();
      await productRef.set({ ...product, id: productRef.id });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting product:", error);
    return { success: false, error: error.message || 'Không thể tạo hoặc cập nhật sản phẩm.' };
  }
}

export async function updateProductStatus(productId: string, status: 'active' | 'draft' | 'archived'): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();
    await firestore.collection('products').doc(productId).update({ status });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating product status:", error);
    return { success: false, error: error.message || 'Không thể cập nhật trạng thái sản phẩm.' };
  }
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();
    
    // In a real app, you should check if this product is part of any sales transactions first.
    await firestore.collection('products').doc(productId).delete();
    
    return { success: true };
  } catch (error: any) {
      console.error("Error deleting product:", error);
      return { success: false, error: error.message || 'Không thể xóa sản phẩm.' };
  }
}

export async function generateProductTemplate(): Promise<{ success: boolean; error?: string; data?: string }> {
  try {
    const headers = [
      "name", "categoryId", "unitId", "status", "lowStockThreshold"
    ];
    const ws = xlsx.utils.aoa_to_sheet([headers]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Products");
    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    return { success: true, data: buffer.toString('base64') };
  } catch (error: any) {
    console.error("Error generating product template:", error);
    return { success: false, error: 'Không thể tạo file mẫu.' };
  }
}

export async function importProducts(base64Data: string): Promise<{ success: boolean; error?: string; createdCount?: number }> {
  try {
    const { firestore } = await getAdminServices();
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const productsData = xlsx.utils.sheet_to_json(worksheet) as any[];

    if (productsData.length === 0) {
      return { success: false, error: "File không có dữ liệu." };
    }

    const batch = firestore.batch();
    let createdCount = 0;

    // Prefetch categories and units to validate against them
    const categoriesSnapshot = await firestore.collection('categories').get();
    const categoriesMap = new Map(categoriesSnapshot.docs.map(doc => [doc.data().name, doc.id]));
    
    // In import, we cannot distinguish units by name, so we must use ID.
    // For simplicity in the Excel file, we'll continue to match by name, but this has limitations.
    // A more robust solution would be a separate import step or requiring unit IDs in the sheet.
    const unitsSnapshot = await firestore.collection('units').get();
    const unitsMap = new Map(unitsSnapshot.docs.map(doc => [doc.id, doc.data()]));

    for (const row of productsData) {
      const name = row.name;
      const categoryName = row.categoryId; // This is a name, not ID from Excel
      const unitId = row.unitId;

      // Basic validation
      if (!name || !categoryName || !unitId) {
        console.warn("Skipping row due to missing required fields (name, categoryId, unitId):", row);
        continue;
      }
      
      const categoryId = categoriesMap.get(categoryName);
      if (!categoryId) {
          console.warn(`Skipping row because category "${categoryName}" was not found.`);
          continue;
      }

      if (!unitsMap.has(unitId)) {
          console.warn(`Skipping row because unit with ID "${unitId}" was not found.`);
          continue;
      }

      const newProductRef = firestore.collection('products').doc();
      const newProduct: Omit<Product, 'id'> = {
        name: row.name,
        categoryId,
        unitId,
        status: ['active', 'draft', 'archived'].includes(row.status) ? row.status : 'draft',
        lowStockThreshold: !isNaN(parseFloat(row.lowStockThreshold)) ? parseFloat(row.lowStockThreshold) : undefined,
        purchaseLots: [],
      };
      
      batch.set(newProductRef, { ...newProduct, id: newProductRef.id });
      createdCount++;
    }

    await batch.commit();

    return { success: true, createdCount };
  } catch (error: any) {
    console.error("Error importing products:", error);
    return { success: false, error: error.message || 'Không thể nhập file sản phẩm.' };
  }
}
