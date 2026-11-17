import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { pool } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadXLSX() {
  const xlsxPath = path.resolve(__dirname, '../../node_modules/xlsx/xlsx.mjs');
  return await import(pathToFileURL(xlsxPath).href);
}

function parseMDY(s) {
  if (!s) return null;
  const clean = String(s).trim().split(' ')[0];
  const parts = clean.split('/');
  if (parts.length === 3) {
    let m = parseInt(parts[0], 10);
    let d = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return clean;
}

function parseISTTimestamp(ts, fallbackDate) {
  if (!ts) return `${fallbackDate}T12:00:00+05:30`;
  const clean = String(ts).trim();
  const parts = clean.split(' ');
  const dStr = parseMDY(parts[0]);
  let tStr = parts[1] || '12:00:00';
  const tParts = tStr.split(':');
  const hh = String(parseInt(tParts[0] || '12', 10)).padStart(2, '0');
  const mm = String(parseInt(tParts[1] || '0', 10)).padStart(2, '0');
  const ss = String(parseInt(tParts[2] || '0', 10)).padStart(2, '0');
  return `${dStr}T${hh}:${mm}:${ss}+05:30`;
}

function parseQuantity(raw) {
  if (!raw) return 1;
  const s = String(raw).trim();
  if (s === '3/4') return 4;
  if (s === '15 to 18') return 18;
  if (s === '2 and 1') return 3;
  if (s === '2/3') return 2;
  const n = parseInt(s, 10);
  return isNaN(n) || n <= 0 ? 1 : n;
}

function parsePrice(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export async function runNewImport() {
  const XLSX = await loadXLSX();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`\n======================================================`);
    console.log(`  NUTRIENTS OCEAN: IMPORTING 2 NEW EXCEL FILES`);
    console.log(`======================================================\n`);

    // 1. Ensure Combo Product in DB
    const comboCheck = await client.query(
      "SELECT id FROM products WHERE name ILIKE '%Combo%';"
    );
    if (comboCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO products (name, default_price, is_active)
        VALUES ('High Protein Oats + Dry Fruit Sandwich Combo', 119.00, true);
      `);
      console.log('Added product: High Protein Oats + Dry Fruit Sandwich Combo (₹119)');
    }

    // 2. Ensure Packaging Materials Category in DB
    const catCheck = await client.query(
      "SELECT id FROM expense_categories WHERE name ILIKE '%Packaging%';"
    );
    if (catCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO expense_categories (name)
        VALUES ('Packaging Materials');
      `);
      console.log('Added category: Packaging Materials');
    }

    // Cache products, categories, members
    const prodRes = await client.query('SELECT id, name, default_price FROM products;');
    const catRes = await client.query('SELECT id, name FROM expense_categories;');
    const memRes = await client.query('SELECT id, name FROM members;');

    const products = prodRes.rows;
    const categories = catRes.rows;
    const members = memRes.rows;

    const memberShivanna = members.find((m) => m.name.includes('Shivanna'));
    const memberSachin = members.find((m) => m.name.includes('Sachin'));
    const memberUday = members.find((m) => m.name.includes('Uday'));
    const productOther = products.find((p) => p.name === 'Other');
    const categoryOther = categories.find((c) => c.name === 'Other');

    // -------------------------------------------------------------------------
    // 1. IMPORT SALES
    // -------------------------------------------------------------------------
    const salesFile = path.resolve('D:/Nutrients Ocean/Nutrients Ocean – Daily Sales Entry 🌊 (Responses) (1).xlsx');
    const salesBuf = fs.readFileSync(salesFile);
    const salesWb = XLSX.read(salesBuf, { type: 'buffer' });
    const salesRows = XLSX.utils.sheet_to_json(salesWb.Sheets[salesWb.SheetNames[0]], { header: 1, raw: false });

    console.log(`Processing Sales Sheet (${salesRows.length} total rows in array)...`);
    let salesCount = 0;
    let salesTotalAmount = 0;
    let salesUnitsTotal = 0;

    for (let i = 1; i < salesRows.length; i++) {
      const row = salesRows[i];
      if (!row || !row[0] || !row[1] || !row[2]) {
        // Skip empty or summary rows
        continue;
      }

      const rawTimestamp = row[0];
      const rawDate = row[1];
      const rawProduct = row[2] || '';
      const rawQty = row[3];
      const rawPrice = row[4];
      const rawTotal = row[5];
      const rawPayment = row[6] || 'UPI';
      const rawMember = row[7] || '';
      const rawNotes = row[8] || '';

      const saleDate = parseMDY(rawDate);
      const timestamp = parseISTTimestamp(rawTimestamp, saleDate);

      // Match Product
      let matchedProd = productOther;
      const pLower = rawProduct.toLowerCase();
      if (pLower.includes('combo')) {
        matchedProd = products.find((p) => p.name.includes('Combo')) || productOther;
      } else if (pLower.includes('nightout')) {
        matchedProd = products.find((p) => p.name.includes('Nightout')) || productOther;
      } else if (pLower.includes('high protein')) {
        matchedProd = products.find((p) => p.name.includes('High Protein')) || productOther;
      } else if (pLower.includes('dry fruit')) {
        matchedProd = products.find((p) => p.name.includes('Dry Fruit')) || productOther;
      } else if (pLower.includes('normal sandwich')) {
        matchedProd = products.find((p) => p.name.includes('Normal')) || productOther;
      }

      const isMixed = matchedProd.name === 'Other';
      const quantity = parseQuantity(rawQty);
      const pricePerItem = parsePrice(rawPrice);
      const totalAmount = parseFloat(String(rawTotal).trim()) || 0;
      const paymentMethod = rawPayment.toUpperCase().includes('CASH') ? 'Cash' : 'UPI';

      let receivedBy = memberShivanna.id;
      if (rawMember.toLowerCase().includes('sachin')) {
        receivedBy = memberSachin.id;
      } else if (rawMember.toLowerCase().includes('uday')) {
        receivedBy = memberUday.id;
      }

      const notes = rawNotes ? String(rawNotes).trim() : null;
      const importRef = `sales:excel_v2:row_${i + 1}:${saleDate}:${timestamp}:${totalAmount}`;

      await client.query(
        `INSERT INTO sales (
          timestamp, sale_date, product_id, quantity, price_per_item,
          total_amount, payment_method, received_by, notes, is_mixed,
          source, import_row_ref, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'import', $11, 'excel-import')`,
        [
          timestamp,
          saleDate,
          matchedProd.id,
          quantity,
          pricePerItem,
          totalAmount,
          paymentMethod,
          receivedBy,
          notes,
          isMixed,
          importRef,
        ]
      );

      salesCount++;
      salesTotalAmount += totalAmount;
      salesUnitsTotal += quantity;
    }

    console.log(`✅ Sales Imported: ${salesCount} rows | Total Revenue: ₹${salesTotalAmount.toFixed(2)} | Total Units: ${salesUnitsTotal}`);

    // -------------------------------------------------------------------------
    // 2. IMPORT EXPENSES & INVESTMENTS
    // -------------------------------------------------------------------------
    const expFile = path.resolve('D:/Nutrients Ocean/Nutrients Ocean – Expense & Investment Entry 💰 (Responses) (1).xlsx');
    const expBuf = fs.readFileSync(expFile);
    const expWb = XLSX.read(expBuf, { type: 'buffer' });
    const expRows = XLSX.utils.sheet_to_json(expWb.Sheets[expWb.SheetNames[0]], { header: 1, raw: false });

    console.log(`Processing Expenses Sheet (${expRows.length} total rows in array)...`);
    let expCount = 0;
    let expRegularTotal = 0;
    let expInvestTotal = 0;

    for (let i = 1; i < expRows.length; i++) {
      const row = expRows[i];
      if (!row || !row[0] || !row[1] || !row[2]) {
        // Skip empty rows
        continue;
      }

      const rawTimestamp = row[0];
      const rawDate = row[1];
      const rawCategory = row[2] || '';
      const rawDesc = row[3] || '';
      const rawAmount = row[4];
      const rawPayment = row[5] || 'UPI';
      const rawMember = row[6] || '';
      const rawType = row[7] || 'Regular Business Expense';
      const rawNotes = row[8] || '';

      const expenseDate = parseMDY(rawDate);
      const timestamp = parseISTTimestamp(rawTimestamp, expenseDate);

      // Clean category name
      const cleanCatName = rawCategory.replace(/^[\s\-–—]+/, '').trim().toLowerCase();
      let matchedCategory = categories.find((c) => c.name.toLowerCase() === cleanCatName);
      if (!matchedCategory) {
        matchedCategory = categoryOther;
      }

      const amount = parseFloat(String(rawAmount).trim()) || 0;
      const description = String(rawDesc).trim() || `${matchedCategory.name} expense`;

      // Match Expense Type
      let expenseType = 'Regular Business Expense';
      if (rawType.toLowerCase().includes('initial')) {
        expenseType = 'Initial Investment';
      }

      // Match Payment Method
      let paymentMethod = 'UPI';
      const pLower = rawPayment.toLowerCase();
      if (pLower.includes('personal')) {
        paymentMethod = 'Personal Payment';
      } else if (pLower.includes('cash')) {
        paymentMethod = 'Cash';
      }

      // Match Member
      let paidBy = memberShivanna.id;
      if (rawMember.toLowerCase().includes('sachin')) {
        paidBy = memberSachin.id;
      } else if (rawMember.toLowerCase().includes('uday')) {
        paidBy = memberUday.id;
      }

      const notes = rawNotes ? String(rawNotes).trim() : null;
      const importRef = `expenses:excel_v2:row_${i + 1}:${expenseDate}:${timestamp}:${amount}`;

      await client.query(
        `INSERT INTO expenses (
          timestamp, expense_date, category_id, description, amount,
          payment_method, paid_by, expense_type, notes, source,
          import_row_ref, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'import', $10, 'excel-import')`,
        [
          timestamp,
          expenseDate,
          matchedCategory.id,
          description.substring(0, 500),
          amount,
          paymentMethod,
          paidBy,
          expenseType,
          notes,
          importRef,
        ]
      );

      expCount++;
      if (expenseType === 'Initial Investment') {
        expInvestTotal += amount;
      } else {
        expRegularTotal += amount;
      }
    }

    console.log(`✅ Expenses Imported: ${expCount} rows | Regular: ₹${expRegularTotal.toFixed(2)} | Sheet Investments: ₹${expInvestTotal.toFixed(2)}`);

    await client.query('COMMIT');
    console.log('\n🎉 ALL DATA SUCCESSFULLY COMMITTED TO POSTGRESQL DATABASE!');

    // -------------------------------------------------------------------------
    // FINAL RECONCILIATION QUERY
    // -------------------------------------------------------------------------
    const finalSales = await client.query('SELECT COUNT(*), SUM(total_amount), SUM(quantity) FROM sales;');
    console.log('\n--- FINAL SALES IN DATABASE ---');
    console.log(`Count: ${finalSales.rows[0].count} | Total Sales: ₹${finalSales.rows[0].sum} | Total Units: ${finalSales.rows[0].sum_1 || finalSales.rows[0].sum}`);

    const finalExp = await client.query('SELECT expense_type, COUNT(*), SUM(amount) FROM expenses GROUP BY expense_type;');
    console.log('--- FINAL EXPENSES IN DATABASE ---');
    console.log(finalExp.rows);

    const partnerInvestments = await client.query(`
      SELECT m.name, SUM(e.amount) as total_invested
      FROM expenses e
      JOIN members m ON e.paid_by = m.id
      WHERE e.expense_type = 'Initial Investment'
      GROUP BY m.name;
    `);
    console.log('--- TOTAL INITIAL INVESTMENTS BY PARTNER ---');
    console.log(partnerInvestments.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runNewImport().catch((e) => {
  console.error(e);
  process.exit(1);
});
