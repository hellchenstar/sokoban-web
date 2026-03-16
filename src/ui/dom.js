export function getDomRefs() {
    return {
        board: document.getElementById('board'),
        levelLabel: document.getElementById('level-label'),
        timerLabel: document.getElementById('timer-label'),
        movesLabel: document.getElementById('moves-label'),
        message: document.getElementById('message'),
        restartBtn: document.getElementById('restart-btn'),
        nextBtn: document.getElementById('next-btn'),
        controlButtons: document.querySelectorAll('[data-dir]'),
        levelClearModal: document.getElementById('level-clear-modal'),
        modalDesc: document.getElementById('modal-desc'),
        modalNextBtn: document.getElementById('modal-next-btn'),
        modalStayBtn: document.getElementById('modal-stay-btn')
    };
}
