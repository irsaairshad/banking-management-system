// Auth guard functions -- plain middleware functions, no classes.

function requireCustomerAuth(req, res, next) {
    if (!req.session || !req.session.accountNo) {
        return res.status(401).json({ error: "Not authenticated. Please log in." });
    }
    next();
}

function requireAdminAuth(req, res, next) {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({ error: "Admin authentication required." });
    }
    next();
}

module.exports = { requireCustomerAuth, requireAdminAuth };
