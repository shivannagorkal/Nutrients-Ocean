# 🌊 Nutrients Ocean – Product Requirements Document (PRD)
## Customer Ordering, Subscriptions, QR Pass & Finance Operating System (V2)

---

## 1. Executive Summary & Vision

### 1.1 Company Overview
**Nutrients Ocean** is a food and nutrition business delivering performance smoothies, protein bowls, healthy meal prep, wellness beverages, and nutrition supplements. The business was officially established on **November 10, 2026**, operating under **INR (₹)** currency and the **Asia/Kolkata** timezone.

The business manages daily retail and kitchen operations, inventory and ingredient procurement, customer subscriptions, and business reinvestment.

### 1.2 Problem Statement
Traditional food and beverage POS solutions and spreadsheet-based accounting tools suffer from critical gaps when applied to a fast-paced nutrition kitchen:
1. **Finished vs. Raw Disconnect:** When a smoothie or bowl is sold, naive systems deduct the finished item from inventory rather than the underlying raw materials (whey protein, almond milk, peanut butter, frozen berries). This creates complete blind spots in stock levels, ingredient waste, and actual Cost of Goods Sold (COGS).
2. **Payment Splitting & Reconciliations:** Customers frequently pay using a combination of Cash and UPI (e.g., PhonePe, Google Pay, Paytm). Without a real-time, double-entry cash ledger, daily cash drawer balances drift from bank statements.
3. **Imprecise Partial Refunds:** Standard systems fail to attribute partial product returns back to the original sale items, leading to tax/discount rounding discrepancies and incorrect inventory re-stocking.
4. **Capital & Reinvestment Blind Spots:** Without an integrated ledger tracking business capital injections and earmarked reinvestment reserves, cash allocation for equipment, bulk inventory, and expansion becomes unclear.

### 1.3 Vision & Objectives (V2 Goals)
The **Nutrients Ocean Platform V2** unifies three strictly separated applications over one audit-grade PostgreSQL + Prisma + Express backend (`Server/`):
- **`client/`** *(renamed from `landing/`)*: Public customer storefront (no login required to browse) with on-demand **Firebase Phone OTP authentication**, online food ordering (**Razorpay + Pay at Stall**), **30-serving monthly subscriptions** (with unlimited freeze/skip-day flexibility), and a **60-second rotating daily QR pass**.
- **`Admin/`**: Complete internal operations, QR counter scanner, and finance management portal (**Dashboard, Revenue, Expenses, Investments, Purchases, Inventory, Reinvestment, P&L Essential, Subscriptions, Advanced Analytics, and PDF/Excel Exports**).
- **`Server/`**: Single authoritative API and transactional ledger enforcing integer paise precision, recipe BOM depletion, and zero mock/fake data.

Key objectives:
- **Zero-Loss Cash & UPI Accounting:** Every single rupee inflow and outflow is immutably recorded in integer paise (`BIGINT`), eliminating floating-point rounding errors.
- **Recipe-Based Ingredient Depletion:** Real-time recipe execution deducts exact gram/milliliter quantities of raw ingredients upon sale and captures historical ingredient cost snapshots.
- **Audit-Grade Partial & Full Refunds:** Mathematical allocation of discounts and taxes using the Hamilton-Hare Largest Remainder method with optional ingredient restock.
- **Sequential Daily Closing:** Enforces day-by-day cash drawer and bank reconciliation with previous closing balance chaining and automated adjustment postings.
- **Transparent Investment & Reinvestment Tracking:** Clear accounting for business capital injections and earmarked growth reserves.

---

## 2. User Personas & Access Control

The platform enforces Role-Based Access Control (RBAC) via the `admins` table, segmented strictly into **two roles**:

| Role | Persona | Key Responsibilities | Primary Permissions |
| :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Business Owner | Full operational, financial, and strategic control. | Access to all financial statements (P&L, Cash Flow), investments & reinvestment approvals, analytics, PDF/Excel exports, user administration, and system configuration. |
| **`ADMIN`** | Store Manager / Staff | Day-to-day store operations, QR redemption, procurement, and end-of-day reconciliation. | Scan customer QR passes, fulfill orders, register POS sales, log ingredient purchases, record operating expenses, initiate internal cash transfers, execute daily closings, and process refunds. |

---

## 3. Product Principles & Non-Negotiable Constraints

1. **Integer Paise Financial Precision:** All monetary amounts are strictly stored as `BIGINT` representing integer paise (1 INR = 100 paise; e.g., ₹250.00 is stored as `25000`). Floating-point currency values are prohibited across database, API, and frontend calculation logic.
2. **Metric Base Units Only:** All raw ingredients and recipe components must be measured and inventoried exclusively in standard base units:
   - Mass: `GRAM`
   - Volume: `ML`
   - Discrete Count: `PCS`
