# Nutrients Ocean – Sales & Expense Dashboard: Build Plan

Prepared 14 Nov 2026 · For the development team · Version 1.1 (final, all recommended decisions adopted)

## 1. Goal and scope

Replace the two Google Sheets (Daily Sales Entry and Expense & Investment Entry) with a secure web app backed by a database. The app has two jobs:

1. **Data entry and log**: add, edit and delete sales and expense records (replaces Google Forms).
2. **Dashboard**: show revenue, expenses, net, investment, payback, partner balances and growth graphs by day, week and month.

Out of scope for v1: inventory, GST/tax reports, customer management, multi-business support, email/WhatsApp alerts.

## 2. Final decisions

These choices are settled. Developers should build to them without further confirmation.

| # | Decision | Final choice |
| --- | --- | --- |
| 1 | Database | **PostgreSQL on Neon.** Parameterized queries and DB constraints. MongoDB is not used, so the NoSQL-injection notes in Section 11 apply only if that changes. |
| 2 | Data entry | **In-app forms** replace Google Forms. The forms are retired after the one-time import. |
| 3 | Settlements | **Separate Settlements table** with Date, Paid By, Paid To, Amount, Notes and its own form. Never stored in Expenses. The owner supplies the list of past reimbursements for import. |
| 4 | Expenses paid by UPI or Cash | A regular expense that is not a Personal Payment always reduces the Estimated revenue balance (treated as paid from the business account, Shivanna’s). Any later repayment between members is recorded as a Settlement. |
| 5 | Week definition | Monday to Sunday, in IST. |
| 6 | User roles | All fixed users have full access. Every create, update and delete goes to the audit log. A read-only role is deferred. |
| 7 | Deleting records | Soft delete (hidden, recoverable), never hard delete. |
| 8 | Sachin’s two ₹1,000 investments | Import both rows as in the sheet (total investment ₹7,248). Data check flags them as a possible duplicate, and the owner deletes one in the app if it is a duplicate. |
| 9 | Hosting | Frontend on Vercel or Netlify, backend on Render or Railway, DB on Neon in the region closest to India. HTTPS everywhere. |
| 10 | Products and prices | Stored in a Products table, editable in Settings (Nightout Oats ₹79, High Protein Oats ₹99, Dry Fruit Sandwich ₹59, Normal Sandwich ₹49, plus “Other”). |
| 11 | Login passwords | Fixed users and **bcrypt hashes** in env, generated with `npm run hash-password`. Plain passwords are never stored. |

**Inputs the owner provides before go-live:** (a) a full CSV export of both sheets with all filters cleared, (b) the list of past settlements, (c) the allowed emails and passwords, shared privately with the developer who creates the hashes.

## 3. Tech stack

**Frontend (admin dashboard):** React + Vite + TypeScript, Tailwind CSS, Recharts, React Router, TanStack Query (data fetching and caching), React Hook Form + Zod (forms), date-fns.

**Backend:** Node.js + Express + TypeScript, Zod (validation of every request), Morgan (request logging), CORS (locked to the frontend origin), Helmet (security headers), express-rate-limit, bcrypt, jsonwebtoken, cookie-parser, hpp.

**Database access:** `pg` (or Drizzle ORM) with parameterized queries only. Migrations with a tool such as Drizzle Kit or node-pg-migrate.

**Testing:** Vitest/Jest for metric calculations (the most important tests), Supertest for API tests.

## 4. Data model (PostgreSQL)

All money is `NUMERIC(12,2)` in rupees. Dates are `DATE` in IST. Timestamps are `TIMESTAMPTZ`. Every table has `id` (UUID or bigserial), `created_at`, `updated_at`, `created_by`, and `deleted_at` (soft delete) where relevant.

**members**: id, name (unique), email (nullable). Seed: Shivanna Gorkal, Uday K S, Sachin Kumar Dadmi.

