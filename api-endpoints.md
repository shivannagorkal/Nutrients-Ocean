# 🌊 Nutrients Ocean – REST API Specification (V1)
## Finance Management Dashboard API

---

## 1. Global API Standards & Conventions

### 1.1 Base URL & Protocol
```http
https://api.nutrientsocean.com/api/v1
```
All API communication must use HTTPS. Plain HTTP requests are redirected or rejected with status `403 Forbidden`.

### 1.2 Common Request Headers
| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | Yes (Protected) | Bearer token format: `Bearer <jwt_token>` |
| `X-Business-Id` | UUID | Optional | Context business ID (defaults to active user business). |
| `Idempotency-Key` | String | Yes (Mutative) | Unique client UUID to prevent duplicate executions (Sales, Transfers, Payments). |
| `Content-Type` | String | Yes (for POST/PUT) | Must be `application/json` |

### 1.3 Standard Response Envelopes

#### Success Envelope (2xx)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-11T15:30:00.000Z",
    "requestId": "req_88f9a21b-c124-4fbb"
  }
}
```

#### Error Envelope (4xx / 5xx)
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Required ingredient 'Whey Protein Vanilla' has insufficient quantity on hand",
    "details": [
      {
        "field": "items[0].quantity",
        "expected": "Available: 150.0000 GRAM",
        "received": "Requested: 200.0000 GRAM"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-11-11T15:30:00.000Z",
    "requestId": "req_88f9a21b-c124-4fbb"
  }
}
```

### 1.4 Financial & Measurement Conventions
- **Currency:** All monetary fields end with `Paise` (e.g. `amountPaise`, `totalAmountPaise`, `currentPricePaise`) and represent integer paise ($1\text{ INR} = 100\text{ paise}$).
- **Inventory Units:** All metric weights and volumes are represented as string decimals with 4 decimal places (e.g. `"150.0000"`).

---

## 2. Authentication & Business Context

### 2.1 Admin Login
- **Endpoint:** `POST /auth/login`
- **Access:** Public
- **Description:** Authenticates an admin using email and password, issuing access and refresh tokens.

#### Request Body
```json
{
  "email": "owner@nutrientsocean.com",
  "password": "SecurePassword123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "admin": {
      "id": "11111111-1111-1111-1111-111111111111",
      "businessId": "00000000-0000-0000-0000-000000000001",
      "email": "owner@nutrientsocean.com",
      "fullName": "Aryan Sharma",
      "role": "SUPER_ADMIN"
    },
    "business": {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "Nutrients Ocean",
      "currency": "INR",
      "timezone": "Asia/Kolkata",
      "startDate": "2026-11-10"
    }
  }
}
```

---

### 2.2 Get Authenticated Profile
- **Endpoint:** `GET /auth/me`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Response (200 OK):** Returns logged-in admin data, business configuration, and active cash drawer assignment.

---

## 3. Business Investments & Reinvestment Reserves

### 3.1 List Business Investments
- **Endpoint:** `GET /investments`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Description:** Lists all business capital injections linked to cash/bank accounts.

### 3.2 Record Business Capital Investment
- **Endpoint:** `POST /investments`
- **Access:** `SUPER_ADMIN`
- **Description:** Records an initial or additional capital injection into the business, creating a corresponding `INVESTMENT_INFLOW` cash transaction.

#### Request Body
```json
{
  "cashAccountId": "10000000-0000-0000-0000-000000000002",
  "investmentType": "ADDITIONAL_CAPITAL",
  "amountPaise": 10000000,
  "date": "2026-11-11",
  "paymentMode": "UPI",
  "referenceNumber": "UPI-REF-9912048",
  "notes": "Expansion fund infusion"
}
```

### 3.3 Record Business Reinvestment Allocation
- **Endpoint:** `POST /reinvestments`
- **Access:** `SUPER_ADMIN`
- **Description:** Allocates retained earnings to an earmarked business reserve (`EQUIPMENT_EXPANSION`, `MARKETING_RESERVE`, `BULK_INVENTORY_RESERVE`, `EMERGENCY_RESERVE`, `NEW_BRANCH_CAPEX`).

