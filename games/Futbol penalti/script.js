(function () {
  var GAME_KEY = 'football_penalty';
  var CW = 400;
  var CH = 600;
  var GOAL_LEFT = 80;
  var GOAL_RIGHT = 320;
  var GOAL_TOP = 15;
  var GOAL_BOTTOM = 90;
  var GOAL_MID = (GOAL_LEFT + GOAL_RIGHT) / 2;
  var GOAL_WIDTH = GOAL_RIGHT - GOAL_LEFT;
  var PENALTY_SPOT_X = CW / 2;
  var PENALTY_SPOT_Y = 560;
  var MAX_ROUNDS = 3;
  var PENALTIES_PER_ROUND = 5;
  var GK_SPEED = 120;
  var GK_DIVE_SPEED = 320;
  var GK_REACTION_DELAY = 0.15;

  function getCoins() { return parseInt(localStorage.getItem(GAME_KEY + '_coins') || '0', 10); }
  function setCoins(v) { localStorage.setItem(GAME_KEY + '_coins', Math.max(0, v)); }
  function addCoins(n) { setCoins(getCoins() + n); }

  function getProfile() { return localStorage.getItem('zxmax_active_profile_v1') || ''; }
  function getSaveKey() { var p = getProfile(); return p ? GAME_KEY + '_save__' + p : GAME_KEY + '_save'; }
  function loadSave() { try { return JSON.parse(localStorage.getItem(getSaveKey())) || {}; } catch (e) { return {}; } }
  function writeSave(obj) { localStorage.setItem(getSaveKey(), JSON.stringify(obj)); }

  function getPurchases() {
    var save = loadSave();
    var p = save.purchases || {};
    return {
      powerBonus: !!p.powerBonus,
      aimGuide: !!p.aimGuide,
      extraPenalty: !!p.extraPenalty
    };
  }

  function setPurchases(p) {
    var save = loadSave();
    save.purchases = { powerBonus: !!p.powerBonus, aimGuide: !!p.aimGuide, extraPenalty: !!p.extraPenalty };
    writeSave(save);
  }

  var SHOP_ITEMS = [
    { id: 'powerBonus', title: 'Kuchli tepish', desc: 'To\'p tezroq uchadi', cost: 100 },
    { id: 'aimGuide', title: 'Aniq mo\'ljal', desc: 'Yo\'nalish chizig\'i ko\'rinadi', cost: 60 },
    { id: 'extraPenalty', title: 'Qo\'shimcha urinish', desc: 'Har raundda +1 penalti', cost: 80 }
  ];

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var coinDisplay = document.getElementById('coinDisplay');
  var screenHome = document.getElementById('screenHome');
  var screenGame = document.getElementById('screenGame');
  var overlay = document.getElementById('gameOverOverlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlayText = document.getElementById('overlayText');
  var btnPlay = document.getElementById('btnPlay');
  var btnExit = document.getElementById('btnExitGame');
  var btnRestart = document.getElementById('btnRestart');
  var btnHome = document.getElementById('btnHome');
  var roundDisplay = document.getElementById('roundDisplay');
  var penaltyDisplay = document.getElementById('penaltyDisplay');
  var goalsDisplay = document.getElementById('goalsDisplay');
  var shopList = document.getElementById('shopList');
  var toastEl = document.getElementById('toast');

  var round = 1;
  var penalty = 1;
  var maxPenalties = PENALTIES_PER_ROUND;
  var goalsThisRound = 0;
  var goalsPerRound = [0, 0, 0];
  var totalGoals = 0;
  var roundCoinsEarned = 0;
  var totalCoinsEarned = 0;
  var currentRoundGoals = 0;
  var isRoundOver = false;

  var gkX = GOAL_MID;
  var gkDir = 1;
  var gkMoving = false;
  var gkDiving = false;
  var gkDiveStartX = GOAL_MID;
  var gkDiveTargetX = GOAL_MID;
  var gkDiveTimer = 0;
  var gkReactionRemaining = 0;

  var ballX = PENALTY_SPOT_X;
  var ballY = PENALTY_SPOT_Y;
  var ballTargetX = GOAL_MID;
  var ballTargetY = GOAL_TOP + 10;
  var ballSpeed = 0;
  var ballStartX = PENALTY_SPOT_X;
  var ballStartY = PENALTY_SPOT_Y;
  var ballFlightProgress = 0;
  var ballInFlight = false;

  var aimX = -1;
  var aimY = -1;
  var aiming = false;

  var power = 0;
  var powerDir = 1;
  var powerLocked = false;
  var powerCharging = false;

  var resultTimer = 0;
  var resultText = '';
  var shotResult = '';

  var roundIntroTimer = 0;
  var roundSummaryTimer = 0;
  var roundSummaryCoins = 0;

  var state = 'home';
  var animId = null;
  var lastTime = 0;
  var toastTimer = null;
  var purchases = getPurchases();

  function random(min, max) { return Math.random() * (max - min) + min; }

  function getMaxPenalties() { return PENALTIES_PER_ROUND + (purchases.extraPenalty ? 1 : 0); }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('toast--show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('toast--show'); }, 2600);
  }

  function updateWallet() { coinDisplay.textContent = String(getCoins()); }

  function showScreen(el) {
    [screenHome, screenGame].forEach(function (s) { s.hidden = true; s.classList.remove('is-active'); });
    el.hidden = false;
    el.classList.add('is-active');
  }

  function updateHud() {
    roundDisplay.textContent = round + ' / ' + MAX_ROUNDS;
    penaltyDisplay.textContent = penalty + ' / ' + maxPenalties;
    goalsDisplay.textContent = currentRoundGoals;
  }

  function startRound() {
    state = 'roundIntro';
    roundIntroTimer = 1.5;
    penalty = 1;
    maxPenalties = getMaxPenalties();
    goalsThisRound = 0;
    currentRoundGoals = 0;
    isRoundOver = false;
    roundCoinsEarned = 0;
    updateHud();
  }

  function startPenalty() {
    state = 'aiming';
    gkX = GOAL_MID + random(-40, 40);
    gkDir = Math.random() > 0.5 ? 1 : -1;
    gkMoving = true;
    gkDiving = false;
    aimX = -1;
    aimY = -1;
    aiming = false;
    power = 0;
    powerDir = 1;
    powerLocked = false;
    powerCharging = false;
    ballX = PENALTY_SPOT_X;
    ballY = PENALTY_SPOT_Y;
    ballInFlight = false;
    ballFlightProgress = 0;
    resultText = '';
    shotResult = '';
    updateHud();
  }

  function endRound() {
    isRoundOver = true;
    goalsPerRound[round - 1] = currentRoundGoals;
    var bonus = currentRoundGoals >= 4 ? 5 : 0;
    var matchBonus = 3;
    var earned = currentRoundGoals * 2 + bonus + matchBonus;
    addCoins(earned);
    totalCoinsEarned += earned;
    roundCoinsEarned = earned;
    state = 'roundSummary';
    roundSummaryTimer = 2.5;
    roundSummaryCoins = earned;
    totalGoals += currentRoundGoals;
  }

  function endGame() {
    state = 'gameOver';
    var total = 0;
    for (var i = 0; i < MAX_ROUNDS; i++) total += goalsPerRound[i];
    var html = '<strong>' + total + '</strong> gol<br>';
    html += 'Jami yig\'ilgan: <strong>+' + totalCoinsEarned + '</strong> 💰';
    overlayTitle.textContent = 'O\'yin tugadi!';
    overlayText.innerHTML = html;
    overlay.hidden = false;
  }

  function makeSaveCheck(targetX) {
    var gkFinalX = gkX;
    if (gkDiving || (gkReactionRemaining > 0)) {
      var diveProgress = Math.max(0, Math.min(1, (gkDiveTimer - GK_REACTION_DELAY) / 0.25));
      gkFinalX = gkDiveStartX + (gkDiveTargetX - gkDiveStartX) * diveProgress;
    }
    return Math.abs(gkFinalX - targetX) < 22;
  }

  function handleCanvasClick(e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var clientX = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    var clientY = e.touches ? e.touches[0].clientY : (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
    var cx = (clientX - rect.left) * scaleX;
    var cy = (clientY - rect.top) * scaleY;

    if (state === 'aiming') {
      if (cx >= GOAL_LEFT && cx <= GOAL_RIGHT && cy >= GOAL_TOP - 5 && cy <= GOAL_BOTTOM + 10) {
        aimX = Math.max(GOAL_LEFT + 5, Math.min(GOAL_RIGHT - 5, cx));
        aimY = Math.max(GOAL_TOP + 5, Math.min(GOAL_BOTTOM + 5, cy));
        aiming = true;
        state = 'power';
        power = 0;
        powerDir = 1;
        powerLocked = false;
        powerCharging = true;
      }
    } else if (state === 'power') {
      if (!powerLocked) {
        powerLocked = true;
        powerCharging = false;
        kickBall();
      }
    }
  }

  function kickBall() {
    state = 'kicking';
    ballTargetX = aimX;
    ballTargetY = GOAL_TOP + 5;
    ballStartX = PENALTY_SPOT_X;
    ballStartY = PENALTY_SPOT_Y;
    ballFlightProgress = 0;
    ballInFlight = true;

    var powerFactor = purchases.powerBonus ? 1.5 : 1;
    ballSpeed = (power * 0.08 + 3) * powerFactor;

    gkDiving = true;
    gkDiveStartX = gkX;
    gkDiveTargetX = ballTargetX;
    gkDiveTimer = 0;
    gkReactionRemaining = GK_REACTION_DELAY;
    gkMoving = false;
  }

  function update(dt) {
    if (dt > 0.1) dt = 0.1;

    if (state === 'roundIntro') {
      roundIntroTimer -= dt;
      if (roundIntroTimer <= 0) startPenalty();
      return;
    }

    if (state === 'aiming') {
      if (gkMoving) {
        gkX += GK_SPEED * dt * gkDir;
        if (gkX >= GOAL_RIGHT - 30) { gkX = GOAL_RIGHT - 30; gkDir = -1; }
        if (gkX <= GOAL_LEFT + 30) { gkX = GOAL_LEFT + 30; gkDir = 1; }
      }
      return;
    }

    if (state === 'power') {
      if (powerCharging && !powerLocked) {
        power += 80 * dt * powerDir;
        if (power >= 100) { power = 100; powerDir = -1; }
        if (power <= 0) { power = 0; powerDir = 1; }
      }
      return;
    }

    if (state === 'kicking') {
      if (gkDiving) {
        gkDiveTimer += dt;
        if (gkReactionRemaining > 0) {
          gkReactionRemaining -= dt;
          if (gkReactionRemaining <= 0) gkReactionRemaining = 0;
        } else {
          var diveSpeed = GK_DIVE_SPEED + random(-20, 20);
          var dx = gkDiveTargetX - gkX;
          var dist = Math.abs(dx);
          if (dist > 2) {
            var step = diveSpeed * dt;
            if (step >= dist) { gkX = gkDiveTargetX; }
            else { gkX += Math.sign(dx) * step; }
          }
        }
      }

      ballFlightProgress += ballSpeed * dt;
      if (ballFlightProgress >= 1) ballFlightProgress = 1;
      var t = ballFlightProgress;
      ballX = ballStartX + (ballTargetX - ballStartX) * t;
      ballY = ballStartY + (ballTargetY - ballStartY) * t;

      if (ballFlightProgress >= 1) {
        ballInFlight = false;
        var saved = makeSaveCheck(ballTargetX);
        if (saved) {
          shotResult = 'SAVED!';
          resultText = 'Saqlab qoldi!';
        } else {
          shotResult = 'GOAL!';
          resultText = 'Gol!';
          currentRoundGoals++;
          goalsThisRound++;
        }
        state = 'result';
        resultTimer = 1.8;
      }
      return;
    }

    if (state === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0) {
        if (penalty >= maxPenalties) {
          endRound();
        } else {
          penalty++;
          startPenalty();
        }
      }
      return;
    }

    if (state === 'roundSummary') {
      roundSummaryTimer -= dt;
      if (roundSummaryTimer <= 0) {
        if (round >= MAX_ROUNDS) {
          endGame();
        } else {
          round++;
          startRound();
        }
      }
      return;
    }
  }

  function drawField() {
    var grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, '#1a4a1a');
    grad.addColorStop(1, '#0f2f0f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 30);
      ctx.lineTo(CW, i * 30);
      ctx.stroke();
    }
    for (var j = 0; j < 14; j++) {
      ctx.beginPath();
      ctx.moveTo(j * 30, 0);
      ctx.lineTo(j * 30, CH);
      ctx.stroke();
    }
  }

  function drawPenaltyArea() {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(GOAL_LEFT - 20, GOAL_BOTTOM, GOAL_WIDTH + 40, 180);
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(GOAL_LEFT - 50, GOAL_BOTTOM, GOAL_WIDTH + 100, 120);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(PENALTY_SPOT_X, PENALTY_SPOT_Y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(PENALTY_SPOT_X, GOAL_BOTTOM + 120, 60, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGoal() {
    var postW = 6;
    var postH = GOAL_BOTTOM - GOAL_TOP;

    ctx.shadowColor = 'rgba(255,255,255,0.15)';
    ctx.shadowBlur = 12;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(GOAL_LEFT - postW, GOAL_TOP - 4, postW, postH + 4);
    ctx.fillRect(GOAL_RIGHT, GOAL_TOP - 4, postW, postH + 4);
    ctx.fillRect(GOAL_LEFT - postW, GOAL_TOP - 4, GOAL_WIDTH + postW * 2, 5);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    var netRows = 6;
    var netCols = 10;
    var netH = (GOAL_BOTTOM - GOAL_TOP) / netRows;
    var netW = (GOAL_RIGHT - GOAL_LEFT) / netCols;
    for (var r = 0; r <= netRows; r++) {
      ctx.beginPath();
      ctx.moveTo(GOAL_LEFT, GOAL_TOP + r * netH);
      ctx.lineTo(GOAL_RIGHT, GOAL_TOP + r * netH);
      ctx.stroke();
    }
    for (var c = 0; c <= netCols; c++) {
      ctx.beginPath();
      ctx.moveTo(GOAL_LEFT + c * netW, GOAL_TOP);
      ctx.lineTo(GOAL_LEFT + c * netW, GOAL_BOTTOM);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(GOAL_LEFT, GOAL_TOP, GOAL_RIGHT - GOAL_LEFT, GOAL_BOTTOM - GOAL_TOP);
  }

  function drawGoalkeeper() {
    var gkDrawX = gkX;
    var gkW = 24;
    var gkH = 32;
    var gkY = GOAL_TOP + (GOAL_BOTTOM - GOAL_TOP) / 2 - gkH / 2;

    if (state === 'kicking' || state === 'result') {
      if (gkDiving) {
        var progress = Math.min(1, (gkDiveTimer - GK_REACTION_DELAY) / 0.3);
        if (progress < 0) progress = 0;
        gkDrawX = gkDiveStartX + (gkDiveTargetX - gkDiveStartX) * Math.min(1, progress);
      }
    }

    ctx.shadowColor = 'rgba(255,200,50,0.3)';
    ctx.shadowBlur = 14;

    ctx.fillStyle = '#ffcc33';
    ctx.beginPath();
    ctx.roundRect(gkDrawX - gkW / 2, gkY, gkW, gkH, 4);
    ctx.fill();

    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.roundRect(gkDrawX - gkW / 2 + 3, gkY + 6, 4, 6, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(gkDrawX + gkW / 2 - 7, gkY + 6, 4, 6, 2);
    ctx.fill();

    ctx.fillStyle = '#ee8800';
    ctx.beginPath();
    ctx.roundRect(gkDrawX - gkW / 2 + 2, gkY + gkH - 8, gkW - 4, 6, 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#cc6600';
    ctx.beginPath();
    ctx.arc(gkDrawX - 5, gkY + 4, 3, 0, Math.PI * 2);
    ctx.arc(gkDrawX + 5, gkY + 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBall() {
    var bx = ballX;
    var by = ballY;
    var radius = 7;

    if (ballInFlight || state === 'result') {
      bx = ballX;
      by = ballY;
      if (state === 'result' && ballFlightProgress < 1) {
        var t = ballFlightProgress;
        bx = ballStartX + (ballTargetX - ballStartX) * t;
        by = ballStartY + (ballTargetY - ballStartY) * t;
      }
    }

    ctx.shadowColor = 'rgba(255,255,255,0.2)';
    ctx.shadowBlur = 10;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bx - 4, by - 4);
    ctx.lineTo(bx + 4, by + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 4, by - 4);
    ctx.lineTo(bx - 4, by + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 5, by);
    ctx.lineTo(bx + 5, by);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  function drawAimMarker() {
    if (state === 'power' && aimX >= 0) {
      ctx.shadowColor = 'rgba(255,50,50,0.5)';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(aimX, aimY, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(aimX - 14, aimY);
      ctx.lineTo(aimX + 14, aimY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(aimX, aimY - 14);
      ctx.lineTo(aimX, aimY + 14);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (purchases.aimGuide && aimX >= 0 && (state === 'power' || state === 'kicking' || state === 'result')) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(PENALTY_SPOT_X, PENALTY_SPOT_Y);
      ctx.lineTo(aimX, aimY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawPowerBar() {
    if (state !== 'power' && state !== 'kicking') return;
    if (state === 'power' && !powerLocked) {
      var barX = CW - 25;
      var barY = CH / 2 - 80;
      var barW = 14;
      var barH = 160;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(barX, barY, barW, barH);

      var fillH = (power / 100) * (barH - 4);
      var r = Math.min(255, Math.floor(power * 2.55));
      var g = Math.min(255, Math.floor((100 - power) * 2.55));
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',50)';
      ctx.fillRect(barX + 2, barY + barH - fillH - 2, barW - 4, fillH);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '10px ' + getComputedStyle(document.body).getPropertyValue('--mono').trim() || 'monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(power) + '%', barX + barW / 2, barY + barH + 14);
    }
  }

  function drawRoundIntro() {
    if (state !== 'roundIntro') return;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#3ecf8e';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(62,207,142,0.5)';
    ctx.shadowBlur = 30;
    ctx.fillText('Raund ' + round, CW / 2, CH / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '16px Outfit, sans-serif';
    ctx.fillText(maxPenalties + ' ta penalti', CW / 2, CH / 2 + 30);
  }

  function drawResult() {
    if (state !== 'result') return;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, CW, CH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (shotResult === 'GOAL!') {
      ctx.fillStyle = '#3ecf8e';
      ctx.shadowColor = 'rgba(62,207,142,0.6)';
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = 'rgba(255,68,68,0.6)';
    }
    ctx.shadowBlur = 30;
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText(shotResult, CW / 2, CH / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '16px Outfit, sans-serif';
    ctx.fillText(resultText, CW / 2, CH / 2 + 25);
  }

  function drawRoundSummary() {
    if (state !== 'roundSummary') return;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, CW, CH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3ecf8e';
    ctx.shadowColor = 'rgba(62,207,142,0.5)';
    ctx.shadowBlur = 24;
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText('Raund ' + round + ' tugadi!', CW / 2, CH / 2 - 50);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8ecf1';
    ctx.font = '18px Outfit, sans-serif';
    ctx.fillText('Gollar: ' + currentRoundGoals + ' / ' + maxPenalties, CW / 2, CH / 2);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 20px JetBrains Mono, monospace';
    var bonus = currentRoundGoals >= 4 ? 5 : 0;
    var detail = '+' + (currentRoundGoals * 2);
    if (bonus > 0) detail += ' (+' + bonus + ' bonus)';
    detail += ' (+3 match)';
    ctx.fillText(detail, CW / 2, CH / 2 + 45);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 24px JetBrains Mono, monospace';
    ctx.fillText('+' + roundSummaryCoins + ' 💰', CW / 2, CH / 2 + 90);
  }

  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawField();
    drawPenaltyArea();
    drawGoal();
    drawAimMarker();
    drawGoalkeeper();
    drawBall();
    drawPowerBar();
    drawRoundIntro();
    drawResult();
    drawRoundSummary();
  }

  function loop(time) {
    if (!lastTime) lastTime = time;
    var dt = (time - lastTime) / 1000;
    lastTime = time;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  function startAnim() {
    if (animId) return;
    lastTime = 0;
    animId = requestAnimationFrame(loop);
  }

  function stopAnim() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  canvas.addEventListener('mousedown', handleCanvasClick);
  canvas.addEventListener('touchstart', handleCanvasClick, { passive: false });

  function startGame() {
    round = 1;
    penalty = 1;
    maxPenalties = getMaxPenalties();
    currentRoundGoals = 0;
    totalGoals = 0;
    totalCoinsEarned = 0;
    goalsPerRound = [0, 0, 0];
    overlay.hidden = true;
    showScreen(screenGame);
    startRound();
    startAnim();
  }

  function exitToMenu() {
    stopAnim();
    state = 'home';
    overlay.hidden = true;
    showScreen(screenHome);
    updateWallet();
  }

  btnPlay.addEventListener('click', function () { purchases = getPurchases(); startGame(); });
  btnExit.addEventListener('click', exitToMenu);
  btnRestart.addEventListener('click', function () { purchases = getPurchases(); overlay.hidden = true; startGame(); });
  btnHome.addEventListener('click', function () { overlay.hidden = true; exitToMenu(); });

  function renderShop() {
    shopList.innerHTML = '';
    var coins = getCoins();
    purchases = getPurchases();
    SHOP_ITEMS.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'shop-item';
      var owned = !!purchases[item.id];
      var canBuy = coins >= item.cost && !owned;
      var info = document.createElement('div');
      info.className = 'shop-item__text';
      info.innerHTML = '<strong>' + item.title + '</strong><small>' + item.desc + '</small><small> \xB7 Narxi: ' + item.cost + ' 💰</small>';
      var buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn btn--buy';
      buy.textContent = owned ? 'Sotib olingan' : 'Sotib olish';
      buy.disabled = !canBuy;
      buy.addEventListener('click', function () {
        if (getCoins() < item.cost || owned) return;
        addCoins(-item.cost);
        var p = getPurchases();
        p[item.id] = true;
        setPurchases(p);
        purchases = getPurchases();
        renderShop();
        updateWallet();
        showToast(item.title + ' sotib olindi!');
      });
      li.appendChild(info);
      li.appendChild(buy);
      shopList.appendChild(li);
    });
  }

  var transferAmount = document.getElementById('transferAmount');
  var transferBtn = document.getElementById('transferBtn');
  var transferAllBtn = document.getElementById('transferAllBtn');
  var transferHint = document.getElementById('transferHint');

  function getZxmaxSaveKey() {
    var id = localStorage.getItem('zxmax_active_profile_v1');
    if (id && /^[a-z0-9]+$/i.test(id)) return 'zxmax_save_v1__' + id;
    return 'zxmax_save_v1';
  }

  function defaultZxmaxState() {
    return { coins: 0, totalEarned: 0, totalSpent: 0, purchases: {}, lastDaily: null, lastQuickEarn: 0, theme: 'default' };
  }

  function loadZxmaxState() {
    try {
      var raw = localStorage.getItem(getZxmaxSaveKey());
      if (!raw) return defaultZxmaxState();
      var parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return defaultZxmaxState();
      var d = defaultZxmaxState();
      d.coins = Math.floor(Number(parsed.coins)) || 0;
      d.totalEarned = Math.floor(Number(parsed.totalEarned)) || 0;
      d.totalSpent = Math.floor(Number(parsed.totalSpent)) || 0;
      d.purchases = parsed.purchases && typeof parsed.purchases === 'object' ? parsed.purchases : {};
      d.lastDaily = parsed.lastDaily != null ? parsed.lastDaily : null;
      d.lastQuickEarn = Number(parsed.lastQuickEarn) || 0;
      d.theme = typeof parsed.theme === 'string' ? parsed.theme : 'default';
      return d;
    } catch (e) { return defaultZxmaxState(); }
  }

  function saveZxmaxState(zx) { localStorage.setItem(getZxmaxSaveKey(), JSON.stringify(zx)); }

  function transferToZxmax(amount) {
    var n = Math.floor(Number(amount));
    if (!isFinite(n) || n <= 0) return { ok: false, msg: '1 yoki undan katta butun son kiriting.' };
    var bal = getCoins();
    if (bal < n) return { ok: false, msg: 'Balans yetarli emas.' };
    var fee = Math.ceil(n * 0.1);
    var net = n - fee;
    var zx = loadZxmaxState();
    zx.coins = (Math.floor(Number(zx.coins)) || 0) + net;
    zx.totalEarned = (Math.floor(Number(zx.totalEarned)) || 0) + net;
    saveZxmaxState(zx);
    setCoins(bal - n);
    return { ok: true, msg: net + ' 💰 zxmax ga o\'tkazildi (10% komissiya: ' + fee + ').' };
  }

  function refreshTransferUi() {
    var bal = getCoins();
    if (transferAmount) { transferAmount.max = String(Math.max(0, bal)); if (bal <= 0) transferAmount.value = ''; }
    if (transferHint) {
      transferHint.textContent = bal > 0 ? 'Tangalar zxmax profil balansiga qo\'shiladi.' : 'O\'tkazish uchun avval o\'yinda 💰 yig\'ing.';
    }
  }

  if (transferAllBtn && transferAmount) {
    transferAllBtn.addEventListener('click', function () {
      var b = getCoins();
      transferAmount.value = b > 0 ? String(b) : '';
    });
  }
  if (transferBtn && transferAmount) {
    transferBtn.addEventListener('click', function () {
      var r = transferToZxmax(transferAmount.value);
      if (r.ok) { showToast(r.msg); transferAmount.value = ''; }
      else { showToast(r.msg); }
      refreshTransferUi();
      updateWallet();
    });
  }

  renderShop();
  updateWallet();
  refreshTransferUi();
})();
