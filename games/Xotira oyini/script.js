(function () {
  var COIN_KEY = "memory_game_coins";
  var MULT_KEY = "memory_next_win_mult";
  var ZXMAX_ACTIVE_KEY = "zxmax_active_profile_v1";
  var ZXMAX_LEGACY_SAVE = "zxmax_save_v1";
  var ZXMAX_SAVE_PREFIX = "zxmax_save_v1__";

  function getZxmaxSaveKey() {
    var id = localStorage.getItem(ZXMAX_ACTIVE_KEY);
    if (id && /^[a-z0-9]+$/i.test(id)) return ZXMAX_SAVE_PREFIX + id;
    return ZXMAX_LEGACY_SAVE;
  }

  var DIFF = {
    easy: { cols: 4, rows: 4, label: "4 × 4 (oson)", baseReward: 22, id: "easy" },
    medium: { cols: 5, rows: 5, label: "5 × 5 (o‘rtacha)", baseReward: 48, id: "medium" },
    hard: { cols: 8, rows: 8, label: "8 × 8 (qiyin)", baseReward: 95, id: "hard" }
  };

  var EASY_SYMBOLS = ["🌙", "⭐", "🔥", "💎", "🎵", "🚀", "🌿", "🎯"];

  /** Emoji satrini haqiqiy belgilar bo‘yicha massivga (split("") surrogate juftliklarni sindiradi). */
  function stringToGraphemes(str) {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      try {
        var seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
        return Array.from(seg.segment(str), function (g) {
          return g.segment;
        }).filter(function (ch) {
          return ch.length > 0;
        });
      } catch (e) {}
    }
    return Array.from(str);
  }

  var GLYPHS = stringToGraphemes(
    "🌙⭐🔥💎🎵🚀🌿🎯🍎🍊🍋🍇🍉🥝🍒🫐⚽🏀🎲🎮🎨🎭🦄🦊🐸🐼🐨🦁🐯🐷🐮🦋🐢🐙🦀🐠🐬🦈🐊🦒🐪🦬🦤🦚🦜🪶🍄🌵🌴🌸🌺🌻🌼🍀⚡☄️🌈☂️❄️🔮🎪🎠🧩"
  );
  if (GLYPHS.length < 8) {
    GLYPHS = EASY_SYMBOLS.slice();
  }

  var SHOP_ITEMS = [
    {
      id: "s3",
      title: "Yulduz kuchaytirgich",
      desc: "Keyingi g‘alaba puli +50%",
      cost: 100,
      mult: true
    }
  ];

  var board = document.getElementById("board");
  var movesEl = document.getElementById("moves");
  var pairsEl = document.getElementById("pairs");
  var totalPairsEl = document.getElementById("totalPairs");
  var resetBtn = document.getElementById("resetBtn");
  var winOverlay = document.getElementById("winOverlay");
  var winMoves = document.getElementById("winMoves");
  var winEarn = document.getElementById("winEarn");
  var playAgainBtn = document.getElementById("playAgainBtn");
  var winMenuBtn = document.getElementById("winMenuBtn");
  var coinDisplay = document.getElementById("coinDisplay");
  var screenHome = document.getElementById("screenHome");
  var screenDiff = document.getElementById("screenDiff");
  var screenShop = document.getElementById("screenShop");
  var screenGame = document.getElementById("screenGame");
  var btnPlay = document.getElementById("btnPlay");
  var btnShopHome = document.getElementById("btnShopHome");
  var btnBackFromDiff = document.getElementById("btnBackFromDiff");
  var btnBackFromShop = document.getElementById("btnBackFromShop");
  var btnExitGame = document.getElementById("btnExitGame");
  var gameModeLabel = document.getElementById("gameModeLabel");
  var shopList = document.getElementById("shopList");

  var moves = 0;
  var pairsFound = 0;
  var firstPick = null;
  var lock = false;
  var currentDiff = null;
  var pairCount = 0;

  function getCoins() {
    var v = parseInt(localStorage.getItem(COIN_KEY), 10);
    return isNaN(v) ? 0 : v;
  }

  function setCoins(n) {
    localStorage.setItem(COIN_KEY, String(Math.max(0, n)));
    coinDisplay.textContent = String(getCoins());
  }

  function addCoins(delta) {
    setCoins(getCoins() + delta);
  }

  function defaultZxmaxState() {
    return {
      coins: 0,
      totalEarned: 0,
      totalSpent: 0,
      purchases: {},
      lastDaily: null,
      lastQuickEarn: 0,
      theme: "default"
    };
  }

  function loadZxmaxState() {
    try {
      var raw = localStorage.getItem(getZxmaxSaveKey());
      if (!raw) return defaultZxmaxState();
      var parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return defaultZxmaxState();
      var d = defaultZxmaxState();
      d.coins = Math.floor(Number(parsed.coins)) || 0;
      d.totalEarned = Math.floor(Number(parsed.totalEarned)) || 0;
      d.totalSpent = Math.floor(Number(parsed.totalSpent)) || 0;
      d.purchases =
        parsed.purchases && typeof parsed.purchases === "object" ? parsed.purchases : {};
      d.lastDaily = parsed.lastDaily != null ? parsed.lastDaily : null;
      d.lastQuickEarn = Number(parsed.lastQuickEarn) || 0;
      d.theme = typeof parsed.theme === "string" ? parsed.theme : "default";
      return d;
    } catch (err) {
      return defaultZxmaxState();
    }
  }

  function saveZxmaxState(zx) {
    localStorage.setItem(getZxmaxSaveKey(), JSON.stringify(zx));
  }

  /** Xotira balansidan zxmax ga (shu brauzer, localStorage). */
  function transferToZxmax(amount) {
    var n = Math.floor(Number(amount));
    if (!isFinite(n) || n <= 0) {
      return { ok: false, msg: "1 yoki undan katta butun son kiriting." };
    }
    var mem = getCoins();
    if (mem < n) {
      return { ok: false, msg: "Balans yetarli emas." };
    }
    var zx = loadZxmaxState();
    zx.coins = (Math.floor(Number(zx.coins)) || 0) + n;
    zx.totalEarned = (Math.floor(Number(zx.totalEarned)) || 0) + n;
    saveZxmaxState(zx);
    setCoins(mem - n);
    return { ok: true, msg: n + " 💰 zxmax ga o‘tkazildi." };
  }

  var toastEl = null;
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) toastEl = document.getElementById("toast");
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("toast--show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("toast--show");
    }, 2600);
  }

  function refreshTransferUi() {
    var inp = document.getElementById("transferAmount");
    var hint = document.getElementById("transferHint");
    var bal = getCoins();
    if (inp) {
      inp.max = String(Math.max(0, bal));
      if (bal <= 0) inp.value = "";
    }
    if (hint) {
      hint.textContent =
        bal > 0
          ? "Tangalar zxmax dagi hozirgi profil balansiga qo‘shiladi (u yerda «Profil» dan tanlangan)."
          : "O‘tkazish uchun avval o‘yinda 💰 yig‘ing.";
    }
  }

  function getNextMult() {
    var m = parseFloat(localStorage.getItem(MULT_KEY));
    return isNaN(m) || m < 1 ? 1 : m;
  }

  function setNextMult(m) {
    if (m <= 1) localStorage.removeItem(MULT_KEY);
    else localStorage.setItem(MULT_KEY, String(m));
  }

  function updateWallet() {
    coinDisplay.textContent = String(getCoins());
  }

  function showScreen(el) {
    [screenHome, screenDiff, screenShop, screenGame].forEach(function (s) {
      s.hidden = true;
      s.classList.remove("is-active");
    });
    el.hidden = false;
    el.classList.add("is-active");
    if (el === screenHome) {
      refreshTransferUi();
    }
  }

  function pairHue(pairId) {
    return (pairId * 37 + 17) % 360;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /** Toq katak (masalan 5×5) uchun juft sonli kartadan keyin bo‘sh joy. */
  function padDeckToGrid(deck, cols, rows) {
    var total = cols * rows;
    if (deck.length >= total) return deck;
    var nPad = total - deck.length;
    var positions = [];
    var p;
    for (p = 0; p < total; p++) {
      positions.push(p);
    }
    positions = shuffle(positions);
    var emptyAt = {};
    for (p = 0; p < nPad; p++) {
      emptyAt[positions[p]] = true;
    }
    var out = [];
    var d = 0;
    for (p = 0; p < total; p++) {
      if (emptyAt[p]) {
        out.push({ kind: "empty" });
      } else {
        out.push(deck[d++]);
      }
    }
    return out;
  }

  function buildDeckEasy() {
    var deck = EASY_SYMBOLS.concat(EASY_SYMBOLS);
    return shuffle(deck).map(function (sym) {
      return { kind: "emoji", symbol: sym };
    });
  }

  function buildDeckPairs(nPairs) {
    var ids = [];
    for (var p = 0; p < nPairs; p++) {
      ids.push(p, p);
    }
    return shuffle(ids).map(function (pairId) {
      return {
        kind: "pair",
        pairId: pairId,
        hue: pairHue(pairId),
        glyph: GLYPHS[pairId % GLYPHS.length]
      };
    });
  }

  function cardMatchKey(card) {
    if (card.dataset.kind === "emoji") return "e:" + card.dataset.symbol;
    return "p:" + card.dataset.pair;
  }

  function renderCardFace(front, cell) {
    front.style.background = "";
    front.style.borderColor = "";
    if (cell.kind === "empty") {
      return;
    }
    if (cell.kind === "emoji") {
      front.textContent = cell.symbol;
      return;
    }
    front.textContent = "";
    var glyphSpan = document.createElement("span");
    glyphSpan.className = "card__glyph";
    glyphSpan.textContent = cell.glyph;
    var numSpan = document.createElement("span");
    numSpan.className = "card__num";
    numSpan.textContent = "#" + String(cell.pairId + 1);
    front.appendChild(glyphSpan);
    front.appendChild(numSpan);
    front.style.background = "hsl(" + cell.hue + ", 38%, 18%)";
    front.style.borderColor = "hsl(" + cell.hue + ", 55%, 42%)";
  }

  function buildDeck() {
    if (currentDiff.id === "easy") return buildDeckEasy();
    return buildDeckPairs(pairCount);
  }

  function setBoardLayout() {
    board.className = "board board--" + currentDiff.id;
    board.style.gridTemplateColumns = "repeat(" + currentDiff.cols + ", 1fr)";
  }

  function updateHud() {
    movesEl.textContent = String(moves);
    pairsEl.textContent = String(pairsFound);
    totalPairsEl.textContent = String(pairCount);
  }

  function computeReward() {
    var base = currentDiff.baseReward;
    var minMoves = pairCount;
    var extra = Math.max(0, moves - minMoves);
    var denom = Math.max(pairCount * 3, 1);
    var eff = Math.max(0.35, 1 - extra / denom);
    var raw = base * (0.75 + 0.55 * eff);
    var mult = getNextMult();
    return Math.round(raw * mult);
  }

  function openWin() {
    var earned = computeReward();
    winMoves.textContent = String(moves);
    winEarn.textContent = String(earned);
    addCoins(earned);
    if (getNextMult() > 1) setNextMult(1);
    winOverlay.hidden = false;
  }

  function resetGame() {
    moves = 0;
    pairsFound = 0;
    firstPick = null;
    lock = false;
    winOverlay.hidden = true;
    updateHud();
    render();
  }

  function render() {
    board.innerHTML = "";
    setBoardLayout();
    var deck = padDeckToGrid(buildDeck(), currentDiff.cols, currentDiff.rows);
    deck.forEach(function (cell) {
      if (cell.kind === "empty") {
        var hole = document.createElement("div");
        hole.className = "board-hole";
        hole.setAttribute("aria-hidden", "true");
        board.appendChild(hole);
        return;
      }

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", "Kartochka");

      if (cell.kind === "emoji") {
        btn.dataset.kind = "emoji";
        btn.dataset.symbol = cell.symbol;
      } else {
        btn.dataset.kind = "pair";
        btn.dataset.pair = String(cell.pairId);
      }

      var back = document.createElement("span");
      back.className = "card__face card__face--back";
      var front = document.createElement("span");
      front.className = "card__face card__face--front";
      renderCardFace(front, cell);

      btn.appendChild(back);
      btn.appendChild(front);
      btn.addEventListener("click", onCardClick);
      board.appendChild(btn);
    });
  }

  function onCardClick(ev) {
    var card = ev.currentTarget;
    if (lock || card.classList.contains("is-flipped") || card.classList.contains("is-matched")) {
      return;
    }

    card.classList.add("is-flipped");

    if (!firstPick) {
      firstPick = card;
      return;
    }

    moves += 1;
    updateHud();
    lock = true;

    var a = firstPick;
    var b = card;
    firstPick = null;

    if (cardMatchKey(a) === cardMatchKey(b)) {
      pairsFound += 1;
      updateHud();
      a.classList.add("is-matched");
      b.classList.add("is-matched");
      lock = false;
      if (pairsFound === pairCount) {
        openWin();
      }
      return;
    }

    window.setTimeout(function () {
      a.classList.remove("is-flipped");
      b.classList.remove("is-flipped");
      lock = false;
    }, currentDiff.id === "hard" ? 550 : 650);
  }

  function startDifficulty(key) {
    currentDiff = DIFF[key];
    pairCount = Math.floor((currentDiff.cols * currentDiff.rows) / 2);
    gameModeLabel.textContent = currentDiff.label;
    showScreen(screenGame);
    resetGame();
  }

  function renderShop() {
    shopList.innerHTML = "";
    var coins = getCoins();
    SHOP_ITEMS.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "shop-item";
      var canBuy = coins >= item.cost;
      var info = document.createElement("div");
      info.className = "shop-item__text";
      info.innerHTML =
        "<strong>" +
        item.title +
        "</strong><br><small>" +
        item.desc +
        "</small><small> · Narxi: " +
        item.cost +
        " 💰</small>";

      var buy = document.createElement("button");
      buy.type = "button";
      buy.className = "btn btn--buy";
      buy.textContent = "Sotib olish";
      buy.disabled = !canBuy;
      buy.addEventListener("click", function () {
        if (getCoins() < item.cost) return;
        addCoins(-item.cost);
        if (item.grant) addCoins(item.grant);
        if (item.mult) setNextMult(1.5);
        renderShop();
        updateWallet();
      });

      li.appendChild(info);
      li.appendChild(buy);
      shopList.appendChild(li);
    });
  }

  btnPlay.addEventListener("click", function () {
    showScreen(screenDiff);
  });

  btnShopHome.addEventListener("click", function () {
    renderShop();
    showScreen(screenShop);
  });

  btnBackFromDiff.addEventListener("click", function () {
    showScreen(screenHome);
  });

  btnBackFromShop.addEventListener("click", function () {
    showScreen(screenHome);
  });

  btnExitGame.addEventListener("click", function () {
    winOverlay.hidden = true;
    showScreen(screenHome);
  });

  resetBtn.addEventListener("click", resetGame);

  playAgainBtn.addEventListener("click", function () {
    winOverlay.hidden = true;
    resetGame();
  });

  winMenuBtn.addEventListener("click", function () {
    winOverlay.hidden = true;
    showScreen(screenHome);
  });

  document.querySelectorAll(".diff-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = btn.getAttribute("data-diff");
      if (DIFF[d]) startDifficulty(d);
    });
  });

  var transferAmount = document.getElementById("transferAmount");
  var transferBtn = document.getElementById("transferBtn");
  var transferAllBtn = document.getElementById("transferAllBtn");
  if (transferAllBtn && transferAmount) {
    transferAllBtn.addEventListener("click", function () {
      var b = getCoins();
      transferAmount.value = b > 0 ? String(b) : "";
    });
  }
  if (transferBtn && transferAmount) {
    transferBtn.addEventListener("click", function () {
      var r = transferToZxmax(transferAmount.value);
      if (r.ok) {
        showToast(r.msg);
        transferAmount.value = "";
      } else {
        showToast(r.msg);
      }
      refreshTransferUi();
    });
  }

  updateWallet();
  refreshTransferUi();
})();
