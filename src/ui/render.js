import { TILE } from '../data/levels.js';

export function renderBoard(boardEl, grid) {
    const width = grid[0].length;
    boardEl.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    boardEl.innerHTML = '';

    grid.forEach((row) => {
        row.forEach((tile) => {
            const cell = document.createElement('div');
            cell.className = 'cell';

            if (tile === TILE.WALL) {
                cell.classList.add('wall');
            }

            if (tile === TILE.TARGET || tile === TILE.BOX_ON_TARGET || tile === TILE.PLAYER_ON_TARGET) {
                cell.classList.add('target');
            }

            if (tile === TILE.BOX || tile === TILE.BOX_ON_TARGET) {
                const box = document.createElement('div');
                box.className = `entity box${tile === TILE.BOX_ON_TARGET ? ' on-target' : ''}`;
                cell.appendChild(box);
            }

            if (tile === TILE.PLAYER || tile === TILE.PLAYER_ON_TARGET) {
                const player = document.createElement('div');
                player.className = 'entity player';
                cell.appendChild(player);
            }

            boardEl.appendChild(cell);
        });
    });
}

export function updateHeader(dom, levelName, moves) {
    dom.levelLabel.textContent = levelName;
    dom.movesLabel.textContent = String(moves);
}

export function updateMessage(messageEl, text) {
    messageEl.textContent = text;
}