3. **Database-Enforced Multi-Tenant Isolation:** Every table carries `business_id`. All foreign-key relationships utilize composite constraints `(business_id, foreign_key_id)` and PostgreSQL isolation triggers (`fn_enforce_cash_tx_business_isolation`) to prevent cross-business data leaks at the database engine level.
4. **Double-Entry Cash Ledger as Source of Truth:** `cash_transactions` is the authoritative ledger. Cash account balances can only be updated through verified ledger postings. Single-leg or unbalanced internal transfers are structurally rejected by deferred constraint triggers.
5. **Sequential Daily Closings:** Daily closings must occur sequentially without skipped dates. The opening balance of Day $T$ is strictly chained from the closing balance of Day $T-1$.

---

## 4. Functional Requirements & Feature Modules

### 4.1 Authentication & Business Multi-Tenancy
- **Admin Authentication:** Secure JWT-based authentication with bcrypt/Argon2 password hashing, token expiration, and refresh token rotation.
- **Business Profile:** Root organization model (`businesses`) capturing `Nutrients Ocean`, start date `2026-11-10`, currency `INR`, and timezone `Asia/Kolkata`.
- **Audit Logging:** Every financial mutation, sale void, and manual adjustment logs an entry in `audit_logs` detailing table name, record ID, admin ID, IP address, timestamp, and JSON before/after state diffs.

### 4.2 Business Investments & Reinvestment Management
- **Capital Investments:** Tracks initial capital contributions and subsequent injections into the business, linking directly to cash accounts (`PHYSICAL_CASH`, `UPI_DIGITAL`, `BANK_CURRENT`) with `INVESTMENT_INFLOW` ledger postings.
- **Reinvestment Allocations:** Allows reserving profits for business growth (`EQUIPMENT_EXPANSION`, `MARKETING_RESERVE`, `BULK_INVENTORY_RESERVE`, `EMERGENCY_RESERVE`, `NEW_BRANCH_CAPEX`), locking earmarked funds inside business reserves.

### 4.3 Product Catalog & Recipe Engine
- **Product Categorization:** Supports four distinct product types:
  - `FINISHED_PRODUCT`: Ready-to-serve items sold to customers (e.g., "Protein Power Smoothie", "Acai Muscle Bowl").
  - `RAW_INGREDIENT`: Stock items used strictly in recipes (e.g., "Whey Isolate Vanilla", "Almond Butter", "Chia Seeds").
  - `RETAIL_READY`: Packaged merchandise sold directly without recipe transformation (e.g., "Electrolyte Sachet", "Protein Bar").
  - `PACKAGING`: Consumables utilized during serving (e.g., "Smoothie Cup 500ml", "Wooden Spoon", "Paper Bag").
- **Recipe Formulation (`recipes` & `recipe_items`):**
  - Defines the exact bill of materials for finished products with target yield quantity and yield unit.
  - Links ingredient products to recipes with exact `quantity_required` in base units (`GRAM`, `ML`, `PCS`).
  - Unit consistency check: Database and API reject any recipe item whose unit diverges from the ingredient's registered base unit.
- **Automated Sales Consumption (`sale_item_ingredients`):**
  - When a finished product is sold, the backend automatically looks up the active recipe and deducts proportional raw ingredients from `inventory`.
  - Captures an immutable snapshot of ingredient name, unit cost, and total cost at the exact moment of sale.
  - If a sellable finished product lacks an active recipe, the transaction falls back to finished-good tracking with an operational warning log.

### 4.4 Sales & Point-of-Sale (POS) Operations
- **Sale Creation:** Captures customer details (optional name/phone), date, line items, item discounts, bill-level discounts, and taxes.
- **Payment Split Support:** Direct support for `CASH`, `UPI`, `BANK_TRANSFER`, and `MIXED_SPLIT`. In mixed mode, exact cash and UPI split amounts are validated:
  $$\text{cashAmountPaise} + \text{upiAmountPaise} = \text{totalAmountPaise}$$
- **Atomic Execution:** In a single database transaction:
  1. Creates the `sales` master record.
  2. Inserts line items in `sale_items`.
  3. Executes recipe ingredient deductions in `inventory` and logs `stock_movements` with type `SALE_RECIPE_CONSUMPTION`.
  4. Posts corresponding `CREDIT` entries in `cash_transactions` (`SALE_REVENUE`) for the cash drawer and/or UPI account.
- **Idempotency Protection:** Enforces `idempotency_key` on sales submission to eliminate double-charging under unstable network conditions.

### 4.5 Purchases & Operating Expenses
- **Stock Procurement (`purchases` & `purchase_items`):**
  - Records raw ingredient and retail stock purchases from vendors.
  - Updates inventory levels (`PURCHASE_RECEIPT`) and recalculates the Moving Average Cost (MAC):
    $$\text{New Average Unit Cost} = \frac{(\text{Current Qty} \times \text{Current MAC}) + (\text{Received Qty} \times \text{Purchase Unit Cost})}{\text{Current Qty} + \text{Received Qty}}$$