#### Request Body
```json
{
  "reserveCategory": "EQUIPMENT_EXPANSION",
  "amountPaise": 2500000,
  "date": "2026-11-11",
  "notes": "Blender and cold-storage upgrade reserve"
}
```

---

## 4. Products & Recipe Management

### 4.1 Product Catalog (`GET /products` / `POST /products`)
- **Supported Product Types:** `FINISHED_PRODUCT`, `RAW_INGREDIENT`, `RETAIL_READY`, `PACKAGING`.
- **Supported Base Units:** `GRAM`, `ML`, `PCS`.

#### Create Product Example (`POST /products`):
```json
{
  "sku": "SM-PRO-BLUE-500",
  "name": "Berry Blast Whey Protein Smoothie (500ml)",
  "category": "Smoothies",
  "type": "FINISHED_PRODUCT",
  "isSellable": true,
  "isRawMaterial": false,
  "currentPricePaise": 28000,
  "unit": "PCS",
  "minStockAlert": "10.0000"
}
```

### 4.2 Create or Update Product Recipe (`POST /recipes`)
- **Endpoint:** `POST /recipes`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Description:** Formulates the active bill-of-materials for a finished product with strict base unit validation.

#### Request Body
```json
{
  "productId": "44444444-4444-4444-4444-444444444441",
  "recipeName": "Berry Blast Standard Formulation 500ml",
  "yieldQuantity": "1.0000",
  "yieldUnit": "PCS",
  "instructions": "Blend whey powder with almond milk for 20s, add frozen blueberries and chia seeds, blend on high for 30s.",
  "items": [
    {
      "ingredientProductId": "55555555-5555-5555-5555-555555555501",
      "quantityRequired": "35.0000",
      "measurementUnit": "GRAM",
      "notes": "Whey Isolate Vanilla 90%"
    },
    {
      "ingredientProductId": "55555555-5555-5555-5555-555555555502",
      "quantityRequired": "250.0000",
      "measurementUnit": "ML",
      "notes": "Unsweetened Almond Milk"
    },
    {
      "ingredientProductId": "55555555-5555-5555-5555-555555555503",
      "quantityRequired": "60.0000",
      "measurementUnit": "GRAM",
      "notes": "Frozen Organic Blueberries"
    },
    {
      "ingredientProductId": "55555555-5555-5555-5555-555555555504",
      "quantityRequired": "1.0000",
      "measurementUnit": "PCS",
      "notes": "500ml Biodegradable Cup & Lid"
    }
  ]
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Recipe created and linked successfully",
  "data": {
    "recipeId": "66666666-6666-6666-6666-666666666661",
    "productId": "44444444-4444-4444-4444-444444444441",
    "recipeName": "Berry Blast Standard Formulation 500ml",
    "calculatedBOMCostPaise": 9250,
    "currentSellingPricePaise": 28000,
    "grossMarginPercentage": "66.96",
    "itemsCount": 4
  }
}
```

---

## 5. Sales & Point of Sale (POS)

### 5.1 Create POS Sale (Atomic Recipe Depletion & Cash Ledger Posting)
- **Endpoint:** `POST /sales`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Header:** `Idempotency-Key: <uuid>`