**products**: id, name (unique, e.g. “Nightout Oats”), default\_price, is\_active. The special product “Other” represents mixed orders.

**expense\_categories**: id, name (unique, clean names without leading dashes). Seen so far: Fruits & Dry Fruits, Milk & Dairy Products, Ingredients / Raw Materials, Stall Maintenance, Equipment / Furniture, Other.

**sales**: id, timestamp, sale\_date, product\_id, quantity (int > 0), price\_per\_item (nullable, informational only), total\_amount (> 0, the source of truth), payment\_method (`UPI` | `Cash`), received\_by (member\_id), notes, is\_mixed (true when product is “Other”), source (`app` | `import`), import\_row\_ref.

**expenses**: id, timestamp, expense\_date, category\_id, description, amount (> 0), payment\_method (`UPI` | `Cash` | `Personal Payment`), paid\_by (member\_id), expense\_type (`Regular Business Expense` | `Initial Investment`), notes, source, import\_row\_ref.

**settlements**: id, settlement\_date, amount (> 0), paid\_by (member\_id), paid\_to (member\_id, must differ from paid\_by), notes.

**audit\_log**: id, user\_email, action (create/update/delete/login/logout), entity, entity\_id, before (JSONB), after (JSONB), at.

**Indexes:** sales(sale\_date), expenses(expense\_date), expenses(expense\_type), expenses(paid\_by), settlements(paid\_to). Partial indexes where `deleted_at IS NULL`.

## 5. Metric definitions (single source of truth)

All metrics are computed on the server in one module (`metrics.ts`) with unit tests, and the frontend never recalculates. Ignore soft-deleted rows. A range is inclusive of both dates.

| Metric | Definition |
| --- | --- |
| Sales | Sum of `total_amount`. Money actually received. **Never** recalculate from quantity × price (customers may pay ₹100 for a ₹99 item). |
| Orders | Count of sales rows. |
| Items sold | Sum of `quantity`. |
| Average per order | Sales ÷ Orders (0 if no orders). |
| Product units and sales | Group by product: units = sum of quantity, sales = sum of total. |
| Mixed / other orders | Rows where product is “Other”. They count in Sales, Orders and Items sold, and show as their own row “Mixed / other orders” in product tables. |
| Cash / UPI split | Sales grouped by payment method, with amount and percentage. |
| Expenses | Sum of `amount` where expense\_type = Regular Business Expense. |
| Investment | Sum of `amount` where expense\_type = Initial Investment, shown per member and in total. Never included in Expenses or Net. |
| Net | Sales − Expenses. Show this note on screen: “Simple cash view. Ingredients count when bought, not when sold, so early numbers are rough.” |
| Payback progress | Net (all time) ÷ total Investment, as a progress bar with the rupee figures beside it. If Net is negative the bar is empty. |
| Paid personally (per member, all time) | Sum of amount where payment\_method = Personal Payment and expense\_type = Regular Business Expense, grouped by paid\_by. |
| Reimbursed (per member, all time) | Sum of settlement amount grouped by paid\_to. |
| Still owed (per member) | Paid personally − Reimbursed. Below zero shows “Overpaid” and is flagged in Data check. |
| Estimated revenue balance (all time) | Total Sales − regular expenses whose payment method is not Personal Payment − total Reimbursed. All sale money (UPI and cash) is held in Shivanna’s account. Label clearly as an **estimate**. |

**Derived metrics for graphs:** cumulative sales, cumulative net, 7-day moving average of sales, week-over-week and month-over-month growth % (current period vs previous period of the same length), best day, average daily sales, expense share by category.

**Bucketing:** day = IST date, week = Monday to Sunday, month = calendar month. Days with no data are returned as zero rows so the charts have no gaps.

## 6. Screens and user flows

### 6.1 Navigation

Left sidebar (bottom tab bar on mobile): Today · Sales · Expenses · Partners · Data check · Settings. Top bar: date-range picker (Today, Yesterday, 7 days, This week, This month, Last month, All time, Custom) and Logout. The range picker is shared by Sales and Expenses.

