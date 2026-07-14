// Admin panel logic -- plain functions, no classes.

function showDashboard() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("dashSection").style.display = "block";
    document.getElementById("logoutBtn").style.display = "inline";
}

function showLogin() {
    document.getElementById("loginSection").style.display = "flex";
    document.getElementById("dashSection").style.display = "none";
    document.getElementById("logoutBtn").style.display = "none";
}

async function loadStats() {
    try {
        const stats = await apiRequest("GET", "/api/admin/stats");
        document.getElementById("statTotal").textContent = stats.totalAccounts;
        document.getElementById("statActive").textContent = stats.activeAccounts;
        document.getElementById("statFrozen").textContent = stats.frozenAccounts;
        document.getElementById("statFunds").textContent = formatMoney(stats.totalFunds);
    } catch (err) {
        console.error(err);
    }
}

function renderAccountsTable(accounts) {
    const body = document.getElementById("accountsBody");
    const empty = document.getElementById("accountsEmpty");
    body.innerHTML = "";

    if (accounts.length === 0) {
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    accounts.forEach(acc => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="mono">${acc.account_no}</td>
            <td>${acc.name}</td>
            <td>${acc.phone}</td>
            <td>${acc.account_type}</td>
            <td class="amount mono">${formatMoney(acc.balance)}</td>
            <td><span class="status-pill ${acc.status}">${acc.status}</span></td>
            <td><button class="btn small secondary toggle-freeze-btn" data-acc="${acc.account_no}">
                ${acc.status === "active" ? "Freeze" : "Unfreeze"}
            </button></td>
        `;
        body.appendChild(row);
    });

    document.querySelectorAll(".toggle-freeze-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const accNo = btn.getAttribute("data-acc");
            try {
                await apiRequest("POST", `/api/admin/accounts/${accNo}/toggle-freeze`);
                await loadAllAccounts();
                await loadStats();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

async function loadAllAccounts() {
    try {
        const accounts = await apiRequest("GET", "/api/admin/accounts");
        renderAccountsTable(accounts);
    } catch (err) {
        console.error(err);
    }
}

async function checkAdminSession() {
    try {
        await apiRequest("GET", "/api/admin/stats");
        showDashboard();
        loadStats();
        loadAllAccounts();
    } catch (err) {
        showLogin();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkAdminSession();

    document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert("adminLoginAlert");
        try {
            const username = document.getElementById("adminUsername").value.trim();
            const password = document.getElementById("adminPassword").value.trim();
            await apiRequest("POST", "/api/admin/login", { username, password });
            showDashboard();
            loadStats();
            loadAllAccounts();
        } catch (err) {
            showAlert("adminLoginAlert", err.message, "error");
        }
    });

    document.getElementById("logoutBtn").addEventListener("click", async () => {
        await apiRequest("POST", "/api/admin/logout");
        showLogin();
    });

    document.getElementById("refreshBtn").addEventListener("click", () => {
        loadStats();
        loadAllAccounts();
    });

    document.getElementById("searchBtn").addEventListener("click", async () => {
        const accNo = document.getElementById("searchAccNo").value.trim();
        if (!accNo) {
            loadAllAccounts();
            return;
        }
        try {
            const acc = await apiRequest("GET", `/api/admin/accounts/${accNo}`);
            renderAccountsTable([acc]);
        } catch (err) {
            renderAccountsTable([]);
        }
    });
});
