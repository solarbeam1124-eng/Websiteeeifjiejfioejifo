// Rhythm Dash — enhanced runner with fades, parallax, squash/stretch, particles, and reliable audio.
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlayEl = document.getElementById('overlay');
  const statusEl = document.getElementById('status');
  const beatBar = document.getElementById('beatbar');

  const W = canvas.width, H = canvas.height;

  // Levels and overlays
  const levels = [
    {
      id: 1, name: 'Level 1', audio: 'level1.mp3', bpm: 120,
      map: makeFlatWithSpikes(320, [60, 120, 180, 240, 300]),
      overlay: {
        year: '2006',
        text: 'Early Roblox era: basic UI, blocky avatars, physics-focused beginnings.',
        fadeStartX: 700, fadeEndX: 2200
      }
    },
    {
      id: 2, name: 'Level 2', audio: 'level2.mp3', bpm: 128,
      map: makeFlatWithSpikes(340, [70, 140, 200, 260, 320]),
      overlay: {
        year: '2008',
        text: 'Image Modding, first Eggstravaganza, Builders Club via PayPal.',
        fadeStartX: 700, fadeEndX: 2200
      }
    },
    {
      id: 3, name: 'Level 3', audio: 'level3.mp3', bpm: 110,
      map: makeFlatWithSpikes(360, [60, 110, 170, 230, 290, 350]),
      overlay: {
        year: '2016',
        text: 'Xbox release, Microsoft Store app, R15 avatar updates.',
        fadeStartX: 700, fadeEndX: 2200
      }
    },
    {
      id: 4, name: 'Level 4', audio: 'level4.mp3', bpm: 122,
      map: makeFlatWithSpikes(380, [80, 160, 220, 280, 340]),
      overlay: {
        year: '2018',
        text: 'MeepCity 1B visits; clearer “Public/Private”; dev roadmap transparency.',
        fadeStartX: 700, fadeEndX: 2200
      }
    },
    {
      id: 5, name: 'Level 5', audio: 'level5.mp3', bpm: 118,
      map: makeFlatWithSpikes(400, [90, 170, 240, 310, 380]),
      overlay: {
        year: '2025',
        text: 'Safety and scale: age checks for chat, engine optimizations, growth at RDC.',
        fadeStartX: 700, fadeEndX: 2200
      }
    }
  ];

  // Helpers
  function makeFlatWithSpikes(len, spikeCols) {
    const m = new Array(len).fill(1); // all ground
    spikeCols.forEach(c => { if (c >= 5 && c < len-2) m[c] = 2; });
    return m;
  }

  // Parallax stars
  const starLayers = [
    { count: 60, speed: 0.4, color: '#95b8ff', stars: [] },
    { count: 40, speed: 0.8, color: '#cfe1ff', stars: [] },
    { count: 20, speed: 1.2, color: '#ffffff', stars: [] }
  ];
  function initStars() {
    starLayers.forEach(layer => {
      layer.stars = [];
      for (let i=0;i<layer.count;i++) {
        layer.stars.push({
          x: Math.random()*W,
          y: Math.random()*H,
          r: Math.random()*1.6 + 0.4
        });
      }
    });
  }
  initStars();

  // Fade transition
  const fade = {
    opacity: 0,
    target: 0,
    speed: 0.05, // per frame
    active: false
  };
  function startFade(toOpacity, callback) {
    fade.target = toOpacity;
    fade.active = true;
    fade.callback = callback || null;
  }
  function updateFade() {
    if (!fade.active) return;
    const diff = fade.target - fade.opacity;
    if (Math.abs(diff) < 0.02) {
      fade.opacity = fade.target;
      fade.active = false;
      if (fade.callback) {
        const cb = fade.callback;
        fade.callback = null;
        cb();
      }
    } else {
      fade.opacity += Math.sign(diff) * fade.speed;
    }
  }
  function drawFade() {
    if (fade.opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = fade.opacity;
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  // Game state
  const state = {
    levelIndex: 0,
    player: { x: 140, y: H - 120, vy: 0, w: 32, h: 32, onGround: true, alive: true, scaleX: 1, scaleY: 1, squashT: 0 },
    scrollX: 0,
    speed: 3.2,
    gravity: 0.6,
    jumpStrength: 10.5,
    audioEl: null,
    audioCtx: null,
    nextBeatTime: 0,
    beatIntervalSec: 0,
    beatAssistWindow: 0.14,
    beatOn: false,
    inGame: false
  };

  // Particles
  const particles = [];
  function spawnParticles(x,y,color,amount=12,spread=4) {
    for (let i=0;i<amount;i++) {
      particles.push({
        x, y,
        vx: (Math.random()-0.5)*spread,
        vy: (Math.random()-0.5)*spread - Math.random()*1.5,
        life: 28 + Math.random()*12,
        color
      });
    }
  }
  function updateParticles() {
    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 1;
    }
    for (let i=particles.length-1;i>=0;i--) {
      if (particles[i].life <= 0) particles.splice(i,1);
    }
  }
  function drawParticles() {
    ctx.save();
    for (let p of particles) {
      ctx.globalAlpha = Math.max(0, p.life/40);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.restore();
  }

  // Controls
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') doJump();
    if (e.code === 'KeyR') restartLevel();
    if (e.code === 'KeyN') nextLevel();
    if (e.code === 'Escape') {
      // Fade back to menu
      startFade(1, () => {
        stopAudio();
        state.inGame = false;
        overlayEl.classList.add('hidden');
        statusEl.textContent = 'Menu';
        showMenu();
        startFade(0);
      });
    }
    // Resume audio context for autoplay policies
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume().catch(()=>{});
    }
  });

  canvas.addEventListener('pointerdown', () => {
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume().catch(()=>{});
    }
  });

  function doJump() {
    if (state.player.onGround && state.player.alive && state.inGame) {
      const now = state.audioCtx ? state.audioCtx.currentTime : 0;
      const distToBeat = Math.abs(now - state.nextBeatTime);
      const assist = distToBeat < state.beatAssistWindow ? 1.15 : 1.0;
      state.player.vy = -state.jumpStrength * assist;
      state.player.onGround = false;
      // squash/stretch
      state.player.squashT = 1;
      spawnParticles(state.player.x + state.player.w/2, state.player.y + state.player.h, '#87c6ff', 16, 5);
    }
  }

  function restartLevel() { if (state.inGame) loadLevel(state.levelIndex); }
  function nextLevel() {
    if (!state.inGame) return;
    state.levelIndex = Math.min(levels.length - 1, state.levelIndex + 1);
    startFade(1, () => { loadLevel(state.levelIndex); startFade(0); });
  }

  // Audio handling
  function stopAudio() {
    try { if (state.audioEl) { state.audioEl.pause(); state.audioEl.src = ''; } } catch {}
    state.audioEl = null;
  }

  async function playAudio(src, bpm) {
    stopAudio();
    state.audioEl = new Audio(src);
    state.audioEl.loop = false;

    // Web Audio for timing/beat
    try {
      state.audioCtx = state.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const track = state.audioCtx.createMediaElementSource(state.audioEl);
      track.connect(state.audioCtx.destination);
      state.beatIntervalSec = 60 / bpm;
      state.nextBeatTime = (state.audioCtx.currentTime || 0) + state.beatIntervalSec;
    } catch {
      state.audioCtx = null;
    }

    // Try to play; if blocked, show status
    try {
      await state.audioEl.play();
      statusEl.textContent = 'Audio playing';
    } catch {
      statusEl.textContent = 'Tap or press Space/Enter to start audio (autoplay blocked).';
    }
  }

  function updateBeat() {
    if (!state.audioCtx) return;
    const now = state.audioCtx.currentTime;
    if (now >= state.nextBeatTime) {
      state.nextBeatTime += state.beatIntervalSec;
      pulseBeat();
    }
    // Visual beat proximity
    const dist = Math.abs(now - state.nextBeatTime);
    state.beatOn = dist < state.beatAssistWindow;
    if (beatBar) beatBar.classList.toggle('on', state.beatOn);
  }

  function pulseBeat() {
    if (!beatBar) return;
    beatBar.classList.add('on');
    setTimeout(() => beatBar.classList.remove('on'), 120);
  }

  // Level load
  async function loadLevel(ix) {
    const lvl = levels[ix];
    state.scrollX = 0;
    state.player.x = 140; state.player.y = H - 120;
    state.player.vy = 0; state.player.onGround = true; state.player.alive = true;
    state.player.scaleX = 1; state.player.scaleY = 1; state.player.squashT = 0;
    overlayEl.classList.add('hidden');
    overlayEl.innerHTML = `<div class="year">${lvl.overlay.year}</div><div class="text">${lvl.overlay.text}</div>`;
    statusEl.textContent = `${lvl.name} · BPM ${lvl.bpm} · Space to jump`;
    await playAudio(lvl.audio, lvl.bpm);
    state.inGame = true;
  }

  // Collision helpers
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function tileAt(px) {
    const tileSize = 40;
    const col = Math.floor((px + state.scrollX) / tileSize);
    const lvl = levels[state.levelIndex];
    if (col < 0 || col >= lvl.map.length) return 0;
    return lvl.map[col];
  }

  // Parallax draw
  function drawParallaxBackground(t) {
    // Gradient base
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, '#0c1020');
    g.addColorStop(1, '#101734');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // Star layers drifting left
    starLayers.forEach((layer, idx) => {
      ctx.save();
      ctx.globalAlpha = 0.25 + idx*0.15;
      ctx.fillStyle = layer.color;
      for (let s of layer.stars) {
        const sx = (s.x - state.scrollX * layer.speed * 0.02) % W;
        const sy = s.y;
        ctx.beginPath();
        ctx.arc((sx+W)%W, sy, s.r, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Waves near horizon
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#4da1ff';
    for (let i=0;i<3;i++) {
      const y = H-160 + i*30 + Math.sin(t*1.2 + i)*6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x=0; x<=W; x+=30) {
        const yy = y + Math.sin((x+state.scrollX*0.1)/120 + i)*6;
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(W, H); ctx.lineTo(0,H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Render
  function draw(t) {
    drawParallaxBackground(t);

    // Ground and spikes
    const tileSize = 40;
    const lvl = levels[state.levelIndex];
    const colsOnScreen = Math.ceil(W / tileSize) + 2;
    const startCol = Math.floor(state.scrollX / tileSize);
    for (let c = startCol; c < startCol + colsOnScreen; c++) {
      const tval = lvl.map[c] || 0;
      const x = Math.floor(c * tileSize - state.scrollX);
      if (tval === 1) {
        // ground block
        ctx.fillStyle = '#223057';
        ctx.fillRect(x, H-80, tileSize, 80);
        // top bevel
        ctx.fillStyle = '#2e3e70';
        ctx.fillRect(x, H-82, tileSize, 2);
      }
      if (tval === 2) {
        // spike
        ctx.fillStyle = '#a7baff';
        ctx.beginPath();
        ctx.moveTo(x + tileSize/2, H-80-36);
        ctx.lineTo(x + 6, H-80);
        ctx.lineTo(x + tileSize-6, H-80);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Player with squash/stretch and idle bounce
    const p = state.player;
    const idleBounce = p.onGround ? Math.sin(t*6)*1.0 : 0;
    const squash = p.squashT > 0 ? Math.max(0.85, 1 - p.squashT*0.15) : 1;
    const stretch = p.squashT > 0 ? Math.min(1.20, 1 + p.squashT*0.20) : 1;
    p.scaleX = squash;
    p.scaleY = stretch;

    ctx.save();
    ctx.translate(p.x + p.w/2, p.y + p.h/2 + idleBounce);
    ctx.scale(p.scaleX, p.scaleY);
    ctx.translate(-p.w/2, -p.h/2);

    // body
    ctx.fillStyle = '#4da1ff';
    ctx.fillRect(0, 0, p.w, p.h);
    // face
    ctx.fillStyle = '#0d2440';
    ctx.fillRect(8, 10, 6, 6);
    ctx.fillRect(p.w - 14, 10, 6, 6);
    ctx.beginPath();
    ctx.arc(p.w/2, p.h - 10, 8, 0, Math.PI, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0d2440';
    ctx.stroke();
    ctx.restore();

    drawParticles();

    // Lose overlay
    if (!state.player.alive) {
      ctx.fillStyle = 'rgba(15,19,32,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#eaf0ff';
      ctx.font = 'bold 26px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Ouch! Press R to retry or N for next level', W/2, 260);
    }

    drawFade();
  }

  // Update loop
  let time = 0;
  function update() {
    time += 1/60;
    updateFade();
    updateBeat();
    updateParticles();

    if (!state.inGame || !state.player.alive) return;

    // scroll
    state.scrollX += state.speed;

    // gravity
    state.player.vy += state.gravity;
    state.player.y += state.player.vy;

    // squash decay
    if (state.player.squashT > 0) state.player.squashT = Math.max(0, state.player.squashT - 0.08);

    // ground collision
    const groundY = H - 80 - state.player.h;
    if (state.player.y >= groundY) {
      if (!state.player.onGround) {
        // landing puff
        spawnParticles(state.player.x + state.player.w/2, state.player.y + state.player.h, '#6fb6ff', 10, 4);
      }
      state.player.y = groundY;
      state.player.vy = 0;
      state.player.onGround = true;
    } else {
      state.player.onGround = false;
    }

    // Spike collision
    const tileSize = 40;
    const checkCols = [
      Math.floor((state.player.x + state.scrollX) / tileSize),
      Math.floor((state.player.x + state.scrollX + state.player.w) / tileSize)
    ];
    const lvl = levels[state.levelIndex];
    for (const c of checkCols) {
      if (lvl.map[c] === 2) {
        const spikeX = c * tileSize - state.scrollX;
        const spikeRect = { x: spikeX + 6, y: H-80-36, w: tileSize - 12, h: 36 };
        if (rectsOverlap(state.player.x, state.player.y, state.player.w, state.player.h,
                         spikeRect.x, spikeRect.y, spikeRect.w, spikeRect.h)) {
          state.player.alive = false;
          spawnParticles(state.player.x + state.player.w/2, state.player.y + state.player.h/2, '#ff8ba7', 28, 6);
          statusEl.textContent = 'Hit spike! R to retry · N for next';
        }
      }
    }

    // End of map
    const endX = lvl.map.length * tileSize - state.scrollX;
    if (endX < 200) {
      statusEl.textContent = `${lvl.name} complete! Press N for next level.`;
    }

    // Overlay fade
    const d = state.scrollX;
    const { fadeStartX, fadeEndX } = lvl.overlay;
    if (d < fadeStartX) {
      overlayEl.classList.remove('hidden');
      overlayEl.style.opacity = '1';
    } else if (d >= fadeStartX && d <= fadeEndX) {
      overlayEl.classList.remove('hidden');
      const t = (d - fadeStartX) / (fadeEndX - fadeStartX);
      overlayEl.style.opacity = String(Math.max(0, 1 - t));
      if (t > 0.85) overlayEl.classList.add('hidden');
    } else {
      overlayEl.classList.add('hidden');
    }
  }

  function loop() {
    update();
    draw(time);
    requestAnimationFrame(loop);
  }

  // Entry points connecting menu and game
  window.startGame = function(levelIndex) {
    // Transition: fade in to black, load, then fade out
    startFade(1, () => {
      state.levelIndex = levelIndex || 0;
      loadLevel(state.levelIndex).then(() => startFade(0));
    });
  };

  // Start in menu
  showMenu();
  loop();
})();
