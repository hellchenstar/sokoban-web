import { LEVELS, TILE } from '../data/levels.js';
import { formatTime } from '../utils/time.js';
import { DIRECTIONS, KEY_TO_DIRECTION } from './directions.js';
import {
    cloneLevelMap,
    findPlayer,
    getTile,
    setTile,
    getBaseTile,
    isBlockedTile,
    isBoxTile,
    isLevelCleared
} from './board.js';
import {
    renderBoard,
    renderLevelOptions,
    updateBestRecord,
    updateHeader,
    updateMessage
} from '../ui/render.js';

const BEST_RECORDS_KEY = 'sokoban-web-best-records';

export class SokobanGame {
    constructor(dom) {
        this.dom = dom;
        this.bestRecords = this.loadBestRecords();
        this.state = {
            levelIndex: 0,
            grid: [],
            player: { x: 0, y: 0 },
            moves: 0,
            cleared: false,
            startTime: 0,
            timerId: null,
            history: []
        };
    }

    init() {
        renderLevelOptions(this.dom.levelSelect, LEVELS, 0);
        this.bindEvents();
        this.loadLevel(0);
    }

    bindEvents() {
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
                event.preventDefault();
                this.undo();
                return;
            }

            const direction = KEY_TO_DIRECTION[event.code];
            if (!direction) {
                return;
            }

