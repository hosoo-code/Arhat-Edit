/* ARHAT EDIT — Admin panel app logic (Supabase) */
(() => {
  "use strict";

  let supabaseClient = null;
  let currentUser = null;
  let subsCache = [];
  let currentSub = null;

  /* ===== DOM ===== */
  const loginSection = document.getElementById("login-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");
  const loginError = document.getElementById("login-error");
  const subsBody = document.getElementById("subs-body");
  const modal = document.getElementById("detail-modal");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnSaveStatus = document.getElementById("btn-save-status");
  const monpayQrImg = document.getElementById("monpay-qr-img");
  const qrFallback = document.getElementById("qr-fallback");

  const modalUser = document.getElementById("modal-user");
  const modalPhone = document.getElementById("modal-phone");
  const modalStatus = document.getElementById("modal-status");
  const modalDate = document.getElementById("modal-date");

  /* ===== INIT ===== */
  window.addEventListener("DOMContentLoaded", init);

  function init() {
    try {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      showError("Supabase хэрэгслэж чадсонгүй: " + e.message);
      return;
    }

    // Check existing session
    supabaseClient.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user ?? null;
      if (currentUser) {
        showDashboard();
        loadSubscriptions();
      } else {
        showLogin();
      }
    });
  }

  /* ===== AUTH ===== */
  btnLogin.onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError("Мэйл болон нууц үгээ бөглөнө үү");
      return;
    }

    btnLogin.textContent = "Дараа...";
    btnLogin.disabled = true;
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      showError("Нэвтрэлт амжилтгүй: " + err.message);
    } finally {
      btnLogin.textContent = "Нэвтрэх";
      btnLogin.disabled = false;
    }
  };

  btnLogout.onclick = async () => {
    await supabaseClient.auth.signOut();
  };

  function showError(msg) {
    loginError.textContent = msg;
    loginError.style.display = "block";
  }

  function showLogin() {
    loginSection.style.display = "block";
    dashboardSection.classList.remove("active");
    currentUser = null;
    subsCache = [];
  }

  function showDashboard() {
    loginSection.style.display = "none";
    dashboardSection.classList.add("active");
    loginError.style.display = "none";
  }

  /* ===== SUBSCRIPTIONS ===== */
  async function loadSubscriptions() {
    try {
      const { data, error } = await supabaseClient
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      subsCache = data || [];
      renderSubscriptions();
    } catch (err) {
      subsBody.innerHTML = `<tr><td colspan="5" class="empty">Алдаа: ${err.message}</td></tr>`;
    }
  }

  function renderSubscriptions() {
    if (!subsCache.length) {
      subsBody.innerHTML = `<tr><td colspan="5" class="empty"><div class="icon">📊</div><div>Хүлэмж байхгүй байна</div></td></tr>`;
      return;
    }

    subsBody.innerHTML = subsCache.map((sub, i) => `
      <tr data-id="${sub.id}" onclick="viewSub('${sub.id}')">
        <td>${i + 1}</td>
        <td>${escapeHtml(sub.user_email || sub.user_id || "—")}</td>
        <td>${formatDate(sub.created_at)}</td>
        <td><span class="status-badge ${sub.status}">${statusLabel(sub.status)}</span></td>
        <td>
          <button class="btn-action btn-approve" onclick="setStatus(event, '${sub.id}', 'active')">Идэвхжүүл</button>
          <button class="btn-action btn-expire" onclick="setStatus(event, '${sub.id}', 'expired')">Сүүжүүл</button>
        </td>
      </tr>
    `).join("");
  }

  window.viewSub = function(id) {
    currentSub = subsCache.find(s => s.id === id);
    if (!currentSub) return;
    modalUser.textContent = currentSub.user_email || currentSub.user_id || "—";
    modalPhone.textContent = currentSub.payment_phone || MONPAY.receiverPhone;
    modalStatus.textContent = currentSub.status ? statusLabel(currentSub.status) : "—";
    modalDate.textContent = formatDate(currentSub.created_at);
    // Update status select in modal
    const saveBtn = btnSaveStatus;
    saveBtn.onclick = saveSubStatus;
    modal.style.display = "flex";
  };

  window.setStatus = async function(e, id, status) {
    e.stopPropagation();
    // Direct update
    await updateSubStatus(id, status);
  };

  async function saveSubStatus() {
    if (!currentSub) return;
    await updateSubStatus(currentSub.id, currentSub.status === "active" ? "expired" : "active");
    closeModal();
  };

  async function updateSubStatus(id, status) {
    try {
      const { error } = await supabaseClient
        .from("subscriptions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      loadSubscriptions();
    } catch (err) {
      alert("Алдаа: " + err.message);
    }
  }

  btnCloseModal.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  function closeModal() {
    modal.style.display = "none";
    currentSub = null;
  }

  /* ===== HELPERS ===== */
  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("mn-MN") + " " + d.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  }

  function statusLabel(s) {
    switch (s) {
      case "active": return "Идэвхитэй";
      case "pending": return "Хүлэмж авсан";
      case "expired": return "Сүүжсэн";
      default: return "Үлдэн";
    }
  }

  /* ===== MONPAY QR ===== */
  // Attempt to show QR; fall back if image fails
  monpayQrImg.onerror = () => {
    monpayQrImg.style.display = "none";
    qrFallback.style.display = "block";
  };
  monpayQrImg.src = MONPAY.qrUrl + "&t=" + Date.now();
})();
