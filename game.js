// Rhythm Dash — simple Geometry Dash–like runner with beat pulses and Roblox overlays.
// Host on GitHub Pages. MP3s must be in the same directory: level1.mp3 … level5.mp3.

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlayEl = document.getElementById('overlay');
  const statusEl = document.getElementById('status');

  // Beat pulse bar
  const beatBar = document.createElement('div');
  beatBar.className = 'beat';
  document.body.appendChild(beatBar);

  const W = canvas.width, H = canvas.height;

  const levels = [
    {
      id: 1, name: 'Level 1', audio: 'level1.mp3', bpm: 120,
      // Easy map: each tile is 40px. 1 = ground, 2 = spike. 0 = empty.
      map: makeFlatWithSpikes(300, [40, 80, 120, 180, 240]),
      // Overlay fades as you pass x positions (distance).
      overlay: {
        year: '2006',
        text: 'Early Roblox era: basic UI, simple blocky avatars, physics-focused beginnings; the site looked much more rudimentary than today.',
        fadeStartX: 800, fadeEndX: 2400
      }
    },
    {
      id: 2, name: 'Level 2', audio: 'level2.mp3', bpm: 128,
      map: makeFlatWithSpikes(320, [70, 140, 200, 260, 300]),
      overlay: {
        year: '2008',
        text: 'Image Modding, first Eggstravaganza event, and Builders Club through PayPal—features that defined Roblox’s early community growth.',
        fadeStartX: 800, fadeEndX: 2400
      }
    },
    {
      id: 3, name: 'Level 3', audio: 'level3.mp3', bpm: 110,
      map: makeFlatWithSpikes(340, [60, 110, 170, 230, 290, 330]),
      overlay: {
        year: '2016',
        text: 'Major platform expansion: Xbox release, Microsoft Store app, and R15 avatar updates—ushering in a modernized Roblox.',
        fadeStartX: 800, fadeEndX: 2400
      }
    },
    {
      id: 4, name: 'Level 4', audio: 'level4.mp3', bpm: 122,
      map: makeFlatWithSpikes(360, [80, 160, 220, 280, 340]),
      overlay: {
        year: '2018',
        text: 'MeepCity hit 1B visits, features renamed for clarity, and dev roadmap transparency—marking maturity in community and tools.',
        fadeStartX: 800, fadeEndX: 2400
      }
    },
    {
      id: 5, name: 'Level 5', audio: 'level5.mp3', bpm: 118,
      map: makeFlatWithSpikes(380, [90, 170, 240, 310, 360]),
      overlay: {
        year: '2025',
        text: 'Big safety and scalability strides: age checks for chat rollouts, engine optimizations, and record growth highlighted at RDC.',
        fadeStartX: 800, fadeEndX: 2400
      }
    }
  ];

  // Helpers to build simple maps
  function makeFlatWithSpikes(len, spikeCols) {
    const m = new Array(len).fill(0);
    // flat ground
    for (let i = 0; i < len; i++) m[i] = 1;
    // spikes at columns
    spikeCols.forEach(c => { if (c >= 5 && c < len-2) m[c] = 2; });
    return m;
  }

  // Game state
  const state = {
    levelIndex: 0,
    player: { x: 120, y: H - 120, vy: 0, w: 32, h: 32, onGround: true, alive: true },
    scrollX: 0,
    speed: 3.0, // pixels per frame
    gravity: 0.6,
    jumpStrength: 10.5,
    audio: null,
    audioCtx: null,
    nextBeatTime: 0,
    beatIntervalSec: 0,
    beatAssistWindow: 0.14, // seconds
    beatOn: false
  };

  // Controls
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') doJump();
    if (e.code === 'KeyR') restartLevel();
    if (e.code === 'KeyN') nextLevel();
  });

  function doJump() {
    if (state.player.onGround && state.player.alive) {
      // Slight assist if within beat window
      const now = state.audioCtx ? state.audioCtx.currentTime : 0;
      const distToBeat = Math.abs(now - state.nextBeatTime);
      const assist = distToBeat < state.beatAssistWindow ? 1.15 : 1.0;
      state.player.vy = -state.jumpStrength * assist;
      state.player.onGround = false;
    }
  }

  function restartLevel() { loadLevel(state.levelIndex); }
  function nextLevel() {
    state.levelIndex = Math.min(levels.length - 1, state.levelIndex + 1);
    loadLevel(state.levelIndex);
  }

  // Audio
  async function playAudio(src, bpm) {
    // Stop previous audio
    if (state.audio) { try { state.audio.pause(); } catch {} }
    state.audio = new Audio(src);
    state.audio.loop = false;
    await state.audio.play().catch(() => {
      statusEl.textContent = 'Autoplay blocked—click the page or press Space to start audio.';
    });

    // Web Audio timing for beats
    try {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const track = state.audioCtx.createMediaElementSource(state.audio);
      track.connect(state.audioCtx.destination);
      state.beatIntervalSec = 60 / bpm;
      state.nextBeatTime = state.audioCtx.currentTime + state.beatIntervalSec;
    } catch {
      state.audioCtx = null;
    }
  }

  function updateBeat() {
    if (!state.audioCtx) return;
    const now = state.audioCtx.currentTime;
    if (now >= state.nextBeatTime) {
      state.nextBeatTime += state.beatIntervalSec;
      pulseBeat();
    }
    // Visual state
    const dist = Math.abs(now - state.nextBeatTime);
    state.beatOn = dist < state.beatAssistWindow;
    beatBar.classList.toggle('on', state.beatOn);
  }

  function pulseBeat() {
    beatBar.classList.add('on');
    setTimeout(() => beatBar.classList.remove('on'), 120);
  }

  // Level load
  async function loadLevel(ix) {
    const lvl = levels[ix];
    state.scrollX = 0;
    state.player.x = 120; state.player.y = H - 120;
    state.player.vy = 0; state.player.onGround = true; state.player.alive = true;
    overlayEl.classList.add('hidden');
    overlayEl.innerHTML = `<div class="year">${lvl.overlay.year}</div><div class="text">${lvl.overlay.text}</div>`;
    statusEl.textContent = `${lvl.name} · BPM ${lvl.bpm} · Press Space to jump`;
    await playAudio(lvl.audio, lvl.bpm);
  }

  // Collision
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

  // Render
  function draw() {
    // Background
    ctx.clearRect(0, 0, W, H);
    // Parallax bands
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, H-140, W, 140);
    ctx.fillStyle = '#161c33';
    ctx.fillRect(0, H-100, W, 100);

    // Ground and spikes
    const tileSize = 40;
    const lvl = levels[state.levelIndex];
    const colsOnScreen = Math.ceil(W / tileSize) + 2;
    const startCol = Math.floor(state.scrollX / tileSize);
    for (let c = startCol; c < startCol + colsOnScreen; c++) {
      const t = lvl.map[c] || 0;
      const x = Math.floor(c * tileSize - state.scrollX);
      if (t === 1) {
        ctx.fillStyle = '#223057';
        ctx.fillRect(x, H-80, tileSize, 80);
        // top line
        ctx.fillStyle = '#2e3e70';
        ctx.fillRect(x, H-82, tileSize, 2);
      }
      if (t === 2) {
        // Spike (triangle)
        ctx.fillStyle = '#a7baff';
        ctx.beginPath();
        ctx.moveTo(x + tileSize/2, H-80-36);
        ctx.lineTo(x + 6, H-80);
        ctx.lineTo(x + tileSize-6, H-80);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Player: blue block with a face
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    // body
    ctx.fillStyle = '#4da1ff';
    ctx.fillRect(0, 0, p.w, p.h);
    // face
    ctx.fillStyle = '#0d2440';
    // eyes
    ctx.fillRect(8, 10, 6, 6);
    ctx.fillRect(p.w - 14, 10, 6, 6);
    // smile
    ctx.beginPath();
    ctx.arc(p.w/2, p.h - 10, 8, 0, Math.PI, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0d2440';
    ctx.stroke();
    ctx.restore();

    // Win/Lose text
    if (!state.player.alive) {
      ctx.fillStyle = 'rgba(15,19,32,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#eaf0ff';
      ctx.font = 'bold 28px system-ui';
      ctx.fillText('Ouch! Press R to retry or N for next level.', 200, 260);
    }
  }

  // Update and overlay fade
  function update() {
    updateBeat();

    if (!state.player.alive) return;

    // Scroll and physics
    state.scrollX += state.speed;

    // gravity
    state.player.vy += state.gravity;
    state.player.y += state.player.vy;

    // ground collision
    const groundY = H - 80 - state.player.h;
    if (state.player.y >= groundY) {
      state.player.y = groundY;
      state.player.vy = 0;
      state.player.onGround = true;
    } else {
      state.player.onGround = false;
    }

    // Spike collision (check nearby tiles)
    const tileSize = 40;
    const checkCols = [Math.floor((state.player.x + state.scrollX) / tileSize),
                       Math.floor((state.player.x + state.scrollX + state.player.w) / tileSize)];
    const lvl = levels[state.levelIndex];
    for (const c of checkCols) {
      if (lvl.map[c] === 2) {
        const spikeX = c * tileSize - state.scrollX;
        const spikeRect = { x: spikeX + 6, y: H-80-36, w: tileSize - 12, h: 36 };
        if (rectsOverlap(state.player.x, state.player.y, state.player.w, state.player.h,
                         spikeRect.x, spikeRect.y, spikeRect.w, spikeRect.h)) {
          state.player.alive = false;
        }
      }
    }

    // End of map = win
    const endX = lvl.map.length * tileSize - state.scrollX;
    if (endX < 200) {
      statusEl.textContent = `${lvl.name} complete! Press N for next level.`;
    }

    // Overlay fade with distance
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
    draw();
    requestAnimationFrame(loop);
  }

  // Start
  loadLevel(0);
  loop();
})();
