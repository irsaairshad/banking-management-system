const express = require("express");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const accountRoutes = require("./routes/accounts");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// MIDDLEWARE
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "bank_management_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2, // 2 hours
        httpOnly: true
    }
}));

// Serve the frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// ---------------------------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------------------------
app.use("/api/accounts", accountRoutes);
app.use("/api/admin", adminRoutes);

// Fallback: send index.html for any unmatched route (simple SPA-like behavior)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Bank Management System server running on http://localhost:${PORT}`);
});
