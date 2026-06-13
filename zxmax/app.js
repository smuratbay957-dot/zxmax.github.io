(function () {
  "use strict";

  const AVATARS = ["😀", "😎", "🚀", "👑", "🦸", "🎮", "💎", "🔥", "⭐", "🌈", "🦁", "🐉", "🤖", "👾", "🎯", "🏆", "🕶️", "🐱"];
  const GAME_IDS = ["xotira", "galaxy", "quiz", "snake", "tictactoe", "numberguess", "reaksiya", "colorblock"];

  const PROFILE_THEMES = [
    { id: "default", label: "Standard", bg: "#0f0f1a", card: "#1a1a2e", accent: "#7c3aed", text: "#e2e8f0", icon: "⚫" },
    { id: "neon", label: "Neon", bg: "#0a0a0a", card: "#111111", accent: "#00ff88", text: "#e2e8f0", icon: "💚" },
    { id: "ocean", label: "Ocean", bg: "#0a1628", card: "#0f1f3d", accent: "#3b82f6", text: "#e2e8f0", icon: "🌊" },
    { id: "sunset", label: "Sunset", bg: "#1a0f0a", card: "#2e1a0f", accent: "#f59e0b", text: "#fef3c7", icon: "🌅" },
    { id: "forest", label: "Forest", bg: "#0a1a0f", card: "#0f2e1a", accent: "#22c55e", text: "#e2e8f0", icon: "🌿" },
    { id: "rose", label: "Rose", bg: "#1a0a14", card: "#2e0f1f", accent: "#ec4899", text: "#e2e8f0", icon: "🌹" },
    { id: "cyber", label: "Cyber", bg: "#0a0a1a", card: "#0f0f2e", accent: "#06b6d4", text: "#e2e8f0", icon: "💠" },
    { id: "custom", label: "Custom", bg: "", card: "", accent: "", text: "#e2e8f0", icon: "🎨" },
  ];

  const BADGES = [
    { id: "first_game", label: "Birinchi o'yin", icon: "🎮", check: () => GAME_IDS.some(g => (getGameStats()[g]?.plays || 0) > 0) },
    { id: "earn_1000", label: "1000◎ ishlagan", icon: "💰", check: () => (state?.totalEarned || 0) >= 1000 },
    { id: "earn_5000", label: "5000◎ ishlagan", icon: "💎", check: () => (state?.totalEarned || 0) >= 5000 },
    { id: "spend_500", label: "500◎ sarflagan", icon: "🛒", check: () => (state?.totalSpent || 0) >= 500 },
    { id: "streak_7", label: "7 kunlik streak", icon: "🔥", check: () => (state?.streakCount || 0) >= 7 },
    { id: "subscriber_5", label: "5 obunachi", icon: "👥", check: () => false },
    { id: "vip", label: "VIP egasi", icon: "👑", check: () => !!(state?.purchases?.vip_badge) },
    { id: "shopaholic", label: "5 xarid", icon: "🛍️", check: () => Object.keys(state?.purchases || {}).length >= 5 },
  ];

  let authUser = null;
  let userData = null;
  let state = null;
  let customAvatarDataUrl = null;
  let pendingBgImage = null;
  let isRegistering = false;

  const defaultState = () => ({
    coins: 0, totalEarned: 0, totalSpent: 0,
    purchases: {}, lastDaily: null, lastQuickEarn: 0,
    theme: "default", dailyTasks: {},
    streakCount: 0, boostEnd: null, magnetEnd: null,
  });

  const defaultGameStats = () => {
    const o = {};
    GAME_IDS.forEach(g => { o[g] = { plays: 0, totalCoins: 0, bestScore: 0 }; });
    return o;
  };

  function escapeHtml(s) {
    if (typeof s !== "string") return "";
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function linkify(text) {
    if (typeof text !== "string") return "";
    const dataImgRe = /^data:image\/(jpe?g|png|gif|webp|bmp|svg);base64,/i;
    if (dataImgRe.test(text.trim())) {
      const u = text.trim();
      return '<a href="' + u + '" target="_blank" rel="noopener">' +
        '<img src="' + u + '" style="max-width:200px;max-height:200px;border-radius:8px;display:block;margin-top:4px" loading="lazy"' +
        ' onerror="this.outerHTML=\'<a href=&quot;' + u.replace(/"/g,'&quot;') + '&quot; target=_blank rel=noopener>Rasm yuklanmadi</a>\'"></a>';
    }
    const imgExt = /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i;
    const urlRe = /(https?:\/\/[^\s<>"']+)/g;
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    return escaped.replace(urlRe, function(m){
      const u = m.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      if (imgExt.test(u)) {
        return '<a href="' + u + '" target="_blank" rel="noopener">' +
          '<img src="' + u + '" style="max-width:200px;max-height:200px;border-radius:8px;display:block;margin-top:4px" loading="lazy"' +
          ' onerror="this.outerHTML=\'<a href=&quot;' + u.replace(/"/g,'&quot;') + '&quot; target=_blank rel=noopener>' + u.replace(/</g,'&lt;') + '</a>\'"></a>';
      }
      return '<a href="' + u + '" target="_blank" rel="noopener" style="color:var(--cyan)">' + u + '</a>';
    });
  }

  function getUserDocRef(uid) {
    return firebase.firestore().collection("users").doc(uid);
  }

  function showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.style.opacity = "1";
    setTimeout(() => { el.style.opacity = "0"; setTimeout(() => { el.hidden = true; }, 300); }, 2500);
  }

  function hideModals() {
    document.querySelectorAll(".modal").forEach(m => { m.hidden = true; });
  }

  function openPanel(id) {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    const p = document.getElementById(id);
    if (p) p.classList.add("active");
    document.querySelectorAll("[data-nav]").forEach(a => {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
    if (id === "admin") renderAdminPanel();
    if (id === "bot") renderBotPanel();
    if (id === "leaderboard") renderLeaderboard();
    if (id === "shop") renderShop();
    if (id === "tasks") renderTasks();
  }

  function showLoginModal() {
    document.getElementById("loginForm").hidden = false;
    document.getElementById("registerForm").hidden = true;
    document.getElementById("loginModal").hidden = false;
  }

  function hideUI() {
    document.querySelectorAll(".panel").forEach(p => p.style.display = "none");
    document.getElementById("profileOpenBtn").style.display = "none";
    document.querySelector(".coin-pill").style.display = "none";
    document.querySelector(".nav").style.display = "none";
    document.querySelector(".logo").style.display = "none";
  }

  function showUI() {
    document.querySelectorAll(".panel").forEach(p => p.style.display = "");
    document.getElementById("profileOpenBtn").style.display = "";
    document.querySelector(".coin-pill").style.display = "";
    document.querySelector(".nav").style.display = "";
    document.querySelector(".logo").style.display = "";
  }

  async function loadUserData() {
    if (!authUser) return null;
    const doc = await getUserDocRef(authUser.uid).get();
    if (doc.exists) {
      userData = { id: doc.id, ...doc.data() };
      const d = userData;
      let coins = d.coins || 0;
      let totalEarned = d.totalEarned || 0;
      let totalSpent = d.totalSpent || 0;
      // Merge game earnings from localStorage (games write here)
      try {
        const lsKeys = ["zxmax_save_v1__" + authUser.uid, "zxmax_save_v1"];
        for (const k of lsKeys) {
          const lsRaw = localStorage.getItem(k);
          if (lsRaw) {
            const ls = JSON.parse(lsRaw);
            if ((ls.coins || 0) > coins) { coins = ls.coins; totalEarned = ls.totalEarned || totalEarned; totalSpent = ls.totalSpent || totalSpent; }
          }
        }
      } catch {}
      state = {
        coins, totalEarned, totalSpent,
        purchases: d.purchases || {},
        lastDaily: d.lastDaily || null,
        lastQuickEarn: d.lastQuickEarn || 0,
        theme: d.theme || "default",
        dailyTasks: d.dailyTasks || {},
        streakCount: d.streakCount || 0,
        boostEnd: d.boostEnd || null,
        magnetEnd: d.magnetEnd || null,
      };
      // Sync merged data back to Firebase if localStorage had more
      if (coins > (d.coins || 0)) {
        await getUserDocRef(authUser.uid).update({ coins, totalEarned });
        userData.coins = coins;
        userData.totalEarned = totalEarned;
      }
      syncLocalStorageBridge();
      return userData;
    }
    return null;
  }

  async function saveUserData(updates) {
    if (!authUser) return;
    await getUserDocRef(authUser.uid).update(updates);
    const snap = await getUserDocRef(authUser.uid).get();
    if (snap.exists) {
      userData = { id: snap.id, ...snap.data() };
      const d = userData;
      state = {
        coins: d.coins || 0, totalEarned: d.totalEarned || 0, totalSpent: d.totalSpent || 0,
        purchases: d.purchases || {}, lastDaily: d.lastDaily || null,
        lastQuickEarn: d.lastQuickEarn || 0, theme: d.theme || "default",
        dailyTasks: d.dailyTasks || {}, streakCount: d.streakCount || 0,
        boostEnd: d.boostEnd || null, magnetEnd: d.magnetEnd || null,
      };
    }
    syncLocalStorageBridge();
  }

  function syncLocalStorageBridge() {
    if (!authUser || !userData || !state) return;
    localStorage.setItem("zxmax_active_profile_v1", authUser.uid);
    localStorage.setItem("zxmax_save_v1", JSON.stringify(state));
    localStorage.setItem("zxmax_save_v1__" + authUser.uid, JSON.stringify(state));
  }

  function syncUI() {
    syncProfileBar();
    renderDashboard();
    renderShop();
    renderTasks();
    renderLeaderboard();
    initChat();
    syncLocalStorageBridge();
  }

  function syncProfileBar() {
    const nameEl = document.getElementById("profileBarName");
    const coinDisplay = document.getElementById("coinDisplay");
    if (!userData) { if (nameEl) nameEl.textContent = "—"; if (coinDisplay) coinDisplay.textContent = "0"; return; }
    const purchases = state?.purchases || {};
    const vip = purchases.vip_badge >= 1;
    const rainbow = purchases.rainbow_name >= 1;
    let displayName = escapeHtml(userData.name);
    if (vip) displayName = "👑 " + displayName;
    if (nameEl) {
      nameEl.textContent = "";
      const span = document.createElement("span");
      span.textContent = displayName;
      if (rainbow) {
        span.style.background = "linear-gradient(90deg,#ff6b6b,#feca57,#48dbfb,#ff9ff3,#54a0ff)";
        span.style.webkitBackgroundClip = "text";
        span.style.webkitTextFillColor = "transparent";
        span.style.backgroundClip = "text";
      }
      nameEl.appendChild(span);
    }
    if (coinDisplay) coinDisplay.textContent = state ? state.coins : "0";
    const nav = document.getElementById("adminNav");
    if (nav) nav.style.display = userData?.role === "admin" ? "" : "none";
  }

  // ── Auth ──

  async function register() {
    const username = document.getElementById("registerUsernameInput").value.trim();
    const password = document.getElementById("registerPasswordInput").value;
    const name = document.getElementById("registerNameInput").value.trim() || username;
    const email = document.getElementById("registerEmailInput").value.trim();
    const hint = document.getElementById("registerHint");
    if (!username) { hint.textContent = "Username kiriting."; return; }
    if (!password) { hint.textContent = "Parol kiriting."; return; }
    if (!email) { hint.textContent = "Email kiriting."; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { hint.textContent = "Email noto'g'ri."; return; }
    try {
      const existing = await firebase.firestore().collection("users").where("username", "==", username).get();
      if (!existing.empty) { hint.textContent = "Bu username band."; return; }
      isRegistering = true;
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;
      await getUserDocRef(uid).set({
        name, username,
        email: email,
        avatar: AVATARS[0],
        bio: "", subscribedTo: [],
        role: window.ADMIN_CONFIG?.usernames?.includes(username) ? "admin" : null,
        coins: 0, totalEarned: 0, totalSpent: 0,
        purchases: {}, theme: "default", dailyTasks: {},
        lastDaily: null, lastQuickEarn: 0,
        created: firebase.firestore.FieldValue.serverTimestamp(),
        profileDesign: null, gameStats: defaultGameStats(),
      });
      isRegistering = false;
      await loadUserData();
      hint.textContent = "";
      hideModals();
      syncUI();
    } catch (e) {
      isRegistering = false;
      hint.textContent = e.message;
    }
  }

  async function login() {
    const input = document.getElementById("loginUsernameInput").value.trim();
    const password = document.getElementById("loginPasswordInput").value;
    const hint = document.getElementById("loginHint");
    if (!input) { hint.textContent = "Email yoki username kiriting."; return; }
    if (!password) { hint.textContent = "Parol kiriting."; return; }
    try {
      let email = input;
      if (!input.includes("@")) {
        const snap = await firebase.firestore().collection("users").where("username", "==", input).get();
        if (snap.empty) { hint.textContent = "Foydalanuvchi topilmadi."; return; }
        email = snap.docs[0].data().email;
      }
      await firebase.auth().signInWithEmailAndPassword(email, password);
      sessionStorage.setItem("zxmax_admin_pass", password);
      hint.textContent = "";
      hideModals();
    } catch (e) {
      hint.textContent = e.message;
    }
  }

  function logout() {
    firebase.auth().signOut();
  }

  async function changePassword() {
    const current = document.getElementById("changePassCurrent").value;
    const newPass = document.getElementById("changePassNew").value;
    const hint = document.getElementById("changePassHint");
    if (!current || !newPass) { hint.textContent = "Ikkala maydonni to'ldiring."; return; }
    if (newPass.length < 6) { hint.textContent = "Yangi parol 6 belgidan kam bo'lmasin."; return; }
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(authUser.email, current);
      await authUser.reauthenticateWithCredential(cred);
      await authUser.updatePassword(newPass);
      hint.textContent = "Parol o'zgartirildi!";
      hint.style.color = "var(--ok)";
      document.getElementById("changePassCurrent").value = "";
      document.getElementById("changePassNew").value = "";
    } catch (e) { hint.textContent = e.message; }
  }

  async function sendRecoveryEmail(username) {
    const status = document.getElementById("recoveryStatus");
    try {
      let email = username;
      if (!username.includes("@")) {
        const snap = await firebase.firestore().collection("users").where("username", "==", username).get();
        if (snap.empty) { status.textContent = "Foydalanuvchi topilmadi."; return; }
        email = snap.docs[0].data().email;
      }
      if (email.endsWith("@zxmax.local")) {
        status.textContent = "Haqiqiy emailingiz yo'q. Admin (Telegram: @zxmax_support) bilan bog'laning yoki profil orqali email qo'shing.";
        status.style.color = "var(--warn)";
        return;
      }
      await firebase.auth().sendPasswordResetEmail(email);
      status.textContent = "Email yuborildi! Pochtangizni tekshiring.";
      status.style.color = "var(--ok)";
    } catch (e) { status.textContent = e.message; }
  }

  // ── Profile ──

  function openProfileModal() {
    const modal = document.getElementById("profileModal");
    if (!modal) return;
    renderProfileModal();
    modal.hidden = false;
  }

  function closeProfileModal() {
    document.getElementById("profileModal").hidden = true;
  }

  function renderProfileModal() {
    if (!userData) return;
    const p = userData;
    const avDiv = document.getElementById("profileAvatarDisplay");
    const av = p.avatar || AVATARS[0];
    if (av.startsWith("data:image/")) {
      avDiv.innerHTML = `<img src="${escapeHtml(av)}" class="avatar-img" />`;
    } else {
      avDiv.textContent = av;
    }
    document.getElementById("profileNameDisplay").textContent = escapeHtml(p.name);
    document.getElementById("profileUsernameDisplay").textContent = p.username ? "@" + escapeHtml(p.username) : "";
    const uidEl = document.getElementById("profileUidDisplay");
    if (uidEl) uidEl.innerHTML = '<span style="font-size:0.75rem;color:var(--muted);cursor:pointer" onclick="navigator.clipboard.writeText(\'' + (authUser?.uid || "") + '\').then(()=>showToast(\'UID nusxalandi\'))">ID: ' + (authUser?.uid?.substring(0, 16) || "") + '... 📋</span>';
    document.getElementById("profileNameInput").value = "";
    document.getElementById("profileNameHint").textContent = "";
    document.getElementById("customAvatarInput").value = "";
    document.getElementById("customAvatarHint").textContent = "";
    document.getElementById("customAvatarPreview").style.display = "none";
    document.getElementById("customAvatarName").textContent = "";
    customAvatarDataUrl = null;
    const grid = document.getElementById("avatarGrid");
    grid.innerHTML = AVATARS.map(a =>
      `<div class="avatar-grid__item ${a === (p.avatar || AVATARS[0]) ? "selected" : ""}" data-avatar="${a}">${a}</div>`
    ).join("");
    grid.querySelectorAll(".avatar-grid__item").forEach(el => {
      el.addEventListener("click", () => changeAvatar(el.getAttribute("data-avatar")));
    });
    document.getElementById("profileBioInput").value = p.bio || "";
    document.getElementById("profileEmailInput").value = p.email || "";
    const logoutSection = document.getElementById("logoutSection");
    const logoutLabel = document.getElementById("logoutUserLabel");
    if (p.username) {
      logoutSection.hidden = false;
      logoutLabel.textContent = "@" + p.username + " — profilingizga kirdingiz";
    } else {
      logoutSection.hidden = true;
    }
    renderSubscribed();
    renderGameStats();
    renderProfileDesign();
  }

  async function changeName() {
    const input = document.getElementById("profileNameInput");
    const hint = document.getElementById("profileNameHint");
    const raw = input ? input.value.trim().slice(0, 24) : "";
    if (!raw) { hint.textContent = "Ism kiriting."; return; }
    try {
      await saveUserData({ name: raw });
      hint.textContent = "Ism o'zgartirildi!";
      hint.style.color = "var(--ok)";
      input.value = "";
      renderProfileModal();
      syncProfileBar();
    } catch (e) { hint.textContent = e.message; }
  }

  async function changeAvatar(emoji) {
    try {
      await saveUserData({ avatar: emoji });
      renderProfileModal();
      syncProfileBar();
    } catch (e) { showToast(e.message); }
  }

  async function saveCustomAvatar() {
    if (!customAvatarDataUrl) return;
    const hint = document.getElementById("customAvatarHint");
    if (state.coins < 3600) { hint.textContent = "Yetarli tanga yo'q."; return; }
    try {
      await saveUserData({ avatar: customAvatarDataUrl, coins: state.coins - 3600, totalSpent: firebase.firestore.FieldValue.increment(3600) });
      customAvatarDataUrl = null;
      hint.textContent = "Avatar saqlandi!";
      hint.style.color = "var(--ok)";
      renderProfileModal();
      syncProfileBar();
    } catch (e) { hint.textContent = e.message; }
  }

  async function saveBio() {
    const input = document.getElementById("profileBioInput");
    const hint = document.getElementById("profileBioHint");
    const raw = input ? input.value.trim().slice(0, 500) : "";
    try {
      await saveUserData({ bio: raw });
      hint.textContent = "Bio saqlandi!";
      hint.style.color = "var(--ok)";
      showToast("Bio saqlandi");
    } catch (e) { hint.textContent = e.message; }
  }

  async function saveEmail() {
    const input = document.getElementById("profileEmailInput");
    const hint = document.getElementById("profileEmailHint");
    const raw = input ? input.value.trim().slice(0, 120) : "";
    if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      hint.textContent = "Email noto'g'ri."; return;
    }
    try {
      await saveUserData({ email: raw || null });
      hint.textContent = raw ? "Email saqlandi!" : "Email o'chirildi.";
      hint.style.color = "var(--ok)";
      showToast("Email saqlandi");
    } catch (e) { hint.textContent = e.message; }
  }

  function saveProfileDesign() {
    if (!authUser || !userData) return;
    const sel = document.querySelector(".p-design__preset.selected");
    const themeId = sel ? sel.getAttribute("data-theme") : "default";
    let design;
    if (themeId === "default") {
      design = null;
    } else if (themeId === "custom") {
      design = {
        bg: document.getElementById("pDesignBg").value || "#0f0f1a",
        card: document.getElementById("pDesignCard").value || "#1a1a2e",
        accent: document.getElementById("pDesignAccent").value || "#7c3aed",
        text: document.getElementById("pDesignText").value || "#e2e8f0",
      };
    } else {
      const t = PROFILE_THEMES.find(x => x.id === themeId);
      if (t) design = { bg: t.bg, card: t.card, accent: t.accent, text: t.text };
    }
    if (design && pendingBgImage) design.bgImage = pendingBgImage;
    else if (design && userData.profileDesign?.bgImage) design.bgImage = userData.profileDesign.bgImage;
    saveUserData({ profileDesign: design }).then(() => {
      document.getElementById("pDesignHint").textContent = "Dizayn saqlandi!";
      document.getElementById("pDesignHint").style.color = "var(--ok)";
      showToast("Profil dizayni saqlandi");
    }).catch(e => { document.getElementById("pDesignHint").textContent = e.message; });
  }

  function renderProfileDesign() {
    if (!userData) return;
    const d = userData.profileDesign;
    const grid = document.getElementById("pDesignGrid");
    if (!grid) return;
    let activeId = "default";
    if (d) {
      const match = PROFILE_THEMES.find(t =>
        t.id !== "custom" && t.bg === d.bg && t.card === d.card && t.accent === d.accent
      );
      activeId = match ? match.id : "custom";
    }
    grid.innerHTML = PROFILE_THEMES.map(t => {
      const preview = t.id === "custom"
        ? 'style="background:linear-gradient(135deg,#333,#555);border:2px dashed var(--muted)"'
        : `style="background:${t.bg};border:2px solid ${t.accent}"`;
      const sel = t.id === activeId ? " selected" : "";
      return `<div class="p-design__preset${sel}" data-theme="${t.id}" title="${t.label}">
        <div class="p-design__swatch" ${preview}>
          <span class="p-design__swatch-icon">${t.icon}</span>
        </div>
        <span class="p-design__label">${t.label}</span>
      </div>`;
    }).join("");
    grid.querySelectorAll(".p-design__preset").forEach(el => {
      el.addEventListener("click", () => {
        grid.querySelectorAll(".p-design__preset").forEach(x => x.classList.remove("selected"));
        el.classList.add("selected");
        const tid = el.getAttribute("data-theme");
        const customColors = document.getElementById("pDesignCustomColors");
        if (customColors) customColors.style.display = tid === "custom" ? "flex" : "none";
      });
    });
    const customColors = document.getElementById("pDesignCustomColors");
    if (customColors) customColors.style.display = activeId === "custom" ? "flex" : "none";
    if (d && activeId === "custom") {
      if (document.getElementById("pDesignBg")) document.getElementById("pDesignBg").value = d.bg || "#0f0f1a";
      if (document.getElementById("pDesignCard")) document.getElementById("pDesignCard").value = d.card || "#1a1a2e";
      if (document.getElementById("pDesignAccent")) document.getElementById("pDesignAccent").value = d.accent || "#7c3aed";
      if (document.getElementById("pDesignText")) document.getElementById("pDesignText").value = d.text || "#e2e8f0";
    }
    pendingBgImage = null;
    const preview = document.getElementById("pDesignBgPreview");
    const clearBtn = document.getElementById("pDesignBgClear");
    const nameSpan = document.getElementById("pDesignBgName");
    if (preview && d?.bgImage) {
      preview.style.display = "block";
      preview.style.backgroundImage = 'url("' + d.bgImage.replace(/"/g, "'") + '")';
      if (clearBtn) clearBtn.style.display = "inline-block";
      if (nameSpan) nameSpan.textContent = "Orqa fon o'rnatilgan";
    } else {
      if (preview) { preview.style.display = "none"; preview.style.backgroundImage = ""; }
      if (clearBtn) clearBtn.style.display = "none";
      if (nameSpan) nameSpan.textContent = "";
    }
  }

  // ── Social ──

  async function subscribe(profileId) {
    const subs = userData.subscribedTo || [];
    if (!subs.includes(profileId)) {
      subs.push(profileId);
      await saveUserData({ subscribedTo: subs });
      // Reward the person being subscribed to
      try { await getUserDocRef(profileId).update({ coins: firebase.firestore.FieldValue.increment(5), totalEarned: firebase.firestore.FieldValue.increment(5), weekEarned: firebase.firestore.FieldValue.increment(5), monthEarned: firebase.firestore.FieldValue.increment(5) }); } catch {}
      renderSubscribed();
      showToast("Obuna bo'ldingiz!");
    }
  }

  async function unsubscribe(profileId) {
    const subs = (userData.subscribedTo || []).filter(id => id !== profileId);
    await saveUserData({ subscribedTo: subs });
    renderSubscribed();
    showToast("Obuna bekor qilindi.");
  }

  function renderSubscribed() {
    const list = document.getElementById("subscribedList");
    if (!list) return;
    const subs = userData?.subscribedTo || [];
    if (subs.length === 0) {
      list.innerHTML = '<div class="user-list__empty">Hali obuna bo\'lganlar yo\'q</div>';
      return;
    }
    Promise.all(subs.map(id => getUserDocRef(id).get())).then(docs => {
      list.innerHTML = docs.filter(d => d.exists).map(d => {
        const u = { id: d.id, ...d.data() };
        const rawAv = u.avatar || "😀";
        const avHtml = rawAv.startsWith("data:image/") ? `<img src="${escapeHtml(rawAv)}" class="avatar-img-sm" />` : escapeHtml(rawAv);
        return `<div class="user-list__item">
          <div class="user-list__info">
            <span class="user-list__avatar">${avHtml}</span>
            <div>
              <div class="user-list__name">${escapeHtml(u.name)}</div>
              <div class="user-list__username">@${escapeHtml(u.username || "?")}</div>
            </div>
          </div>
          <button type="button" class="btn ghost" data-unsub="${escapeHtml(u.id)}" style="font-size:0.78rem;padding:0.3rem 0.6rem">Obunani bekor qilish</button>
        </div>`;
      }).join("");
      list.querySelectorAll("[data-unsub]").forEach(btn => {
        btn.addEventListener("click", () => unsubscribe(btn.getAttribute("data-unsub")));
      });
    });
  }

  async function searchUsers() {
    const input = document.getElementById("searchUserInput");
    const result = document.getElementById("searchUserResult");
    const q = input ? input.value.trim().toLowerCase() : "";
    if (!q) { result.innerHTML = '<div class="user-list__empty">Qidiruv so\'zini kiriting.</div>'; return; }
    try {
      const nameSnap = await firebase.firestore().collection("users")
        .orderBy("name").startAt(q).endAt(q + "\uf8ff").get();
      const userSnap = await firebase.firestore().collection("users")
        .orderBy("username").startAt(q).endAt(q + "\uf8ff").get();
      const seen = new Set();
      const found = [];
      nameSnap.forEach(d => { if (!seen.has(d.id) && d.id !== authUser.uid) { seen.add(d.id); found.push({ id: d.id, ...d.data() }); } });
      userSnap.forEach(d => { if (!seen.has(d.id) && d.id !== authUser.uid) { seen.add(d.id); found.push({ id: d.id, ...d.data() }); } });
      if (found.length === 0) { result.innerHTML = '<div class="user-list__empty">Hech narsa topilmadi.</div>'; return; }
      result.innerHTML = found.map(u => {
        const rawAv = u.avatar || "😀";
        const avHtml = rawAv.startsWith("data:image/") ? `<img src="${escapeHtml(rawAv)}" class="avatar-img-sm" />` : escapeHtml(rawAv);
        return `<div class="user-list__item">
          <div class="user-list__info" style="cursor:pointer" data-search-view="${escapeHtml(u.id)}">
            <span class="user-list__avatar">${avHtml}</span>
            <div>
              <div class="user-list__name">${escapeHtml(u.name)}</div>
              <div class="user-list__username">${u.username ? "@" + escapeHtml(u.username) : ""}</div>
            </div>
          </div>
          <button type="button" class="btn ghost" data-search-view="${escapeHtml(u.id)}" style="font-size:0.78rem;padding:0.3rem 0.6rem">Ko'rish</button>
        </div>`;
      }).join("");
      result.querySelectorAll("[data-search-view]").forEach(btn => {
        btn.addEventListener("click", () => showUserProfile(btn.getAttribute("data-search-view")));
      });
    } catch (e) { result.innerHTML = '<div class="user-list__empty">Xatolik: ' + escapeHtml(e.message) + '</div>'; }
  }

  async function showUserProfile(profileId) {
    let doc;
    try { doc = await getUserDocRef(profileId).get(); } catch {}
    if (!doc || !doc.exists) return;
    const p = { id: doc.id, ...doc.data() };
    const isMe = p.id === authUser.uid;
    const coins = p.coins || 0;
    const totalEarned = p.totalEarned || 0;
    const totalSpent = p.totalSpent || 0;
    const design = p.profileDesign;
    const av = p.avatar || "😀";
    const accentColor = design ? design.accent : "var(--accent)";
    const avHtml = av.startsWith("data:image/")
      ? `<img src="${escapeHtml(av)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid color-mix(in srgb,${accentColor} 40%,transparent)" />`
      : escapeHtml(av);
    const isSubbed = (userData?.subscribedTo || []).includes(p.id);
    const subCountSnap = await firebase.firestore().collection("users").where("subscribedTo", "array-contains", p.id).get();
    const subCount = subCountSnap.size;
    // Track profile view
    if (!isMe) {
      try { await getUserDocRef(p.id).update({ profileViews: firebase.firestore.FieldValue.increment(1) }); } catch {}
    }
    const views = p.profileViews || 0;
    const userBadges = BADGES.filter(b => {
      if (b.id === "subscriber_5") return subCount >= 5;
      const origCheck = b.check;
      const oldState = state; state = { ...state, purchases: p.purchases || {}, totalEarned: p.totalEarned || 0, totalSpent: p.totalSpent || 0, streakCount: p.streakCount || 0 };
      const result = b.id === "vip" ? !!(p.purchases?.vip_badge) : (b.id === "shopaholic" ? Object.keys(p.purchases || {}).length >= 5 : origCheck());
      state = oldState;
      return result;
    });

    const overlay = document.createElement("div");
    const bgImg = design?.bgImage;
    const cssVars = design
      ? `--bg:${design.bg};--bg-elev:${design.card};--accent:${design.accent};--text:${design.text};--border:color-mix(in srgb,${design.text} 15%,${design.card});--muted:color-mix(in srgb,${design.text} 50%,${design.card});--ok:color-mix(in srgb,${design.accent} 70%,#22c55e);--danger:#ef4444;--accent-2:${design.accent}`
      : "";
    const bgLayer = bgImg
      ? `background:linear-gradient(color-mix(in srgb,${design?.bg || "#0f0f1a"} 70%,transparent),color-mix(in srgb,${design?.bg || "#0f0f1a"} 85%,transparent)),url("${bgImg.replace(/"/g, "'")}") center/cover fixed`
      : "background:var(--bg)";
    overlay.style.cssText = `position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;overflow-y:auto;${cssVars};color:var(--text);${bgLayer}`;

    overlay.innerHTML =
      '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.25rem;border-bottom:1px solid var(--border);background:var(--bg-elev)">' +
        '<span style="font-weight:600;font-size:0.95rem;color:var(--muted)">Profili</span>' +
        '<div style="display:flex;align-items:center;gap:0.75rem">' +
          '<span style="font-family:var(--mono);font-weight:600;font-size:1rem;color:var(--accent)">' + Math.floor(coins) + ' ◎</span>' +
          '<button type="button" class="btn ghost" data-up-close style="font-size:0.85rem;padding:0.3rem 0.7rem">\u2716</button>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.25rem;gap:1.5rem">' +
        '<div style="display:flex;align-items:center;gap:2rem;flex-wrap:wrap;justify-content:center;width:100%;max-width:600px">' +
          '<div style="flex-shrink:0">' +
            '<div style="font-size:6rem;line-height:1;filter:drop-shadow(0 0 30px color-mix(in srgb,var(--accent) 30%,transparent))">' + avHtml + '</div>' +
          '</div>' +
          '<div style="flex:1;min-width:200px">' +
            '<div style="font-size:1.6rem;font-weight:700;margin-bottom:0.2rem">' + escapeHtml(p.name) + '</div>' +
            '<div style="font-size:0.9rem;color:var(--muted);margin-bottom:0.5rem">' + (p.username ? "@" + escapeHtml(p.username) : "") + '</div>' +
            (isMe ? '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.5rem;font-family:var(--mono);cursor:pointer" title="Nusxa olish" onclick="navigator.clipboard.writeText(\'' + p.id + '\').then(()=>showToast(\'UID nusxalandi\'))">ID: ' + p.id.substring(0, 12) + '... \uD83D\uDCCB</div>' : '') +
            (p.bio ? '<div style="font-size:0.88rem;color:var(--muted);line-height:1.45;margin-bottom:0.75rem;max-width:320px">' + escapeHtml(p.bio) + '</div>' : "") +
            (userBadges.length > 0 ? '<div style="display:flex;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.5rem">' + userBadges.map(b => '<span title="' + escapeHtml(b.label) + '" style="font-size:1.1rem;cursor:default">' + b.icon + '</span>').join("") + '</div>' : "") +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;max-width:320px">' +
              '<div style="background:rgba(0,0,0,0.15);border-radius:10px;padding:0.5rem;text-align:center;border:1px solid var(--border)">' +
                '<div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Ishlagan</div>' +
                '<div style="font-family:var(--mono);font-weight:600;font-size:0.95rem;color:var(--ok)">+' + Math.floor(totalEarned) + '</div>' +
              '</div>' +
              '<div style="background:rgba(0,0,0,0.15);border-radius:10px;padding:0.5rem;text-align:center;border:1px solid var(--border)">' +
                '<div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Sarflagan</div>' +
                '<div style="font-family:var(--mono);font-weight:600;font-size:0.95rem;color:var(--danger)">-' + Math.floor(totalSpent) + '</div>' +
              '</div>' +
              '<div style="background:rgba(0,0,0,0.15);border-radius:10px;padding:0.5rem;text-align:center;border:1px solid var(--border)">' +
                                '<div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Ko\'rishlar</div>' +
                '<div style="font-family:var(--mono);font-weight:600;font-size:0.95rem;color:var(--muted)">' + views + '</div>' +
              '</div>' +
              '<div style="background:rgba(0,0,0,0.15);border-radius:10px;padding:0.5rem;text-align:center;border:1px solid var(--border)">' +
                '<div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Obunachilar</div>' +
                '<div style="font-family:var(--mono);font-weight:600;font-size:0.95rem;color:var(--accent)">' + subCount + '</div>' +
              '</div>' +
              '<div style="background:rgba(0,0,0,0.15);border-radius:10px;padding:0.5rem;text-align:center;border:1px solid var(--border)">' +
                '<div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Obuna</div>' +
                '<div style="font-family:var(--mono);font-weight:600;font-size:0.95rem;color:var(--accent-2)">' + ((userData?.subscribedTo || []).includes(p.id) ? "Ha" : "Yo\u0026#768;q") + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;max-width:320px">' +
              (!isMe
                ? '<div style="display:flex;flex-direction:column;gap:0.4rem;width:100%">' +
                  '<button type="button" class="btn primary" data-up-sub="' + escapeHtml(p.id) + '" style="width:100%;font-size:0.9rem">' + (isSubbed ? "Obunadan chiqish" : "Obuna bo\u0026#768;lish") + '</button>' +
                  '<button type="button" class="btn ghost" data-up-friend="' + escapeHtml(p.id) + '" style="width:100%;font-size:0.85rem;padding:0.35rem 0.5rem;border:1px solid var(--border);border-radius:8px">Do\u0026#768;st qo\u0026#768;shish</button>' +
                  '</div>'
                : '<button type="button" class="btn ghost" data-up-close style="flex:1;font-size:0.9rem">Yopish</button>') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.querySelectorAll("[data-up-close]").forEach(el => {
      el.addEventListener("click", () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); searchUsers(); });
    });
    const subBtn = overlay.querySelector("[data-up-sub]");
    if (subBtn) subBtn.addEventListener("click", async () => {
      const id = subBtn.getAttribute("data-up-sub");
      if ((userData?.subscribedTo || []).includes(id)) await unsubscribe(id); else await subscribe(id);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      searchUsers();
    });
    const friendBtn = overlay.querySelector("[data-up-friend]");
    if (friendBtn) friendBtn.addEventListener("click", async () => {
      const id = friendBtn.getAttribute("data-up-friend");
      await sendFriendRequest(id);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
  }

  async function sendCoins() {
    const usernameInput = document.getElementById("sendCoinsUsername");
    const amountInput = document.getElementById("sendCoinsAmount");
    const hint = document.getElementById("sendCoinsHint");
    const username = usernameInput ? usernameInput.value.trim() : "";
    const amountStr = amountInput ? amountInput.value.trim() : "";
    const amount = parseInt(amountStr, 10);
    if (!username) { hint.textContent = "Username kiriting."; return; }
    if (!amount || amount < 1) { hint.textContent = "Miqdorni kiriting (min 1)."; return; }
    if (amount > state.coins) { hint.textContent = "Hisobingizda yetarli tanga yo'q."; return; }
    try {
      const snap = await firebase.firestore().collection("users").where("username", "==", username).get();
      if (snap.empty) { hint.textContent = "Foydalanuvchi topilmadi."; return; }
      const targetDoc = snap.docs[0];
      const batch = firebase.firestore().batch();
      batch.update(getUserDocRef(authUser.uid), { coins: state.coins - amount, totalSpent: firebase.firestore.FieldValue.increment(amount) });
      batch.update(targetDoc.ref, { coins: firebase.firestore.FieldValue.increment(amount), totalEarned: firebase.firestore.FieldValue.increment(amount), weekEarned: firebase.firestore.FieldValue.increment(amount), monthEarned: firebase.firestore.FieldValue.increment(amount) });
      await batch.commit();
      state.coins -= amount;
      state.totalSpent += amount;
      syncLocalStorageBridge();
      hint.textContent = amount + " tanga @" + username + " ga jo'natildi!";
      hint.style.color = "var(--ok)";
      usernameInput.value = "";
      amountInput.value = "";
      syncProfileBar();
    } catch (e) { hint.textContent = e.message; }
  }

  // ── Game Stats ──

  function getGameStats() {
    return userData?.gameStats || defaultGameStats();
  }

  async function saveGameStats(stats) {
    if (!authUser) return;
    await getUserDocRef(authUser.uid).update({ gameStats: stats });
  }

  function renderGameStats() {
    const container = document.getElementById("gameStatsList");
    if (!container) return;
    const stats = getGameStats();
    const labels = { xotira: "Xotira", galaxy: "Galaxy Tycoon", quiz: "Quiz", snake: "Snake", tictactoe: "Tic-Tac-Toe", numberguess: "Son topish", reaksiya: "Reaksiya", colorblock: "Color Block" };
    const played = GAME_IDS.filter(g => stats[g] && stats[g].plays > 0);
    if (played.length === 0) {
      container.innerHTML = '<div class="user-list__empty">Hali o\'yin o\'ynalmagan</div>';
      return;
    }
    container.innerHTML = played.map(g => {
      const s = stats[g];
      return `<div class="game-stat-item"><strong>${labels[g] || g}</strong> <span class="muted">${s.plays} marta | jami ${s.totalCoins}◎ | rekord: ${s.bestScore}</span></div>`;
    }).join("");
  }

  async function recordGamePlay(gameId, coinsEarned, score) {
    const stats = getGameStats();
    if (!stats[gameId]) stats[gameId] = { plays: 0, totalCoins: 0, bestScore: 0 };
    stats[gameId].plays++;
    stats[gameId].totalCoins += coinsEarned;
    if (score > stats[gameId].bestScore) stats[gameId].bestScore = score;
    await saveGameStats(stats);
  }

  function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function renderDashboard() {
    document.getElementById("statEarned").textContent = state ? state.totalEarned : "0";
    document.getElementById("statSpent").textContent = state ? state.totalSpent : "0";
    renderAchievements();
    renderDailyHint();
    renderBoostTimers();
  }

  function renderBoostTimers() {
    const container = document.getElementById("boostStatus");
    if (!container) return;
    const now = Date.now();
    const boosts = [];
    if (state?.boostEnd && now < state.boostEnd) boosts.push({ label: "🚀 2× tanga", end: state.boostEnd });
    if (state?.magnetEnd && now < state.magnetEnd) boosts.push({ label: "🧲 Tanga magniti", end: state.magnetEnd });
    if (boosts.length === 0) { container.style.display = "none"; return; }
    container.style.display = "flex";
    const tick = () => {
      const n = Date.now();
      container.innerHTML = boosts.map(b => {
        const left = Math.max(0, b.end - n);
        const m = Math.floor(left / 60000);
        const s = Math.floor((left % 60000) / 1000);
        return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.85rem"><span>' + b.label + '</span><span style="font-family:var(--mono);color:var(--accent);font-weight:600">' + m + ":" + String(s).padStart(2, "0") + '</span></div>';
      }).join("");
      if (boosts.every(b => b.end <= Date.now())) container.style.display = "none";
    };
    tick();
    if (window._boostTimer) clearInterval(window._boostTimer);
    window._boostTimer = setInterval(() => {
      tick();
      if (boosts.every(b => b.end <= Date.now())) clearInterval(window._boostTimer);
    }, 1000);
  }

  function renderAchievements() {
    const list = document.getElementById("achList");
    if (!list) return;
    const ach = [
      { label: "50◎ tanga ishlang", check: (state?.totalEarned || 0) >= 50 },
      { label: "500◎ tanga ishlang", check: (state?.totalEarned || 0) >= 500 },
      { label: "2000◎ tanga ishlang", check: (state?.totalEarned || 0) >= 2000 },
      { label: "Birinchi o'yin", check: GAME_IDS.some(g => (getGameStats()[g]?.plays || 0) > 0) },
      { label: "Do'kondan xarid", check: Object.keys(state?.purchases || {}).length > 0 },
    ];
    list.innerHTML = ach.map(a => `<li class="${a.check ? "ok" : ""}">${a.check ? "✔" : "○"} ${a.label}</li>`).join("");
  }

  function renderDailyHint() {
    const btn = document.getElementById("dailyBtn");
    const hint = document.getElementById("dailyHint");
    if (!hint) return;
    if (state?.lastDaily) {
      const diff = Date.now() - state.lastDaily;
      if (diff < 86400000) {
        const left = Math.ceil((86400000 - diff) / 3600000);
        const streak = state.streakCount || 0;
        hint.textContent = left + " soatdan keyin (streak: " + streak + " kun)";
        if (btn) { btn.disabled = true; btn.style.opacity = "0.5"; btn.style.filter = "grayscale(0.6)"; btn.textContent = "❌ Bonus olingan"; }
        return;
      }
    }
    const nextStreak = (state?.lastDaily ? (state.streakCount || 0) + 1 : 1);
    const bonus = 10 + nextStreak * 3;
    hint.textContent = "🔥 " + nextStreak + "-kunlik streak! +" + bonus + "◎";
    if (btn) { btn.disabled = false; btn.style.opacity = "1"; btn.style.filter = "none"; btn.textContent = "✅ Bonusni olish"; }
  }

  async function claimDaily() {
    if (state?.lastDaily) {
      const diff = Date.now() - state.lastDaily;
      if (diff < 86400000) { showToast("Bugun olgansiz!"); return; }
    }
    const today = getTodayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const lastDate = userData?.lastStreakDate || "";
    const wasYesterday = lastDate === yesterday;
    const newStreak = wasYesterday ? (state.streakCount || 0) + 1 : 1;
    let bonus = 10 + newStreak * 3;
    if (state?.purchases?.extra_daily) bonus *= 2;
    try {
      await saveUserData({
        coins: firebase.firestore.FieldValue.increment(bonus),
        totalEarned: firebase.firestore.FieldValue.increment(bonus),
        weekEarned: firebase.firestore.FieldValue.increment(bonus),
        monthEarned: firebase.firestore.FieldValue.increment(bonus),
        lastDaily: Date.now(),
        streakCount: newStreak,
        lastStreakDate: today,
      });
      const btn = document.getElementById("dailyBtn");
      if (btn) { btn.disabled = true; btn.style.opacity = "0.5"; btn.style.filter = "grayscale(0.6)"; btn.textContent = "❌ Bonus olingan"; }
      showToast("+" + bonus + " tanga (streak: " + newStreak + " kun)");
      await loadUserData();
      syncProfileBar();
      renderDashboard();
    } catch (e) { showToast(e.message); }
  }

  async function quickEarn() {
    const now = Date.now();
    const btn = document.getElementById("quickEarnBtn");
    if (state?.lastQuickEarn && (now - state.lastQuickEarn) < 5000) {
      showToast("Kuting (5 soniya)");
      return;
    }
    let amount = 1 + Math.floor(Math.random() * 5);
    if (state?.magnetEnd && now < state.magnetEnd) amount *= 2;
    if (state?.boostEnd && now < state.boostEnd) amount *= 2;
    try {
      await saveUserData({
        coins: firebase.firestore.FieldValue.increment(amount),
        totalEarned: firebase.firestore.FieldValue.increment(amount),
        weekEarned: firebase.firestore.FieldValue.increment(amount),
        monthEarned: firebase.firestore.FieldValue.increment(amount),
        lastQuickEarn: now,
      });
      showToast("+" + amount + " tanga");
      if (btn) {
        btn.disabled = true;
        let sec = 5;
        btn.textContent = sec + "s";
        const iv = setInterval(() => {
          sec--;
          if (sec > 0) btn.textContent = sec + "s";
          else { clearInterval(iv); btn.disabled = false; btn.textContent = "+ tanga"; }
        }, 1000);
      }
      await loadUserData();
      syncProfileBar();
      renderDashboard();
    } catch (e) { showToast(e.message); }
  }

  // ── Shop ──

  const SHOP_ITEMS = [
    { id: "theme_neon", label: "Neon mavzusi", price: 500, type: "theme", value: "neon", once: true, icon: "💚" },
    { id: "theme_classic", label: "Klassik mavzusi", price: 800, type: "theme", value: "classic", once: true, icon: "📱" },
    { id: "boost_x2", label: "2× tanga (30 daqiqa)", price: 200, type: "boost", value: "boostEnd", duration: 1800000, once: false, icon: "🚀", desc: "30 daqiqa davomida ikki barobar tanga" },
    { id: "bg_dark", label: "Qora fon", price: 100, type: "purchase", once: false, icon: "⬛", desc: "Do'konda qora fon" },
    { id: "vip_badge", label: "VIP nishoni", price: 100000, type: "purchase", once: true, icon: "👑", desc: "Ismingiz yonida 👑 ko'rinadi" },
    { id: "rainbow_name", label: "Kamalak ism", price: 35000, type: "purchase", once: true, icon: "🌈", desc: "Ismingiz kamalak rangida yonadi" },
    { id: "extra_daily", label: "Kunlik bonus ×2", price: 600, type: "purchase", once: false, icon: "🎁", desc: "Kunlik bonus ikki barobar" },
    { id: "coin_magnet", label: "Tanga magniti", price: 400, type: "boost", value: "magnetEnd", duration: 1800000, once: false, icon: "🧲", desc: "Tez tanga 2× ko'p beradi (30 daqiqa)" },
    { id: "avatar_pack1", label: "Avatar to'plami 1", price: 500, type: "purchase", once: true, icon: "😺", desc: "10 ta yangi avatar (mushuklar)" },
    { id: "avatar_pack2", label: "Avatar to'plami 2", price: 1200, type: "purchase", once: true, icon: "🐶", desc: "10 ta yangi avatar (itlar)" },
  ];

  function renderShop() {
    const grid = document.getElementById("shopGrid");
    if (!grid || !state) return;
    grid.innerHTML = SHOP_ITEMS.map(item => {
      const owned = state.purchases[item.id] || 0;
      const isOwned = item.once ? owned >= 1 : item.type === "theme" && owned >= 1;
      const canBuy = (state.coins >= item.price);
      return `<div class="shop-item ${isOwned ? "owned" : ""}">
        <h3>${item.icon} ${escapeHtml(item.label)}</h3>
        ${item.desc ? '<p style="font-size:0.82rem;color:var(--muted);margin:0.15rem 0">' + escapeHtml(item.desc) + '</p>' : ''}
        <div class="price">${item.price} ◎</div>
        ${isOwned ? '<div class="status">Sotib olingan</div>' : '<button type="button" class="btn primary shop-buy" data-shop-id="' + escapeHtml(item.id) + '" ' + (canBuy ? "" : "disabled") + '>Sotib olish</button>'}
      </div>`;
    }).join("");
    grid.querySelectorAll(".shop-buy").forEach(btn => {
      btn.addEventListener("click", () => buyShopItem(btn.getAttribute("data-shop-id")));
    });
  }

  async function buyShopItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (state.coins < item.price) { showToast("Yetarli tanga yo'q"); return; }
    const purchases = { ...state.purchases };
    purchases[itemId] = (purchases[itemId] || 0) + 1;
    try {
      const newCoins = state.coins - item.price;
      const updates = {
        coins: newCoins,
        totalSpent: firebase.firestore.FieldValue.increment(item.price),
        purchases: purchases,
      };
      if (item.type === "theme") updates.theme = item.value;
      if (item.type === "boost") updates[item.value] = Date.now() + item.duration;
      if (item.id === "avatar_pack1") {
        AVATARS.push("😺", "😸", "😻", "🙀", "😹", "😼", "😽", "🐱", "🐈", "🐾");
      }
      if (item.id === "avatar_pack2") {
        AVATARS.push("🐶", "🐕", "🦮", "🐩", "🐾", "🐕‍🦺", "🦴", "🐰", "🐹", "🐭");
      }
      await saveUserData(updates);
      showToast(item.label + " sotib olindi!");
      await loadUserData();
      syncProfileBar();
      renderShop();
      applyTheme();
    } catch (e) { showToast(e.message); }
  }

  function applyTheme() {
    document.body.classList.remove("theme-neon", "theme-classic");
    if (state?.theme === "neon") document.body.classList.add("theme-neon");
    if (state?.theme === "classic") document.body.classList.add("theme-classic");
  }

  // ── Tasks ──

  const TASKS = [
    { id: "play_any", label: window.__("task_play_one"), reward: 5, icon: "🎮", check: () => GAME_IDS.some(g => (getGameStats()[g]?.plays || 0) > 0) },
    { id: "play_3", label: window.__("task_play_three"), reward: 10, icon: "🎮", check: () => GAME_IDS.reduce((s, g) => s + (getGameStats()[g]?.plays || 0), 0) >= 3 },
    { id: "earn_50", label: window.__("task_earn_50"), reward: 10, icon: "💰", check: () => (state?.totalEarned || 0) >= 50 },
    { id: "earn_200", label: window.__("task_earn_200"), reward: 20, icon: "💰", check: () => (state?.totalEarned || 0) >= 200 },
    { id: "spend_30", label: window.__("task_shop_30"), reward: 8, icon: "🛒", check: () => (state?.totalSpent || 0) >= 30 },
    { id: "spend_100", label: window.__("task_shop_100"), reward: 15, icon: "🛒", check: () => (state?.totalSpent || 0) >= 100 },
    { id: "subscribe", label: window.__("task_subscribe"), reward: 10, icon: "👥", check: () => (userData?.subscribedTo?.length || 0) > 0 },
    { id: "daily_bonus", label: window.__("task_daily_bonus"), reward: 8, icon: "🎁", check: () => !!state?.lastDaily && (Date.now() - state.lastDaily) < 86400000 },
    { id: "quick_earn", label: window.__("task_quick_earn"), reward: 5, icon: "⚡", check: () => (state?.lastQuickEarn || 0) > 0 },
  ];

  function getTaskDay() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function renderTasks() {
    const container = document.getElementById("tasksList");
    if (!container || !state) return;
    const today = getTaskDay();
    const tasksData = state.dailyTasks || {};
    const dayKey = tasksData._day;
    const done = (dayKey === today) ? (tasksData.done || {}) : {};
    let completedCount = 0;
    let totalReward = 0;
    container.innerHTML = TASKS.map(t => {
      const completed = done[t.id];
      const canComplete = !completed && t.check();
      if (completed) { completedCount++; totalReward += t.reward; }
      return `<div class="task-item ${completed ? 'task-item--done' : ''}">
        <div class="task-item__icon">${t.icon}</div>
        <div class="task-item__body">
          <div class="task-item__label">${escapeHtml(t.label)}</div>
          <div class="task-item__reward">+${t.reward}◎</div>
        </div>
        <div class="task-item__action">
          ${completed ? '<span class="task-item__check">✔</span>' : canComplete ? '<button type="button" class="btn primary task-claim" data-task-id="' + escapeHtml(t.id) + '" style="font-size:0.78rem;padding:0.3rem 0.65rem">' + window.__("task_claim_btn") + '</button>' : '<span class="task-item__lock">🔒</span>'}
        </div>
      </div>`;
    }).join("");
    container.innerHTML =
      '<div class="task-progress"><span class="task-progress__label">' + window.__("task_completed") + '</span><span class="task-progress__count">' + completedCount + '/' + TASKS.length + '</span><span class="task-progress__reward">+' + totalReward + '◎</span></div>' +
      container.innerHTML;
    container.querySelectorAll(".task-claim").forEach(btn => {
      btn.addEventListener("click", () => claimTask(btn.getAttribute("data-task-id")));
    });
  }

  async function claimTask(taskId) {
    const task = TASKS.find(t => t.id === taskId);
    if (!task || !task.check()) return;
    const today = getTaskDay();
    const tasksData = state.dailyTasks || {};
    const dayKey = tasksData._day;
    const done = (dayKey === today) ? { ...(tasksData.done || {}) } : {};
    if (done[taskId]) return;
    done[taskId] = true;
    try {
      await saveUserData({
        coins: firebase.firestore.FieldValue.increment(task.reward),
        totalEarned: firebase.firestore.FieldValue.increment(task.reward),
        weekEarned: firebase.firestore.FieldValue.increment(task.reward),
        monthEarned: firebase.firestore.FieldValue.increment(task.reward),
        dailyTasks: { _day: today, done },
      });
      showToast(window.__("task_reward_toast").replace("{0}", task.reward));
      await loadUserData();
      syncProfileBar();
      renderDashboard();
      renderTasks();
    } catch (e) { showToast(e.message); }
  }

  // ── Bot Panel ──

  async function renderBotPanel() {
    const container = document.getElementById("botPanel");
    if (!container) return;
    if (!authUser) { container.innerHTML = '<p class="muted">' + window.__("bot_login_first") + '</p>'; return; }
    const doc = await firebase.firestore().collection("users").doc(authUser.uid).get();
    const data = doc.data() || {};
    const coins = data.coins || 0;
    container.innerHTML = `
      <div class="card" style="display:flex;flex-direction:column;gap:0.75rem">
        <p>${window.__("bot_balance").replace("{0}", `<strong>${coins}</strong>`)}</p>
        <p class="muted" style="font-size:0.85rem">${window.__("bot_instruction")}</p>
        <div style="display:flex;gap:0.5rem">
          <input type="number" id="botAmountInput" class="modal__input" placeholder="${window.__("bot_amount_placeholder")}" min="1" max="${coins}" style="flex:1" />
          <button type="button" class="btn primary" id="botSendBtn">${window.__("bot_send_btn")}</button>
        </div>
        <div id="botStatus" style="font-size:0.85rem"></div>
      </div>
      <div class="card" style="margin-top:0.75rem;display:flex;flex-direction:column;gap:0.4rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>${window.__("bot_claim_instruction")}</span>
          <button type="button" class="btn ghost" id="botCheckBtn">${window.__("bot_check_btn")}</button>
        </div>
        <div id="botClaimStatus" class="muted" style="font-size:0.85rem"></div>
      </div>
    `;
    document.getElementById("botSendBtn").addEventListener("click", async () => {
      const inp = document.getElementById("botAmountInput");
      const amount = parseInt(inp.value);
      const status = document.getElementById("botStatus");
      if (!amount || amount <= 0) { status.textContent = window.__("bot_amount_error"); return; }
      if (amount > coins) { status.textContent = window.__("bot_balance_error"); return; }
      try {
        await firebase.firestore().collection("users").doc(authUser.uid).update({
          coins: firebase.firestore.FieldValue.increment(-amount),
          pendingBotAmount: firebase.firestore.FieldValue.increment(amount)
        });
        status.innerHTML = window.__("bot_success").replace("{0}", amount);
        inp.value = "";
        renderBotPanel();
      } catch (e) { status.textContent = window.__("bot_error_prefix") + e.message; }
    });
    document.getElementById("botCheckBtn").addEventListener("click", async () => {
      const d = await firebase.firestore().collection("users").doc(authUser.uid).get();
      const pending = (d.data() || {}).pendingBotAmount || 0;
      document.getElementById("botClaimStatus").textContent = pending > 0 ? window.__("bot_pending").replace("{0}", pending) : window.__("bot_nothing");
    });
  }

  // ── Leaderboard ──

  let leaderboardFilter = "all";

  async function renderLeaderboard() {
    const container = document.getElementById("leaderboardList");
    if (!container) return;
    try {
      // Periodic reset for week/month earnings
      await checkPeriodReset();
      // Sort field based on filter
      const sortField = leaderboardFilter === "weekly" ? "weekEarned" : leaderboardFilter === "monthly" ? "monthEarned" : "coins";
      const snap = await firebase.firestore().collection("users")
        .orderBy(sortField, "desc").limit(50).get();
      const entries = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.username === "aziko") return;
        entries.push({ id: d.id, ...data });
      });
      const meId = authUser?.uid;
      // Highlight active filter button
      document.querySelectorAll(".lb-filter").forEach(b => {
        const f = b.getAttribute("data-filter");
        b.style.borderColor = f === leaderboardFilter ? "var(--accent)" : "var(--border)";
        b.style.color = f === leaderboardFilter ? "var(--accent)" : "";
      });
      container.innerHTML = entries.map((p, i) => {
        const isMe = p.id === meId;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
        const rawAv = p.avatar || "😀";
        const avHtml = rawAv.startsWith("data:image/")
          ? `<img src="${escapeHtml(rawAv)}" class="lb-avatar" />`
          : `<span class="lb-avatar" style="font-size:1.2rem">${escapeHtml(rawAv)}</span>`;
        const displayCoins = sortField === "coins" ? (p.coins || 0) : (p[sortField] || 0);
        return `<div class="lb-item ${isMe ? "lb-item--me" : ""}">
          <span class="lb-rank">${medal || (i + 1)}</span>
          ${avHtml}
          <span class="lb-name">${escapeHtml(p.name)}</span>
          <span class="lb-coins">${Math.floor(displayCoins)} ◎</span>
        </div>`;
      }).join("");
      // Bind filter buttons
      document.querySelectorAll(".lb-filter").forEach(b => {
        b.removeEventListener("click", onLbFilter);
        b.addEventListener("click", onLbFilter);
      });
    } catch (e) { container.innerHTML = '<div class="user-list__empty">Xatolik: ' + escapeHtml(e.message) + '</div>'; }
  }

  function onLbFilter(e) {
    const f = e.currentTarget.getAttribute("data-filter");
    if (f !== leaderboardFilter) { leaderboardFilter = f; renderLeaderboard(); }
  }

  async function checkPeriodReset() {
    if (!authUser) return;
    const now = Date.now();
    const dayMs = 86400000;
    // Weekly reset (Monday)
    const lastWeekReset = userData?.lastWeekReset || 0;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); weekStart.setHours(0,0,0,0);
    if (lastWeekReset < weekStart.getTime()) {
      try { await getUserDocRef(authUser.uid).update({ weekEarned: 0, lastWeekReset: now }); } catch {}
    }
    // Monthly reset (1st)
    const lastMonthReset = userData?.lastMonthReset || 0;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    if (lastMonthReset < monthStart.getTime()) {
      try { await getUserDocRef(authUser.uid).update({ monthEarned: 0, lastMonthReset: now }); } catch {}
    }
  }

  // ── Chat & Friends & Groups ──

  let chatUnsub = null;
  let privateChatUnsub = null;
  let activePrivateChatId = null;
  let groupChatUnsub = null;
  let activeGroupId = null;
  let chatInitDone = false;
  const CHAT_CLOSE_HOUR = 0;
  const CHAT_OPEN_HOUR = 6;

  function isPublicChatOpen() {
    const h = new Date().getHours();
    return h >= CHAT_OPEN_HOUR || h < CHAT_CLOSE_HOUR;
  }

  function isNearBottom(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  function initChat() {
    if (chatInitDone) return;
    chatInitDone = true;
    // Tabs
    document.querySelectorAll(".chat-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".chat-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const t = tab.getAttribute("data-chtab");
        document.getElementById("chatPublic").style.display = t === "public" ? "flex" : "none";
        document.getElementById("chatFriends").style.display = t === "friends" ? "flex" : "none";
        document.getElementById("chatRequests").style.display = t === "requests" ? "flex" : "none";
        document.getElementById("chatGroups").style.display = t === "groups" ? "flex" : "none";
        if (t === "requests") renderFriendRequests();
        if (t === "friends") renderFriendsList();
        if (t === "groups") renderGroupsList();
      });
    });
    // Public chat
    const sendBtn = document.getElementById("chatSendBtn");
    const input = document.getElementById("chatInput");
    if (sendBtn) sendBtn.addEventListener("click", sendChatMessage);
    if (input) input.addEventListener("keydown", e => { if (e.key === "Enter") sendChatMessage(); });
    if (chatUnsub) chatUnsub();
    updateChatNightState();
    setInterval(updateChatNightState, 30000);
    checkMidnightCleanup();
    setInterval(() => {
      const h = new Date().getHours();
      const m = new Date().getMinutes();
      if (h === 0 && m === 0) checkMidnightCleanup();
    }, 60000);
    chatUnsub = firebase.firestore().collection("chat")
      .orderBy("time", "asc").limit(100)
      .onSnapshot(snap => {
        const container = document.getElementById("chatMessages");
        if (!container) return;
        updateChatNightState();
        const wasNearBottom = isNearBottom(container);
        const msgs = [];
        snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
        container.innerHTML = msgs.map(m => {
          const isMe = m.uid === authUser?.uid;
          let content;
          if (m.imageUrl) {
            content = `<img src="${escapeHtml(m.imageUrl)}" style="max-width:200px;max-height:200px;border-radius:8px;display:block;margin-top:4px" onerror="this.style.display='none'" loading="lazy">`;
          } else {
            content = linkify(m.text);
          }
          return `<div style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.4rem 0.6rem;background:${isMe ? "rgba(99,102,241,0.1)" : "rgba(0,0,0,0.08)"};border-radius:10px;font-size:0.88rem">
            ${m.avatar && (m.avatar.startsWith("http") || m.avatar.startsWith("data:image/")) ? `<img src="${escapeHtml(m.avatar)}" style="width:24px;height:24px;border-radius:50%;flex-shrink:0" onerror="this.outerHTML='<span style=font-size:1.1rem;flex-shrink:0>😀</span>'">` : `<span style="font-size:1.1rem;flex-shrink:0">${escapeHtml(m.avatar || "😀")}</span>`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.78rem;color:var(--accent)">${escapeHtml(m.name)}</div>
              <div style="color:var(--text);word-wrap:break-word">${content}</div>
            </div>
            <span style="font-size:0.68rem;color:var(--muted);flex-shrink:0;font-family:var(--mono)">${m.time ? new Date(m.time.toMillis ? m.time.toMillis() : m.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</span>
          </div>`;
        }).join("");
        if (wasNearBottom) container.scrollTop = container.scrollHeight;
      }, err => {
        const container = document.getElementById("chatMessages");
        if (container) container.innerHTML = '<div class="user-list__empty">Chat yuklanmadi: ' + escapeHtml(err.message) + '</div>';
      });
    // Private chat
    document.getElementById("privateChatSendBtn")?.addEventListener("click", sendPrivateMessage);
    document.getElementById("privateChatInput")?.addEventListener("keydown", e => { if (e.key === "Enter") sendPrivateMessage(); });
    // Group chat
    document.getElementById("createGroupBtn")?.addEventListener("click", createGroup);
    document.getElementById("groupChatSendBtn")?.addEventListener("click", sendGroupMessage);
    document.getElementById("groupChatInput")?.addEventListener("keydown", e => { if (e.key === "Enter") sendGroupMessage(); });
  }

  async function checkMidnightCleanup() {
    const today = new Date().toDateString();
    const lastCleanup = localStorage.getItem("zxmax_chat_cleanup_date");
    if (lastCleanup === today) return;
    try {
      const snapshot = await firebase.firestore().collection("chat").get();
      if (snapshot.empty) { localStorage.setItem("zxmax_chat_cleanup_date", today); return; }
      const batchSize = 490;
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = firebase.firestore().batch();
        const chunk = docs.slice(i, i + batchSize);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      localStorage.setItem("zxmax_chat_cleanup_date", today);
      console.log("[chat] midnight cleanup: " + docs.length + " messages deleted");
    } catch (e) {
      console.warn("[chat] cleanup error:", e);
    }
  }

  function updateChatNightState() {
    const open = isPublicChatOpen();
    const input = document.getElementById("chatInput");
    const sendBtn = document.getElementById("chatSendBtn");
    const nightMsg = document.getElementById("chatNightMsg");
    if (!open) {
      if (input) { input.disabled = true; input.placeholder = "🌙 Chat 00:00–06:00 yopiq"; }
      if (sendBtn) sendBtn.disabled = true;
      if (nightMsg) nightMsg.style.display = "block";
    } else {
      if (input) { input.disabled = false; input.placeholder = "Xabar yozish..."; }
      if (sendBtn) sendBtn.disabled = false;
      if (nightMsg) nightMsg.style.display = "none";
    }
  }

  async function sendChatMessage() {
    if (!isPublicChatOpen()) { showToast("🌙 Chat 00:00–06:00 yopiq"); return; }
    const input = document.getElementById("chatInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text || !authUser) return;
    const msg = {
      uid: authUser.uid,
      name: userData?.name || "Noma'lum",
      avatar: userData?.avatar || "😀",
      text,
      time: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      await firebase.firestore().collection("chat").add(msg);
      input.value = "";
    } catch (e) { showToast(e.message); }
  }

  // ── Friend Requests ──

  async function sendFriendRequest(targetUid) {
    if (targetUid === authUser.uid) return;
    try {
      const existing = await getUserDocRef(targetUid).collection("friendRequests").doc(authUser.uid).get();
      if (existing.exists) { showToast("So'rov yuborilgan"); return; }
      const friends = await getUserDocRef(authUser.uid).collection("friends").doc(targetUid).get();
      if (friends.exists) { showToast("Allaqachon do'st"); return; }
      await getUserDocRef(targetUid).collection("friendRequests").doc(authUser.uid).set({
        fromUid: authUser.uid,
        name: userData?.name || "",
        avatar: userData?.avatar || "😀",
        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: "pending",
      });
      showToast("So'rov yuborildi!");
    } catch (e) { showToast(e.message); }
  }

  async function acceptFriendRequest(requesterUid) {
    try {
      const batch = firebase.firestore().batch();
      batch.set(getUserDocRef(authUser.uid).collection("friends").doc(requesterUid), {
        friendUid: requesterUid, addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(getUserDocRef(requesterUid).collection("friends").doc(authUser.uid), {
        friendUid: authUser.uid, addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      batch.delete(getUserDocRef(authUser.uid).collection("friendRequests").doc(requesterUid));
      await batch.commit();
      showToast("Do'st qabul qilindi!");
      renderFriendRequests();
      renderFriendsList();
    } catch (e) { showToast(e.message); }
  }

  async function rejectFriendRequest(requesterUid) {
    try {
      await getUserDocRef(authUser.uid).collection("friendRequests").doc(requesterUid).delete();
      showToast("So'rov rad etildi");
      renderFriendRequests();
    } catch (e) { showToast(e.message); }
  }

  async function removeFriend(friendUid) {
    try {
      const batch = firebase.firestore().batch();
      batch.delete(getUserDocRef(authUser.uid).collection("friends").doc(friendUid));
      batch.delete(getUserDocRef(friendUid).collection("friends").doc(authUser.uid));
      await batch.commit();
      showToast("Do'st olib tashlandi");
      renderFriendsList();
      if (activePrivateChatId) { activePrivateChatId = null; document.getElementById("privateChatArea").style.display = "none"; }
    } catch (e) { showToast(e.message); }
  }

  async function renderFriendRequests() {
    const container = document.getElementById("friendRequestsList");
    if (!container) return;
    try {
      const snap = await getUserDocRef(authUser.uid).collection("friendRequests").get();
      if (snap.empty) { container.innerHTML = '<div class="user-list__empty">So\'rovlar yo\'q</div>'; return; }
      const requests = [];
      snap.forEach(d => requests.push({ id: d.id, ...d.data() }));
      container.innerHTML = requests.map(r =>
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem;background:rgba(0,0,0,0.08);border-radius:10px">' +
          '<div style="display:flex;align-items:center;gap:0.5rem"><span style="font-size:1.2rem">' + escapeHtml(r.avatar || "😀") + '</span><span style="font-weight:600">' + escapeHtml(r.name) + '</span></div>' +
          '<div style="display:flex;gap:0.3rem">' +
            '<button type="button" class="btn primary" data-accept-friend="' + escapeHtml(r.id) + '" style="font-size:0.78rem;padding:0.25rem 0.6rem">Qabul</button>' +
            '<button type="button" class="btn ghost" data-reject-friend="' + escapeHtml(r.id) + '" style="font-size:0.78rem;padding:0.25rem 0.6rem">Rad</button>' +
          '</div>' +
        '</div>'
      ).join("");
      container.querySelectorAll("[data-accept-friend]").forEach(b => b.addEventListener("click", () => acceptFriendRequest(b.getAttribute("data-accept-friend"))));
      container.querySelectorAll("[data-reject-friend]").forEach(b => b.addEventListener("click", () => rejectFriendRequest(b.getAttribute("data-reject-friend"))));
    } catch (e) { container.innerHTML = '<div class="user-list__empty">Xatolik</div>'; }
  }

  async function renderFriendsList() {
    const container = document.getElementById("friendsList");
    if (!container) return;
    try {
      const snap = await getUserDocRef(authUser.uid).collection("friends").get();
      if (snap.empty) { container.innerHTML = '<div class="user-list__empty">Do\'stlar yo\'q</div>'; return; }
      const friends = [];
      const batch = [];
      snap.forEach(d => { friends.push(d.id); batch.push(getUserDocRef(d.id).get()); });
      const userSnaps = await Promise.all(batch);
      const userMap = {};
      userSnaps.forEach(s => { if (s.exists) userMap[s.id] = s.data(); });
      container.innerHTML = friends.map(fid => {
        const u = userMap[fid] || {};
        const rawAv = u.avatar || "😀";
        const avHtml = rawAv.startsWith("data:image/") ? `<img src="${escapeHtml(rawAv)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" />` : `<span style="font-size:1.2rem">${escapeHtml(rawAv)}</span>`;
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem;background:rgba(0,0,0,0.08);border-radius:10px;cursor:pointer" data-chat-friend="' + escapeHtml(fid) + '">' +
          '<div style="display:flex;align-items:center;gap:0.5rem">' + avHtml + '<span style="font-weight:600">' + escapeHtml(u.name || fid) + '</span></div>' +
          '<button type="button" class="btn ghost" data-remove-friend="' + escapeHtml(fid) + '" style="font-size:0.75rem;padding:0.2rem 0.5rem" title="O\'chirish">✕</button>' +
        '</div>';
      }).join("");
      container.querySelectorAll("[data-chat-friend]").forEach(el => el.addEventListener("click", () => openPrivateChat(el.getAttribute("data-chat-friend"))));
      container.querySelectorAll("[data-remove-friend]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); removeFriend(b.getAttribute("data-remove-friend")); }));
    } catch (e) { container.innerHTML = '<div class="user-list__empty">Xatolik</div>'; }
  }

  // ── Private Chat ──

  function getConversationId(uid1, uid2) {
    return [uid1, uid2].sort().join("_");
  }

  async function openPrivateChat(friendUid) {
    activePrivateChatId = getConversationId(authUser.uid, friendUid);
    const area = document.getElementById("privateChatArea");
    const msgsContainer = document.getElementById("privateChatMessages");
    area.style.display = "flex";
    if (privateChatUnsub) privateChatUnsub();
    privateChatUnsub = firebase.firestore().collection("privateChats").doc(activePrivateChatId)
      .collection("messages").orderBy("time", "asc").limit(100)
      .onSnapshot(snap => {
        const wasNearBottom = isNearBottom(msgsContainer);
        const msgs = [];
        snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
        msgsContainer.innerHTML = msgs.map(m => {
          const isMe = m.from === authUser?.uid;
          let content;
          if (m.imageUrl) {
            content = `<img src="${escapeHtml(m.imageUrl)}" style="max-width:200px;max-height:200px;border-radius:8px;display:block;margin-top:4px" onerror="this.style.display='none'" loading="lazy">`;
          } else {
            content = linkify(m.text);
          }
          return `<div style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.4rem 0.6rem;background:${isMe ? "rgba(99,102,241,0.1)" : "rgba(0,0,0,0.08)"};border-radius:10px;font-size:0.85rem">
            <div style="flex:1;min-width:0">
              <div style="color:var(--text);word-wrap:break-word">${content}</div>
            </div>
            <span style="font-size:0.65rem;color:var(--muted);flex-shrink:0;font-family:var(--mono)">${m.time ? new Date(m.time.toMillis ? m.time.toMillis() : m.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</span>
          </div>`;
        }).join("");
        if (wasNearBottom) msgsContainer.scrollTop = msgsContainer.scrollHeight;
      }, err => {
        msgsContainer.innerHTML = '<div class="user-list__empty">Xabarlar yuklanmadi: ' + escapeHtml(err.message) + '</div>';
      });
    // Focus input
    document.getElementById("privateChatInput")?.focus();
  }

  async function sendPrivateMessage() {
    const input = document.getElementById("privateChatInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text || !authUser || !activePrivateChatId) return;
    try {
      await firebase.firestore().collection("privateChats").doc(activePrivateChatId)
        .collection("messages").add({
          from: authUser.uid,
          text,
          time: firebase.firestore.FieldValue.serverTimestamp(),
        });
      input.value = "";
    } catch (e) { showToast(e.message); }
  }

  // ── Group Chat ──

  async function createGroup() {
    const input = document.getElementById("groupNameInput");
    if (!input) return;
    const name = input.value.trim();
    if (!name || !authUser) return;
    try {
      const ref = await firebase.firestore().collection("groups").add({
        name,
        avatar: "👥",
        members: [authUser.uid],
        createdBy: authUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      input.value = "";
      showToast("Guruh yaratildi!");
      renderGroupsList();
      openGroupChat(ref.id);
    } catch (e) { showToast(e.message); }
  }

  async function renderGroupsList() {
    const container = document.getElementById("groupsList");
    if (!container) return;
    try {
      const snap = await firebase.firestore().collection("groups").where("members", "array-contains", authUser.uid).get();
      if (snap.empty) { container.innerHTML = '<div class="user-list__empty" style="font-size:0.85rem">Guruhlar yo\'q</div>'; return; }
      const groups = [];
      snap.forEach(d => groups.push({ id: d.id, ...d.data() }));
      container.innerHTML = groups.map(g =>
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.45rem 0.5rem;background:rgba(0,0,0,0.08);border-radius:10px;cursor:pointer" data-open-group="' + escapeHtml(g.id) + '">' +
          '<div style="display:flex;align-items:center;gap:0.5rem"><span>' + (g.avatar || "👥") + '</span><span style="font-weight:600;font-size:0.9rem">' + escapeHtml(g.name) + '</span><span style="font-size:0.75rem;color:var(--muted)">(' + (g.members?.length || 1) + ')</span></div>' +
          '<button type="button" class="btn ghost" data-leave-group="' + escapeHtml(g.id) + '" style="font-size:0.75rem;padding:0.2rem 0.5rem" title="Chiqish">🚪</button>' +
        '</div>'
      ).join("");
      container.querySelectorAll("[data-open-group]").forEach(el => el.addEventListener("click", () => openGroupChat(el.getAttribute("data-open-group"))));
      container.querySelectorAll("[data-leave-group]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); leaveGroup(b.getAttribute("data-leave-group")); }));
    } catch (e) { container.innerHTML = '<div class="user-list__empty">Xatolik</div>'; }
  }

  async function openGroupChat(groupId) {
    activeGroupId = groupId;
    const area = document.getElementById("groupChatArea");
    const header = document.getElementById("groupChatHeader");
    const msgsContainer = document.getElementById("groupChatMessages");
    area.style.display = "flex";
    // Load group name
    try {
      const doc = await firebase.firestore().collection("groups").doc(groupId).get();
      if (doc.exists) {
        const g = doc.data();
        header.innerHTML = '<span>' + (g.avatar || "👥") + ' ' + escapeHtml(g.name) + '</span><button type="button" class="btn ghost" id="addMemberToGroupBtn" style="font-size:0.8rem;padding:0.2rem 0.5rem">+ A\'zo</button>';
        document.getElementById("addMemberToGroupBtn")?.addEventListener("click", () => addGroupMember(groupId));
      }
    } catch {}
    if (groupChatUnsub) groupChatUnsub();
    groupChatUnsub = firebase.firestore().collection("groupChats").doc(groupId)
      .collection("messages").orderBy("time", "asc").limit(100)
      .onSnapshot(snap => {
        const wasNearBottom = isNearBottom(msgsContainer);
        const msgs = [];
        snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
        msgsContainer.innerHTML = msgs.map(m => {
          const isMe = m.from === authUser?.uid;
          return `<div style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.4rem 0.6rem;background:${isMe ? "rgba(99,102,241,0.1)" : "rgba(0,0,0,0.08)"};border-radius:10px;font-size:0.85rem">
            ${m.avatar && m.avatar.startsWith("data:image/") ? `<img src="${escapeHtml(m.avatar)}" style="width:24px;height:24px;border-radius:50%;flex-shrink:0" onerror="this.outerHTML='<span style=font-size:1rem;flex-shrink:0>😀</span>'">` : `<span style="font-size:1rem;flex-shrink:0">${escapeHtml(m.avatar || "😀")}</span>`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.78rem;color:var(--accent)">${escapeHtml(m.name)}</div>
              <div style="color:var(--text);word-wrap:break-word">${m.imageUrl ? `<img src="${escapeHtml(m.imageUrl)}" style="max-width:200px;max-height:200px;border-radius:8px;display:block;margin-top:4px" onerror="this.style.display='none'" loading="lazy">` : linkify(m.text)}</div>
            </div>
            <span style="font-size:0.65rem;color:var(--muted);flex-shrink:0;font-family:var(--mono)">${m.time ? new Date(m.time.toMillis ? m.time.toMillis() : m.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</span>
          </div>`;
        }).join("");
        if (wasNearBottom) msgsContainer.scrollTop = msgsContainer.scrollHeight;
      }, err => {
        msgsContainer.innerHTML = '<div class="user-list__empty">Xabarlar yuklanmadi: ' + escapeHtml(err.message) + '</div>';
      });
    document.getElementById("groupChatInput")?.focus();
  }

  async function sendGroupMessage() {
    const input = document.getElementById("groupChatInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text || !authUser || !activeGroupId) return;
    try {
      await firebase.firestore().collection("groupChats").doc(activeGroupId)
        .collection("messages").add({
          from: authUser.uid,
          name: userData?.name || "Noma'lum",
          avatar: userData?.avatar || "😀",
          text,
          time: firebase.firestore.FieldValue.serverTimestamp(),
        });
      input.value = "";
    } catch (e) { showToast(e.message); }
  }

  async function addGroupMember(groupId) {
    const uid = prompt("A'zoning UID sini kiriting:");
    if (!uid || !authUser) return;
    try {
      await firebase.firestore().collection("groups").doc(groupId).update({
        members: firebase.firestore.FieldValue.arrayUnion(uid),
      });
      showToast("A'zo qo'shildi!");
    } catch (e) { showToast(e.message); }
  }

  async function leaveGroup(groupId) {
    if (!confirm("Guruhdan chiqishni tasdiqlaysizmi?")) return;
    try {
      await firebase.firestore().collection("groups").doc(groupId).update({
        members: firebase.firestore.FieldValue.arrayRemove(authUser.uid),
      });
      showToast("Guruhdan chiqdingiz");
      if (activeGroupId === groupId) {
        activeGroupId = null;
        document.getElementById("groupChatArea").style.display = "none";
        if (groupChatUnsub) groupChatUnsub();
      }
      renderGroupsList();
    } catch (e) { showToast(e.message); }
  }

  // ── Admin ──

  function renderAdminPanel() {
    const container = document.getElementById("adminPanel");
    if (!container) return;
    const isAdmin = userData?.role === "admin";
    if (!isAdmin) { container.innerHTML = '<div class="user-list__empty">Siz admin emassiz.</div>'; return; }
    firebase.firestore().collection("users").get().then(snap => {
      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      container.innerHTML =
        '<div class="admin-card"><div class="admin-card__head"><span class="admin-card__title">➕ Yangi foydalanuvchi</span></div>' +
        '<div class="admin-add-row"><input class="modal__input" id="adminAddUsername" placeholder="Username" style="min-width:130px" />' +
        '<input class="modal__input" id="adminAddPassword" type="password" placeholder="Parol" style="min-width:100px" />' +
        '<input class="modal__input" id="adminAddName" placeholder="Ism (ixtiyoriy)" style="min-width:100px" />' +
        '<button type="button" class="btn primary" id="adminCreateBtn" style="white-space:nowrap">Qo\'shish</button></div>' +
        '<p class="hint" id="adminAddHint"></p></div>' +
        rows.map(p => {
          const rawAv = p.avatar || "😀";
          const avHtml = rawAv.startsWith("data:image/") ? `<img src="${escapeHtml(rawAv)}" class="admin-user-avatar" />` : `<span style="font-size:1.3rem">${escapeHtml(rawAv)}</span>`;
          const roleBadge = p.role === "admin" ? '<span class="admin-badge">admin</span>' : "";
          return '<div class="admin-card"><div class="admin-card__head">' + avHtml + ' <span class="admin-card__title">' + escapeHtml(p.name) + ' @' + escapeHtml(p.username || "?") + roleBadge + '</span></div>' +
            '<div class="admin-user-actions">' +
            '<button type="button" class="btn ghost" data-admin-del="' + escapeHtml(p.id) + '" ' + (p.id === authUser.uid ? 'disabled' : '') + ' style="font-size:0.78rem;padding:0.25rem 0.5rem">O\'chirish</button>' +
            '<button type="button" class="btn ghost" data-admin-pass="' + escapeHtml(p.id) + '" style="font-size:0.78rem;padding:0.25rem 0.5rem">Parolni almashtirish</button>' +
            (p.role === "admin" && p.id !== authUser.uid ? '<button type="button" class="btn ghost" data-admin-role="' + escapeHtml(p.id) + '" style="font-size:0.78rem;padding:0.25rem 0.5rem">Adminlikni olib tashlash</button>' : '') +
            (p.role !== "admin" ? '<button type="button" class="btn ghost" data-admin-role="' + escapeHtml(p.id) + '" style="font-size:0.78rem;padding:0.25rem 0.5rem">Admin qilish</button>' : '') +
            '</div></div>';
        }).join("");
      document.getElementById("adminCreateBtn")?.addEventListener("click", () => adminCreateUser());
      container.querySelectorAll("[data-admin-del]").forEach(b => b.addEventListener("click", () => adminDeleteUser(b.getAttribute("data-admin-del"))));
      container.querySelectorAll("[data-admin-pass]").forEach(b => b.addEventListener("click", () => adminChangePassword(b.getAttribute("data-admin-pass"))));
      container.querySelectorAll("[data-admin-role]").forEach(b => b.addEventListener("click", () => adminToggleRole(b.getAttribute("data-admin-role"))));
    });
  }

  async function adminCreateUser() {
    const username = document.getElementById("adminAddUsername").value.trim();
    const password = document.getElementById("adminAddPassword").value;
    const name = document.getElementById("adminAddName").value.trim() || username;
    const hint = document.getElementById("adminAddHint");
    if (!username || !password) { hint.textContent = "Username va parol kiriting."; return; }
    const adminEmail = authUser.email;
    try {
      const email = username + "@zxmax.local";
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;
      await getUserDocRef(uid).set({
        name, username, email,
        avatar: AVATARS[0], bio: "", subscribedTo: [], role: null,
        coins: 0, totalEarned: 0, totalSpent: 0,
        purchases: {}, theme: "default", dailyTasks: {},
        lastDaily: null, lastQuickEarn: 0,
        created: firebase.firestore.FieldValue.serverTimestamp(),
        profileDesign: null, gameStats: defaultGameStats(),
      });
      await firebase.auth().signInWithEmailAndPassword(adminEmail, sessionStorage.getItem("zxmax_admin_pass") || "");
      document.getElementById("adminAddUsername").value = "";
      document.getElementById("adminAddPassword").value = "";
      document.getElementById("adminAddName").value = "";
      hint.textContent = name + " qo'shildi!";
      hint.style.color = "var(--ok)";
      renderAdminPanel();
      renderLeaderboard();
      showToast(name + " qo'shildi");
    } catch (e) { hint.textContent = e.message; }
  }

  async function adminDeleteUser(profileId) {
    if (profileId === authUser.uid) return;
    if (!confirm("Bu foydalanuvchini o'chirishni tasdiqlaysizmi?")) return;
    try {
      await getUserDocRef(profileId).delete();
      renderAdminPanel();
      renderLeaderboard();
      showToast("O'chirildi (Firestore). Auth akkauntini o'chirish uchun Firebase console > Authentication dan o'chiring.");
    } catch (e) { showToast(e.message); }
  }

  async function adminChangePassword(profileId) {
    const newPass = prompt("Yangi parolni kiriting (kamida 6 belgi):");
    if (!newPass || newPass.length < 6) return;
    showToast("Parolni Firebase console > Authentication dan o'zgartiring yoki foydalanuvchiga 'Parolni unutdim' dan tiklashni aytin.");
  }

  async function adminToggleRole(profileId) {
    const ref = getUserDocRef(profileId);
    const doc = await ref.get();
    if (!doc.exists) return;
    const currentRole = doc.data().role;
    await ref.update({ role: currentRole === "admin" ? null : "admin" });
    renderAdminPanel();
    showToast("Rol o'zgartirildi");
  }

  // ── Wire Events ──

  function wireAuthModal() {
    document.getElementById("registerBtn")?.addEventListener("click", register);
    document.getElementById("loginBtn")?.addEventListener("click", login);
    document.getElementById("showRegisterBtn")?.addEventListener("click", () => {
      document.getElementById("loginForm").hidden = true;
      document.getElementById("registerForm").hidden = false;
      document.getElementById("loginHint").textContent = "";
    });
    document.getElementById("showLoginBtn")?.addEventListener("click", () => {
      document.getElementById("loginForm").hidden = false;
      document.getElementById("registerForm").hidden = true;
      document.getElementById("registerHint").textContent = "";
    });
    document.getElementById("loginUsernameInput")?.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
    document.getElementById("loginPasswordInput")?.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
    document.getElementById("registerUsernameInput")?.addEventListener("keydown", e => { if (e.key === "Enter") register(); });
    document.getElementById("registerPasswordInput")?.addEventListener("keydown", e => { if (e.key === "Enter") register(); });
    document.getElementById("registerNameInput")?.addEventListener("keydown", e => { if (e.key === "Enter") register(); });
    document.getElementById("registerEmailInput")?.addEventListener("keydown", e => { if (e.key === "Enter") register(); });
    document.getElementById("forgotPassBtn")?.addEventListener("click", () => {
      document.getElementById("forgotPassForm").hidden = false;
      document.getElementById("forgotPassBtn").hidden = true;
      const input = document.getElementById("loginUsernameInput").value.trim();
      if (!input) { document.getElementById("recoveryStatus").textContent = "Avval username ni kiriting."; return; }
      sendRecoveryEmail(input);
    });
  }

  function wireProfileModal() {
    const modal = document.getElementById("profileModal");
    document.getElementById("profileOpenBtn")?.addEventListener("click", () => openProfileModal());
    document.querySelectorAll("[data-close-modal]").forEach(el => {
      el.addEventListener("click", () => closeProfileModal());
    });
    document.getElementById("customAvatarBtn")?.addEventListener("click", () => document.getElementById("customAvatarInput").click());
    document.getElementById("customAvatarInput")?.addEventListener("change", () => handleCustomFile());
    document.getElementById("customAvatarSaveBtn")?.addEventListener("click", () => saveCustomAvatar());
    document.getElementById("changeNameBtn")?.addEventListener("click", () => changeName());
    document.getElementById("profileNameInput")?.addEventListener("keydown", e => { if (e.key === "Enter") changeName(); });
    document.getElementById("saveBioBtn")?.addEventListener("click", () => saveBio());
    document.getElementById("sendCoinsBtn")?.addEventListener("click", () => sendCoins());
    document.getElementById("deleteAccountBtn")?.addEventListener("click", () => deleteMyAccount());
    document.getElementById("changePassBtn")?.addEventListener("click", () => changePassword());
    document.getElementById("changePassNew")?.addEventListener("keydown", e => { if (e.key === "Enter") changePassword(); });
    document.getElementById("logoutBtn")?.addEventListener("click", () => logout());
    document.getElementById("saveEmailBtn")?.addEventListener("click", () => saveEmail());
    document.getElementById("profileEmailInput")?.addEventListener("keydown", e => { if (e.key === "Enter") saveEmail(); });
    document.getElementById("searchUserBtn")?.addEventListener("click", () => searchUsers());
    document.getElementById("searchUserInput")?.addEventListener("keydown", e => { if (e.key === "Enter") searchUsers(); });
    document.getElementById("saveDesignBtn")?.addEventListener("click", () => saveProfileDesign());
    document.getElementById("pDesignBgBtn")?.addEventListener("click", () => document.getElementById("pDesignBgInput").click());
    document.getElementById("pDesignBgInput")?.addEventListener("change", () => {
      const file = document.getElementById("pDesignBgInput").files?.[0];
      const nameSpan = document.getElementById("pDesignBgName");
      const preview = document.getElementById("pDesignBgPreview");
      const clearBtn = document.getElementById("pDesignBgClear");
      if (!file) return;
      if (file.size > 1024 * 1024) { nameSpan.textContent = "Rasm 1MB dan kichik bo'lishi kerak."; return; }
      nameSpan.textContent = file.name;
      const reader = new FileReader();
      reader.onload = function (e) {
        pendingBgImage = e.target.result;
        if (preview) { preview.style.display = "block"; preview.style.backgroundImage = "url(" + pendingBgImage + ")"; }
        if (clearBtn) clearBtn.style.display = "inline-block";
      };
      reader.readAsDataURL(file);
    });
    document.getElementById("pDesignBgClear")?.addEventListener("click", () => {
      pendingBgImage = null;
      document.getElementById("pDesignBgInput").value = "";
      const preview = document.getElementById("pDesignBgPreview");
      const clearBtn = document.getElementById("pDesignBgClear");
      const nameSpan = document.getElementById("pDesignBgName");
      if (preview) { preview.style.display = "none"; preview.style.backgroundImage = ""; }
      if (clearBtn) clearBtn.style.display = "none";
      if (nameSpan) nameSpan.textContent = "";
    });
    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && modal && !modal.hidden) closeProfileModal();
    });
  }

  function handleCustomFile() {
    const input = document.getElementById("customAvatarInput");
    const file = input.files && input.files[0];
    const preview = document.getElementById("customAvatarPreview");
    const img = document.getElementById("customAvatarImg");
    const name = document.getElementById("customAvatarName");
    const hint = document.getElementById("customAvatarHint");
    if (!file) return;
    if (file.size > 500 * 1024) { hint.textContent = "Rasm 500KB dan kichik bo'lishi kerak."; return; }
    hint.textContent = "";
    name.textContent = file.name;
    const reader = new FileReader();
    reader.onload = function (e) {
      customAvatarDataUrl = e.target.result;
      img.src = customAvatarDataUrl;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  async function deleteMyAccount() {
    if (!confirm("Akkauntingizni o'chirishni tasdiqlaysizmi? Bu qayta tiklanmaydi!")) return;
    try {
      await getUserDocRef(authUser.uid).delete();
      await authUser.delete();
      showToast("Akkaunt o'chirildi");
    } catch (e) { showToast(e.message); }
  }

  // ── Navigation ──

  function wireNav() {
    document.querySelectorAll("[data-nav]").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        const panelId = a.getAttribute("href").slice(1);
        openPanel(panelId);
        const nav = document.querySelector(".nav");
        const ham = document.getElementById("hamburgerBtn");
        if (nav) nav.classList.remove("open");
        if (ham) ham.classList.remove("open");
      });
    });
    const hash = location.hash.slice(1) || "home";
    openPanel(hash);
    window.addEventListener("hashchange", () => {
      const id = location.hash.slice(1) || "home";
      openPanel(id);
    });
    document.getElementById("dailyBtn")?.addEventListener("click", claimDaily);
    document.getElementById("quickEarnBtn")?.addEventListener("click", quickEarn);
  }

  // ── Games Integration (called from game files) ──

  window.recordGamePlay = recordGamePlay;

  async function zxmaxTransfer(coins, gameId, score) {
    if (!authUser) return;
    try {
      await saveUserData({
        coins: firebase.firestore.FieldValue.increment(coins),
        totalEarned: firebase.firestore.FieldValue.increment(coins),
        weekEarned: firebase.firestore.FieldValue.increment(coins),
        monthEarned: firebase.firestore.FieldValue.increment(coins),
      });
      if (gameId) await recordGamePlay(gameId, coins, score || coins);
      await loadUserData();
      syncProfileBar();
      return true;
    } catch { return false; }
  }
  window.zxmaxTransfer = zxmaxTransfer;

  async function getBalance() {
    if (!authUser) return 0;
    await loadUserData();
    return state?.coins || 0;
  }
  window.getBalance = getBalance;

  // ── Init ──

  firebase.auth().onAuthStateChanged(async (fbUser) => {
    if (fbUser) {
      authUser = fbUser;
      showUI();
      hideModals();
      await loadUserData();
      if (!userData && !isRegistering) {
        const autoUsername = fbUser.email?.split("@")[0] || "";
        await getUserDocRef(fbUser.uid).set({
          name: fbUser.displayName || autoUsername || "User",
          username: autoUsername,
          email: fbUser.email || "",
          avatar: AVATARS[0], bio: "", subscribedTo: [],
          role: window.ADMIN_CONFIG?.usernames?.includes(autoUsername) ? "admin" : null,
          coins: 0, totalEarned: 0, totalSpent: 0,
          purchases: {}, theme: "default", dailyTasks: {},
          lastDaily: null, lastQuickEarn: 0,
          created: firebase.firestore.FieldValue.serverTimestamp(),
          profileDesign: null, gameStats: defaultGameStats(),
        });
        await loadUserData();
      }
      if (userData && window.ADMIN_CONFIG?.usernames?.includes(userData.username) && userData.role !== "admin") {
        await getUserDocRef(fbUser.uid).update({ role: "admin" });
        userData.role = "admin";
      }
      syncUI();
      applyTheme();
    } else {
      authUser = null;
      userData = null;
      state = defaultState();
      hideUI();
      showLoginModal();
    }
  });

  wireAuthModal();
  wireProfileModal();
  wireNav();

  // Hamburger menu toggle
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const navEl = document.querySelector(".nav");
  if (hamburgerBtn && navEl) {
    hamburgerBtn.addEventListener("click", () => {
      hamburgerBtn.classList.toggle("open");
      navEl.classList.toggle("open");
    });
    navEl.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        hamburgerBtn.classList.remove("open");
        navEl.classList.remove("open");
      });
    });
  }

  window.getManifest = () => ({ profiles: authUser ? [{ id: authUser.uid, ...userData }] : [], activeId: authUser?.uid || null });
  window.SAVE_PREFIX = "zxmax_firebase_";
/* anchored-summary:
## Goal
- Firebase (Auth + Firestore) ga o'tkazilgan zxmax platformasini rivojlantirish: o'yinlar, profillar, admin panel, qidirish, do'kon, vazifalar, zaxira tizimi.

## Constraints & Preferences
- Uzbek language throughout the interface
- Firebase Auth (Email/Password) + Firestore ma'lumotlar bazasi
- Tashqi o'yin saytlari localStorage bridge orqali integratsiyalangan
- Barcha o'yinlar bir domenda (local path'lar)
- Profil dizaynini sozlash (rang, fon rasmi) foydalanuvchi tomonidan

## Progress
### Done
- Firebase SDK (compat) `index.html` ga qo'shildi; `admin-config.js`, `email-config.js`, EmailJS olib tashlandi
- `app.js` butunlay Firebase Auth + Firestore ga o'tkazildi (asynchronous)
- Profil dizayni: 7 preset tema + Custom ranglar + orqa fon rasmi yuklash
- `showUserProfile` da profil dizayni qo'llaniladi (css custom properties)
- Vazifalar bo'limi yangilandi: 9 ta vazifa, kunlik reset (`_day`), progress bar, task-item CSS
- Tez tanga tugmasida 5 soniyali countdown; kunlik bonus tugmasi `grayscale` + `disabled`
- Do'konga yangi narsalar qo'shildi: VIP nishoni (100000◎), Kamalak ism (35000◎), 2× tanga, tanga magniti, bonus ×2, qora fon, avatar to'plamlari
- VIP nishoni va Kamalak ism profil satrida ko'rinadi (`syncProfileBar`)
- Barcha o'yin linklari local path'ga qaytarildi (bir domenda ishlashi uchun)
- localStorage bridge: Firebase → localStorage sinxronlash + game earnings ni Firebase ga merge qilish
- Quiz olib tashlandi; Galaxy Tycoon, Snake, TicTacToe, Xotira, NumberGuess, Reaksiya local da
- Streak tizimi: ketma-ket kunlik bonus (1-kun 13◎, 7-kun 31◎, 30-kun 100◎)
- Badge tizimi: 8 ta yutuq nishoni (`BADGES` constanta)
- Kunlik bonus tugmasi endi streak sonini va bonus miqdorini ko'rsatadi
- Boost taymerlari (2× tanga, magnit) UI da countdown bilan ko'rsatiladi (`renderBoostTimers`)
- Profilga tashrif buyuruvchilar hisoblagichi (`profileViews` increment + display)
- Obuna bo'lganda tanga berish (5◎ subscribed shaxsga)
- Reyting filtri (hamma/haftalik/oylik) qo'shildi (`weekEarned`/`monthEarned` field lar, period reset)
- Foydalanuvchilar o'rtasida oddiy chat (Firestore `chat` collection, real-time listener)
- Do'konda avatar to'plamlari sotib olish (10 tadan yangi avatar)
- QuickEarn da boost/magnet multiplier qo'llaniladi
- `extra_daily` ×2 bonus daily reward da qo'llaniladi
- Do'st tizimi: so'rov yuborish (profil orqali), qabul qilish/rad etish, do'stlar ro'yxati
- Shaxsiy chat: do'stlar bilan alohida suhbat (`privateChats` collection, real-time)
- Chat panelida 4 ta tab: Umumiy / Do'stlar / Guruhlar / So'rovlar
- Guruh chat: guruh yaratish (+ tugmasi), a'zo qo'shish, chiqish, real-time xabarlar

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Firebase compat SDK ishlatiladi (modul emas) — mavjud IIFE pattern bilan mos
- `localStorage` bridge orqali eski o'yinlar o'zgarishsiz ishlaydi; `loadUserData` da localStorage → Firebase merge qilinadi
- Admin `createUserWithEmailAndPassword` dan keyin adminni qayta sign in qilish uchun `sessionStorage` da parol saqlanadi
- `adminDeleteUser` va `adminChangePassword` faqat Firestore dokumentini o'chiradi/ogohlantiradi (Auth Admin SDK clientda yo'q)
- Vazifalar `dailyTasks._day` kaliti orqali kunlik resetlanadi (sana bilan solishtirish)
- Streak `lastStreakDate` va `streakCount` orqali hisoblanadi (ketma-ket kunlar)
- Boost lar `boostEnd`/`magnetEnd` timestamp property lar orqali ishlaydi (30 daqiqa)
- Haftalik/oylik reyting: `weekEarned`/`monthEarned` Firestore field'lari, `checkPeriodReset` orqali reset
- Chat `chat` collection, `time` bo'yicha tartiblangan, real-time `onSnapshot`
- Do'stlar: `users/{uid}/friends/` subcollection, `friendRequests/` subcollection
- Shaxsiy chat: `privateChats/{conversationId}/messages/`, conversationId = sorted UIDs joined by `_`
- Guruhlar: `groups/{groupId}` (members array, name, avatar), `groupChats/{groupId}/messages/`

## Next Steps
- Chat xabarlarini o'chirish (admin)
- Fayl yuklash (avatar, fon rasmi) Firebase Storage ga o'tkazish
- O'yin natijalarini Firestore ga saqlash (yuqori score)
- Push notifications
- Til tanlash (O'zbek/Russian/English)
- Do'stlarni onlayn statusi (presence)
- Guruhga do'stlarni tanlab qo'shish (UID emas)

## Critical Context
- Firebase project: `zxmax-com`; apiKey: `AIzaSyAXBr7vgnGQHUUyHlIhXGwBwqfSYNYF-7o`
- Firebase SDK compat versiya 12.13.0 ishlatiladi
- `zxmax_active_profile_v1` localStorage kaliti oddiy string (UID) — o'yinlar shuni o'qiydi
- `zxmax_save_v1` va `zxmax_save_v1__<uid>` ikkala kalitga ham yoziladi (o'yinlar turli kalitlarni ishlatadi)
- Admin panelda foydalanuvchi yaratish: fake email (`username@zxmax.local`) orqali Firebase Auth da yaratiladi, keyin admin qayta login qilinadi
- In `loadUserData` localStorage merge faqat `coins` katta bo'lsa yangilanadi

## Relevant Files
- `zxmax/index.html` — Firebase SDK scriptlari, 7 panel (home, shop, earn, games, leaderboard, tasks, admin, chat), login/register/profile modal
- `zxmax/app.js` — barcha Firebase + UI logika (~1444 lines)
- `zxmax/styles.css` — CSS custom properties, task-item, p-design, shop-item, badge stillari
- `games/` — Snake, TicTacToe, NumberGuess, Reaksiya, Xotira oyini, Galaxy toysn (local)
*/

})();
