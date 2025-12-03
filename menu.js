// Menu screen with level selection arrows and simple animation
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const menuState = {
    selectedLevel: 0,
    levels: [
      { name: 'Level 1 – 2006' },
      { name: 'Level 2 – 2008' },
      { name: 'Level 3 – 2016' },
      { name: 'Level 4 – 2018' },
      { name: 'Level 5 – 2025' },
    ],
    t: 0,
    running: false,
  };

  function drawBackground(t) {
    // Gradient waves background (subtle)
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, '#0b1020');
    g.addColorStop(1, '#121a33');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // Soft moving waves
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#4da1ff';
    for (let i=0;i<3;i++) {
      const y = 120 + i*100 + Math.sin(t*0.8 + i)*10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x=0; x<=W; x+=40) {
        const yy = y + Math.sin((x+t*60)/160 + i)*8;
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(W, H); ctx.lineTo(0,H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMenu(t) {
    drawBackground(t);
    const W = canvas.width, H = canvas.height;

    // Title with bounce
    ctx.fillStyle = "#93c5ff";
    ctx.textAlign = "center";
    ctx.font = "800 52px system-ui";
    const bounce = Math.sin(t*3)*4;
    ctx.fillText("Rhythm Dash", W/2, 120 + bounce);

    // Selected level
    ctx.fillStyle = "#eaf0ff";
    ctx.font = "600 28px system-ui";
    ctx.fillText(menuState.levels[menuState.selectedLevel].name, W/2, 240);

    // Arrows
    ctx.fillStyle = "#4da1ff";
    ctx.font = "bold 40px system-ui";
    ctx.fillText("‹", W/2 - 160, 240);
    ctx.fillText("›", W/2 + 160, 240);

    // Hint
    ctx.fillStyle = "#cbd6ff";
    ctx.font = "500 18px system-ui";
    ctx.fillText("Left/Right to select · Enter to play · Esc to quit a level", W/2, 320);

    // Little blue block bouncing on the menu
    const bx = W/2, by = 380 + Math.sin(t*4)*10;
    ctx.save();
    ctx.translate(bx-16, by-16);
    ctx.fillStyle = '#4da1ff';
    ctx.fillRect(0,0,32,32);
    ctx.fillStyle = '#0d2440';
    ctx.fillRect(8, 10, 6, 6);
    ctx.fillRect(32 - 14, 10, 6, 6);
    ctx.beginPath();
    ctx.arc(16, 22, 8, 0, Math.PI, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0d2440';
    ctx.stroke();
    ctx.restore();
  }

  function loop() {
    if (!menuState.running) return;
    menuState.t += 1/60;
    drawMenu(menuState.t);
    requestAnimationFrame(loop);
  }

  function onKey(e) {
    if (!menuState.running) return;
    if (e.code === "ArrowLeft") {
      menuState.selectedLevel = (menuState.selectedLevel + menuState.levels.length - 1) % menuState.levels.length;
    }
    if (e.code === "ArrowRight") {
      menuState.selectedLevel = (menuState.selectedLevel + 1) % menuState.levels.length;
    }
    if (e.code === "Enter") {
      window.removeEventListener('keydown', onKey);
      window.hideMenu(menuState.selectedLevel);
    }
  }

  window.showMenu = function() {
    menuState.running = true;
    window.addEventListener('keydown', onKey);
    loop();
  };

  window.hideMenu = function(selectedLevel) {
    menuState.running = false;
    window.removeEventListener('keydown', onKey);
    if (window.startGame) window.startGame(selectedLevel);
  };
})();
