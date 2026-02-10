(() => {
    const MOVES_LIMIT = 30;
    const TARGET_RED = 30;

    const TYPES = ["red", "green", "yellow", "blue"];
    const COLORS = {
        red: "#7a1f2b",
        green: "#3f6b4f",
        yellow: "#d8b35a",
        blue: "#4f6fa8"
    };

    const MASK = [
        [0, 1, 1, 0, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0],
    ];

    const rows = MASK.length;
    const cols = MASK[0].length;

    let canvas, ctx, overlayEl, movesEl, scoreEl, restartBtn;
    let W = 0, H = 0;
    let offsetX = 0, offsetY = 0, cellSize = 0;

    let grid = [];
    let moves = MOVES_LIMIT;
    let redCollected = 0;
    let state = "idle";

    let dragging = false;
    let path = [];

    let raf = null;
    let isInitialized = false;
    let isActive = false;

    const gravity = 0.9;
    const bounce = -0.28;

    function spawnCell(x, y) {
        return {
            x, y,
            py: y,
            vy: 0,
            type: TYPES[Math.floor(Math.random() * TYPES.length)],
            selected: false
        };
    }

    function initGrid() {
        grid = [];
        for (let y = 0; y < rows; y++) {
            const row = [];
            for (let x = 0; x < cols; x++) {
                row.push(MASK[y][x] ? spawnCell(x, y) : null);
            }
            grid.push(row);
        }
    }

    function resizeCanvas() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        W = rect.width;
        H = rect.height;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(W * dpr));
        canvas.height = Math.max(1, Math.floor(H * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function computeLayout() {
        const sx = (W * 0.90) / cols;
        const sy = (H * 0.90) / rows;
        cellSize = Math.min(sx, sy);
        offsetX = (W - cols * cellSize) / 2;
        offsetY = (H - rows * cellSize) / 2;
    }

    function drawHeart(cx, cy, r, type, selected = false) {
        ctx.save();
        ctx.translate(cx, cy);

        ctx.beginPath();
        ctx.moveTo(0, r * 0.30);
        ctx.bezierCurveTo(-r, -r, -1.45 * r, r * 0.58, 0, r);
        ctx.bezierCurveTo(1.45 * r, r * 0.58, r, -r, 0, r * 0.30);
        ctx.closePath();

        ctx.fillStyle = COLORS[type];
        ctx.fill();

        const jelly = ctx.createRadialGradient(-r * 0.25, -r * 0.30, 1, 0, 0, r * 1.25);
        jelly.addColorStop(0, "rgba(255,255,255,.62)");
        jelly.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = jelly;
        ctx.fill();

        const glossy = ctx.createLinearGradient(-r, -r, r, r);
        glossy.addColorStop(0, "rgba(255,255,255,.34)");
        glossy.addColorStop(0.4, "rgba(255,255,255,.10)");
        glossy.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glossy;
        ctx.fill();

        if (type === "red") {
            const sparkle = ctx.createRadialGradient(r * 0.18, -r * 0.22, 0.5, r * 0.18, -r * 0.22, r * 0.7);
            sparkle.addColorStop(0, "rgba(255,255,255,.75)");
            sparkle.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = sparkle;
            ctx.fill();
        }

        ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.strokeStyle = "rgba(0,0,0,.15)";
        ctx.stroke();

        if (selected) {
            ctx.lineWidth = Math.max(2, r * 0.15);
            ctx.strokeStyle = "rgba(255,255,255,.96)";
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, r * 0.30);
            ctx.bezierCurveTo(-r, -r, -1.45 * r, r * 0.58, 0, r);
            ctx.bezierCurveTo(1.45 * r, r * 0.58, r, -r, 0, r * 0.30);
            ctx.closePath();
            ctx.strokeStyle = "rgba(255,235,190,.5)";
            ctx.lineWidth = Math.max(1, r * 0.08);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawPathLine() {
        if (path.length < 2) return;
        ctx.save();
        ctx.lineWidth = Math.max(3, cellSize * 0.11);
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();

        for (let i = 0; i < path.length; i++) {
            const c = path[i];
            const cx = offsetX + c.x * cellSize + cellSize / 2;
            const cy = offsetY + c.py * cellSize + cellSize / 2;
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.restore();
    }

    function render() {
        if (!isActive) return;
        computeLayout();
        ctx.clearRect(0, 0, W, H);

        let isFalling = false;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const c = grid[y][x];
                if (!c) continue;

                if (c.py < y - 0.001 || c.vy !== 0) {
                    isFalling = true;
                    c.vy += gravity * 0.06;
                    c.py += c.vy;

                    if (c.py > y) {
                        c.py = y;
                        c.vy *= bounce;
                        if (Math.abs(c.vy) < 0.03) c.vy = 0;
                    }
                }

                const cx = offsetX + x * cellSize + cellSize / 2;
                const cy = offsetY + c.py * cellSize + cellSize / 2;
                drawHeart(cx, cy, cellSize * 0.36, c.type, c.selected);
            }
        }

        drawPathLine();

        if (state === "animating" && !isFalling) {
            state = "play";
            checkEndConditions();
        }

        raf = requestAnimationFrame(render);
    }

    function getPointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX ?? 0) - rect.left,
            y: (e.clientY ?? 0) - rect.top
        };
    }

    function getCellAt(px, py) {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const c = grid[y][x];
                if (!c) continue;
                const cx = offsetX + x * cellSize + cellSize / 2;
                const cy = offsetY + c.py * cellSize + cellSize / 2;
                if (Math.hypot(px - cx, py - cy) <= cellSize * 0.40) return c;
            }
        }
        return null;
    }

    function isNeighbor(a, b) {
        return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && !(a.x === b.x && a.y === b.y);
    }

    function clearSelection() {
        for (const c of path) c.selected = false;
        path = [];
    }

    function onPointerDown(e) {
        if (!isActive || state !== "play") return;
        dragging = true;
        const p = getPointerPos(e);
        const c = getCellAt(p.x, p.y);
        if (!c) return;
        c.selected = true;
        path = [c];
    }

    function onPointerMove(e) {
        if (!isActive || !dragging || state !== "play" || path.length === 0) return;
        const p = getPointerPos(e);
        const c = getCellAt(p.x, p.y);
        if (!c) return;

        const last = path[path.length - 1];
        if (c === last) return;

        if (path.length >= 2 && c === path[path.length - 2]) {
            last.selected = false;
            path.pop();
            return;
        }

        if (!isNeighbor(last, c)) return;
        if (c.type !== path[0].type) return;
        if (path.includes(c)) return;

        c.selected = true;
        path.push(c);
    }

    function onPointerUp() {
        if (!isActive || !dragging || state !== "play") return;
        dragging = false;

        if (path.length < 3) {
            clearSelection();
            return;
        }

        applyMove();
    }

    function applyMove() {
        state = "animating";
        window.AudioManager?.playMatch?.();
        moves -= 1;

        for (const c of path) {
            if (c.type === "red") redCollected += 1;
            grid[c.y][c.x] = null;
        }

        clearSelection();
        applyGravity();
        updateGameUI();
    }

    function applyGravity() {
        for (let x = 0; x < cols; x++) {
            const existing = [];
            for (let y = rows - 1; y >= 0; y--) {
                if (MASK[y][x] && grid[y][x]) existing.push(grid[y][x]);
            }

            for (let y = rows - 1; y >= 0; y--) {
                if (!MASK[y][x]) continue;

                let c = existing.shift();
                if (!c) c = spawnCell(x, y);

                c.x = x;
                c.y = y;
                c.vy = 0;
                c.selected = false;
                if (c.py >= y) c.py = -1 - Math.random() * 1.2;

                grid[y][x] = c;
            }
        }
    }

    function updateGameUI() {
        movesEl.textContent = `Ходы: ${moves}`;
        scoreEl.textContent = `Красные сердца: ${redCollected} / ${TARGET_RED}`;
    }

    function showOverlay(html, withRestart = false) {
        overlayEl.classList.remove("victory");
        overlayEl.hidden = false;
        overlayEl.style.pointerEvents = "auto";
        overlayEl.innerHTML = `
      <div class="overlay-inner">
        <div>${html}</div>
        ${withRestart ? `<button id="overlay-restart" class="btn btn-neutral overlay-btn">Попробовать снова</button>` : ""}
      </div>
    `;
        if (withRestart) {
            document.getElementById("overlay-restart")?.addEventListener("click", startLevel);
        }
    }

    function showVictoryOverlay() {
        overlayEl.hidden = false;
        overlayEl.style.pointerEvents = "auto";
        overlayEl.classList.add("victory");
        overlayEl.innerHTML = `
      <div class="victory-card">
        <div class="victory-frame"></div>

        <div class="victory-sconce left">
          <div class="base"></div>
          <div class="arm"></div>
          <div class="candle"></div>
          <div class="flame"></div>
        </div>

        <div class="victory-sconce right">
          <div class="base"></div>
          <div class="arm"></div>
          <div class="candle"></div>
          <div class="flame"></div>
        </div>

        <div class="victory-content">
          <h2 class="victory-title">Умничка!</h2>
          <p class="victory-subtitle">Ты собрала все нужные сердца ✨</p>
        </div>

        <div class="victory-dust"></div>
      </div>
    `;
    }

    function checkEndConditions() {
        if (redCollected >= TARGET_RED) {
            state = "win";
            window.AudioManager?.playWin?.();
            showVictoryOverlay();
            setTimeout(() => window.App?.nextScreen?.(), 5000);
            return;
        }

        if (moves <= 0) {
            state = "lose";
            showOverlay(
                "Бывает, не всё получается с первого раза, но главное — не опускать руки и пробовать снова. Худшее, что ты можешь сделать — это сдаться",
                true
            );
            return;
        }

        state = "play";
    }

    function startLevel() {
        overlayEl.hidden = true;
        overlayEl.classList.remove("victory");
        overlayEl.style.pointerEvents = "none";
        overlayEl.innerHTML = "";

        moves = MOVES_LIMIT;
        redCollected = 0;
        state = "play";
        initGrid();
        updateGameUI();
    }

    function attachEvents() {
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointerleave", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
    }

    function initOnce() {
        if (isInitialized) return;
        canvas = document.getElementById("gameCanvas");
        if (!canvas) return;
        ctx = canvas.getContext("2d");

        overlayEl = document.getElementById("overlay");
        movesEl = document.getElementById("moves");
        scoreEl = document.getElementById("score");
        restartBtn = document.getElementById("restart");

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        attachEvents();

        restartBtn.addEventListener("click", () => {
            if (restartBtn.dataset.locked === "1") return;
            restartBtn.dataset.locked = "1";
            restartBtn.disabled = true;

            window.AudioManager?.playClick?.();
            startLevel();

            setTimeout(() => {
                restartBtn.dataset.locked = "0";
                restartBtn.disabled = false;
            }, 450);
        });

        isInitialized = true;
    }

    function activate() {
        initOnce();
        isActive = true;
        startLevel();
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
    }

    function deactivate() {
        isActive = false;
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        dragging = false;
        clearSelection();
    }

    window.Match3 = { activate, deactivate, startLevel };
})();
