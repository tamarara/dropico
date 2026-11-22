
import { CONFIG } from "./config.js";

// Erstellt eine neue Frucht
export function createFruit(
    level = 0,
    x = CONFIG.gameWidth / 2,
    y = CONFIG.fruitStartY
) {

    const stage = CONFIG.fruitLevels[level];

    if (!stage) {
        throw new Error("Ungültige Fruchtstufe: " + level);
    }

    return {
        x: x,
        y: y,

        radius: stage.radius,

        level: level,
        falling: false,

        color: stage.color
    };

}


// Zeichnet eine Frucht
export function drawFruit(ctx, fruit) {

    ctx.beginPath();

    ctx.arc(
        fruit.x,
        fruit.y,
        fruit.radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = fruit.color;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Fruchtstufe anzeigen
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
        fruit.level + 1,
        fruit.x,
        fruit.y
    );

}
