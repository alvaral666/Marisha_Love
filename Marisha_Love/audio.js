window.AudioManager = {
    bgMain: null,
    bgGame: null,
    click: null,
    match: null,
    win: null,
    ready: false,

    init() {
        this.bgMain = new Audio("assets/audio/bg-main.mp3");
        this.bgGame = new Audio("assets/audio/bg-game.mp3");
        this.click = new Audio("assets/audio/click.mp3");
        this.match = new Audio("assets/audio/match.mp3");
        this.win = new Audio("assets/audio/win.mp3");

        this.bgMain.loop = true;
        this.bgGame.loop = true;

        this.bgMain.volume = 0.35;
        this.bgGame.volume = 0.42;
        this.click.volume = 0.50;
        this.match.volume = 0.60;
        this.win.volume = 0.75;

        this.ready = true;
    },

    unlockByUserGesture() {
        if (!this.ready) return;
        const p = this.bgMain.play();
        if (p && typeof p.then === "function") {
            p.then(() => {
                this.bgMain.pause();
                this.bgMain.currentTime = 0;
            }).catch(() => { });
        }
    },

    playMain() {
        if (!this.ready) return;
        this.bgGame.pause();
        this.bgMain.play().catch(() => { });
    },

    playGame() {
        if (!this.ready) return;
        this.bgMain.pause();
        this.bgGame.play().catch(() => { });
    },

    playClick() {
        if (!this.ready) return;
        this.click.currentTime = 0;
        this.click.play().catch(() => { });
    },

    playMatch() {
        if (!this.ready) return;
        this.match.currentTime = 0;
        this.match.play().catch(() => { });
    },

    playWin() {
        if (!this.ready) return;
        this.win.currentTime = 0;
        this.win.play().catch(() => { });
    }
};

window.AudioManager.init();
