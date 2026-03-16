import { getDomRefs } from './ui/dom.js';
import { SokobanGame } from './game/SokobanGame.js';

const dom = getDomRefs();
const game = new SokobanGame(dom);

game.init();
