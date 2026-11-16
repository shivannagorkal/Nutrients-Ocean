import fs from 'fs';
import path from 'path';
import { pool } from '../db/index.js';
import { parseCSV, parseMDYDate, parseISTTimestamp, cleanCurrency } from './csv-parser.js';

export async function importSales(filePath, { dryRun = false } = {}) {
  console.log(`\n========================================`);
  console.log(`  NUTRIENTS OCEAN: SALES DATA IMPORT`);
  console.log(`  Mode: ${dryRun ? 'DRY-RUN (No changes saved)' : 'LIVE IMPORT'}`);
  console.log(`  File: ${filePath}`);
  console.log(`========================================\n`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found at path: ${filePath}`);
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} rows from CSV.`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Cache products and members
    const [prodRes, memRes] = await Promise.all([
      client.query('SELECT id, name, default_price FROM products;'),
      client.query('SELECT id, name FROM members;'),
    ]);

    const products = prodRes.rows;
    const members = memRes.rows;
    const otherProduct = products.find((p) => p.name.toLowerCase() === 'other');

    let insertedCount = 0;
    let skippedCount = 0;
    let totalSalesRupees = 0;
    let totalUnits = 0;
    const warnings = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1

      // 1. Resolve Date and Timestamp
      const rawDate = row['Date'] || row['Sale Date'] || row['Timestamp'] || '';
      if (!rawDate) {
        warnings.push(`Row ${rowNum}: Skipped due to missing date.`);
        continue;
      }

      let saleDate;
      try {
        saleDate = parseMDYDate(rawDate);
      } catch (err) {
        warnings.push(`Row ${rowNum}: Failed to parse date "${rawDate}": ${err.message}`);
        continue;
      }

      const timestamp = parseISTTimestamp(row['Timestamp'], saleDate);

      // 2. Resolve Product Sold
      const rawProduct = row['Product Sold'] || row['Product'] || row['Item'] || '';
      let matchedProduct = null;
      let listedPrice = null;

      // Extract product name and listed price (e.g. "Nightout Oats – ₹79")
      if (rawProduct.toLowerCase().includes('other')) {
        matchedProduct = otherProduct;
      } else {
        // Split by dash or rupee sign
        const cleanedName = rawProduct
          .replace(/[–—\-].*$/, '')
          .replace(/₹.*$/, '')
          .trim();

        matchedProduct = products.find(
          (p) => p.name.toLowerCase() === cleanedName.toLowerCase()
        );
      }

      if (!matchedProduct) {
        matchedProduct = otherProduct;
        warnings.push(`Row ${rowNum}: Unknown product "${rawProduct}", mapped to "Other".`);
      }

      const isMixed = matchedProduct?.name.toLowerCase() === 'other';

      // 3. Resolve Quantity
      const rawQty = row['Quantity'] || row['Qty'] || '1';
      const quantity = parseInt(rawQty, 10) || 1;

      // 4. Resolve Price per item (informational)
      const rawPrice = row['Price'] || row['Price per item'] || row['Rate'] || '';
      const pricePerItem = rawPrice ? cleanCurrency(rawPrice) : null;

      // 5. Resolve Total Amount Received (Source of Truth!)
      const rawTotal = row['Total Amount Received'] || row['Total Amount'] || row['Total'] || row['Amount'] || '';
      let totalAmount = cleanCurrency(rawTotal);

      if (totalAmount <= 0) {
        // Fallback to quantity * default price if totally missing
        totalAmount = quantity * (pricePerItem || matchedProduct.default_price || 0);
        warnings.push(`Row ${rowNum}: Zero or missing total amount, calculated fallback ₹${totalAmount}`);
      }

      // Check quantity vs total anomaly warning per Section 10
      if (quantity > 1 && pricePerItem && Math.abs(pricePerItem - totalAmount) < 0.01) {
        warnings.push(`Row ${rowNum}: Warning - Quantity is ${quantity} but price per item equals total amount (₹${totalAmount}).`);
      }

      // 6. Resolve Payment Method
      const rawPayment = (row['Payment Method'] || row['Payment'] || 'UPI').trim().toUpperCase();
      const paymentMethod = rawPayment === 'CASH' ? 'Cash' : 'UPI';

      // 7. Resolve Received By Member
      const rawMember = (row['Received By'] || row['Staff'] || row['Member'] || '').trim();
      let matchedMember = members.find(
        (m) => m.name.toLowerCase() === rawMember.toLowerCase()
      );

      if (!matchedMember) {
        // Default to first member with warning
        matchedMember = members[0];
        warnings.push(`Row ${rowNum}: Unknown member "${rawMember}", assigned to ${matchedMember.name}.`);
      }

      // 8. Notes
      const notes = (row['Notes'] || row['Remarks'] || '').trim() || null;

      // 9. Idempotency Check with import_row_ref
      const importRowRef = `sales:row_${rowNum}:${saleDate}:${totalAmount.toFixed(2)}:${matchedMember.id}`;

      const existingCheck = await client.query(
        'SELECT id FROM sales WHERE import_row_ref = $1 AND deleted_at IS NULL;',
        [importRowRef]
      );

      if (existingCheck.rows.length > 0) {
        skippedCount++;
        continue;
      }

      // 10. Insert Record
      await client.query(
        `INSERT INTO sales (
          timestamp, sale_date, product_id, quantity, price_per_item,
          total_amount, payment_method, received_by, notes, is_mixed,
          source, import_row_ref, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'import', $11, 'import-script')`,
        [
          timestamp,
          saleDate,
          matchedProduct.id,
          quantity,
          pricePerItem,
          totalAmount,
          paymentMethod,
          matchedMember.id,
          notes,
          isMixed,
          importRowRef,
        ]
      );

      insertedCount++;
      totalSalesRupees += totalAmount;
      totalUnits += quantity;
    }

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('🔄 DRY-RUN: Transaction rolled back. Database untouched.');
    } else {
      await client.query('COMMIT');
      console.log('✅ COMMIT: Sales data imported successfully.');
    }

    console.log(`\n--- IMPORT SUMMARY REPORT ---`);
    console.log(`Total rows read:        ${rows.length}`);
    console.log(`Rows inserted:          ${insertedCount}`);
    console.log(`Rows skipped (already): ${skippedCount}`);
    console.log(`Total Units Sold:       ${totalUnits}`);
    console.log(`Total Sales Revenue:    ₹${totalSalesRupees.toFixed(2)}`);
    console.log(`Warnings flagged:       ${warnings.length}`);
    if (warnings.length > 0) {
      console.log(`\nFirst 5 warnings:`);
      warnings.slice(0, 5).forEach((w) => console.log(`  * ${w}`));
    }

    return {
      totalRows: rows.length,
      insertedCount,
      skippedCount,
      totalSalesRupees,
      totalUnits,
      warnings,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Import failed and rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('import-sales.js')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArgIdx = args.findIndex((a) => a === '--file' || a === '-f');
  const filePath = fileArgIdx !== -1 ? args[fileArgIdx + 1] : args.find((a) => !a.startsWith('-'));

  if (!filePath) {
    console.error('Usage: npm run import:sales -- --file <path-to-csv> [--dry-run]');
    process.exit(1);
  }

  importSales(filePath, { dryRun })
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
