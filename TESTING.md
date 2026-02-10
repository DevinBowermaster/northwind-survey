# Testing Before Pushing to Live

Ways to test contract health and other changes **locally** before deploying to production.

## Why "no such column: company_id" happened (fixed)

The `contacts` table links each contact to a company by the **Autotask company ID**. Over time the codebase used two column names:

- **`company_id`** – used in `database.js` and most of the app (production DB was created with this).
- **`company_autotask_id`** – used after running `fix-contacts-table.js` (some local DBs were recreated with this only).

So **local** had only `company_autotask_id` (no `company_id`) → queries using `company_id` failed. **Production** had `company_id` and worked.

The fix:

1. **One column name everywhere:** All code now uses **`company_autotask_id`** (clearer: it’s the Autotask company ID).
2. **Startup migration:** On server start we run a migration that:
   - If `contacts` already has `company_autotask_id` → do nothing (local and already-migrated production).
   - If `contacts` has `company_id` but not `company_autotask_id` → add `company_autotask_id`, copy values from `company_id`, and leave `company_id` in place (no drop). So production gets the new column and keeps working.
3. **New installs:** `database.js` now creates `contacts` with `company_autotask_id` so new DBs are consistent.

After you deploy, production runs the migration once and then uses `company_autotask_id` like local. No data loss and no breaking change for live.

---

## 1. Use a local database (default)

When you **don't** set `NODE_ENV=production`:

- Server and scripts use **`northwind.db`** in the project root (local file).
- Production uses a different path (e.g. on Render: `/opt/render/project/src/data/northwind.db`).

So running locally without `NODE_ENV=production` already avoids touching the live DB.

## 2. Dry-run: Unlimited Contract Amount

Test the Unlimited calculation (estimatedRevenue ÷ contract length) **without writing to the DB**:

```bash
# Test all Unlimited managed clients
node test-unlimited-calculation.js

# Test one client by name (e.g. MSBT LAW)
node test-unlimited-calculation.js "MSBT LAW"
```

Or:

```bash
npm run test:unlimited
npm run test:unlimited -- "MSBT LAW"
```

This prints for each Unlimited client: `estimatedRevenue`, start/end dates, length in months, and the computed monthly amount.

## 3. Run contract sync locally

Running the sync **locally** writes to **`northwind.db`** in the project root (not production):

```bash
node backend/sync-contract-health.js
```

Or:

```bash
npm run sync:contracts
```

Use a **copy** of the live DB if you want to test with real data without affecting live:

```bash
copy northwind.db northwind.db.backup
# then run sync; it will use northwind.db (or set db path in script)
```

## 4. Run the full app locally

1. **Backend** (from project root):

   ```bash
   npm start
   # or: node server.js
   ```

   Uses `northwind.db` in the project root (unless `NODE_ENV=production`).

2. **Frontend** (in another terminal):

   ```bash
   cd client && npm run dev
   ```

   Open the URL Vite prints (e.g. http://localhost:5173). Use the Contract Health tab and “Sync contract health” (if admin) to verify behavior.

3. Ensure `.env` has the same Autotask (and other) keys you want to test with; use a dev/sandbox Autotask account if you have one.

## 5. Checklist before pushing

- [ ] Run `node test-unlimited-calculation.js` and confirm amounts look correct (e.g. MSBT LAW ~$1,778 if applicable).
- [ ] Run `node backend/sync-contract-health.js` locally and check console for errors.
- [ ] Start server + client locally and confirm Contract Health tab shows expected Unlimited amounts and overage.
- [ ] Don’t set `NODE_ENV=production` when testing locally so the app uses the local DB.