#### Request Body
```json
{
  "date": "2026-11-11",
  "paymentMode": "MIXED_SPLIT",
  "customerName": "Vikram Seth",
  "customerPhone": "+919876543210",
  "notes": "Less ice",
  "items": [
    {
      "productId": "44444444-4444-4444-4444-444444444441",
      "quantity": "2.0000",
      "unitPricePaise": 28000
    },
    {
      "productId": "44444444-4444-4444-4444-444444444442",
      "quantity": "1.0000",
      "unitPricePaise": 15000
    }
  ],
  "discountPaise": 5000,
  "taxPaise": 3550,
  "totalAmountPaise": 69550,
  "payments": [
    {
      "cashAccountId": "10000000-0000-0000-0000-000000000001",
      "amountPaise": 20000,
      "mode": "CASH"
    },
    {
      "cashAccountId": "10000000-0000-0000-0000-000000000002",
      "amountPaise": 49550,
      "mode": "UPI"
    }
  ]
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Sale created, recipe ingredients deducted, and cash ledger updated",
  "data": {
    "saleId": "77777777-7777-7777-7777-777777777771",
    "saleNumber": "SALE-20261111-0042",
    "date": "2026-11-11",
    "totalAmountPaise": 69550,
    "paymentStatus": "PAID",
    "consumedIngredients": [
      {
        "ingredient": "Whey Isolate Vanilla 90%",
        "quantityDeducted": "70.0000",
        "unit": "GRAM",
        "unitCostPaise": 160,
        "totalCostPaise": 11200
      },
      {
        "ingredient": "Unsweetened Almond Milk",
        "quantityDeducted": "500.0000",
        "unit": "ML",
        "unitCostPaise": 15,
        "totalCostPaise": 7500
      }
    ],
    "ledgerPostings": [
      {
        "accountName": "Physical Cash Till",
        "direction": "CREDIT",
        "amountPaise": 20000
      },
      {
        "accountName": "PhonePe Merchant UPI",
        "direction": "CREDIT",
        "amountPaise": 49550
      }
    ]
  }
}
```

---

## 6. Refunds & Item-Level Reversals

### 6.1 Process Partial / Full Refund (Hamilton-Hare Allocation)
- **Endpoint:** `POST /sales/:id/refunds`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Header:** `Idempotency-Key: <uuid>`

#### Request Body
```json
{
  "cashAccountId": "10000000-0000-0000-0000-000000000001",
  "paymentMode": "CASH",
  "reason": "Customer ordered incorrect flavour; unopened smoothie cup returned",
  "items": [
    {
      "saleItemId": "88888888-8888-8888-8888-888888888881",
      "quantityRefunded": "1.0000",
      "restockInventory": true
    }
  ]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Refund processed with Hamilton-Hare allocation and stock restock",
  "data": {
    "refundId": "99999999-9999-9999-9999-999999999991",
    "refundNumber": "REF-20261111-0004",
    "saleId": "77777777-7777-7777-7777-777777777771",
    "refundedAmountPaise": 27420,
    "saleUpdatedStatus": "PARTIALLY_REFUNDED",
    "allocatedItems": [
      {
        "saleItemId": "88888888-8888-8888-8888-888888888881",
        "productName": "Berry Blast Whey Protein Smoothie (500ml)",
        "quantityRefunded": "1.0000",
        "netRefundPaise": 27420,
        "restocked": true
      }
    ],
    "ledgerReversal": {
      "accountName": "Physical Cash Till",
      "direction": "DEBIT",
      "amountPaise": 27420,
      "transactionType": "CUSTOMER_REFUND"
    }
  }
}
```

---

## 7. Purchases & Operating Expenses

### 7.1 Record Stock Purchase (`POST /purchases`)
- **Endpoint:** `POST /purchases`
- **Access:** `SUPER_ADMIN`, `ADMIN`

#### Request Body
```json
{
  "supplierName": "Optimum Nutrition Direct Distributors",
  "date": "2026-11-11",
  "invoiceReference": "INV-ON-88219",
  "shippingChargesPaise": 50000,
  "taxPaise": 180000,
  "items": [
    {
      "productId": "55555555-5555-5555-5555-555555555501",
      "quantity": "25000.0000",
      "unit": "GRAM",
      "unitCostPaise": 160,
      "totalCostPaise": 4000000,
      "expiryDate": "2027-10-31"
    }
  ]
}
```

### 7.2 Record Partial or Full Payment (`POST /purchases/:id/payments`)
- **Endpoint:** `POST /purchases/:id/payments`
- **Description:** Adds an instalment payment, reducing purchase balance and debiting the cash/bank account.

