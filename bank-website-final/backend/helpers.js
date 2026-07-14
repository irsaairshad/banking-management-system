// Shared helper functions -- plain functions only, no classes/objects-as-instances.

function generateAccountNumber() {
    // 6-digit numeric account number as a string
    return String(Math.floor(100000 + Math.random() * 900000));
}

async function accountNumberExists(pool, accNo) {
    const [rows] = await pool.query("SELECT account_no FROM accounts WHERE account_no = ?", [accNo]);
    return rows.length > 0;
}

async function generateUniqueAccountNumber(pool) {
    let accNo = generateAccountNumber();
    while (await accountNumberExists(pool, accNo)) {
        accNo = generateAccountNumber();
    }
    return accNo;
}

async function recordTransaction(pool, accountNo, type, amount, balanceAfter, note = "") {
    await pool.query(
        "INSERT INTO transactions (account_no, type, amount, balance_after, note) VALUES (?, ?, ?, ?, ?)",
        [accountNo, type, amount, balanceAfter, note]
    );
}

function isValidPin(pin) {
    return typeof pin === "string" && /^\d{4}$/.test(pin);
}

function isValidPhone(phone) {
    return typeof phone === "string" && /^\d{7,15}$/.test(phone);
}

function isPositiveNumber(value) {
    const n = Number(value);
    return !isNaN(n) && n > 0;
}

module.exports = {
    generateAccountNumber,
    generateUniqueAccountNumber,
    recordTransaction,
    isValidPin,
    isValidPhone,
    isPositiveNumber
};
