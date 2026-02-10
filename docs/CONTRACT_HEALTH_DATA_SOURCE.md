# How Contract Health Amounts Are Pulled

This doc traces where each number comes from: Autotask API → sync → database → API → frontend.

---

## Unlimited Contract Amount (UI: "Unlimited Contract Amount")

**Goal:** Show the **Estimated Monthly Amount** from the contract’s **Services** tab — what the client gets billed monthly. One process for every Unlimited contract.

### 1. Sync (backend/sync-contract-health.js)

For every **Unlimited** contract, the same process:

- **API:** `GET /ContractServices/query` with `contractID = contract.id` (services on the contract).
- **Per service line:** line total = `adjustedPrice` **or** `adjustedUnitPrice × units` **or** `unitPrice × units` (same formula for all contracts).
- **Result:** Sum of line totals → written to `contract_usage.monthly_revenue`. No billing periods, no other APIs, no fallbacks.

### 2. Database

- **Table:** `contract_usage`  
- **Column:** `monthly_revenue` (REAL)  
- One row per (client_id, month). Same `monthly_revenue` is written for each of the last 3 months for that client.

### 3. API (backend/routes/contract-usage.js)

- **Endpoint:** `GET /api/contract-usage/all`  
- **Query:** `contract_usage` joined to `clients` for the **current month** (same month as sync: `getLastThreeMonths()[0]`).  
- **Response:** For each client, `monthlyRevenue: isUnlimited ? Number(monthly_revenue) : null`.

### 4. Frontend (client/src/App.jsx)

- **Display:** “Unlimited Contract Amount” column uses `formatRevenue(client.monthlyRevenue)` for Unlimited contracts.

---

## Block Hours: Overage Amount (UI: “Overage Amount”)

**Goal:** Show the dollar overage when hours used this month exceed the block allocation.

### 1. Sync

- **Contract:** From `getClientContract()` we get `blocks` (from ContractBlocks API).  
- **Rate:** From the current (or most recent) block we use `hourlyRate` (or `unitPrice`).  
- **Logic:** If `contract.displayType === 'Block Hours'` and `hoursUsed > monthlyHours` and we have a rate:  
  `overageAmount = (hoursUsed - monthlyHours) * blockHourlyRate`  
- **Written to:** `contract_usage.overage_amount`.

### 2. API

- Same `GET /api/contract-usage/all` row.  
- **Response:** `currentMonth.overageAmount: Number(overage_amount)` for Block Hours (null for Unlimited).

### 3. Frontend

- **Display:** “Overage Amount” shows currency when `client.currentMonth?.overageAmount > 0`, else “—”.

---

## If Amounts Are Wrong

- **Unlimited:** We use only ContractServices; same formula for every contract (adjustedPrice or adjustedUnitPrice×units or unitPrice×units). If a total is wrong, run `getContractServices(contractId, { logRaw: true })` and compare the API’s `adjustedPrice` / `adjustedUnitPrice` / `unitPrice` to the Services tab in Autotask.
- **Same DB:** Sync uses the server’s `db`; the API reads the same `contract_usage` table. Current month = `getLastThreeMonths()[0]`.
