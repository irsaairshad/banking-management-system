// Database connection pool -- plain module, no classes.
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "bankuser",
    password: process.env.DB_PASSWORD || "bankpass123",
    database: process.env.DB_NAME || "bank_management",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