#### Request Body
```json
{
  "cashAccountId": "10000000-0000-0000-0000-000000000002",
  "amountPaise": 2000000,
  "paymentDate": "2026-11-11",
  "paymentMode": "UPI",
  "referenceNumber": "UPI-REF-002194",
  "notes": "First tranche 50% payment"
}
```

### 7.3 Record Operating Expense (`POST /expenses`)
- **Endpoint:** `POST /expenses`
- **Categories:** `RENT`, `ELECTRICITY`, `WATER`, `STAFF_SALARY`, `MARKETING_PROMOTIONS`, `REPAIRS_MAINTENANCE`, `LICENSES_PERMITS`, `CLEANING_SUPPLIES`, `PACKAGING_OVERHEAD`, `SOFTWARE_SUBSCRIPTION`, `MISCELLANEOUS`.

---

## 8. Cash Accounts & Internal Transfers

### 8.1 List Cash Accounts (`GET /cash-accounts`)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "10000000-0000-0000-0000-000000000001",
      "accountName": "Counter Cash Drawer",
      "accountType": "PHYSICAL_CASH",
      "openingBalancePaise": 0,
      "currentBalancePaise": 0
    },
    {
      "id": "10000000-0000-0000-0000-000000000002",
      "accountName": "UPI / Online",
      "accountType": "UPI_DIGITAL",
      "openingBalancePaise": 0,
      "currentBalancePaise": 0
    }
  ]
}
```

### 8.2 Create Paired Internal Transfer
- **Endpoint:** `POST /cash-transfers`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Description:** Atomically transfers funds between accounts. Enforces database deferred triggers requiring balanced DEBIT/CREDIT entries.

#### Request Body
```json
{
  "sourceCashAccountId": "10000000-0000-0000-0000-000000000001",
  "destCashAccountId": "10000000-0000-0000-0000-000000000002",
  "amountPaise": 1500000,
  "transferDate": "2026-11-11",
  "notes": "Transfer physical cash to UPI/Online settlement account"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Transfer executed with balanced debit and credit entries",
  "data": {
    "transferId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "transferNumber": "TXF-20261111-0002",
    "amountPaise": 1500000,
    "sourceAccount": "Counter Cash Drawer",
    "destAccount": "UPI / Online",
    "sourceBalanceAfterPaise": 0,
    "destBalanceAfterPaise": 1500000
  }
}
```

---

## 9. Sequential Daily Closings

### 9.1 Preview Today's Expected Closing
- **Endpoint:** `GET /daily-closings/current`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Query Params:** `date=2026-11-11`
- **Description:** Returns chained opening balances from Day $T-1$, ledger inflows, ledger outflows, and expected balances per account.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "closingDate": "2026-11-11",
    "previousDayStatus": "RECONCILED",
    "isEligibleToClose": true,
    "summary": {
      "totalOpeningPaise": 15000000,
      "totalInflowPaise": 8500000,
      "totalOutflowPaise": 3200000,
      "totalExpectedPaise": 20300000
    },
    "accounts": [
      {
        "accountId": "10000000-0000-0000-0000-000000000001",
        "accountName": "Counter Cash Drawer",
        "accountType": "PHYSICAL_CASH",
        "openingBalancePaise": 1000000,
        "inflowPaise": 2500000,
        "outflowPaise": 1500000,
        "expectedBalancePaise": 2000000
      },
      {
        "accountId": "10000000-0000-0000-0000-000000000002",
        "accountName": "PhonePe Merchant UPI",
        "accountType": "UPI_DIGITAL",
        "openingBalancePaise": 0,
        "inflowPaise": 6000000,
        "outflowPaise": 1700000,
        "expectedBalancePaise": 4300000
      }
    ]
  }
}
```

### 9.2 Submit Daily Closing & Reconcile
- **Endpoint:** `POST /daily-closings`
- **Access:** `SUPER_ADMIN`, `ADMIN`

