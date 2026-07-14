// Dashboard logic -- plain functions, no classes.

let currentAccount = null;

function openModal(id) {
    document.getElementById(id).classList.add("show");
}
function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}

async function loadAccount() {
    try {
        const account = await apiRequest("GET", "/api/accounts/me");
        currentAccount = account;
        document.getElementById("userName").textContent = account.name;
        document.getElementById("balanceAmount").textContent = formatMoney(account.balance);
        document.getElementById("accNoDisplay").textContent = account.account_no;
        document.getElementById("accTypeDisplay").textContent = account.account_type + " account";

        const pill = document.getElementById("statusPill");
        pill.textContent = account.status;
        pill.className = "status-pill " + account.status;

        document.getElementById("detailName").value = account.name;
        document.getElementById("detailPhone").value = account.phone;
        document.getElementById("detailAddress").value = account.address || "";
    } catch (err) {
        window.location.href = "index.html";
    }
}

async function loadTransactions() {
    try {
        const txns = await apiRequest("GET", "/api/accounts/transactions");
        const body = document.getElementById("txnBody");
        const empty = document.getElementById("txnEmpty");
        body.innerHTML = "";

        if (txns.length === 0) {
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        txns.forEach(t => {
            const isCredit = ["Deposit", "Opening Deposit", "Transfer Received"].includes(t.type);
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${formatDate(t.created_at)}</td>
                <td class="txn-type ${isCredit ? "credit" : "debit"}">${t.type}</td>
                <td>${t.note || "-"}</td>
                <td class="amount mono">${isCredit ? "+" : "-"}${formatMoney(t.amount)}</td>
                <td class="amount mono">${formatMoney(t.balance_after)}</td>
            `;
            body.appendChild(row);
        });
    } catch (err) {
        console.error(err);
    }
}

function refreshAll() {
    loadAccount();
    loadTransactions();
}

document.addEventListener("DOMContentLoaded", () => {
    refreshAll();

    document.querySelectorAll("[data-modal]").forEach(card => {
        card.addEventListener("click", () => openModal(card.getAttribute("data-modal")));
    });
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", (e) => closeModal(e.target.closest(".modal-overlay").id));
    });
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    document.getElementById("logoutBtn").addEventListener("click", async () => {
        await apiRequest("POST", "/api/accounts/logout");
        window.location.href = "index.html";
    });

    document.getElementById("depositForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert("depositAlert");
        try {
            const amount = document.getElementById("depositAmount").value;
            await apiRequest("POST", "/api/accounts/deposit", { amount });
            closeModal("depositModal");
            e.target.reset();
            refreshAll();
        } catch (err) {
            showAlert("depositAlert", err.message, "error");
        }
    });

    document.getElementById("withdrawForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert("withdrawAlert");
        try {
            const amount = document.getElementById("withdrawAmount").value;
            await apiRequest("POST", "/api/accounts/withdraw", { amount });
            closeModal("withdrawModal");
            e.target.reset();
            refreshAll();
        } catch (err) {
            showAlert("withdrawAlert", err.message, "error");
        }
    });

    document.getElementById("transferForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert("transferAlert");
        try {
            const toAccountNo = document.getElementById("toAccountNo").value.trim();
            const amount = document.getElementById("transferAmount").value;
            await apiRequest("POST", "/api/accounts/transfer", { toAccountNo, amount });
            closeModal("transferModal");
            e.target.reset();
            refreshAll();
        } catch (err) {
            showAlert("transferAlert", err.message, "error");
        }
    });

    document.getElementById("detailsForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert("detailsAlert");
        try {
            const phone = document.getElementById("detailPhone").value.trim();
            const address = document.getElementById("detailAddress").value.trim();
            const newPin = document.getElementById("detailNewPin").value.trim();

            const payload = { phone, address };
            if (newPin) payload.newPin = newPin;

            await apiRequest("PUT", "/api/accounts/update", payload);
            showAlert("detailsAlert", "Details updated successfully.", "success");
            document.getElementById("detailNewPin").value = "";
            refreshAll();
        } catch (err) {
            showAlert("detailsAlert", err.message, "error");
        }
    });

    document.getElementById("confirmCloseBtn").addEventListener("click", async () => {
        hideAlert("closeAlert");
        try {
            await apiRequest("DELETE", "/api/accounts/close");
            window.location.href = "index.html";
        } catch (err) {
            showAlert("closeAlert", err.message, "error");
        }
    });
});