            event.preventDefault();
            this.move(direction);
        });

        this.dom.controlButtons.forEach((button) => {
            button.addEventListener('click', () => {
                this.move(button.dataset.dir);
            });
        });

        this.bindSwipeControls();

        this.dom.levelSelect.addEventListener('change', () => {
            this.loadLevel(Number(this.dom.levelSelect.value));
        });

        this.dom.undoBtn.addEventListener('click', () => {
            this.undo();
        });

        this.dom.prevBtn.addEventListener('click', () => {
            if (this.state.levelIndex > 0) {
                this.loadLevel(this.state.levelIndex - 1);
            }
        });

        this.dom.restartBtn.addEventListener('click', () => {
            this.loadLevel(this.state.levelIndex);
        });

        this.dom.nextBtn.addEventListener('click', () => {
            if (this.state.levelIndex < LEVELS.length - 1) {
                this.loadLevel(this.state.levelIndex + 1);
            }
        });

        this.dom.modalNextBtn.addEventListener('click', () => {
            this.goToNextLevelFromModal();
        });

        this.dom.modalStayBtn.addEventListener('click', () => {
            this.keepCurrentLevelFromModal();
        });
    }

    bindSwipeControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchMoved = false;
        const minSwipeDistance = 24;

        this.dom.board.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1) {
                return;
            }

            const touch = event.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchMoved = false;
        }, { passive: true });

        this.dom.board.addEventListener('touchmove', (event) => {
            if (event.touches.length !== 1) {
                return;
            }

            const touch = event.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
                touchMoved = true;
            }
        }, { passive: true });

        this.dom.board.addEventListener('touchend', (event) => {
            if (!touchMoved || event.changedTouches.length !== 1) {
                return;
            }

            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (Math.max(absX, absY) < minSwipeDistance) {
                return;
            }

            if (absX > absY) {
                this.move(deltaX > 0 ? 'right' : 'left');
                return;
            }

            this.move(deltaY > 0 ? 'down' : 'up');
        }, { passive: true });
    }

    loadBestRecords() {
        try {
            const raw = window.localStorage.getItem(BEST_RECORDS_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    saveBestRecords() {
        try {
            window.localStorage.setItem(BEST_RECORDS_KEY, JSON.stringify(this.bestRecords));
        } catch {
            // ignore storage failures
        }
    }

    getCurrentBestRecord() {
        return this.bestRecords[String(this.state.levelIndex)] || null;
    }

    updateBestRecordIfNeeded(seconds) {
        const key = String(this.state.levelIndex);
        const current = this.bestRecords[key];
        const next = {
            moves: this.state.moves,
            seconds,
            timeLabel: formatTime(seconds)
        };

        const shouldUpdate = !current
            || next.moves < current.moves
            || (next.moves === current.moves && next.seconds < current.seconds);

        if (!shouldUpdate) {
            return false;
        }

        this.bestRecords[key] = next;
        this.saveBestRecords();
        return true;
    }

    syncLevelUi() {
        this.dom.levelSelect.value = String(this.state.levelIndex);
        this.dom.undoBtn.disabled = this.state.history.length === 0;
        this.dom.prevBtn.disabled = this.state.levelIndex === 0;
        updateBestRecord(this.dom, this.getCurrentBestRecord());
    }

    loadLevel(index) {
        const source = LEVELS[index];
        this.state.levelIndex = index;
        this.state.grid = cloneLevelMap(source.map);
        this.state.player = findPlayer(this.state.grid);
        this.state.moves = 0;
        this.state.cleared = false;
        this.state.history = [];

        this.startTimer();
        this.closeLevelClearModal();
        this.dom.nextBtn.disabled = true;
        this.syncLevelUi();
        updateHeader(this.dom, source.name, this.state.moves);
        updateMessage(this.dom.message, '箱子归位，脑子别飞。');
        renderBoard(this.dom.board, this.state.grid);
    }

    startTimer() {
        this.state.startTime = Date.now();
        if (this.state.timerId) {
            clearInterval(this.state.timerId);
        }
        this.state.timerId = setInterval(() => this.updateTimer(), 1000);
        this.updateTimer();
    }

    updateTimer() {
        const seconds = Math.floor((Date.now() - this.state.startTime) / 1000);
        this.dom.timerLabel.textContent = formatTime(seconds);
    }

    snapshotState() {
        this.state.history.push({
            grid: this.state.grid.map((row) => [...row]),
            player: { ...this.state.player },
            moves: this.state.moves,
            elapsedSeconds: Math.floor((Date.now() - this.state.startTime) / 1000)
        });
        this.syncLevelUi();
    }

    undo() {
        const previous = this.state.history.pop();
        if (!previous) {
            updateMessage(this.dom.message, '没得撤了，真就这一步。');
            this.syncLevelUi();
            return;
        }

        this.state.grid = previous.grid.map((row) => [...row]);
        this.state.player = { ...previous.player };
        this.state.moves = previous.moves;
        this.state.cleared = false;
        this.startTimer();
        this.state.startTime = Date.now() - previous.elapsedSeconds * 1000;
        this.updateTimer();
        this.closeLevelClearModal();
        this.dom.nextBtn.disabled = true;
        this.syncLevelUi();
        updateHeader(this.dom, LEVELS[this.state.levelIndex].name, this.state.moves);
        renderBoard(this.dom.board, this.state.grid);
        updateMessage(this.dom.message, '撤回一步，刚才那下当没发生。');
    }

    move(directionKey) {
        if (this.state.cleared) {
            return;
        }

        const direction = DIRECTIONS[directionKey];
        if (!direction) {
            return;
        }

        const { x, y } = this.state.player;
        const nextX = x + direction.x;
        const nextY = y + direction.y;
        const nextTile = getTile(this.state.grid, nextX, nextY);

        if (isBlockedTile(nextTile)) {
            updateMessage(this.dom.message, '墙：今天你也别想过去。');
            return;
        }

        this.snapshotState();

        if (isBoxTile(nextTile)) {
            this.pushBox(direction, x, y, nextX, nextY, nextTile);
            return;
        }

        this.movePlayerTo(nextX, nextY, nextTile);
        this.finishMove('继续，别把自己堵死。');
    }

    pushBox(direction, playerX, playerY, boxX, boxY, boxTile) {
        const pushX = boxX + direction.x;
        const pushY = boxY + direction.y;
        const pushTile = getTile(this.state.grid, pushX, pushY);

        if (isBlockedTile(pushTile) || isBoxTile(pushTile)) {
            this.state.history.pop();
            this.syncLevelUi();
            updateMessage(this.dom.message, '箱子顶住了，推不动。');
            return;
        }

        setTile(this.state.grid, pushX, pushY, pushTile === TILE.TARGET ? TILE.BOX_ON_TARGET : TILE.BOX);
        setTile(this.state.grid, boxX, boxY, boxTile === TILE.BOX_ON_TARGET ? TILE.PLAYER_ON_TARGET : TILE.PLAYER);
        setTile(this.state.grid, playerX, playerY, getBaseTile(this.state.grid[playerY][playerX]));

        this.state.player = { x: boxX, y: boxY };
        this.finishMove('漂亮，箱子动了。');
    }

    movePlayerTo(nextX, nextY, nextTile) {
        const { x, y } = this.state.player;
        setTile(this.state.grid, nextX, nextY, nextTile === TILE.TARGET ? TILE.PLAYER_ON_TARGET : TILE.PLAYER);
        setTile(this.state.grid, x, y, getBaseTile(this.state.grid[y][x]));
        this.state.player = { x: nextX, y: nextY };
    }

    finishMove(message) {
        this.state.moves += 1;
        this.syncLevelUi();
        updateHeader(this.dom, LEVELS[this.state.levelIndex].name, this.state.moves);
        renderBoard(this.dom.board, this.state.grid);
        updateMessage(this.dom.message, message);

        if (isLevelCleared(this.state.grid)) {
            this.handleLevelClear();
        }
    }

    handleLevelClear() {
        this.state.cleared = true;
        clearInterval(this.state.timerId);
        this.dom.nextBtn.disabled = this.state.levelIndex >= LEVELS.length - 1;

        const elapsedSeconds = Math.floor((Date.now() - this.state.startTime) / 1000);
        const totalTime = formatTime(elapsedSeconds);
        const improved = this.updateBestRecordIfNeeded(elapsedSeconds);
        this.syncLevelUi();

        if (this.state.levelIndex >= LEVELS.length - 1) {
            const suffix = improved ? '，还顺手刷新了最佳成绩。' : '，这波很稳。';
            updateMessage(this.dom.message, `20 关全过，用时 ${totalTime}${suffix}`);
            return;
        }

        const recordTip = improved ? ' 新纪录，手感不错。' : '';
        updateMessage(this.dom.message, `过关，用时 ${totalTime}。选一下要不要继续。${recordTip}`);
        this.openLevelClearModal(totalTime, improved);
    }

    openLevelClearModal(totalTime, improved) {
        const nextLevelName = LEVELS[this.state.levelIndex + 1]?.name;
        if (!nextLevelName) {
            return;
        }

        const recordTip = improved ? ' 你还刷新了本关最佳成绩。' : '';
        this.dom.modalDesc.textContent = `本关用时 ${totalTime}，是否进入${nextLevelName}？${recordTip}`;
        this.dom.levelClearModal.classList.add('is-visible');
        this.dom.levelClearModal.setAttribute('aria-hidden', 'false');
    }

    closeLevelClearModal() {
        this.dom.levelClearModal.classList.remove('is-visible');
        this.dom.levelClearModal.setAttribute('aria-hidden', 'true');
    }

    goToNextLevelFromModal() {
        const nextLevelIndex = this.state.levelIndex + 1;
        if (nextLevelIndex >= LEVELS.length) {
            return;
        }

        this.loadLevel(nextLevelIndex);
    }

    keepCurrentLevelFromModal() {
        const nextLevelName = LEVELS[this.state.levelIndex + 1]?.name;

        this.state.cleared = false;
        this.dom.nextBtn.disabled = false;
        this.closeLevelClearModal();
        updateMessage(this.dom.message, `已停在当前关。点“下一关”继续进入${nextLevelName}。`);
    }
}