#### Request Body
```json
{
  "closingDate": "2026-11-11",
  "notes": "Evening shift closing. 100 Rs short in till due to coin change rounding.",
  "accounts": [
    {
      "cashAccountId": "10000000-0000-0000-0000-000000000001",
      "actualBalancePaise": 1990000,
      "reconciliationNotes": "Physical count: ₹19,900"
    },
    {
      "cashAccountId": "10000000-0000-0000-0000-000000000002",
      "actualBalancePaise": 4300000,
      "reconciliationNotes": "PhonePe merchant settlement match: ₹43,000"
    }
  ]
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Daily closing saved with status DISCREPANCY_FLAGGED. Adjustment transaction generated.",
  "data": {
    "closingId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "closingDate": "2026-11-11",
    "status": "DISCREPANCY_FLAGGED",
    "totalExpectedPaise": 6300000,
    "totalActualPaise": 6290000,
    "totalDiscrepancyPaise": -10000,
    "adjustmentsPosted": [
      {
        "accountName": "Counter Cash Drawer",
        "direction": "DEBIT",
        "amountPaise": 10000,
        "description": "Daily closing discrepancy shortage adjustment (2026-11-11)"
      }
    ]
  }
}
```

---

## 10. Financial Reports & Analytics

### 10.1 Live Profit & Loss (P&L) Statement
- **Endpoint:** `GET /reports/pnl`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Query Params:** `startDate=2026-11-10&endDate=2026-11-11`

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-11-10",
      "endDate": "2026-11-11"
    },
    "operatingRevenue": {
      "grossSalesPaise": 12500000,
      "discountsPaise": 500000,
      "refundsPaise": 250000,
      "netSalesRevenuePaise": 11750000
    },
    "costOfGoodsSold": {
      "recipeIngredientsConsumedPaise": 3850000,
      "retailGoodsConsumedPaise": 850000,
      "totalCogsPaise": 4700000
    },
    "grossProfitPaise": 7050000,
    "grossMarginPercentage": "60.00",
    "operatingExpenses": {
      "rentPaise": 1500000,
      "electricityPaise": 350000,
      "staffSalaryPaise": 2000000,
      "softwareSubscriptionPaise": 250000,
      "miscellaneousPaise": 100000,
      "totalExpensesPaise": 4200000
    },
    "netOperatingProfitPaise": 2850000,
    "netProfitMarginPercentage": "24.25"
  }
}
```

### 10.2 Menu Product Margin Breakdown
- **Endpoint:** `GET /reports/product-margins`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Description:** Returns selling price, recipe ingredient BOM cost, contribution margin, and margin percentage for every sellable menu item.

### 10.3 Business Capital & Reinvestment Summary
- **Endpoint:** `GET /reports/capital-summary`
- **Access:** `SUPER_ADMIN`
- **Description:** Returns total business investments injected, earmarked reinvestment reserves by category, and net retained business cash position.

---

## 11. Complete Error Code Dictionary

| Error Code | HTTP Status | Trigger Condition | Recommended UI Action |
| :--- | :--- | :--- | :--- |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired JWT. | Redirect user to Login screen. |
| `FORBIDDEN` | 403 | User role lacks permission for the endpoint. | Show permission denied badge. |
| `INSUFFICIENT_STOCK` | 422 | Attempting to record sale where raw ingredient stock is below required consumption. | Prompt user to record purchase or emergency stock adjustment. |
| `RECIPE_NOT_FOUND` | 404 | Finished product has no recipe defined. | Alert manager to configure recipe bill of materials. |
| `UNIT_MISMATCH` | 400 | Recipe item measurement unit does not match ingredient base unit. | Correct recipe ingredient unit in Recipe Studio. |
| `INVALID_SPLIT_PAYMENT` | 400 | Cash + UPI split sum does not match bill total. | Recompute and balance payment inputs. |
| `REFUND_EXCEEDS_QUANTITY` | 409 | Requested refund quantity exceeds refundable remaining quantity. | Block refund button; display remaining quantity limit. |
| `UNBALANCED_TRANSFER` | 400 | Internal transfer debit and credit amounts do not match. | Server-side protection; verify transfer form state. |
| `SAME_ACCOUNT_TRANSFER` | 400 | Source and destination transfer accounts are identical. | Show "Source and destination accounts must be distinct". |
| `SKIPPED_CLOSING_DATE` | 409 | Attempting to close Day $T$ while Day $T-1$ remains unclosed. | Redirect user to close Day $T-1$ first. |
| `IDEMPOTENCY_CONFLICT` | 409 | Request with identical `Idempotency-Key` is already processed. | Display cached transaction confirmation. |


---

## 12. Customer Authentication (On-Demand Firebase Phone OTP)

### 12.1 Exchange Firebase ID Token for HTTP-Only Session
- **Endpoint:** `POST /auth/customer/firebase`
- **Access:** Public (called only when user checks out, subscribes, or opens `/account` / `/pass`)
- **Description:** Verifies Firebase Phone Auth `idToken` via `firebase-admin`, upserts customer record by `(businessId, phone)`, and sets HTTP-only `customerAccessToken` + `customerRefreshToken` cookies (`aud: "customer"`).

### 12.2 Refresh & Profile Endpoints
- `POST /auth/customer/refresh`: Rotates customer access token cookie.
- `POST /auth/customer/logout`: Clears customer session cookies.
- `GET /auth/customer/me`: Returns authenticated customer profile & saved delivery address (`aud: "customer"`).
- `PATCH /auth/customer/me`: Updates `fullName` and `defaultAddress`.

---

## 13. Public Catalog & Customer Ordering (Razorpay + Pay at Stall)

### 13.1 Public Catalog
- **Endpoint:** `GET /catalog`
- **Access:** Public (no authentication required)
- **Description:** Returns live sellable menu items, available flavors (`Strawberry`, `Chocolate`), 30-serving Individual/Combo subscription plans, and 2 KM delivery fee tiers from PostgreSQL.

### 13.2 Create Single-Item Order
- **Endpoint:** `POST /customer/orders`
- **Access:** Customer (`aud: "customer"`)
- **Header:** `Idempotency-Key: <uuid>`
- **Body:** `{ items: [{ productId, flavor?, quantity }], scheduledDate, collectionSlot: "MORNING" | "EVENING", fulfillmentType: "PICKUP" | "DELIVERY", deliveryBracket, deliveryAddress?, paymentMethod: "RAZORPAY" | "PAY_AT_STALL" }`
- **Behavior:** Server computes exact integer paise totals. If `RAZORPAY`, returns Razorpay order parameters; if `PAY_AT_STALL`, marks order `PLACED` (`paymentStatus: "PENDING"`) ready for counter pickup & payment.

### 13.3 Razorpay Verification & Webhook
- `POST /payments/razorpay/verify`: Verifies HMAC signature (`razorpay_order_id + "|" + razorpay_payment_id`) in a `Serializable` transaction, marks order/subscription active, and posts `CREDIT` to `cash_transactions` (`UPI_DIGITAL`).
- `POST /webhooks/razorpay`: Verifies raw-body `X-Razorpay-Signature` (`payment.captured`) idempotently.

---

## 14. 30-Serving Monthly Subscriptions & Unlimited Freeze

### 14.1 Create Monthly Subscription Order
- **Endpoint:** `POST /customer/subscriptions`
- **Access:** Customer (`aud: "customer"`)
- **Header:** `Idempotency-Key: <uuid>`
- **Body:** `{ planId, flavor?, collectionSlot, fulfillmentType, deliveryBracket, deliveryAddress? }`
- **Behavior:** Initiates Razorpay checkout; upon verified payment capture, activates `customer_subscriptions` with `totalServings = 30`, `usedServings = 0`, and no expiry date cap.

### 14.2 Get My Subscriptions & History
- **Endpoint:** `GET /customer/subscriptions/me`
- **Access:** Customer (`aud: "customer"`)
- **Description:** Returns active/completed subscriptions, `usedServings`, `remainingServings`, upcoming `subscription_freezes` dates, and `daily_redemptions` history.

### 14.3 Schedule or Remove Freeze Days (Unlimited Skip Support)
- `POST /customer/subscriptions/:id/freeze`: Body `{ dates: ["YYYY-MM-DD", ...] }` (supports single days or multi-day/week ranges before slot cutoff; no max freeze-day limit).
- `DELETE /customer/subscriptions/:id/freeze`: Body `{ dates: ["YYYY-MM-DD", ...] }` to unfreeze upcoming dates prior to slot cutoff.

---

## 15. Option 1 Daily-Updating QR Pass & Admin Counter Scanner

### 15.1 Issue Rotating 60-Second Customer QR Pass
- **Endpoint:** `GET /customer/qr-pass`
- **Access:** Customer (`aud: "customer"`)
- **Description:** Checks today's IST status for active subscriptions and paid/ready single orders. Returns `{ status: "READY" | "FROZEN_TODAY" | "ALREADY_COLLECTED", qrPayload, qrDataUrl, expiresAt, collectionSlot, itemSummary }` where `qrPayload` is signed with `QR_HMAC_SECRET` and rotates every **60 seconds** + daily at midnight IST.

### 15.2 Staff Counter QR Redemption
- **Endpoint:** `POST /admin/qr/redeem`
- **Access:** `SUPER_ADMIN`, `ADMIN` (`aud: "admin"`)
- **Body:** `{ qrPayload, payAtStallMode?: "CASH" | "UPI" }`
- **Behavior:** Inside a `Serializable` transaction:
  1. Validates HMAC signature (`crypto.timingSafeEqual`), `date === todayIST`, and 60s window freshness.
  2. For subscriptions: enforces `@@unique([subscriptionId, redemptionDate])`, rejects if frozen today, increments `usedServings`, marks `COMPLETED` at `30/30`, and deducts recipe raw ingredients from `inventory`.
  3. For single orders: transitions `orderStatus` to `COLLECTED`, records `PAY_AT_STALL` payment into `cash_transactions` if unpaid, and executes recipe BOM inventory deduction.

### 15.3 Admin Order & Kitchen Prep Management
- `GET /admin/orders`: Filterable live order queue by date & `MORNING | EVENING` slot.
- `PATCH /admin/orders/:id/status`: Update `PLACED` → `PREPARING` → `READY` → `COLLECTED` / `CANCELLED`.
- `GET /admin/subscriptions`: Full subscriber directory, remaining servings, freeze dates, and daily kitchen prep headcount.

---

## 16. Admin Advanced Analytics & PDF / Excel Exports

### 16.1 Advanced Analytics
- **Endpoint:** `GET /admin/analytics/overview`
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Query Params:** `startDate`, `endDate`
- **Response Data:** Daily revenue & gross profit time-series, recipe contribution margin rankings, ingredient MAC cost-spike alerts, subscriber completion/redemption & freeze trends, `MORNING` vs. `EVENING` slot volume, and `PICKUP` vs. `2 KM DELIVERY` split.

### 16.2 Server-Generated PDF & Excel (`.xlsx`) Exports
- **Access:** `SUPER_ADMIN`, `ADMIN`
- **Query Params:** `startDate`, `endDate`, `format=pdf|xlsx`
- **Endpoints:**
  - `GET /admin/exports/pnl` — P&L statement workbook / formatted PDF
  - `GET /admin/exports/revenue` — POS + Razorpay + Subscription revenue register
  - `GET /admin/exports/expenses` — Categorized expenses & payment status
  - `GET /admin/exports/purchases` — Vendor stock purchases & MAC valuation
  - `GET /admin/exports/inventory` — Live stock valuation & movement audit
  - `GET /admin/exports/subscriptions` — 30-serving member balances, freeze dates & daily QR redemption log