### 6.2 Login

Flow: open app → `GET /api/auth/me` → if 401 show login → enter email and password → `POST /api/auth/login` → success sets cookie and goes to Today → failure shows a generic “Invalid email or password”. After 5 failed attempts in 15 minutes show “Too many attempts, try later”.

### 6.3 Today

Date picker defaulting to today (IST). Shows:

- Cards: Sales, Orders, Items sold, Average per order, Expenses, Net.
- Cash vs UPI split (donut) and received-by split.
- Product table (units, sales, with “Mixed / other orders” row).
- Today’s sales list and expenses list with Edit/Delete.
- Quick-add buttons: **+ Sale** and **+ Expense** (open a drawer form).
- Comparison chips: vs yesterday and vs same weekday last week.

### 6.4 Sales

Range picker plus day / week / month toggle.

- Cards: Sales, Orders, Items sold, Average per order, Best day, Average daily sales.
- Charts: daily revenue line, cumulative revenue area, 7-day moving average overlay, orders per day bar, product sales bar (units and ₹), cash vs UPI donut, sales by hour of day (from timestamp), sales by member.
- Tables: product table, full sales log (search, filter by product, payment method, member; sort; pagination; CSV export).

### 6.5 Expenses

Range picker plus day / week / month toggle.

- Cards: Expenses, Investment (total and per member), Net, Biggest category.
- Charts: daily expenses, expenses by category (donut or bar), daily profit (Net) bar with red negatives, cumulative net line, sales vs expenses combined chart, payment method split.
- Tables: expense log (filter by category, type, member, payment method), **Investment list** (date, member, amount), expenses by category table.
- Net note displayed under the Net card.

### 6.6 Partners

- Payback progress bar: Net (all time) of total Investment, with the rupee figures.
- Per-member table: Invested, Paid personally, Reimbursed, Still owed (or “Overpaid” badge).
- Estimated revenue balance card, labelled “Estimate”, with a breakdown (Sales − business-paid expenses − reimbursements).
- Settlements list with **+ Settlement** form (Date, Paid By, Paid To, Amount, Notes).

### 6.7 Data check

List of every data problem, grouped by severity (Error, Warning, Info), each with a link to open the row in an edit drawer. Badge with the count shows in the sidebar. See Section 10.

### 6.8 Settings

Manage products (name, default price, active), expense categories, member list. Import history. No user management (users come from env).

### 6.9 Entry forms (drawers)

**Sale form:** Date (default today), Product (dropdown from products; choosing “Other” makes Notes required), Quantity, Price per item (auto-filled from product default and editable), **Total Amount Received** (auto-suggested as quantity × price but freely editable, since it is the source of truth), Payment Method (UPI/Cash), Received By (default current user’s member), Notes.

**Expense form:** Date, Category, Description, Amount, Payment Method (UPI/Cash/Personal Payment), Paid By, Expense Type (default Regular Business Expense), Notes. If Expense Type is Initial Investment, Category defaults to Other and payment method to Personal Payment.

Every form shows inline validation errors, a loading state, a success toast, and an “Add another” option for quick repeated entry. Edit and delete (with confirm dialog) are available from every table.

## 7. Charts checklist (Recharts)

1. Daily revenue (line) with 7-day moving average.
2. Daily profit/Net (bar, green positive and red negative).
3. Cumulative revenue (area).
4. Cumulative net (line) with a horizontal line at total Investment to show the payback point.
5. Sales vs Expenses by day, week or month (grouped bars).
6. Orders per day (bar).
7. Product sales and units (horizontal bar).
8. Cash vs UPI (donut).
9. Expenses by category (donut or bar).
10. Sales by hour of day (bar).
11. Weekly and monthly growth % (bar, with the first period shown as “n/a”).

