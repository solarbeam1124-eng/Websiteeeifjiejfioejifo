// Simple home screen with arrows to select level
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let selectedLevel = 0;
  const levels = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];

  window.showMenu = function(startCallback) {
    function drawMenu() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = "#0f1320";
      ctx.fillRect(0,0,canvas.width,canvas.height);

      ctx.fillStyle = "#4da1ff";
      ctx.font = "bold 48px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Rhythm Dash", canvas.width/2, 120);

      ctx.font = "28px system-ui";
      ctx.fillText(levels[selectedLevel], canvas.width/2, 260);

      // arrows
      ctx.fillText("<", canvas.width/2 - 120, 260);
      ctx.fillText(">", canvas.width/2 + 120, 260);

      ctx.font = "24px system-ui";
      ctx.fillText("Press Enter to Play", canvas.width/2, 360);
    }

    function keyHandler(e) {
      if (e.code === "ArrowLeft") {
        selectedLevel = (selectedLevel + levels.length - 1) % levels.length;
      }
      if (e.code === "ArrowRight") {
        selectedLevel = (selectedLevel + 1) % levels.length;
      }
      if (e.code === "Enter") {
        window.removeEventListener("keydown", keyHandler);
        startCallback(selectedLevel);
      }
      drawMenu();
    }

    window.addEventListener("keydown", keyHandler);
    drawMenu();
  };
})();
