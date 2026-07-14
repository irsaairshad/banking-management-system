# Meridian Trust — Bank Management System (Website)

A complete, working **bank management website** built with:
- **Frontend:** Plain HTML, CSS, JavaScript (no frameworks)
- **Backend:** Node.js + Express (function-based — no classes/OOP anywhere)
- **Database:** MySQL (works with MariaDB too)

Tested end-to-end: account creation, login, deposit, withdraw, transfer,
transaction history, account updates, account closure, and the full admin
panel (view all accounts, search, freeze/unfreeze, bank statistics).

---

## 1. Requirements

- Node.js (v16 or newer) — [nodejs.org](https://nodejs.org)
- MySQL Server or MariaDB — [XAMPP](https://www.apachefriends.org/) is the
  easiest way to get MySQL running on Windows if you don't have it already.

---

## 2. Project Structure

```
bank-website/
├── backend/
│   ├── config/db.js          # MySQL connection pool
│   ├── routes/accounts.js    # customer routes (register, login, deposit...)
│   ├── routes/admin.js       # admin routes (view, freeze, stats)
│   ├── helpers.js            # shared helper functions
│   ├── middleware.js         # auth guard functions
│   ├── server.js             # Express app entry point
│   ├── schema.sql            # database schema (run this first)
│   ├── package.json
│   └── .env.example          # copy this to .env and edit
├── public/
│   ├── index.html            # sign-in page
│   ├── register.html         # open a new account
│   ├── dashboard.html        # customer dashboard
│   ├── admin.html            # admin panel
│   ├── css/style.css
│   └── js/ (api.js, dashboard.js, admin.js)
└── README.md
```

---

## 3. Setup Instructions

### Step 1 — Create the database
Open MySQL (via command line, MySQL Workbench, or phpMyAdmin if using XAMPP)
and run the contents of `backend/schema.sql`. This creates the
`bank_management` database with three tables: `accounts`, `transactions`,
and `admins`.

Command line example:
```bash
mysql -u root -p < backend/schema.sql
```

### Step 2 — Create a database user (or just use root)
```sql
CREATE USER 'bankuser'@'localhost' IDENTIFIED BY 'bankpass123';
GRANT ALL PRIVILEGES ON bank_management.* TO 'bankuser'@'localhost';
FLUSH PRIVILEGES;
```
(Or skip this and just use your existing `root` user + password in Step 3.)

### Step 3 — Configure environment variables
```bash
cd backend
cp .env.example .env
```
Open `.env` and set your real DB credentials:
```
DB_HOST=localhost
DB_USER=bankuser
DB_PASSWORD=bankpass123
DB_NAME=bank_management
```

### Step 4 — Install dependencies
```bash
cd backend
npm install
```

### Step 5 — Run the server
```bash
npm start
```
You should see:
```
Bank Management System server running on http://localhost:3000
```

### Step 6 — Open the website
Go to **http://localhost:3000** in your browser.

---

## 4. Using the Website

**Customers:**
1. Click "Open an account" → fill the form → note down your account number.
2. Sign in with your account number + 4-digit PIN.
3. From the dashboard: deposit, withdraw, transfer, view transaction
   history, update your phone/address/PIN, or close your account.

**Admin:**
1. Go to the "Bank admin" link (or `/admin.html`).
2. Default login: `admin` / `admin123` (change these in `.env`).
3. View all accounts, search by account number, freeze/unfreeze accounts,
   and see bank-wide statistics.

---

## 5. Design Notes (for your project report)

- **No OOP:** every feature is a plain function — no `class` keyword
  anywhere in the backend or frontend JavaScript. State (accounts,
  balances) lives in the MySQL database, not in objects.
- **Security basics included:** PINs are hashed with bcrypt (never stored
  in plain text), sessions are used for login state, and transfers use a
  database transaction (commit/rollback) so money can never "disappear"
  partway through.
- **Frozen accounts** cannot deposit, withdraw, or transfer — useful for
  demonstrating admin controls in your demo/viva.

## 6. Troubleshooting

- **"Access denied for user"** → check your `.env` DB credentials match
  what you set up in Step 2.
- **"Cannot find module..."** → run `npm install` again inside `backend/`.
- **Port 3000 already in use** → change `PORT` in `.env`, e.g. `PORT=4000`,
  then visit `http://localhost:4000`.
