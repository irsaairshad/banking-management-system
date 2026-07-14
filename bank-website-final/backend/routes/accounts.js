const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const pool = require("../config/db");
const { requireCustomerAuth } = require("../middleware");
const {
    generateUniqueAccountNumber,
    recordTransaction,
    isValidPin,
    isValidPhone,
    isPositiveNumber
} = require("../helpers");

const MIN_OPENING_BALANCE = 500;

// ---------------------------------------------------------------------------
// REGISTER (Open New Account)
// ---------------------------------------------------------------------------
router.post("/register", async (req, res) => {
    try {
        const { name, phone, address, accountType, pin, openingBalance } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({ error: "Please provide a valid name." });
        }
        if (!isValidPhone(phone)) {
            return res.status(400).json({ error: "Please provide a valid phone number (7-15 digits)." });
        }
        if (!["Savings", "Current"].includes(accountType)) {
            return res.status(400).json({ error: "Account type must be 'Savings' or 'Current'." });
        }
        if (!isValidPin(pin)) {
            return res.status(400).json({ error: "PIN must be exactly 4 digits." });
        }
        const balance = Number(openingBalance);
        if (isNaN(balance) || balance < MIN_OPENING_BALANCE) {
            return res.status(400).json({ error: `Opening balance must be at least ${MIN_OPENING_BALANCE}.` });
        }

        const accountNo = await generateUniqueAccountNumber(pool);
        const pinHash = await bcrypt.hash(pin, 10);

        await pool.query(
            `INSERT INTO accounts (account_no, name, phone, address, account_type, pin_hash, balance, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [accountNo, name.trim(), phone, address || "", accountType, pinHash, balance]
        );

        await recordTransaction(pool, accountNo, "Opening Deposit", balance, balance);

        res.status(201).json({
            message: "Account created successfully.",
            accountNo
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error while creating account." });
    }
});

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
router.post("/login", async (req, res) => {
    try {
        const { accountNo, pin } = req.body;
        if (!accountNo || !pin) {
            return res.status(400).json({ error: "Account number and PIN are required." });
        }

        const [rows] = await pool.query("SELECT * FROM accounts WHERE account_no = ?", [accountNo]);
        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid account number or PIN." });
        }

        const account = rows[0];
        const match = await bcrypt.compare(pin, account.pin_hash);
        if (!match) {
            return res.status(401).json({ error: "Invalid account number or PIN." });
        }

        req.session.accountNo = account.account_no;
        res.json({ message: "Login successful.", accountNo: account.account_no, name: account.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login." });
    }
});

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out successfully." });
    });
});

// ---------------------------------------------------------------------------
// GET LOGGED-IN ACCOUNT DETAILS
// ---------------------------------------------------------------------------
router.get("/me", requireCustomerAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT account_no, name, phone, address, account_type, balance, status, created_at FROM accounts WHERE account_no = ?",
            [req.session.accountNo]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Account not found." });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error." });
    }
});

// ---------------------------------------------------------------------------
// DEPOSIT
// ---------------------------------------------------------------------------
router.post("/deposit", requireCustomerAuth, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!isPositiveNumber(amount)) {
            return res.status(400).json({ error: "Please provide a valid positive amount." });
        }

        const [rows] = await pool.query("SELECT * FROM accounts WHERE account_no = ?", [req.session.accountNo]);
        const account = rows[0];
        if (account.status === "frozen") {
            return res.status(403).json({ error: "This account is frozen." });
        }

        const newBalance = Number(account.balance) + Number(amount);
        await pool.query("UPDATE accounts SET balance = ? WHERE account_no = ?", [newBalance, account.account_no]);
        await recordTransaction(pool, account.account_no, "Deposit", amount, newBalance);

        res.json({ message: "Deposit successful.", balance: newBalance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during deposit." });
    }
});

// ---------------------------------------------------------------------------
// WITHDRAW
// ---------------------------------------------------------------------------
router.post("/withdraw", requireCustomerAuth, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!isPositiveNumber(amount)) {
            return res.status(400).json({ error: "Please provide a valid positive amount." });
        }

        const [rows] = await pool.query("SELECT * FROM accounts WHERE account_no = ?", [req.session.accountNo]);
        const account = rows[0];
        if (account.status === "frozen") {
            return res.status(403).json({ error: "This account is frozen." });
        }
        if (Number(amount) > Number(account.balance)) {
            return res.status(400).json({ error: "Insufficient balance." });
        }

        const newBalance = Number(account.balance) - Number(amount);
        await pool.query("UPDATE accounts SET balance = ? WHERE account_no = ?", [newBalance, account.account_no]);
        await recordTransaction(pool, account.account_no, "Withdrawal", amount, newBalance);

        res.json({ message: "Withdrawal successful.", balance: newBalance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during withdrawal." });
    }
});

// ---------------------------------------------------------------------------
// TRANSFER
// ---------------------------------------------------------------------------
router.post("/transfer", requireCustomerAuth, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { toAccountNo, amount } = req.body;
        if (!isPositiveNumber(amount)) {
            connection.release();
            return res.status(400).json({ error: "Please provide a valid positive amount." });
        }
        if (!toAccountNo || toAccountNo === req.session.accountNo) {
            connection.release();
            return res.status(400).json({ error: "Invalid recipient account." });
        }

        await connection.beginTransaction();

        const [senderRows] = await connection.query(
            "SELECT * FROM accounts WHERE account_no = ? FOR UPDATE", [req.session.accountNo]
        );
        const [receiverRows] = await connection.query(
            "SELECT * FROM accounts WHERE account_no = ? FOR UPDATE", [toAccountNo]
        );

        if (receiverRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: "Recipient account does not exist." });
        }

        const sender = senderRows[0];
        const receiver = receiverRows[0];

        if (sender.status === "frozen") {
            await connection.rollback();
            connection.release();
            return res.status(403).json({ error: "This account is frozen." });
        }
        if (Number(amount) > Number(sender.balance)) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ error: "Insufficient balance." });
        }

        const senderNewBalance = Number(sender.balance) - Number(amount);
        const receiverNewBalance = Number(receiver.balance) + Number(amount);

        await connection.query("UPDATE accounts SET balance = ? WHERE account_no = ?", [senderNewBalance, sender.account_no]);
        await connection.query("UPDATE accounts SET balance = ? WHERE account_no = ?", [receiverNewBalance, receiver.account_no]);

        await connection.query(
            "INSERT INTO transactions (account_no, type, amount, balance_after, note) VALUES (?, 'Transfer Sent', ?, ?, ?)",
            [sender.account_no, amount, senderNewBalance, `To ${receiver.account_no}`]
        );
        await connection.query(
            "INSERT INTO transactions (account_no, type, amount, balance_after, note) VALUES (?, 'Transfer Received', ?, ?, ?)",
            [receiver.account_no, amount, receiverNewBalance, `From ${sender.account_no}`]
        );

        await connection.commit();
        connection.release();

        res.json({ message: "Transfer successful.", balance: senderNewBalance });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error(err);
        res.status(500).json({ error: "Server error during transfer." });
    }
});

// ---------------------------------------------------------------------------
// TRANSACTION HISTORY
// ---------------------------------------------------------------------------
router.get("/transactions", requireCustomerAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT type, amount, balance_after, note, created_at FROM transactions WHERE account_no = ? ORDER BY created_at DESC",
            [req.session.accountNo]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error." });
    }
});

// ---------------------------------------------------------------------------
// UPDATE ACCOUNT INFO (phone, address, pin)
// ---------------------------------------------------------------------------
router.put("/update", requireCustomerAuth, async (req, res) => {
    try {
        const { phone, address, newPin } = req.body;
        const updates = [];
        const values = [];

        if (phone !== undefined) {
            if (!isValidPhone(phone)) return res.status(400).json({ error: "Invalid phone number." });
            updates.push("phone = ?");
            values.push(phone);
        }
        if (address !== undefined) {
            updates.push("address = ?");
            values.push(address);
        }
        if (newPin !== undefined) {
            if (!isValidPin(newPin)) return res.status(400).json({ error: "PIN must be exactly 4 digits." });
            const pinHash = await bcrypt.hash(newPin, 10);
            updates.push("pin_hash = ?");
            values.push(pinHash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: "Nothing to update." });
        }

        values.push(req.session.accountNo);
        await pool.query(`UPDATE accounts SET ${updates.join(", ")} WHERE account_no = ?`, values);

        res.json({ message: "Account updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during update." });
    }
});

// ---------------------------------------------------------------------------
// CLOSE ACCOUNT
// ---------------------------------------------------------------------------
router.delete("/close", requireCustomerAuth, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT balance FROM accounts WHERE account_no = ?", [req.session.accountNo]);
        if (rows.length === 0) return res.status(404).json({ error: "Account not found." });

        if (Number(rows[0].balance) > 0) {
            return res.status(400).json({ error: "Please withdraw remaining balance before closing the account." });
        }

        await pool.query("DELETE FROM accounts WHERE account_no = ?", [req.session.accountNo]);
        req.session.destroy(() => {
            res.json({ message: "Account closed successfully." });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during account closure." });
    }
});

module.exports = router;
