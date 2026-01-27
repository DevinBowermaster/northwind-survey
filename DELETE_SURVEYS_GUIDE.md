# Guide: Deleting All Survey Responses from Production Database

This guide explains how to delete all survey responses from the production database on Render while keeping the table structure intact.

## ⚠️ WARNING
**This operation is irreversible!** Make sure you have a backup before proceeding.

---

## Method 1: Using Render Shell (Recommended)

### Step 1: Access Render Shell
1. Go to your Render dashboard: https://dashboard.render.com
2. Navigate to your `northwind-survey` service
3. Click on the **"Shell"** tab (or use the terminal icon)
4. This opens an interactive shell connected to your production environment

### Step 2: Navigate to Project Directory
```bash
cd /opt/render/project/src
```

### Step 3: Run the Deletion Script

**For Production (requires confirmation):**
```bash
CONFIRM_DELETE=true node delete-all-surveys.js
```

**For Local Development:**
```bash
node delete-all-surveys.js
```

> **Note:** The script requires `CONFIRM_DELETE=true` when running in production mode to prevent accidental deletion.

The script will:
- Show current survey count
- Delete all records from the `surveys` table
- Reset client scores to 0
- Clear `last_survey` dates
- Preserve the table structure

---

## Method 2: Using Render API Endpoint (Alternative)

If you prefer to add a temporary API endpoint, you can add this to `server.js`:

```javascript
// TEMPORARY ENDPOINT - Remove after use!
app.post('/api/admin/delete-all-surveys', (req, res) => {
  try {
    const { deleteAllSurveys } = require('./delete-all-surveys');
    deleteAllSurveys();
    res.json({ success: true, message: 'All surveys deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Then call it:
```bash
curl -X POST https://your-render-app.onrender.com/api/admin/delete-all-surveys
```

**⚠️ Remember to remove this endpoint after use for security!**

---

## Method 3: Direct SQL Command (Advanced)

If you prefer to use SQL directly:

### Step 1: Access Render Shell
Same as Method 1, Step 1

### Step 2: Connect to SQLite Database
```bash
cd /opt/render/project/src
sqlite3 data/northwind.db
```

### Step 3: Run SQL Commands
```sql
-- Check current count
SELECT COUNT(*) FROM surveys;

-- Delete all surveys
DELETE FROM surveys;

-- Reset client scores
UPDATE clients SET score = 0;

-- Clear last_survey dates
UPDATE clients SET last_survey = NULL;

-- Verify deletion
SELECT COUNT(*) FROM surveys;

-- Exit SQLite
.quit
```

---

## What Gets Deleted

✅ **Deleted:**
- All records in the `surveys` table
- Client scores (reset to 0)
- `last_survey` dates (cleared)

✅ **Preserved:**
- Table structure (schema remains intact)
- All client records
- All contact records
- Survey templates
- All other data

---

## Verification

After deletion, verify the operation:

1. **Check survey count:**
   ```bash
   node -e "const db = require('./database'); console.log('Surveys:', db.prepare('SELECT COUNT(*) as count FROM surveys').get().count); db.close();"
   ```

2. **Check via API:**
   ```bash
   curl https://your-render-app.onrender.com/api/surveys/statistics
   ```
   Should show `total_surveys: 0`

---

## Backup Before Deletion (Recommended)

### Create Backup via Render Shell:
```bash
cd /opt/render/project/src
cp data/northwind.db data/northwind.db.backup.$(date +%Y%m%d_%H%M%S)
```

### Or download via Render Dashboard:
1. Go to your service → **"Persistent Disk"** tab
2. Download the database file before making changes

---

## Troubleshooting

### Error: "Cannot find module"
- Make sure you're in the project root directory
- Run `npm install` if needed

### Error: "Database is locked"
- Another process might be using the database
- Restart your Render service and try again

### Error: "Permission denied"
- Make sure you're using the Render Shell (not SSH)
- Check file permissions: `ls -la data/northwind.db`

---

## After Deletion

1. ✅ Verify the deletion was successful
2. ✅ Test that new surveys can still be created
3. ✅ Remove any temporary endpoints you added
4. ✅ Update your deployment if needed

---

## Quick Reference

```bash
# Access Render Shell
# Navigate to project
cd /opt/render/project/src

# Run deletion script
node delete-all-surveys.js

# Verify (should show 0)
node -e "const db = require('./database'); console.log(db.prepare('SELECT COUNT(*) as count FROM surveys').get().count); db.close();"
```
