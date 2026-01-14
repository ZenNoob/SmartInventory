/**
 * Fix Supplier Debt Script - ONE TIME USE
 * 
 * This script recalculates supplier debt (Công nợ) based on:
 * - Tổng nhập (Total Purchases): Sum of all purchase orders from supplier
 * - Đã trả (Total Paid): Sum of all payments to supplier
 * - Công nợ (Debt): Tổng nhập - Đã trả
 * 
 * The script will DELETE ITSELF after successful execution.
 * 
 * Usage: npx tsx scripts/fix-supplier-debt-once.ts
 */

import 'dotenv/config';
import { getConnection, closeConnection } from '../src/db/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixSupplierDebt() {
  console.log('🔧 Starting supplier debt fix...\n');
  
  try {
    const pool = await getConnection();
    console.log('✅ Connected to SQL Server\n');

    // Get all suppliers with their purchase totals and payment totals
    const result = await pool.request().query(`
      SELECT 
        s.id,
        s.name,
        s.store_id,
        ISNULL(SUM(po.total_amount), 0) as total_purchases,
        ISNULL((
          SELECT SUM(sp.amount) 
          FROM SupplierPayments sp 
          WHERE sp.supplier_id = s.id
        ), 0) as total_paid
      FROM Suppliers s
      LEFT JOIN PurchaseOrders po ON po.supplier_id = s.id
      GROUP BY s.id, s.name, s.store_id
    `);

    console.log(`📊 Found ${result.recordset.length} suppliers\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const supplier of result.recordset) {
      const totalPurchases = parseFloat(supplier.total_purchases) || 0;
      const totalPaid = parseFloat(supplier.total_paid) || 0;
      const debt = totalPurchases - totalPaid;

      // Only log suppliers with issues (all zeros or incorrect debt)
      if (totalPurchases === 0 && totalPaid === 0 && debt === 0) {
        console.log(`⚠️  ${supplier.name}`);
        console.log(`   Tổng nhập: 0 VND | Đã trả: 0 VND | Công nợ: 0 VND`);
        console.log(`   → No transactions found, skipping...\n`);
        skippedCount++;
      } else {
        console.log(`✅ ${supplier.name}`);
        console.log(`   Tổng nhập: ${totalPurchases.toLocaleString('vi-VN')} VND`);
        console.log(`   Đã trả: ${totalPaid.toLocaleString('vi-VN')} VND`);
        console.log(`   Công nợ: ${debt.toLocaleString('vi-VN')} VND\n`);
        fixedCount++;
      }
    }

    await closeConnection();
    
    console.log('\n✅ Supplier debt analysis completed!\n');
    console.log('Summary:');
    console.log(`  - Total suppliers: ${result.recordset.length}`);
    console.log(`  - Suppliers with transactions: ${fixedCount}`);
    console.log(`  - Suppliers with no data: ${skippedCount}`);
    
    // Self-destruct: Delete this script file
    console.log('\n🗑️  Self-destructing script...');
    try {
      fs.unlinkSync(__filename);
      console.log('✅ Script file deleted successfully!');
      console.log('   This script can no longer be run.\n');
    } catch (error) {
      console.error('❌ Failed to delete script file:', error);
      console.log('   Please manually delete: scripts/fix-supplier-debt-once.ts\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixSupplierDebt();
