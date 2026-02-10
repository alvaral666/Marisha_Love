(() => {
    // =========================
    // БАЗА НАВИГАЦИИ И UI
    // =========================
    const screens = Array.from(document.querySelectorAll(".screen"));
    const progressEl = document.getElementById("progress");
    const backBtn = document.getElementById("backBtn");

    let currentScreen = 0;
    const TOTAL_SCREENS = screens.length;

    function lockButton(btn, ms = 500) {
        if (!btn) return false;
        if (btn.dataset.locked === "1") return true;
        btn.dataset.locked = "1";
        btn.disabled = true;
        setTimeout(() => {
            btn.dataset.locked = "0";
            btn.disabled = false;
        }, ms);
        return false;
    }

    function makeHeartSVG(active = false) {
        const fill = active ? "#b43a4a" : "#c9b9b9";
        return `
      <svg class="progress-heart ${active ? "active" : ""}" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="${fill}" d="M12 21s-7.2-4.8-9.5-9C.6 8.8 2.1 4.8 5.8 4c2.4-.5 4.4.6 6.2 2.8C13.8 4.6 15.8 3.5 18.2 4c3.7.8 5.2 4.8 3.3 8-2.3 4.2-9.5 9-9.5 9z"/>
      </svg>
    `;
    }

    function updateProgress() {
        let html = "";
        for (let i = 0; i < TOTAL_SCREENS; i++) {
            html += makeHeartSVG(i <= currentScreen);
        }
        progressEl.innerHTML = html;
    }

    function updateBackButton() {
        backBtn.hidden = currentScreen === 0;
    }

    function cleanupGlobalOverlays() {
        const gameOverlay = document.getElementById("overlay");
        if (gameOverlay) {
            gameOverlay.hidden = true;
            gameOverlay.classList.remove("victory");
            gameOverlay.innerHTML = "";
            gameOverlay.style.pointerEvents = "none";
        }

        const balloons = document.getElementById("balloonsCanvas");
        if (balloons) {
            balloons.style.display = "none";
            balloons.style.pointerEvents = "none";
        }
    }

    function resetButtonLocks() {
        [captchaConfirm, btnLetterNext, backBtn, btnYes, btnEventsNext].forEach((btn) => {
            if (!btn) return;
            btn.dataset.locked = "0";
            btn.disabled = false;
        });
    }

    function showScreen(index) {
        if (index < 0 || index >= TOTAL_SCREENS) return;

        cleanupGlobalOverlays();

        if (currentScreen === 1 && yesFlowTimer) {
            clearTimeout(yesFlowTimer);
            yesFlowTimer = null;
            yesFlowLocked = false;
        }

        if (currentScreen === 3) {
            window.Match3?.deactivate?.();
        }

        screens[currentScreen].classList.remove("active");
        currentScreen = index;
        screens[currentScreen].classList.add("active");

        resetButtonLocks();

        if (currentScreen === 1) {
            resetNoButton();
            yesFlowLocked = false;
            if (yesFlowTimer) {
                clearTimeout(yesFlowTimer);
                yesFlowTimer = null;
            }
            btnYes.dataset.locked = "0";
            btnYes.disabled = false;
            btnYes.style.opacity = "";
            btnYes.style.cursor = "";
        }

        if (currentScreen === 2) {
            resetLetterState();
        }

        if (currentScreen === 4) {
            initEventsScreen();
        }

        if (currentScreen === 3) {
            window.AudioManager?.playGame?.();
            window.Match3?.activate?.();
        } else {
            window.AudioManager?.playMain?.();
        }

        if (currentScreen === 5) {
            FinalScene.start();
        } else {
            FinalScene.reset();
        }

        updateProgress();
        updateBackButton();
    }

    function nextScreen() {
        showScreen(currentScreen + 1);
    }

    function prevScreen() {
        if (currentScreen > 1) showScreen(currentScreen - 1);
    }

    backBtn.addEventListener("click", () => {
        if (lockButton(backBtn, 450)) return;
        window.AudioManager?.playClick?.();
        prevScreen();
    });

    window.App = { nextScreen, showScreen };

    // =========================
    // CAPTCHA (ЭКРАН 0)
    // =========================
    const CAPTCHA_ITEMS = [
        { src: "assets/images/captcha/1.jpg", pair: false },
        { src: "assets/images/captcha/2.jpg", pair: true },
        { src: "assets/images/captcha/3.jpg", pair: false },
        { src: "assets/images/captcha/4.jpg", pair: true },
        { src: "assets/images/captcha/5.jpg", pair: true },
        { src: "assets/images/captcha/6.jpg", pair: true },
        { src: "assets/images/captcha/7.jpg", pair: false },
        { src: "assets/images/captcha/8.jpg", pair: true },
        { src: "assets/images/captcha/9.jpg", pair: false },
    ];

    let captchaAttempts = 0;

    const captchaCheck = document.getElementById("captcha-check");
    const captchaPanel = document.getElementById("captcha-panel");
    const captchaGrid = document.getElementById("captcha-grid");
    const captchaConfirm = document.getElementById("captcha-confirm");
    const captchaMsg = document.getElementById("captcha-msg");

    function buildCaptchaGrid() {
        captchaGrid.innerHTML = "";
        CAPTCHA_ITEMS.forEach((item, idx) => {
            const el = document.createElement("button");
            el.type = "button";
            el.className = "captcha-item";
            el.dataset.index = String(idx);
            el.dataset.pair = item.pair ? "1" : "0";
            el.innerHTML = `<img src="${item.src}" alt="captcha photo ${idx + 1}" loading="lazy" />`;
            el.addEventListener("click", () => {
                window.AudioManager?.playClick?.();
                const selected = captchaGrid.querySelectorAll(".captcha-item.selected");
                if (!el.classList.contains("selected") && selected.length >= 5) return;
                el.classList.toggle("selected");
            });
            captchaGrid.appendChild(el);
        });
    }

    captchaCheck?.addEventListener("change", () => {
        window.AudioManager?.playClick?.();
        if (captchaCheck.checked) {
            captchaPanel.classList.remove("hidden");
            buildCaptchaGrid();
            captchaMsg.textContent = "";
        } else {
            captchaPanel.classList.add("hidden");
            captchaMsg.textContent = "";
        }
    });

    captchaConfirm?.addEventListener("click", () => {
        if (lockButton(captchaConfirm, 700)) return;
        window.AudioManager?.playClick?.();

        const selected = Array.from(captchaGrid.querySelectorAll(".captcha-item.selected"));
        if (selected.length !== 5) {
            captchaMsg.textContent = "Нужно выбрать ровно 5 фото";
            return;
        }

        const ok = selected.every((el) => el.dataset.pair === "1");
        if (ok) {
            captchaMsg.textContent = "";
            captchaConfirm.disabled = true;
            setTimeout(() => nextScreen(), 250);
        } else {
            captchaAttempts += 1;
            if (captchaAttempts >= 5) {
                captchaMsg.textContent = "Ты же знаешь, что я имею в виду)";
            } else {
                captchaMsg.textContent = "Попробуй ещё раз";
            }
        }
    });

    // =========================
    // ЭКРАН 1: ВОПРОС
    // =========================
    const btnYes = document.getElementById("btn-yes");
    const btnNo = document.getElementById("btn-no");
    const balloonsCanvas = document.getElementById("balloonsCanvas");
    const bctx = balloonsCanvas?.getContext("2d");

    let yesFlowLocked = false;
    let yesFlowTimer = null;
    let balloonsAnimId = null;
    let evadeLocked = false;

    function resetNoButton() {
        btnNo.classList.remove("evading");
        btnNo.style.position = "static";
        btnNo.style.left = "";
        btnNo.style.top = "";
    }

    function getYesRect() {
        return btnYes.getBoundingClientRect();
    }

    function intersects(a, b) {
        return !(
            a.right < b.left ||
            a.left > b.right ||
            a.bottom < b.top ||
            a.top > b.bottom
        );
    }

    function getRandomNoPosition() {
        const w = btnNo.offsetWidth || 140;
        const h = btnNo.offsetHeight || 56;
        const pad = 12;

        const minX = pad;
        const minY = pad + 8;
        const maxX = Math.max(minX, window.innerWidth - w - pad);
        const maxY = Math.max(minY, window.innerHeight - h - pad);

        const yes = getYesRect();

        for (let i = 0; i < 20; i++) {
            const left = Math.random() * (maxX - minX) + minX;
            const top = Math.random() * (maxY - minY) + minY;
            const noRect = { left, top, right: left + w, bottom: top + h };
            if (!intersects(noRect, yes)) return { left, top };
        }

        return {
            left: Math.random() * (maxX - minX) + minX,
            top: Math.random() * (maxY - minY) + minY
        };
    }

    function evadeNoButton() {
        if (currentScreen !== 1) return;
        if (evadeLocked) return;
        evadeLocked = true;

        const { left, top } = getRandomNoPosition();
        btnNo.classList.add("evading");
        btnNo.style.position = "fixed";
        btnNo.style.left = `${left}px`;
        btnNo.style.top = `${top}px`;

        setTimeout(() => {
            btnNo.classList.remove("evading");
            evadeLocked = false;
        }, 150);
    }

    btnNo?.addEventListener("mouseenter", evadeNoButton);
    btnNo?.addEventListener("pointerdown", (e) => {
        if (currentScreen === 1) {
            e.preventDefault();
            evadeNoButton();
        }
    });

    function playBalloonsAnimation(duration = 5000) {
        if (!balloonsCanvas || !bctx) return;
        balloonsCanvas.style.display = "block";
        balloonsCanvas.style.pointerEvents = "none";
        balloonsCanvas.width = window.innerWidth;
        balloonsCanvas.height = window.innerHeight;

        const hearts = Array.from({ length: 50 }, () => ({
            x: Math.random() * balloonsCanvas.width,
            y: balloonsCanvas.height + Math.random() * 120,
            s: 12 + Math.random() * 18,
            v: 0.7 + Math.random() * 1.8,
            drift: (Math.random() - 0.5) * 0.7,
            c: ["#b43a4a", "#7a1f2b", "#c45d6a"][Math.floor(Math.random() * 3)]
        }));

        const start = performance.now();

        function drawHeart(x, y, r, color) {
            bctx.save();
            bctx.translate(x, y);
            bctx.fillStyle = color;
            bctx.beginPath();
            bctx.moveTo(0, r * 0.3);
            bctx.bezierCurveTo(-r, -r, -1.35 * r, r * 0.6, 0, r);
            bctx.bezierCurveTo(1.35 * r, r * 0.6, r, -r, 0, r * 0.3);
            bctx.fill();
            bctx.restore();
        }

        function frame(now) {
            bctx.clearRect(0, 0, balloonsCanvas.width, balloonsCanvas.height);

            hearts.forEach((h) => {
                h.y -= h.v;
                h.x += h.drift;
                drawHeart(h.x, h.y, h.s * 0.5, h.c);
            });

            if (now - start < duration) {
                balloonsAnimId = requestAnimationFrame(frame);
            } else {
                cancelAnimationFrame(balloonsAnimId);
                balloonsAnimId = null;
                balloonsCanvas.style.display = "none";
            }
        }

        if (balloonsAnimId) cancelAnimationFrame(balloonsAnimId);
        balloonsAnimId = requestAnimationFrame(frame);
    }

    btnYes?.addEventListener("click", () => {
        if (yesFlowLocked || currentScreen !== 1 || btnYes.dataset.locked === "1") return;
        yesFlowLocked = true;
        btnYes.dataset.locked = "1";

        window.AudioManager?.playClick?.();

        btnYes.disabled = true;
        btnYes.style.opacity = "0.75";
        btnYes.style.cursor = "default";

        playBalloonsAnimation(5000);

        if (yesFlowTimer) clearTimeout(yesFlowTimer);
        yesFlowTimer = setTimeout(() => {
            showScreen(2);
            yesFlowLocked = false;
            btnYes.dataset.locked = "0";
            btnYes.disabled = false;
            btnYes.style.opacity = "";
            btnYes.style.cursor = "";
            yesFlowTimer = null;
        }, 5000);
    });

    // =========================
    // ЭКРАН 2: ПИСЬМО
    // =========================
    const envelope = document.getElementById("envelope");
    const letter = document.getElementById("letter");
    const letterGrab = document.getElementById("letterGrab");
    const letterHint = document.getElementById("letterHint");
    const btnLetterNext = document.getElementById("btn-letter-next");

    let letterOpened = false;
    let letterExtracted = false;
    let isDraggingLetter = false;
    let dragStartY = 0;
    let startTopPercent = 34;
    let currentTopPercent = 34;
    const EXTRACT_TARGET = 2;

    function resetLetterState() {
        letterOpened = false;
        letterExtracted = false;
        isDraggingLetter = false;
        currentTopPercent = 34;

        envelope?.classList.remove("stage-open", "stage-extracted");
        envelope?.classList.add("stage-closed", "pulse");

        if (letter) {
            letter.classList.remove("dragging");
            letter.style.top = "34%";
        }

        if (btnLetterNext) btnLetterNext.disabled = true;
        if (letterHint) letterHint.textContent = "Открой конверт, затем потяни лист вверх";
    }

    function openEnvelopeStage() {
        if (letterOpened) return;
        letterOpened = true;
        window.AudioManager?.playClick?.();
        envelope?.classList.remove("pulse", "stage-closed");
        envelope?.classList.add("stage-open");
        if (letterHint) letterHint.textContent = "Теперь аккуратно потяни лист вверх";
    }

    function finishExtractLetter() {
        if (letterExtracted) return;
        letterExtracted = true;
        isDraggingLetter = false;

        currentTopPercent = EXTRACT_TARGET;
        if (letter) letter.style.top = `${EXTRACT_TARGET}%`;

        envelope?.classList.add("stage-extracted");
        if (btnLetterNext) btnLetterNext.disabled = false;
        if (letterHint) letterHint.textContent = "Письмо у тебя в руках 💌";
    }

    function onLetterDragStart(clientY) {
        if (!letterOpened || letterExtracted) return;
        isDraggingLetter = true;
        dragStartY = clientY;
        letter?.classList.add("dragging");
    }

    function onLetterDragMove(clientY) {
        if (!isDraggingLetter || letterExtracted) return;

        const delta = dragStartY - clientY;
        const envRect = envelope.getBoundingClientRect();
        const deltaPercent = (delta / envRect.height) * 100;

        const nextTop = Math.max(EXTRACT_TARGET, Math.min(34, startTopPercent - deltaPercent));
        currentTopPercent = nextTop;
        if (letter) letter.style.top = `${nextTop}%`;

        if (nextTop <= EXTRACT_TARGET + 0.2) finishExtractLetter();
    }

    function onLetterDragEnd() {
        if (!isDraggingLetter) return;
        isDraggingLetter = false;
        letter?.classList.remove("dragging");

        if (!letterExtracted) {
            currentTopPercent = Math.min(34, currentTopPercent + 3);
            if (letter) letter.style.top = `${currentTopPercent}%`;
            startTopPercent = currentTopPercent;
        }
    }

    envelope?.addEventListener("click", (e) => {
        if (e.target.closest("#letter")) return;
        openEnvelopeStage();
    });

    envelope?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEnvelopeStage();
        }
    });

    letterGrab?.addEventListener("pointerdown", (e) => {
        if (!letterOpened || letterExtracted) return;
        e.preventDefault();
        window.AudioManager?.playClick?.();
        startTopPercent = currentTopPercent;
        onLetterDragStart(e.clientY);
        letterGrab.setPointerCapture?.(e.pointerId);
    });
    letterGrab?.addEventListener("pointermove", (e) => onLetterDragMove(e.clientY));
    letterGrab?.addEventListener("pointerup", onLetterDragEnd);
    letterGrab?.addEventListener("pointercancel", onLetterDragEnd);

    letter?.addEventListener("pointerdown", (e) => {
        if (!letterOpened || letterExtracted) return;
        e.preventDefault();
        startTopPercent = currentTopPercent;
        onLetterDragStart(e.clientY);
        letter.setPointerCapture?.(e.pointerId);
    });
    letter?.addEventListener("pointermove", (e) => onLetterDragMove(e.clientY));
    letter?.addEventListener("pointerup", onLetterDragEnd);
    letter?.addEventListener("pointercancel", onLetterDragEnd);

    btnLetterNext?.addEventListener("click", () => {
        if (lockButton(btnLetterNext, 700)) return;
        window.AudioManager?.playClick?.();
        nextScreen();
    });

    // =========================
    // ЭКРАН 4: МЕРОПРИЯТИЯ
    // =========================
    const btnEventsNext = document.getElementById("btn-events-next");

    function initEventsScreen() {
        if (btnEventsNext && !btnEventsNext.dataset.bound) {
            btnEventsNext.dataset.bound = "1";
            btnEventsNext.addEventListener("click", () => {
                if (lockButton(btnEventsNext, 700)) return;
                window.AudioManager?.playClick?.();
                nextScreen();
            });
        }

        const cards = document.querySelectorAll("#screen-4 .flip-card");
        cards.forEach((card) => {
            if (card.dataset.bound) return;
            card.dataset.bound = "1";

            card.addEventListener("click", () => {
                window.AudioManager?.playClick?.();
                card.classList.toggle("flipped");
            });

            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    window.AudioManager?.playClick?.();
                    card.classList.toggle("flipped");
                }
            });
        });
    }

    // =========================
    // ФИНАЛЬНЫЙ ЭКРАН
    // =========================
    const FinalScene = (() => {
        let canvas = null;
        let ctx = null;
        let textEl = null;

        let rafId = null;
        let started = false;
        let startTs = 0;
        let stars = [];

        const DRAW_MS = 4000;
        const POINTS = 1400;
        const HEART_COLOR = "#6e1f2b";

        function heartFormula(t) {
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            return { x, y };
        }

        function ensureDom() {
            canvas = document.getElementById("finalCanvas");
            textEl = document.getElementById("finalText");
            if (!canvas || !textEl) return false;
            ctx = canvas.getContext("2d");
            return !!ctx;
        }

        function resize() {
            if (!canvas || !ctx) return;
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;

            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            stars = Array.from({ length: 130 }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.3,
                a: 0.15 + Math.random() * 0.45,
                tw: 0.004 + Math.random() * 0.018
            }));
        }

        function drawStars() {
            for (const s of stars) {
                s.a += (Math.random() - 0.5) * s.tw;
                if (s.a < 0.08) s.a = 0.08;
                if (s.a > 0.75) s.a = 0.75;

                ctx.fillStyle = `rgba(255,255,255,${s.a})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function frame(ts) {
            if (!started) return;
            if (!startTs) startTs = ts;

            const p = Math.min((ts - startTs) / DRAW_MS, 1);
            const w = window.innerWidth;
            const h = window.innerHeight;

            ctx.clearRect(0, 0, w, h);
            drawStars();

            ctx.save();
            ctx.translate(w / 2, h / 2 - 30);
            const scale = Math.min(w, h) / 48;
            ctx.scale(scale, -scale);

            ctx.strokeStyle = HEART_COLOR;
            ctx.lineWidth = 0.13;
            ctx.shadowColor = HEART_COLOR;
            ctx.shadowBlur = 1.0;

            ctx.beginPath();
            const maxI = Math.floor(POINTS * p);
            for (let i = 0; i <= maxI; i++) {
                const t = (i / POINTS) * Math.PI * 2;
                const { x, y } = heartFormula(t);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            if (p < 1) {
                rafId = requestAnimationFrame(frame);
            } else {
                textEl.style.opacity = "1";
                rafId = null;
            }
        }

        function reset() {
            if (!ensureDom()) return;
            started = false;
            startTs = 0;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;

            textEl.style.opacity = "0";
            resize();
            const w = window.innerWidth;
            const h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);
            drawStars();
        }

        function start() {
            if (!ensureDom()) return;
            reset();
            started = true;
            rafId = requestAnimationFrame(frame);
        }

        function init() {
            if (!ensureDom()) return;
            resize();
            window.addEventListener("resize", () => {
                if (!canvas || !ctx) return;
                resize();
                if (started && !rafId) {
                    rafId = requestAnimationFrame(frame);
                }
            });
        }

        return { init, start, reset };
    })();

    // =========================
    // ГЛОБАЛЬНЫЕ КЛИКИ + AUDIO UNLOCK
    // =========================
    document.addEventListener("click", (e) => {
        if (e.target.closest("button")) {
            window.AudioManager?.playClick?.();
        }
    });

    window.addEventListener("pointerdown", () => {
        window.AudioManager?.unlockByUserGesture?.();
        if (currentScreen !== 3) window.AudioManager?.playMain?.();
    }, { once: true });

    // =========================
    // INIT
    // =========================
    initEventsScreen();
    FinalScene.init();
    updateProgress();
    updateBackButton();
})();
