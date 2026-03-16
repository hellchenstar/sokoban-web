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
import { renderBoard, updateHeader, updateMessage } from '../ui/render.js';

export class SokobanGame {
    constructor(dom) {
        this.dom = dom;
        this.state = {
            levelIndex: 0,
            grid: [],
            player: { x: 0, y: 0 },
            moves: 0,
            cleared: false,
            startTime: 0,
            timerId: null
        };
    }

    init() {
        this.bindEvents();
        this.loadLevel(0);
    }

    bindEvents() {
        document.addEventListener('keydown', (event) => {
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

    loadLevel(index) {
        const source = LEVELS[index];
        this.state.levelIndex = index;
        this.state.grid = cloneLevelMap(source.map);
        this.state.player = findPlayer(this.state.grid);
        this.state.moves = 0;
        this.state.cleared = false;

        this.startTimer();
        this.closeLevelClearModal();
        this.dom.nextBtn.disabled = true;
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
            updateMessage(this.dom.message, '箱子顶住了，推不动。');
            return;
        }

        // 这里最容易写乱：一次推动同时涉及玩家旧位置、箱子原位置、箱子新位置三处状态。
        // 如果更新顺序不稳，玩家或箱子就会凭空消失，所以这里固定按“新箱子 -> 新玩家 -> 旧玩家”顺序落格子。
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

        const totalTime = this.dom.timerLabel.textContent;
        if (this.state.levelIndex >= LEVELS.length - 1) {
            updateMessage(this.dom.message, `三关全过，用时 ${totalTime}，这波很稳。`);
            return;
        }

        updateMessage(this.dom.message, `过关，用时 ${totalTime}。选一下要不要继续。`);
        this.openLevelClearModal(totalTime);
    }

    openLevelClearModal(totalTime) {
        const nextLevelName = LEVELS[this.state.levelIndex + 1]?.name;
        if (!nextLevelName) {
            return;
        }

        this.dom.modalDesc.textContent = `本关用时 ${totalTime}，是否进入${nextLevelName}？`;
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

        // 这里要把 cleared 改回 false，否则玩家留在当前关时，键盘和按钮都会被直接拦掉。
        updateMessage(this.dom.message, `已停在当前关。点“下一关”继续进入${nextLevelName}。`);
    }
}
