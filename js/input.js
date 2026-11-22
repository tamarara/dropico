
import { CONFIG } from "./config.js";

export function setupInput(
    canvas,
    getFruit,
    moveFruit,
    dropFruit
) {

    let activePointerId = null;


    function getPointerPosition(event) {

        const rect = canvas.getBoundingClientRect();

        const scaleX = CONFIG.gameWidth / rect.width;
        const scaleY = CONFIG.gameHeight / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }


    function handleMove(event) {

        const fruit = getFruit();

        if (!fruit || fruit.falling) return;

        const position = getPointerPosition(event);

        moveFruit(fruit, position.x);
    }


    canvas.addEventListener("pointermove", event => {

        if (
            activePointerId !== null &&
            event.pointerId !== activePointerId
        ) return;

        handleMove(event);
    });


    canvas.addEventListener("pointerdown", event => {

        event.preventDefault();

        if (activePointerId !== null) return;

        activePointerId = event.pointerId;

        canvas.setPointerCapture(event.pointerId);

        handleMove(event);
    });


    canvas.addEventListener("pointerup", event => {

        if (event.pointerId !== activePointerId) return;

        handleMove(event);

        const fruit = getFruit();

        if (fruit && !fruit.falling) {
            dropFruit(fruit);
        }

        activePointerId = null;
    });


    canvas.addEventListener("pointercancel", event => {

        if (event.pointerId === activePointerId) {
            activePointerId = null;
        }
    });

}
