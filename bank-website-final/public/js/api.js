// Small fetch wrapper -- plain functions, no classes.

async function apiRequest(method, url, body) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin"
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    let data = null;
    try {
        data = await res.json();
    } catch (e) {
        data = null;
    }
    if (!res.ok) {
        const message = (data && data.error) ? data.error : `Request failed (${res.status})`;
        throw new Error(message);
    }
    return data;
}

function showAlert(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `alert show ${type}`;
}

function hideAlert(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = "alert";
}

function formatMoney(value) {
    const n = Number(value);
    return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}