Guidelines: ₹ with Indian digit grouping (₹1,23,456), tooltips on all charts, empty states (“No data for this range”), loading skeletons, responsive layout, and colour is never the only signal.

## 8. API specification

Base path `/api`. JSON only. All routes except login require a valid session. All dates are `YYYY-MM-DD` (IST). Money is returned as numbers with 2 decimals. Errors use one shape: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /api/auth/login | Body `{ email, password }`. Checks the email against the env allowlist and verifies the password hash. Sets an httpOnly session cookie. |
| GET | /api/auth/me | Returns the signed-in user, or 401. |
| POST | /api/auth/logout | Clears the cookie and ends the session. |

### Dashboard reads

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/today?date= | Cards, product table, split, sales list and expense list for one day, plus comparison with yesterday and last week. |
| GET | /api/sales?from=&to=&group=day\|week\|month | Sales cards, chart series (including zero days), product table, payment split, hourly data. |
| GET | /api/expenses?from=&to=&group= | Expense cards, chart series, category table, Net series, cumulative series, investment list. |
| GET | /api/overview?from=&to=&group= | Combined series for sales vs expenses vs net and growth %. |
| GET | /api/partners | Payback, per-member balances, estimated revenue balance, settlements. |
| GET | /api/data-check | All data problems with severity and row links. |
| GET | /api/meta | Members, products, categories and enum values for dropdowns. |

### Sales records

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/sales/records?from=&to=&product=&payment=&member=&q=&page=&pageSize=&sort= | Paginated log. |
| POST | /api/sales/records | Create a sale. |
| GET | /api/sales/records/:id | One sale. |
| PUT | /api/sales/records/:id | Update a sale. |
| DELETE | /api/sales/records/:id | Soft delete. |

### Expense records

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/expenses/records?from=&to=&category=&type=&payment=&member=&q=&page=&pageSize=&sort= | Paginated log. |
| POST | /api/expenses/records | Create an expense or investment. |
| GET | /api/expenses/records/:id | One record. |
| PUT | /api/expenses/records/:id | Update. |
| DELETE | /api/expenses/records/:id | Soft delete. |

### Settlements, settings, export

| Method | Path | Purpose |
| --- | --- | --- |
| GET / POST | /api/settlements | List or create. |
| PUT / DELETE | /api/settlements/:id | Update or soft delete. |
| GET / POST / PUT | /api/products, /api/products/:id | Manage products (deactivate instead of delete). |
| GET / POST / PUT | /api/categories, /api/categories/:id | Manage expense categories. |
| GET | /api/export/sales.csv?from=&to= and /api/export/expenses.csv?from=&to= | CSV download. |
| GET | /api/health | Uptime check (no auth, returns only `{ ok: true }`). |

Notes: Express must register the static `/api/sales/records` routes before any `/:id` pattern, and `from`/`to` default to the current month when missing.

## 9. Validation rules (Zod)

- Dates: valid `YYYY-MM-DD`, not more than 1 day in the future, `from` ≤ `to`, and range limited to 5 years.
- Sale: quantity integer 1 to 1000, total\_amount 0.01 to 1,000,000, price\_per\_item optional and non-negative, payment method in enum, product exists, notes required (min 3 chars) when product is “Other”, notes max 500 chars.
- Expense: amount 0.01 to 10,000,000, category exists, enums validated, description 1 to 200 chars, notes max 500.
- Settlement: paid\_by ≠ paid\_to, amount > 0.
- IDs validated as UUID or integer. Unknown fields are rejected (`.strict()`). Strings are trimmed.
- Pagination: pageSize max 100.

## 10. Data check rules