- **Operational Expenses (`expenses`):**
  - Tracks non-inventory business overhead across standardized categories: `RENT`, `ELECTRICITY`, `WATER`, `STAFF_SALARY`, `MARKETING_PROMOTIONS`, `REPAIRS_MAINTENANCE`, `LICENSES_PERMITS`, `CLEANING_SUPPLIES`, `PACKAGING_OVERHEAD`, `SOFTWARE_SUBSCRIPTION`, and `MISCELLANEOUS`.
- **Reusable Payment Lifecycle (`payments`):**
  - Purchases and expenses support multiple partial payments over time.
  - Tracks `paid_amount_paise` and `balance_amount_paise`.
  - Automatically transitions status: `UNPAID` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `PAID`.
  - Generates verified `DEBIT` entries in `cash_transactions` for each payment instalment.

### 4.6 Partial & Full Refund Workflow
- **Item-Level Refund Line Items (`refund_items`):**
  - Refunds reference specific `sale_items` with quantity to refund.
  - Validates cumulative refund limits under concurrent requests:
    $$\sum \text{Refunded Qty} \le \text{Original Sale Qty}$$
    $$\sum \text{Refunded Amount} \le \text{Original Net Line Amount}$$
- **Hamilton-Hare Largest Remainder Method:**
  - Proportional bill-level discounts and taxes are distributed across refunded line items without 1-paise rounding leaks or mathematical drift.
- **Optional Inventory Restocking:**
  - Cashier selects `restock_inventory = true` only if the item was unopened or returned to stock.
  - Generates `REFUND_RESTOCK` stock movement and updates inventory quantity on hand.
- **Cash Ledger Reversal:**
  - Automatically posts a `DEBIT` entry in `cash_transactions` (`CUSTOMER_REFUND`) linked to the refund record and target cash/UPI account.
  - Updates sale status to `PARTIALLY_REFUNDED` or `REFUNDED`.

### 4.7 Cash Account Management & Atomic Internal Transfers
- **Account Types:**
  - `PHYSICAL_CASH`: Physical cash drawer / till at the retail counter.
  - `UPI_DIGITAL`: Merchant QR accounts (PhonePe, Google Pay, Paytm, BharatPe).
  - `BANK_CURRENT`: Primary commercial checking bank account.
- **Atomic Internal Transfers (`cash_transfers`):**
  - Transfers between accounts (e.g., depositing end-of-day cash into the bank, or transferring UPI funds to current account).
  - Enforces database constraint: Source and destination accounts must be distinct.
  - Database deferred constraint triggers require exactly two entries at commit:
    - 1 `DEBIT` on source account for exact `amount_paise`.
    - 1 `CREDIT` on destination account for exact `amount_paise`.
  - Rejection of single-leg inserts, updates, or deletes.

### 4.8 Sequential Daily Closing & Audit Reconciliation
- **Strict Date Sequencing:**
  - Closing Day $T$ requires Day $T-1$ to be closed (`RECONCILED` or `DISCREPANCY_FLAGGED`). Gaps are strictly blocked.
- **Chained Opening Balances:**
  - Opening balance for each account on Day $T$ is automatically loaded from the closing balance of Day $T-1$ or the verified ledger state.
- **Account Reconciliation Matrix:**
  - Computes expected balance per account:
    $$\text{Expected} = \text{Opening} + \text{Inflows (Sales, Investments, Transfers In)} - \text{Outflows (Purchases, Expenses, Refunds, Transfers Out)}$$
  - Cashier enters actual physical count (cash breakdown) and UPI/bank closing statement balances.
  - Computes Discrepancy:
    $$\text{Discrepancy} = \text{Actual} - \text{Expected}$$
- **Automated Ledger Adjustment Postings:**
  - If discrepancy is non-zero, the system posts a balancing `RECONCILIATION_ADJUSTMENT` cash transaction (`CREDIT` for cash overage, `DEBIT` for cash shortage) linked to `daily_closing_id`, ensuring the ledger stays synchronized with reality.

### 4.9 Financial Reporting & Business Analytics
- **Live Profit & Loss (P&L) Statement:**
  - Operating Revenue (Gross Sales - Discounts - Refunds).
  - Cost of Goods Sold (Recipe ingredient consumption costs + direct retail product costs).
  - Gross Profit & Gross Margin Percentage.
  - Operating Expenses (by category).
  - Net Operating Profit.
- **Recipe Margin Analyzer:**
  - Compares selling price vs. real-time ingredient BOM cost for every menu item.
  - Visualizes contribution margin and highlights ingredients driving cost spikes.
