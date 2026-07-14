const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { requireAdminAuth } = require("../middleware");

// Simple hardcoded admin credentials for the assignment.
// (For a real deployment, store hashed credentials in the `admins` table instead.)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// ---------------------------------------------------------------------------
// ADMIN LOGIN
// ---------------------------------------------------------------------------
router.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.json({ message: "Admin login successful." });
    }
    res.status(401).json({ error: "Invalid admin credentials." });
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ message: "Logged out." }));
});

// ---------------------------------------------------------------------------
// VIEW ALL ACCOUNTS
// ---------------------------------------------------------------------------
router.get("/accounts", requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT account_no, name, phone, account_type, balance, status, created_at FROM accounts ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error." });
    }
});

// ---------------------------------------------------------------------------
// SEARCH A SPECIFIC ACCOUNT
// ---------------------------------------------------------------------------
router.get("/accounts/:accNo", requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT account_no, name, phone, address, account_type, balance, status, created_at FROM accounts WHERE account_no = ?",
            [req.params.accNo]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Account not found." });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error." });
    }
});

// ---------------------------------------------------------------------------
// FREEZE / UNFREEZE ACCOUNT
// ---------------------------------------------------------------------------
router.post("/accounts/:accNo/toggle-freeze", requireAdminAuth, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT status FROM accounts WHERE account_no = ?", [req.params.accNo]);
        if (rows.length === 0) return res.status(404).json({ error: "Account not found." });

        const newStatus = rows[0].status === "active" ? "frozen" : "active";
        await pool.query("UPDATE accounts SET status = ? WHERE account_no = ?", [newStatus, req.params.accNo]);

        res.json({ message: `Account ${newStatus}.`, status: newStatus });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error." });
    }
});

// ---------------------------------------------------------------------------
// BANK STATISTICS
// ---------------------------------------------------------------------------
router.get("/stats", requireAdminAuth, async (req, res) => {
    try {
        const [[{ totalAccounts }]] = await pool.query("SELECT COUNT(*) AS totalAccounts FROM accounts");
        const [[{ activeAccounts }]] = await pool.query("SELECT COUNT(*) AS activeAccounts FROM accounts WHERE status = 'active'");
        const [[{ frozenAccounts }]] = await pool.query("SELECT COUNT(*) AS frozenAccounts FROM accounts WHERE status = 'frozen'");
        const [[{ totalFunds }]] = await pool.query("SELECT COALESCE(SUM(balance),0) AS totalFunds FROM accounts");

        res.json({ totalAccounts, activeAccounts, frozenAccounts, totalFunds });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error." });
    }
});

module.exports = router;
