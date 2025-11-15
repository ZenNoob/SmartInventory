'use server'

import { CashTransaction } from "@/lib/types";
import { getAdminServices } from "@/lib/admin-actions";
import { FieldValue } from "firebase-admin/firestore";
import * as xlsx from 'xlsx';

export async function upsertCashTransaction(transaction: Partial<CashTransaction>): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();

    if (transaction.id) {
      // Update existing transaction
      const transactionRef = firestore.collection('cash_transactions').doc(transaction.id);
      await transactionRef.set(transaction, { merge: true });
    } else {
      // Create new transaction
      const transactionRef = firestore.collection('cash_transactions').doc();
      await transactionRef.set({ 
        ...transaction, 
        id: transactionRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error upserting cash transaction:", error);
    return { success: false, error: error.message || 'Không thể tạo hoặc cập nhật phiếu.' };
  }
}

export async function deleteCashTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = await getAdminServices();
    await firestore.collection('cash_transactions').doc(transactionId).delete();
    return { success: true };
  } catch (error: any) {
      console.error("Error deleting cash transaction:", error);
      return { success: false, error: error.message || 'Không thể xóa phiếu.' };
  }
}


export async function generateCashTransactionsExcel(transactions: CashTransaction[]): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const dataToExport = transactions.map((t, index) => ({
      'STT': index + 1,
      'Ngày': new Date(t.transactionDate).toLocaleDateString('vi-VN'),
      'Loại': t.type === 'thu' ? 'Thu' : 'Chi',
      'Số tiền': t.amount,
      'Lý do': t.reason,
      'Danh mục': t.category || '',
    }));
    
    const totalThu = transactions.filter(t => t.type === 'thu').reduce((acc, t) => acc + t.amount, 0);
    const totalChi = transactions.filter(t => t.type === 'chi').reduce((acc, t) => acc + t.amount, 0);

    const worksheet = xlsx.utils.json_to_sheet(dataToExport);

    // Add total rows
    xlsx.utils.sheet_add_aoa(worksheet, [
        [], // empty row
        ['Tổng thu', totalThu],
        ['Tổng chi', totalChi],
        ['Tồn quỹ', totalThu - totalChi]
    ], { origin: -1 });


    worksheet['!cols'] = [
      { wch: 5 },  // STT
      { wch: 15 }, // Ngày
      { wch: 10 }, // Loại
      { wch: 20 }, // Số tiền
      { wch: 40 }, // Lý do
      { wch: 20 }, // Danh mục
    ];

    const numberFormat = '#,##0';
    const lastDataRow = dataToExport.length + 1;
    for(let i = 2; i <= lastDataRow; i++) {
        worksheet[`D${i}`].z = numberFormat;
    }
    worksheet[`B${lastDataRow + 2}`].z = numberFormat;
    worksheet[`B${lastDataRow + 3}`].z = numberFormat;
    worksheet[`B${lastDataRow + 4}`].z = numberFormat;

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'SoQuy');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return { success: true, data: buffer.toString('base64') };
  } catch (error: any) {
    console.error("Error generating cash transactions excel:", error);
    return { success: false, error: 'Không thể tạo file excel.' };
  }
}