- **Daily Cash Flow Statement:**
  - Inflows vs. Outflows across Physical Cash, UPI, and Bank channels.
- **Investments & Reinvestment Summary:**
  - Total capital injected into the business, earmarked reinvestment reserves, and retained business cash position.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Data Integrity & Precision
- **Financial Arithmetic:** BigInt representation in paise for 100% precision. Zero IEEE-754 floating-point usage.
- **Inventory Units:** Decimal precision of 4 decimal places (`Decimal(14, 4)`) for metric weights and volumes (e.g., `0.0250` kg or `15.5000` grams).
- **Referential Integrity:** Enforced by PostgreSQL composite foreign keys and deferred triggers.

### 5.2 Performance & Scalability
- **Sub-100ms API Latency:** POS sale checkout and cash balance queries complete in under 100ms.
- **Optimized Indexes:** Composite B-tree indexes on `(business_id, date)`, `(business_id, transaction_date)`, `(business_id, product_id)`, and `(business_id, cash_account_id)`.
- **Connection Pooling:** Managed PostgreSQL connection pool via Prisma ORM with connection timeout safeguards.

### 5.3 Security & Auditability
- **Authentication:** Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 or RS256, with short expiration (15 mins) and secure HTTP-only refresh cookies.
- **Password Security:** Scrypt or Argon2id password hashing with unique salts.
- **Data Isolation:** All queries filter on `business_id` verified from authenticated session tokens.
- **Immutable Audit Trail:** Cash transactions and stock movements cannot be modified or deleted directly; reversals and voids must be executed via paired offsetting transactions.

---

## 6. V2 Scope & Full Platform Feature Matrix

| Module / Area | Workspace | Implemented Scope |
| :--- | :--- | :--- |
| **Public Storefront** | `client/` | Public home, `/menu`, `/why-us`, `/app`, legal pages — **no login required to browse**. |
| **Customer Auth** | `client/` + `Server/` | On-demand **Firebase Phone OTP** triggered only at checkout, subscription purchase, or `/account` & `/pass`. Verified server-side via `firebase-admin` -> HTTP-only `CUSTOMER` JWT cookie (`aud: "customer"`). |
| **Online Food Ordering** | `client/` + `Server/` | Single items (`Normal Sandwich`, `Dry Fruit Sandwich`, `High Protein Oats`, `Nightout Oats` + Strawberry/Chocolate flavors), Morning (6–8 AM) / Evening (5–8 PM) slot, Stall Pickup (Free) or 2 KM Delivery (`₹5 / ₹10 / ₹15`). Supports **Razorpay** and **Pay at Stall**. |
| **Monthly Subscriptions & Unlimited Freeze** | `client/` + `Server/` | **30-serving plans** (Individual ₹1,199–₹2,699 & Combo ₹2,999–₹3,999) paid via **Razorpay**. Strictly **1 serving per day**, with **unlimited freeze/skip days** (no max expiry cap — user collects all 30 items whenever they come). |
| **Daily-Updating QR Pass & Counter Scanner** | `client/` + `Admin/` + `Server/` | **Option 1:** Customer `/pass` displays an HMAC-SHA256 QR rotating every **60s** + daily (IST). Staff scans via `Admin/` `/scan` camera scanner inside a `Serializable` DB lock (`@@unique([subscriptionId, redemptionDate])`), deducting recipe ingredients automatically. |
| **Admin Dashboard & Revenue** | `Admin/` + `Server/` | Live KPIs (gross/net revenue, net profit, Cash/UPI/Bank balances, active subscribers, prep forecast), POS Cash/UPI/Split sales, online Razorpay orders, subscription revenues, Hamilton-Hare partial/full refunds. |
| **Admin Expenses, Purchases & Inventory** | `Admin/` + `Server/` | Categorized expenses + multi-instalment payments, vendor purchases with Moving Average Cost (MAC), `FINISHED_PRODUCT`/`RAW_INGREDIENT`/`RETAIL_READY`/`PACKAGING` stock, Recipe BOM studio, wastage/count adjustments. |
| **Admin Investments, Reinvestment & P&L Essential** | `Admin/` + `Server/` | Business capital injections (`INVESTMENT_INFLOW`), earmarked reserves (`EQUIPMENT_EXPANSION`, `MARKETING_RESERVE`, `BULK_INVENTORY_RESERVE`, `EMERGENCY_RESERVE`, `NEW_BRANCH_CAPEX`), live P&L statement, Cash Flow, and Sequential Daily Closing. |
| **Admin Subscriptions, Advanced Analytics & Exports** | `Admin/` + `Server/` | Subscriber directory, daily redemption logs, freeze/kitchen prep forecast, margin & ingredient cost-spike analytics, slot/fulfillment analytics, and **server-verified PDF & Excel (`.xlsx`) exports** across all financial and operational reports. |
