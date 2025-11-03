
'use server'

import { Customer, LoyaltySettings } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import { FieldValue } from "firebase-admin/firestore";
import * as xlsx from 'xlsx';

export async function upsertCustomer(customer: Partial<Customer>): Promise<{ success: boolean; error?: string; customerId?: string }> {
  try {
    const { firestore } = await getAdminServices();
    let customerId: string;
    
    const customerData: Partial<Customer> = { ...customer };

    // If lifetimePoints are being updated manually, we need to recalculate the tier
    if (customerData.lifetimePoints !== undefined) {
      const settingsDoc = await firestore.collection('settings').doc('theme').get();
      if (settingsDoc.exists) {
        const loyaltySettings = settingsDoc.data()?.loyalty as LoyaltySettings | undefined;
        if (loyaltySettings && loyaltySettings.enabled) {
          const sortedTiers = [...loyaltySettings.tiers].sort((a, b) => b.threshold - a.threshold);
          const newTier = sortedTiers.find(tier => customerData.lifetimePoints! >= tier.threshold);
          
          if (newTier) {
            customerData.loyaltyTier = newTier.name;
          } else {
            // Use FieldValue.delete() to remove the field if no tier is matched
            (customerData as any).loyaltyTier = FieldValue.delete();
          }
        }
      }
    }


    if (customerData.id) {
      // Update existing customer
      customerId = customerData.id;
      const customerRef = firestore.collection('customers').doc(customerId);
      await customerRef.set({
        ...customerData,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      // Create new customer
      const customerRef = firestore.collection('customers').doc();
      customerId = customerRef.id;
      await customerRef.set({ 
        ...customerData, 
        id: customerId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true, customerId };
  } catch (error: any) {
    console.error("Error upserting customer:", error);
    return { success: false, error: error.message || 'Không thể tạo hoặc cập nhật khách hàng.' };
  }
}

export async function deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();
    
    // TODO: Check if any transaction is using this customer before deleting.

    await firestore.collection('customers').doc(customerId).delete();
    
    return { success: true };
  } catch (error: any) {
      console.error("Error deleting customer:", error);
      return { success: false, error: error.message || 'Không thể xóa khách hàng.' };
  }
}


export async function updateCustomerStatus(customerId: string, status: 'active' | 'inactive'): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();
    await firestore.collection('customers').doc(customerId).update({ 
      status,
      updatedAt: FieldValue.serverTimestamp() 
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating customer status:", error);
    return { success: false, error: error.message || 'Không thể cập nhật trạng thái khách hàng.' };
  }
}

export async function generateCustomerTemplate(): Promise<{ success: boolean; error?: string; data?: string }> {
  try {
    const headers = [
      "name", "customerType", "phone", "email", "address", 
      "customerGroup", "gender", "birthday", "zalo", "creditLimit",
      "bankName", "bankAccountNumber", "bankBranch"
    ];
    const ws = xlsx.utils.aoa_to_sheet([headers]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Customers");
    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    return { success: true, data: buffer.toString('base64') };
  } catch (error: any) {
    console.error("Error generating customer template:", error);
    return { success: false, error: 'Không thể tạo file mẫu.' };
  }
}

export async function importCustomers(base64Data: string): Promise<{ success: boolean; error?: string; createdCount?: number }> {
  try {
    const { firestore } = await getAdminServices();
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const customersData = xlsx.utils.sheet_to_json(worksheet) as any[];

    if (customersData.length === 0) {
      return { success: false, error: "File không có dữ liệu." };
    }

    const batch = firestore.batch();
    let createdCount = 0;

    customersData.forEach(row => {
      const name = row.name;
      // Basic validation
      if (!name) {
        // We can add more complex validation later
        console.warn("Skipping row due to missing name:", row);
        return;
      }
      
      const newCustomerRef = firestore.collection('customers').doc();
      const newCustomer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
        name: row.name,
        customerType: row.customerType === 'business' ? 'business' : 'personal',
        status: 'active',
        phone: row.phone?.toString() || undefined,
        email: row.email || undefined,
        address: row.address || undefined,
        customerGroup: row.customerGroup || undefined,
        gender: ['male', 'female', 'other'].includes(row.gender) ? row.gender : undefined,
        birthday: row.birthday ? new Date(row.birthday).toISOString() : undefined,
        zalo: row.zalo?.toString() || undefined,
        bankName: row.bankName || undefined,
        bankAccountNumber: row.bankAccountNumber?.toString() || undefined,
        bankBranch: row.bankBranch || undefined,
        creditLimit: !isNaN(parseFloat(row.creditLimit)) ? parseFloat(row.creditLimit) : 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      batch.set(newCustomerRef, { ...newCustomer, id: newCustomerRef.id });
      createdCount++;
    });

    await batch.commit();

    return { success: true, createdCount };
  } catch (error: any) {
    console.error("Error importing customers:", error);
    return { success: false, error: error.message || 'Không thể nhập file khách hàng.' };
  }
}
