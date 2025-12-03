// Menu screen with level selection arrows and animated splash
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const menu = {
    level: 0,
    t: 0,
    running: false,
    names: [
      'Level 1 – 2006',
      'Level 2 – 2008',
      'Level 3 – 2016',
      'Level 4 – 2018',
      'Level 5 – 2025'
    ]
  };

  function drawBackground(t) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#121a33');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // soft waves
    ctx.save();
    ctx.globalAlpha = 0.15; ctx.fillStyle = '#4da1ff';
    for (let i=0;i<3;i++) {
      const y = 120 + i*100 + Math.sin(t*0.8 + i)*10;
      ctx.beginPath(); ctx.moveTo(0,y);
      for (let x=0; x<=W; x+=40) {
        const yy = y + Math.sin((x+t*60)/160 + i)*8;
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(W, H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawMenu(t) {
    drawBackground(t);
    const W = canvas.width, H = canvas.height;
    ctx.textAlign = 'center';

    // title
    const bounce = Math.sin(t*3)*4;
    ctx.fillStyle = '#93c5ff';
    ctx.font = '800 52px system-ui';
    ctx.fillText('Rhythm Dash', W/2, 120 + bounce);

    // selected level
    ctx.fillStyle = '#eaf0ff';
    ctx.font = '600 28px system-ui';
    ctx.fillText(menu.names[menu.level], W/2, 240);

    // arrows
    ctx.fillStyle = '#4da1ff';
    ctx.font = 'bold 40px system-ui';
    ctx.fillText('‹', W/2 - 160, 240);
    ctx.fillText('›', W/2 + 160, 240);

    // hint
    ctx.fillStyle = '#cbd6ff';
    ctx.font = '500 18px system-ui';
    ctx.fillText('Left/Right to select · Enter to play · Esc exits a level', W/2, 320);

    // mascot block
    const bx = W/2, by = 380 + Math.sin(t*4)*10;
    ctx.save();
    ctx.translate(bx-16, by-16);
    ctx.fillStyle = '#4da1ff'; ctx.fillRect(0,0,32,32);
    ctx.fillStyle = '#0d2440';
    ctx.fillRect(8, 10, 6, 6);
    ctx.fillRect(32 - 14, 10, 6, 6);
    ctx.beginPath(); ctx.arc(16, 22, 8, 0, Math.PI, false);
    ctx.lineWidth = 3; ctx.strokeStyle = '#0d2440'; ctx.stroke();
    ctx.restore();
  }

  function loop() {
    if (!menu.running) return;
    menu.t += 1/60;
    drawMenu(menu.t);
    requestAnimationFrame(loop);
  }

  function onKey(e) {
    if (!menu.running) return;
    if (e.code === 'ArrowLeft') {
      menu.level = (menu.level + menu.names.length - 1) % menu.names.length;
    } else if (e.code === 'ArrowRight') {
      menu.level = (menu.level + 1) % menu.names.length;
    } else if (e.code === 'Enter') {
      window.removeEventListener('keydown', onKey);
      window.hideMenu(menu.level);
    }
  }

  window.showMenu = function() {
    menu.running = true;
    window.addEventListener('keydown', onKey);
    loop();
  };

  window.hideMenu = function(selectedLevel) {
    menu.running = false;
    window.removeEventListener('keydown', onKey);
    if (window.startGame) window.startGame(selectedLevel);
  };
})();