| Severity | Rule |
| --- | --- |
| Error | A member is Overpaid (Reimbursed > Paid personally). |
| Error | Amount ≤ 0, missing required field, or unknown member/product/category. |
| Error | Date in the future. |
| Warning | Possible duplicate: same date, member, amount and type within 10 minutes (e.g. the two ₹1,000 investments from Sachin). |
| Warning | Sale quantity > 1 but price per item equals the total (price column holds the total instead of the unit price; seen in rows with 6 × ₹594 and 5 × ₹295). |
| Warning | Sale total differs from quantity × price by more than ₹10 (small rounding like ₹100 for ₹99 is **not** flagged). |
| Warning | “Other” product without notes. |
| Warning | Entry date more than 3 days before the record’s creation time (back-dated, e.g. expense dated 11/8 entered 11/12). |
| Warning | Initial Investment paid by a method other than Personal Payment. |
| Info | Notes mention settlement words (“paid to”, “repaid”) but no matching Settlement exists. |
| Info | Days with no sales between the first and last sale date. |

The data-check module is a set of small pure functions so rules are easy to add.

## 11. Security

**Authentication**

- Allowed users come from env, e.g. `ALLOWED_USERS=[{"email":"a@x.com","passwordHash":"$2b$...","member":"Shivanna Gorkal"}]`. Store **bcrypt hashes** in env instead of plain passwords. Provide a small script `npm run hash-password` to generate them.
- Login compares with constant-time functions, gives the same error for unknown email and wrong password, and runs a dummy hash compare for unknown emails to avoid timing leaks.
- Session: signed JWT (or server session) in an **httpOnly, Secure, SameSite=Strict** cookie, 7-day expiry, `JWT_SECRET` from env. No tokens in localStorage.
- Rate limit: 5 login attempts per 15 minutes per IP and per email. 100 requests per minute per user elsewhere.

**Injection and input safety**

- SQL injection: only parameterized queries or ORM query builders, with **no string concatenation of user input into SQL**. Sort columns and group-by values are mapped from a fixed whitelist, never passed through.
- If MongoDB is chosen instead: Zod-validate every field as a primitive, reject any object containing keys that start with `$` or contain `.`, and use `express-mongo-sanitize`.
- Zod validates body, query and params for every route. Reject unknown fields. Body size limit 100 KB.
- Output is JSON only, React escapes output, and there is no `dangerouslySetInnerHTML`. Notes and descriptions are treated as plain text.

**Transport and headers**

- HTTPS only, `helmet()` with a strict CSP, HSTS, `x-powered-by` disabled, `trust proxy` configured for the host.
- CORS: allow only `FRONTEND_ORIGIN` with credentials, no wildcard.
- CSRF: SameSite=Strict cookie plus an Origin/Referer check on all non-GET requests.
- Morgan logs method, path, status and time, and must **never** log bodies, cookies or passwords. Use a production format and redirect it to a log service.

**Secrets and operations**

- `.env` is never committed; provide `.env.example`. Use the host’s secret store in production. Neon connection uses `sslmode=require` with a least-privilege DB user.
- Dependency audit in CI (`npm audit`), lockfile committed, Dependabot enabled.
- Neon backups and point-in-time recovery turned on. A weekly CSV export is a good extra safety net.
- Audit log for every write. Generic error messages to clients, details only in server logs.

## 12. Historical data import (one time)

The owner exports both sheets to CSV (**clear all filters first**: the Daily Sales sheet currently shows “22 of 40 rows displayed”, so hidden rows must be included). Then run `npm run import:sales` and `npm run import:expenses` with the CSV paths.

Import rules:

- Dates are `M/D/YYYY` (US format in the sheet). Parse explicitly, never with `new Date(string)`. Timestamps are IST.
- “Product Sold” values like “Nightout Oats – ₹79” are split into product name and listed price. “Other” becomes the mixed product.
- Category values with a leading “- ” are cleaned to the bare name and mapped to the categories table.
- “Total Amount Received” is imported as-is, and the price column as-is (informational).
- Expense Type text is matched by prefix (“Regular Business Expen…”). Member names are matched to the members table, with unknown names reported rather than created silently.
- The script runs in a transaction, supports `--dry-run`, prints a report (rows read, inserted, skipped, warnings), and stores `import_row_ref` so re-running does not create duplicates.
- After import, compare totals with the sheet (total sales, total expenses, total investment) and fix differences before go-live.
- Past settlements are entered by the owner through the Settlements form or a short CSV.

