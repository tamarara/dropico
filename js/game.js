
import { CONFIG } from "./config.js";

import { createFruit } from "./fruits.js";
import { setupInput } from "./input.js";
import { createPhysics } from "./physics.js";


export function createGame(canvas) {

    const physics = createPhysics(canvas);

    const droppedFruits = new Set();
    const pendingCollisions = [];
    const mergeAnimations = [];

    let activeFruit = null;
    let lastFruitX = CONFIG.gameWidth / 2;

    const MERGE_DURATION = 100;
    const MERGE_DELAY = 100;


    // --------------------------------------------------
    // POSITION BEGRENZEN
    // --------------------------------------------------

    function clampFruitX(x, radius) {

        const minX = CONFIG.wallThickness + radius;
        const maxX = CONFIG.gameWidth - CONFIG.wallThickness - radius;

        return Math.max(minX, Math.min(maxX, x));
    }


    // --------------------------------------------------
    // AKTIVE FRUCHT ERSTELLEN
    // --------------------------------------------------

    function createActiveFruit() {

        const level = Math.random() < 0.5 ? 0 : 1;
        const radius = CONFIG.fruitLevels[level].radius;

        const x = clampFruitX(lastFruitX, radius);

        lastFruitX = x;

        const fruit = createFruit(
            level,
            x,
            CONFIG.fruitStartY
        );

        fruit.body = physics.addFruit(
            fruit.x,
            fruit.y,
            fruit.radius,
            fruit.color
        );

        fruit.body.gameFruit = fruit;

        return fruit;
    }


    activeFruit = createActiveFruit();


    // --------------------------------------------------
    // KOLLISIONEN
    // --------------------------------------------------
        physics.onCollision((bodyA, bodyB) => {

            const fruitA = bodyA.gameFruit;
            const fruitB = bodyB.gameFruit;

            if (fruitA && !fruitA.merging) {
                fruitA.squashUntil = Date.now() + 140;
            }

            if (fruitB && !fruitB.merging) {
                fruitB.squashUntil = Date.now() + 140;
            }

            if (!fruitA || !fruitB) return;

            if (!bodyA.inGameWorld || !bodyB.inGameWorld) return;

            if (fruitA.merging || fruitB.merging) return;

            if (fruitA.mergePending || fruitB.mergePending) return;

            if (
                fruitA.falling !== true ||
                fruitB.falling !== true
            ) return;

            if (fruitA.level !== fruitB.level) return;

            if (fruitA.level >= CONFIG.fruitLevels.length - 1) {
                return;
            }

            // Beide Früchte für diese Verschmelzung reservieren
            fruitA.mergePending = true;
            fruitB.mergePending = true;

            pendingCollisions.push({
                bodyA,
                bodyB,
                startedAt: Date.now()
            });

        });


    // --------------------------------------------------
    // POSITION FÜR VERSCHMELZUNG SUCHEN
    // --------------------------------------------------

    function findMergePosition(fruitA, fruitB, radius) {

        const settings = CONFIG.physics;

        const minX = CONFIG.wallThickness + radius;
        const maxX = CONFIG.gameWidth - CONFIG.wallThickness - radius;

        const minY = CONFIG.wallThickness + radius;

        const maxY =
            CONFIG.gameHeight -
            CONFIG.wallThickness -
            radius -
            settings.mergeClearance;

        if (minX > maxX || minY > maxY) {
            return null;
        }

        const centerX = clampFruitX(
            (
                fruitA.body.position.x +
                fruitB.body.position.x
            ) / 2,
            radius
        );

        const lowerFruitY = Math.max(
            fruitA.body.position.y,
            fruitB.body.position.y
        );

        const centerY = Math.max(
            minY,
            Math.min(maxY, lowerFruitY)
        );

        const obstacles = [
            ...droppedFruits,
            ...(activeFruit ? [activeFruit] : [])
        ].filter(fruit => {
            return fruit !== fruitA && fruit !== fruitB;
        });

        const step = settings.mergeSearchStep;
        const clearance = settings.mergeClearance;

        function isPositionFree(x, y) {

            return !obstacles.some(other => {

                const dx = x - other.body.position.x;
                const dy = y - other.body.position.y;

                const minDistance =
                    radius +
                    other.radius +
                    clearance;

                return (
                    dx * dx + dy * dy <
                    minDistance * minDistance
                );
            });
        }

        if (isPositionFree(centerX, centerY)) {
            return { x: centerX, y: centerY };
        }

        const directions = 16;
        const maxSearchDistance = 120;

        for (
            let distance = step;
            distance <= maxSearchDistance;
            distance += step
        ) {

            for (let i = 0; i < directions; i++) {

                const angle =
                    Math.PI / 2 +
                    (i / directions) * Math.PI * 2;

                const x = Math.max(
                    minX,
                    Math.min(
                        maxX,
                        centerX + Math.cos(angle) * distance
                    )
                );

                const y = Math.max(
                    minY,
                    Math.min(
                        maxY,
                        centerY + Math.sin(angle) * distance
                    )
                );

                if (isPositionFree(x, y)) {
                    return { x, y };
                }
            }
        }

        return null;
    }


    // --------------------------------------------------
    // VERSCHMELZUNG STARTEN
    // --------------------------------------------------

    function mergeFruits(bodyA, bodyB) {

        const fruitA = bodyA.gameFruit;
        const fruitB = bodyB.gameFruit;

        if (!fruitA || !fruitB) return;

        if (fruitA.merging || fruitB.merging) return;

        if (
            !droppedFruits.has(fruitA) ||
            !droppedFruits.has(fruitB) ||
            fruitA.falling !== true ||
            fruitB.falling !== true ||
            fruitA.level !== fruitB.level ||
            fruitA.level >= CONFIG.fruitLevels.length - 1
        ) {
            fruitA.mergePending = false;
            fruitB.mergePending = false;
            return;
        }

        const nextLevel = fruitA.level + 1;
        const nextStage = CONFIG.fruitLevels[nextLevel];

        const position = findMergePosition(
            fruitA,
            fruitB,
            nextStage.radius
        );

        if (!position) {
            fruitA.mergePending = false;
            fruitB.mergePending = false;
            return;
        }

        // Aktuelle Positionen nach der Verzögerung sichern
        const startA = {
            x: bodyA.position.x,
            y: bodyA.position.y
        };

        const startB = {
            x: bodyB.position.x,
            y: bodyB.position.y
        };

        // Aktuelle Geschwindigkeit übernehmen
        const velocityA = {
            x: bodyA.velocity.x,
            y: bodyA.velocity.y
        };

        const velocityB = {
            x: bodyB.velocity.x,
            y: bodyB.velocity.y
        };

        fruitA.mergePending = false;
        fruitB.mergePending = false;

        fruitA.merging = true;
        fruitB.merging = true;

        droppedFruits.delete(fruitA);
        droppedFruits.delete(fruitB);

        physics.removeFruit(bodyA);
        physics.removeFruit(bodyB);

        mergeAnimations.push({

            velocityA,
            velocityB,

            fruitA,
            fruitB,

            startA,
            startB,

            target: position,

            level: nextLevel,
            radius: nextStage.radius,
            color: nextStage.color,

            startedAt: Date.now()

        });

    }


    // --------------------------------------------------
    // VERSCHMELZUNG ABSCHLIESSEN
    // --------------------------------------------------

    function finishMerge(animation) {

        const fruit = createFruit(
            animation.level,
            animation.target.x,
            animation.target.y
        );

        fruit.body = physics.addFruit(
            fruit.x,
            fruit.y,
            fruit.radius,
            fruit.color
        );

        fruit.body.gameFruit = fruit;

        fruit.falling = true;

        droppedFruits.add(fruit);

        physics.dropFruit(fruit.body);
    }


    // --------------------------------------------------
    // VERSCHMELZUNGEN AKTUALISIEREN
    // --------------------------------------------------

    function updateMerges() {

        const now = Date.now();

        for (
            let i = mergeAnimations.length - 1;
            i >= 0;
            i--
        ) {

            const animation = mergeAnimations[i];

            const progress = Math.min(
                1,
                (now - animation.startedAt) / MERGE_DURATION
            );

            if (progress >= 1) {

                finishMerge(animation);

                mergeAnimations.splice(i, 1);
            }
        }
    }


    // --------------------------------------------------
    // KOLLISIONEN VERARBEITEN
    // --------------------------------------------------

        function processCollisions() {

            const now = Date.now();

            const waiting = [];
            const ready = [];

            pendingCollisions.forEach(collision => {

                if (now - collision.startedAt >= MERGE_DELAY) {
                    ready.push(collision);
                } else {
                    waiting.push(collision);
                }

            });

            pendingCollisions.length = 0;
            pendingCollisions.push(...waiting);

            // Tiefste Kollision zuerst
            ready.sort((collisionA, collisionB) => {

                function getLowestPosition(collision) {

                    const bodyA = collision.bodyA;
                    const bodyB = collision.bodyB;

                    return Math.max(
                        bodyA.position.y + bodyA.circleRadius,
                        bodyB.position.y + bodyB.circleRadius
                    );
                }

                return getLowestPosition(collisionB) -
                       getLowestPosition(collisionA);
            });

            ready.forEach(collision => {

                mergeFruits(
                    collision.bodyA,
                    collision.bodyB
                );

            });

        }


    // --------------------------------------------------
    // POSITIONEN AKTUALISIEREN
    // --------------------------------------------------

    function updateFruitPositions() {

        droppedFruits.forEach(fruit => {

            fruit.x = fruit.body.position.x;
            fruit.y = fruit.body.position.y;

        });

        if (activeFruit) {

            activeFruit.x = activeFruit.body.position.x;
            activeFruit.y = activeFruit.body.position.y;

        }
    }


    // --------------------------------------------------
    // FRUCHT ZEICHNEN
    // --------------------------------------------------

    function drawCircle(
        ctx,
        x,
        y,
        radius,
        color,
        level,
        alpha = 1,
        scaleX = 1,
        scaleY = 1
    ) {

        ctx.save();

        ctx.globalAlpha = alpha;

        ctx.translate(x, y);
        ctx.scale(scaleX, scaleY);

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);

        ctx.fillStyle = color;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(level + 1, 0, 0);

        ctx.restore();
    }


    function drawFruit(fruit, ctx, now) {

        const x = fruit.body.position.x;
        const y = fruit.body.position.y;

        const remaining = Math.max(
            0,
            (fruit.squashUntil || 0) - now
        );

        const squashAmount = 0.09 * (remaining / 140);

        drawCircle(
            ctx,
            x,
            y,
            fruit.radius,
            fruit.color,
            fruit.level,
            1,
            1 + squashAmount,
            1 - squashAmount
        );
    }

