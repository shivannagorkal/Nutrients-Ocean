import fs from 'fs';
import path from 'path';
import { pool } from '../db/index.js';
import { parseCSV, parseMDYDate, parseISTTimestamp, cleanCurrency } from './csv-parser.js';

export async function importExpenses(filePath, { dryRun = false } = {}) {
  console.log(`\n========================================`);
  console.log(`  NUTRIENTS OCEAN: EXPENSES & INVESTMENTS DATA IMPORT`);
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

    // Cache categories and members
    const [catRes, memRes] = await Promise.all([
      client.query('SELECT id, name FROM expense_categories;'),
      client.query('SELECT id, name FROM members;'),
    ]);

    const categories = catRes.rows;
    const members = memRes.rows;
    const otherCategory = categories.find((c) => c.name.toLowerCase() === 'other');

    let insertedCount = 0;
    let skippedCount = 0;
    let totalRegularExpenses = 0;
    let totalInvestment = 0;
    const warnings = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1

      // 1. Resolve Date and Timestamp
      const rawDate = row['Date'] || row['Expense Date'] || row['Timestamp'] || '';
      if (!rawDate) {
        warnings.push(`Row ${rowNum}: Skipped due to missing date.`);
        continue;
      }

      let expenseDate;
      try {
        expenseDate = parseMDYDate(rawDate);
      } catch (err) {
        warnings.push(`Row ${rowNum}: Failed to parse date "${rawDate}": ${err.message}`);
        continue;
      }

      const timestamp = parseISTTimestamp(row['Timestamp'], expenseDate);

      // 2. Clean and Resolve Category (Strip leading "- ")
      const rawCategory = row['Category'] || row['Expense Category'] || '';
      const cleanCategoryName = rawCategory
        .replace(/^[\s\-–—]+/, '')
        .trim();

      let matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === cleanCategoryName.toLowerCase()
      );

      if (!matchedCategory) {
        matchedCategory = otherCategory;
        warnings.push(`Row ${rowNum}: Unknown category "${rawCategory}", mapped to "Other".`);
      }

      // 3. Resolve Description
      const rawDesc = row['Description'] || row['Particulars'] || row['Item'] || '';
      const description = rawDesc.trim() || `${matchedCategory.name} expense`;

      // 4. Resolve Amount
      const rawAmount = row['Amount'] || row['Amount Spent'] || row['Total'] || '';
      const amount = cleanCurrency(rawAmount);

      if (amount <= 0) {
        warnings.push(`Row ${rowNum}: Skipped row with zero or invalid amount "${rawAmount}".`);
        continue;
      }

      // 5. Match Expense Type by Prefix ("Regular Business Expen...")
      const rawType = (row['Expense Type'] || row['Type'] || 'Regular Business Expense').trim();
      let expenseType = 'Regular Business Expense';

      if (rawType.toLowerCase().startsWith('initial invest')) {
        expenseType = 'Initial Investment';
      } else if (rawType.toLowerCase().startsWith('regular business expen')) {
        expenseType = 'Regular Business Expense';
      }

      // 6. Resolve Payment Method
      const rawPayment = (row['Payment Method'] || row['Payment'] || '').trim().toLowerCase();
      let paymentMethod = 'UPI';

      if (rawPayment.includes('personal')) {
        paymentMethod = 'Personal Payment';
      } else if (rawPayment.includes('cash')) {
        paymentMethod = 'Cash';
      } else {
        paymentMethod = 'UPI';
      }

      // 7. Resolve Paid By Member
      const rawMember = (row['Paid By'] || row['Member'] || row['Staff'] || '').trim();
      let matchedMember = members.find(
        (m) => m.name.toLowerCase() === rawMember.toLowerCase()
      );

      if (!matchedMember) {
        matchedMember = members[0];
        warnings.push(`Row ${rowNum}: Unknown member "${rawMember}", assigned to ${matchedMember.name}.`);
      }

      // 8. Notes
      const notes = (row['Notes'] || row['Remarks'] || '').trim() || null;

      // 9. Idempotency Check with import_row_ref
      const importRowRef = `expenses:row_${rowNum}:${expenseDate}:${amount.toFixed(2)}:${matchedMember.id}`;

      const existingCheck = await client.query(
        'SELECT id FROM expenses WHERE import_row_ref = $1 AND deleted_at IS NULL;',
        [importRowRef]
      );

      if (existingCheck.rows.length > 0) {
        skippedCount++;
        continue;
      }

      // 10. Insert Record
      await client.query(
        `INSERT INTO expenses (
          timestamp, expense_date, category_id, description, amount,
          payment_method, paid_by, expense_type, notes, source,
          import_row_ref, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'import', $10, 'import-script')`,
        [
          timestamp,
          expenseDate,
          matchedCategory.id,
          description.substring(0, 500),
          amount,
          paymentMethod,
          matchedMember.id,
          expenseType,
          notes,
          importRowRef,
        ]
      );

      insertedCount++;
      if (expenseType === 'Initial Investment') {
        totalInvestment += amount;
      } else {
        totalRegularExpenses += amount;
      }
    }

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('🔄 DRY-RUN: Transaction rolled back. Database untouched.');
    } else {
      await client.query('COMMIT');
      console.log('✅ COMMIT: Expenses & Investments data imported successfully.');
    }

    console.log(`\n--- IMPORT SUMMARY REPORT ---`);
    console.log(`Total rows read:        ${rows.length}`);
    console.log(`Rows inserted:          ${insertedCount}`);
    console.log(`Rows skipped (already): ${skippedCount}`);
    console.log(`Regular Expenses:       ₹${totalRegularExpenses.toFixed(2)}`);
    console.log(`Initial Investments:    ₹${totalInvestment.toFixed(2)}`);
    console.log(`Warnings flagged:       ${warnings.length}`);
    if (warnings.length > 0) {
      console.log(`\nFirst 5 warnings:`);
      warnings.slice(0, 5).forEach((w) => console.log(`  * ${w}`));
    }

    return {
      totalRows: rows.length,
      insertedCount,
      skippedCount,
      totalRegularExpenses,
      totalInvestment,
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
if (process.argv[1]?.endsWith('import-expenses.js')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArgIdx = args.findIndex((a) => a === '--file' || a === '-f');
  const filePath = fileArgIdx !== -1 ? args[fileArgIdx + 1] : args.find((a) => !a.startsWith('-'));

  if (!filePath) {
    console.error('Usage: npm run import:expenses -- --file <path-to-csv> [--dry-run]');
    process.exit(1);
  }

  importExpenses(filePath, { dryRun })
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