## 13. Project structure and configuration

```
/web   (Vite + React)
  src/pages  src/components  src/api  src/hooks  src/lib/format.ts (₹, dates)
/server (Express)
  src/routes  src/controllers  src/services/metrics.ts
  src/services/dataCheck.ts  src/middleware (auth, validate, errors)
  src/db (migrations, queries)  src/scripts (import, hash-password)
```

**Server env:** `PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_USERS`, `FRONTEND_ORIGIN`, `TZ=Asia/Kolkata`. **Web env:** `VITE_API_URL`.

## 14. Build phases

| Phase | Work | Done when |
| --- | --- | --- |
| 1. Foundation | Repos, lint, TypeScript, Neon DB, migrations, seed members/products/categories, env handling, CI | App and API deploy to staging and `/api/health` works. |
| 2. Auth and security base | Login, me, logout, cookie session, rate limits, Helmet, CORS, Zod middleware, Morgan, error handler, audit log | Only allowlisted users get in, and security tests pass. |
| 3. Data entry | Sales, expense and settlement CRUD, forms, logs with filters and pagination, soft delete | Users can add, edit and delete from phone and laptop. |
| 4. Import | Import scripts, dry run, reconciliation report | Imported totals match the sheets exactly. |
| 5. Metrics and Today | `metrics.ts` with unit tests, `/api/today`, Today screen | Today numbers match hand-calculated examples. |
| 6. Sales and Expenses dashboards | Range picker, day/week/month grouping, all charts, investment list | All charts and cards in Section 7 work with real data. |
| 7. Partners and Data check | Payback, balances, estimate, settlements, data-check rules | Balances match the formulas in Section 5. |
| 8. Polish and release | Mobile layout, empty/loading/error states, CSV export, accessibility pass, backups, runbook, user training | Owner signs off with real data, then go-live and Google Forms are retired. |

## 15. Acceptance tests (key examples)

- A sale of 1 × High Protein Oats (₹99) with total ₹100 increases Sales by exactly 100.
- A mixed “Other” sale of ₹150 counts in Sales, Orders and Items sold, and appears in the “Mixed / other orders” row.
- An Initial Investment never changes Expenses or Net, but increases total Investment and the member’s Invested amount.
- A Personal Payment regular expense increases that member’s “Paid personally” and **does not** reduce the Estimated revenue balance until a Settlement is entered.
- A UPI or Cash regular expense reduces the Estimated revenue balance immediately.
- Net below zero shows an empty payback bar with the correct negative rupee figure.
- A member with Reimbursed greater than Paid personally shows “Overpaid” and an Error in Data check.
- Days with no data appear as zero in all daily charts.
- Any request without a session returns 401, and any invalid body returns 400 with field details.

## 16. Main risks

| Risk | Mitigation |
| --- | --- |
| Inconsistent historical data (price column holds totals, stray characters, duplicates) | Import cleaning rules, dry run, Data check screen, reconciliation against the sheets. |
| Owners disagree with balance logic | Keep formulas in one tested module, show the “Estimate” label, and use the final decisions in Section 2 as the reference for Phase 7. |
| Time zone and date-format bugs (US-style dates, late-night entries) | Store DATE in IST, explicit parsing, tests around midnight. |
| Password handling in env | Bcrypt hashes, secrets in host secret store, rotate by redeploying. |
| Free-tier limits (Neon, hosting cold starts) | Acceptable for this volume. Upgrade if cold starts hurt the daily entry experience. |
| Staff entering data in a hurry | Quick-add forms with smart defaults, “Add another”, and soft delete with undo. |
