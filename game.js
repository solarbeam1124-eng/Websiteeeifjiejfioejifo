// Rhythm Dash — polished runner with transitions, parallax, squash/stretch, particles, robust audio
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlayEl = document.getElementById('overlay');
  const statusEl = document.getElementById('status');
  const beatBar = document.getElementById('beatbar');
  const W = canvas.width, H = canvas.height;

  // Global audio context (created once)
  let sharedAudioCtx = null;
  function getAudioCtx() {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) sharedAudioCtx = new Ctx();
    }
    return sharedAudioCtx;
  }

  // Levels
  const levels = [
    { id:1, name:'Level 1', audio:'level1.mp3', bpm:120,
      map: flatWithSpikes(340,[80,140,200,260,320]),
      overlay:{ year:'2006', text:'Early Roblox era: basic UI, blocky avatars, physics-focused beginnings.', fadeStartX:700, fadeEndX:2200 } },
    { id:2, name:'Level 2', audio:'level2.mp3', bpm:128,
      map: flatWithSpikes(360,[90,150,210,270,330]),
      overlay:{ year:'2008', text:'Image Modding, first Eggstravaganza, Builders Club via PayPal.', fadeStartX:700, fadeEndX:2200 } },
    { id:3, name:'Level 3', audio:'level3.mp3', bpm:110,
      map: flatWithSpikes(380,[70,130,190,250,310,370]),
      overlay:{ year:'2016', text:'Xbox release, Microsoft Store app, R15 avatar updates.', fadeStartX:700, fadeEndX:2200 } },
    { id:4, name:'Level 4', audio:'level4.mp3', bpm:122,
      map: flatWithSpikes(400,[80,160,220,280,340,380]),
      overlay:{ year:'2018', text:'MeepCity 1B visits; clearer “Public/Private”; dev roadmap transparency.', fadeStartX:700, fadeEndX:2200 } },
    { id:5, name:'Level 5', audio:'level5.mp3', bpm:118,
      map: flatWithSpikes(420,[100,180,240,300,360,410]),
      overlay:{ year:'2025', text:'Safety and scale: age checks for chat, engine optimizations, growth at RDC.', fadeStartX:700, fadeEndX:2200 } },
  ];

  function flatWithSpikes(len, spikeCols) {
    const m = new Array(len).fill(1);
    spikeCols.forEach(c => { if (c>4 && c<len-2) m[c] = 2; });
    return m;
  }

  // Parallax stars
  const starLayers = [
    { count: 64, speed: 0.25, color: '#95b8ff', stars: [] },
    { count: 44, speed: 0.5,  color: '#cfe1ff', stars: [] },
    { count: 24, speed: 0.9,  color: '#ffffff', stars: [] },
  ];
  function initStars() {
    starLayers.forEach(layer => {
      layer.stars = [];
      for (let i=0;i<layer.count;i++) {
        layer.stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.6+0.4 });
      }
    });
  }
  initStars();

  // Fade
  const fade = { opacity: 0, target: 0, speed: 0.06, active: false, callback: null };
  function startFade(to, cb) { fade.target = to; fade.active = true; fade.callback = cb || null; }
  function stepFade() {
    if (!fade.active) return;
    const diff = fade.target - fade.opacity;
    if (Math.abs(diff) < 0.02) {
      fade.opacity = fade.target; fade.active = false;
      if (fade.callback) { const c = fade.callback; fade.callback = null; c(); }
    } else { fade.opacity += Math.sign(diff) * fade.speed; }
  }
  function drawFade() {
    if (fade.opacity <= 0) return;
    ctx.save(); ctx.globalAlpha = fade.opacity; ctx.fillStyle = '#000';
    ctx.fillRect(0,0,W,H); ctx.restore();
  }

  // State
  const state = {
    inGame: false,
    levelIndex: 0,
    scrollX: 0,
    speed: 3.2,
    gravity: 0.6,
    jumpStrength: 10.6,
    player: { x: 140, y: H-120, vy:0, w:32, h:32, onGround:true, alive:true, squashT:0, scaleX:1, scaleY:1 },
    audioEl: null,
    beatIntervalSec: 0,
    nextBeatTime: 0,
    beatAssistWindow: 0.14,
    beatOn: false
  };

  // Particles
  const particles = [];
  function spawnParticles(x,y,color,amount=14,spread=4) {
    for (let i=0;i<amount;i++) {
      particles.push({ x, y, vx:(Math.random()-0.5)*spread, vy:(Math.random()-0.5)*spread- Math.random()*1.5, life:28+Math.random()*12, color });
    }
  }
  function updateParticles(dt) {
    for (let p of particles) {
      p.x += p.vx * (dt*60);
      p.y += p.vy * (dt*60);
      p.vy += 0.05 * (dt*60);
      p.life -= (dt*60);
    }
    for (let i=particles.length-1;i>=0;i--) if (particles[i].life <= 0) particles.splice(i,1);
  }
  function drawParticles() {
    ctx.save();
    for (let p of particles) {
      ctx.globalAlpha = Math.max(0, p.life/40);
      ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.restore();
  }

  // Controls + audio resume on gesture
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') doJump();
    else if (e.code === 'KeyR') retryLevel();
    else if (e.code === 'KeyN') nextLevel();
    else if (e.code === 'Enter' && !state.inGame) window.startGame(state.levelIndex);
    else if (e.code === 'Escape') backToMenu();

    const ac = getAudioCtx();
    if (ac && ac.state === 'suspended') ac.resume().catch(()=>{});
  });
  canvas.addEventListener('pointerdown', () => {
    const ac = getAudioCtx();
    if (ac && ac.state === 'suspended') ac.resume().catch(()=>{});
    if (!state.inGame) window.startGame(state.levelIndex);
  });

  function doJump() {
    if (!state.inGame || !state.player.onGround || !state.player.alive) return;
    const ac = getAudioCtx();
    const now = ac ? ac.currentTime : 0;
    const dist = Math.abs(now - state.nextBeatTime);
    const assist = dist < state.beatAssistWindow ? 1.15 : 1.0;
    state.player.vy = -state.jumpStrength * assist;
    state.player.onGround = false;
    state.player.squashT = 1;
    spawnParticles(state.player.x + state.player.w/2, state.player.y + state.player.h, '#87c6ff', 16, 5);
  }

  function retryLevel() { if (state.inGame) loadLevel(state.levelIndex); }
  function nextLevel() {
    if (!state.inGame) return;
    state.levelIndex = Math.min(levels.length-1, state.levelIndex+1);
    startFade(1, () => { loadLevel(state.levelIndex).then(()=> startFade(0)); });
  }
  function backToMenu() {
    startFade(1, () => {
      stopAudio();
      state.inGame = false;
      overlayEl.classList.add('hidden');
      statusEl.textContent = 'Menu';
      showMenu();
      startFade(0);
    });
  }

  // Audio
  function stopAudio() {
    try { if (state.audioEl) { state.audioEl.pause(); state.audioEl.src = ''; } } catch {}
    state.audioEl = null;
  }
  async function playAudio(src, bpm) {
    stopAudio();
    const ac = getAudioCtx();
    state.audioEl = new Audio(src);
    state.audioEl.loop = false;

    if (ac) {
      try {
        const node = ac.createMediaElementSource(state.audioEl);
        node.connect(ac.destination);
      } catch {}
      state.beatIntervalSec = 60 / bpm;
      state.nextBeatTime = ac.currentTime + state.beatIntervalSec;
    }

    try {
      await state.audioEl.play();
      statusEl.textContent = 'Audio playing';
    } catch {
      statusEl.textContent = 'Autoplay blocked. Press Space/Enter or click to start audio.';
    }
  }
  function updateBeat() {
    const ac = getAudioCtx();
    if (!ac) return;
    const now = ac.currentTime;
    if (now >= state.nextBeatTime) {
      state.nextBeatTime += state.beatIntervalSec;
      pulseBeat();
    }
    const dist = Math.abs(now - state.nextBeatTime);
    state.beatOn = dist < state.beatAssistWindow;
    if (beatBar) beatBar.classList.toggle('on', state.beatOn);
  }
  function pulseBeat() {
    if (!beatBar) return;
    beatBar.classList.add('on'); setTimeout(()=> beatBar.classList.remove('on'), 120);
  }

  // Level load
  async function loadLevel(ix) {
    const lvl = levels[ix];
    // reset
    state.scrollX = 0;
    state.player.x = 140; state.player.y = H - 120;
    state.player.vy = 0; state.player.onGround = true; state.player.alive = true;
    state.player.squashT = 0; state.player.scaleX = 1; state.player.scaleY = 1;
    particles.length = 0;

    // overlay
    overlayEl.classList.add('hidden');
    overlayEl.innerHTML = `<div class="year">${lvl.overlay.year}</div><div class="text">${lvl.overlay.text}</div>`;
    statusEl.textContent = `${lvl.name} · BPM ${lvl.bpm} · Space to jump`;

    // audio
    await playAudio(lvl.audio, lvl.bpm);
    state.inGame = true;
  }

  // Collision helpers
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Parallax background
  function drawParallax(t) {
    // gradient
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, '#0c1020'); g.addColorStop(1, '#101734');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // stars
    starLayers.forEach((layer, i) => {
      ctx.save(); ctx.globalAlpha = 0.25 + i*0.15; ctx.fillStyle = layer.color;
      for (let s of layer.stars) {
        const sx = (s.x - state.scrollX * layer.speed * 0.06) % W;
        const sy = s.y;
        ctx.beginPath(); ctx.arc((sx+W)%W, sy, s.r, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    });

    // horizon waves
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#4da1ff';
    for (let i=0;i<3;i++) {
      const y = H-160 + i*30 + Math.sin(t*1.2 + i)*6;
      ctx.beginPath(); ctx.moveTo(0,y);
      for (let x=0; x<=W; x+=30) {
        const yy = y + Math.sin((x+state.scrollX*0.1)/120 + i)*6;
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // Ground/spikes draw
  function drawTerrain() {
    const tileSize = 40;
    const lvl = levels[state.levelIndex];
    const colsOnScreen = Math.ceil(W / tileSize) + 2;
    const startCol = Math.floor(state.scrollX / tileSize);
    for (let c = startCol; c < startCol + colsOnScreen; c++) {
      const t = lvl.map[c] || 0;
      const x = Math.floor(c * tileSize - state.scrollX);
      if (t === 1) {
        ctx.fillStyle = '#223057'; ctx.fillRect(x, H-80, tileSize, 80);
        ctx.fillStyle = '#2e3e70'; ctx.fillRect(x, H-82, tileSize, 2);
      } else if (t === 2) {
        ctx.fillStyle = '#a7baff';
        ctx.beginPath();
        ctx.moveTo(x + tileSize/2, H-80-36);
        ctx.lineTo(x + 6, H-80);
        ctx.lineTo(x + tileSize-6, H-80);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  // Player draw (squash/stretch + idle bounce)
  function drawPlayer(t) {
    const p = state.player;
    const idle = p.onGround ? Math.sin(t*6)*1.0 : 0;
    const squash = p.squashT > 0 ? Math.max(0.85, 1 - p.squashT*0.15) : 1;
    const stretch = p.squashT > 0 ? Math.min(1.20, 1 + p.squashT*0.20) : 1;
    p.scaleX = squash; p.scaleY = stretch;

    ctx.save();
    ctx.translate(p.x + p.w/2, p.y + p.h/2 + idle);
    ctx.scale(p.scaleX, p.scaleY);
    ctx.translate(-p.w/2, -p.h/2);

    ctx.fillStyle = '#4da1ff'; ctx.fillRect(0,0,p.w,p.h);
    ctx.fillStyle = '#0d2440';
    ctx.fillRect(8,10,6,6);
    ctx.fillRect(p.w-14,10,6,6);
    ctx.beginPath(); ctx.arc(p.w/2, p.h-10, 8, 0, Math.PI, false);
    ctx.lineWidth = 3; ctx.strokeStyle = '#0d2440'; ctx.stroke();
    ctx.restore();
  }

  // Physics update
  function updatePhysics(dt) {
    if (!state.inGame || !state.player.alive) return;

    state.scrollX += state.speed * (dt*60);

    state.player.vy += state.gravity * (dt*60);
    state.player.y += state.player.vy * (dt*60);

    if (state.player.squashT > 0) state.player.squashT = Math.max(0, state.player.squashT - 0.08 * (dt*60));

    // ground
    const groundY = H - 80 - state.player.h;
    if (state.player.y >= groundY) {
      if (!state.player.onGround) spawnParticles(state.player.x + state.player.w/2, state.player.y + state.player.h, '#6fb6ff', 10, 4);
      state.player.y = groundY; state.player.vy = 0; state.player.onGround = true;
    } else {
      state.player.onGround = false;
    }

    // spikes
    const tileSize = 40;
    const lvl = levels[state.levelIndex];
    const c1 = Math.floor((state.player.x + state.scrollX) / tileSize);
    const c2 = Math.floor((state.player.x + state.scrollX + state.player.w) / tileSize);
    for (const c of [c1,c2]) {
      if (lvl.map[c] === 2) {
        const sx = c * tileSize - state.scrollX;
        const rect = { x: sx+6, y: H-80-36, w: tileSize-12, h: 36 };
        if (rectsOverlap(state.player.x, state.player.y, state.player.w, state.player.h, rect.x, rect.y, rect.w, rect.h)) {
          state.player.alive = false;
          spawnParticles(state.player.x + state.player.w/2, state.player.y + state.player.h/2, '#ff8ba7', 28, 6);
          statusEl.textContent = 'Hit spike! R to retry · N for next';
        }
      }
    }

    // end
    const endX = lvl.map.length * tileSize - state.scrollX;
    if (endX < 200) statusEl.textContent = `${lvl.name} complete! Press N for next level.`;

    // overlay fade
    const d = state.scrollX;
    const { fadeStartX, fadeEndX } = lvl.overlay;
    if (d < fadeStartX) {
      overlayEl.classList.remove('hidden'); overlayEl.style.opacity = '1';
    } else if (d >= fadeStartX && d <= fadeEndX) {
      overlayEl.classList.remove('hidden');
      const tt = (d - fadeStartX) / (fadeEndX - fadeStartX);
      overlayEl.style.opacity = String(Math.max(0, 1 - tt));
      if (tt > 0.85) overlayEl.classList.add('hidden');
    } else {
      overlayEl.classList.add('hidden');
    }
  }

  // Draw
  function draw(t) {
    drawParallax(t);
    drawTerrain();
    drawPlayer(t);
    drawParticles();

    if (!state.player.alive) {
      ctx.fillStyle = 'rgba(15,19,32,0.7)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#eaf0ff'; ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Ouch! Press R to retry or N for next level', W/2, 260);
    }

    drawFade();
  }

  // Fixed timestep loop
  let last = performance.now();
  let acc = 0;
  const dt = 1/60;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000); // clamp
    last = now;
    acc += elapsed;

    stepFade();
    updateBeat();

    while (acc >= dt) {
      updateParticles(dt);
      updatePhysics(dt);
      acc -= dt;
    }

    draw(now / 1000);
    requestAnimationFrame(frame);
  }

  // Public startGame for menu
  window.startGame = function(levelIndex) {
    startFade(1, () => {
      state.levelIndex = Math.max(0, Math.min(levels.length-1, levelIndex || 0));
      loadLevel(state.levelIndex).then(() => startFade(0));
    });
  };

  // Boot: show menu and run loop
  showMenu();
  requestAnimationFrame(frame);
})();
