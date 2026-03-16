import { TILE } from '../data/levels.js';

export function cloneLevelMap(map) {
    return map.map((row) => row.split(''));
}

export function findPlayer(grid) {
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < grid[y].length; x += 1) {
            const tile = grid[y][x];
            if (tile === TILE.PLAYER || tile === TILE.PLAYER_ON_TARGET) {
                return { x, y };
            }
        }
    }
    return { x: 0, y: 0 };
}

export function getTile(grid, x, y) {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
        return null;
    }
    return grid[y][x];
}

export function setTile(grid, x, y, value) {
    grid[y][x] = value;
}

export function getBaseTile(tile) {
    if (tile === TILE.PLAYER_ON_TARGET || tile === TILE.BOX_ON_TARGET) {
        return TILE.TARGET;
    }
    return TILE.FLOOR;
}

export function isBlockedTile(tile) {
    return tile === null || tile === TILE.WALL;
}

export function isBoxTile(tile) {
    return tile === TILE.BOX || tile === TILE.BOX_ON_TARGET;
}

export function isLevelCleared(grid) {
    return grid.every((row) => row.every((tile) => tile !== TILE.BOX));
}
