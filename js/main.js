
import { createGame } from "./game.js";

const canvas = document.getElementById("game-canvas");

if (!canvas) {
    throw new Error("Canvas mit ID 'game-canvas' wurde nicht gefunden.");
}

createGame(canvas);