// --------------------------------------------------
// ORGANISCHE VERSCHMELZUNGSFORM
// --------------------------------------------------

function drawViscousBlob(
    ctx,
    xA, yA, radiusA,
    xB, yB, radiusB,
    color
) {

    const dx = xB - xA;
    const dy = yB - yA;

    const distance = Math.sqrt(dx * dx + dy * dy);

    // Wenn die Mittelpunkte fast identisch sind:
    // eine gemeinsame Kreisform zeichnen.
    if (distance < 2) {

        const radius = Math.max(radiusA, radiusB);

        ctx.beginPath();
        ctx.arc(xA, yA, radius, 0, Math.PI * 2);

        ctx.fillStyle = color;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        return;
    }

    const angle = Math.atan2(dy, dx);

    const dirX = dx / distance;
    const dirY = dy / distance;

    const perpX = -dirY;
    const perpY = dirX;

    const aTop = {
        x: xA + perpX * radiusA,
        y: yA + perpY * radiusA
    };

    const aBottom = {
        x: xA - perpX * radiusA,
        y: yA - perpY * radiusA
    };

    const bTop = {
        x: xB + perpX * radiusB,
        y: yB + perpY * radiusB
    };

    const bBottom = {
        x: xB - perpX * radiusB,
        y: yB - perpY * radiusB
    };

    const controlDistance = distance * 0.35;

    ctx.beginPath();

    ctx.moveTo(aTop.x, aTop.y);

    // Oberer Verbindungssteg
    ctx.bezierCurveTo(
        aTop.x + dirX * controlDistance,
        aTop.y + dirY * controlDistance,
        bTop.x - dirX * controlDistance,
        bTop.y - dirY * controlDistance,
        bTop.x,
        bTop.y
    );

    // Äußere Rundung der rechten Frucht
    ctx.arc(
        xB,
        yB,
        radiusB,
        angle + Math.PI / 2,
        angle - Math.PI / 2,
        true
    );

    // Unterer Verbindungssteg
    ctx.bezierCurveTo(
        bBottom.x - dirX * controlDistance,
        bBottom.y - dirY * controlDistance,
        aBottom.x + dirX * controlDistance,
        aBottom.y + dirY * controlDistance,
        aBottom.x,
        aBottom.y
    );

    // Äußere Rundung der linken Frucht
    ctx.arc(
        xA,
        yA,
        radiusA,
        angle - Math.PI / 2,
        angle + Math.PI / 2,
        true
    );

    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
}
    // --------------------------------------------------
    // VERSCHMELZUNGSANIMATION ZEICHNEN
    // --------------------------------------------------

   
        function drawMergeAnimation(animation, ctx, now) {

            

                const rawProgress = Math.min(
                    1,
                    (now - animation.startedAt) / MERGE_DURATION
                );

            const ease = value =>
                value * value * (3 - 2 * value);

            const progress = ease(rawProgress);

            const speedA = Math.hypot(
                animation.velocityA.x,
                animation.velocityA.y
            );

            const speedB = Math.hypot(
                animation.velocityB.x,
                animation.velocityB.y
            );

            // Geschwindigkeit bestimmt, welche Frucht stärker nachgibt
            const totalSpeed = speedA + speedB + 0.001;

            const weightA = speedA / totalSpeed;
            const weightB = speedB / totalSpeed;

            // Die schnellere Frucht bewegt sich etwas früher
            const progressA = ease(Math.min(
                1,
                rawProgress * (1 + weightA * 0.35)
            ));

            const progressB = ease(Math.min(
                1,
                rawProgress * (1 + weightB * 0.35)
            ));

            const target = animation.target;

            const xA =
                animation.startA.x +
                (target.x - animation.startA.x) * progressA;

            const yA =
                animation.startA.y +
                (target.y - animation.startA.y) * progressA;

            const xB =
                animation.startB.x +
                (target.x - animation.startB.x) * progressB;

            const yB =
                animation.startB.y +
                (target.y - animation.startB.y) * progressB;

            const dx = xB - xA;
            const dy = yB - yA;
            const distance = Math.hypot(dx, dy);

            // Die Masse wächst auf die Größe der neuen Frucht
            const sourceRadius =
                (animation.fruitA.radius + animation.fruitB.radius) / 2;

            const radius =
                sourceRadius +
                (animation.radius - sourceRadius) * progress;

            // Dezente Verformung beim Aufprall
            const impact = Math.sin(progress * Math.PI);

            const squashX = 1 + impact * 0.045;
            const squashY = 1 - impact * 0.025;

            const centerX = (xA + xB) / 2;
            const centerY = (yA + yB) / 2;

            ctx.save();

            ctx.translate(centerX, centerY);

            // Die Form orientiert sich an der Bewegungsrichtung
            const angle = Math.atan2(dy, dx);
            ctx.rotate(angle);

            // Eine kompakte, weiche gemeinsame Masse
            const radiusX = radius + distance * 0.5;

            ctx.fillStyle = animation.color;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.ellipse(
                0,
                0,
                radiusX * squashX,
                radius * squashY,
                0,
                0,
                Math.PI * 2
            );

            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

    // --------------------------------------------------
    // ALLE FRÜCHTE ZEICHNEN
    // --------------------------------------------------

    function drawFruits() {

        const ctx = physics.render.context;
        const now = Date.now();

        droppedFruits.forEach(fruit => {
            drawFruit(fruit, ctx, now);
        });

        if (activeFruit) {
            drawFruit(activeFruit, ctx, now);
        }

        mergeAnimations.forEach(animation => {
            drawMergeAnimation(animation, ctx, now);
        });
    }


    // --------------------------------------------------
    // EINGABE
    // --------------------------------------------------

    setupInput(

        canvas,

        () => activeFruit,

        (fruit, x) => {

            if (
                !fruit ||
                fruit !== activeFruit ||
                fruit.falling
            ) return;

            const newX = clampFruitX(x, fruit.radius);

            physics.setFruitPosition(
                fruit.body,
                newX,
                fruit.body.position.y
            );

            fruit.x = newX;

            lastFruitX = newX;
        },


        fruit => {

            if (
                !fruit ||
                fruit !== activeFruit ||
                fruit.falling
            ) return;

            fruit.falling = true;

            droppedFruits.add(fruit);

            physics.dropFruit(fruit.body);

            activeFruit = createActiveFruit();
        }

    );


    // --------------------------------------------------
    // ENGINE-EVENTS
    // --------------------------------------------------

    physics.onUpdate(() => {

        processCollisions();

        updateMerges();

        updateFruitPositions();

    });

    physics.onRender(() => {

        drawFruits();

    });


    // --------------------------------------------------
    // START
    // --------------------------------------------------

    physics.start();

}
