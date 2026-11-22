
import { CONFIG } from "./config.js";

const {
    Engine,
    Runner,
    Render,
    Bodies,
    Body,
    Composite,
    Events,
    Sleeping
} = window.Matter;


export function createPhysics(canvas) {

    const settings = CONFIG.physics;

    // Physik-Engine
    const engine = Engine.create({
        enableSleeping: settings.enableSleeping,
        positionIterations: settings.positionIterations,
        velocityIterations: settings.velocityIterations,
        constraintIterations: settings.constraintIterations
    });

    engine.gravity.x = 0;
    engine.gravity.y = settings.gravity;


    // Matter-Renderer
    const render = Render.create({
        canvas,
        engine,
        options: {
            width: CONFIG.gameWidth,
            height: CONFIG.gameHeight,
            wireframes: false,
            background: CONFIG.backgroundColor,
            showAngleIndicator: false,
            pixelRatio: 1
        }
    });

    // Responsives Canvas
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.maxWidth = CONFIG.gameWidth + "px";
    canvas.style.display = "block";
    canvas.style.touchAction = "none";


    // Physik-Runner
    const runner = Runner.create();


    // Begrenzungen
    const wallOptions = {
        isStatic: true,
        friction: settings.friction,
        restitution: 0,
        render: {
            fillStyle: CONFIG.wallColor,
            strokeStyle: CONFIG.wallColor,
            lineWidth: 0
        }
    };

    const leftWall = Bodies.rectangle(
        CONFIG.wallThickness / 2,
        CONFIG.gameHeight / 2,
        CONFIG.wallThickness,
        CONFIG.gameHeight,
        wallOptions
    );

    const rightWall = Bodies.rectangle(
        CONFIG.gameWidth - CONFIG.wallThickness / 2,
        CONFIG.gameHeight / 2,
        CONFIG.wallThickness,
        CONFIG.gameHeight,
        wallOptions
    );

    const floor = Bodies.rectangle(
        CONFIG.gameWidth / 2,
        CONFIG.gameHeight - CONFIG.wallThickness / 2,
        CONFIG.gameWidth,
        CONFIG.wallThickness,
        wallOptions
    );

    Composite.add(engine.world, [
        leftWall,
        rightWall,
        floor
    ]);


    // Kollisions-Callbacks
    const collisionCallbacks = [];
    const updateCallbacks = [];

    Events.on(engine, "collisionStart", event => {
        event.pairs.forEach(pair => {
            collisionCallbacks.forEach(callback => {
                callback(pair.bodyA, pair.bodyB);
            });
        });
    });

    Events.on(engine, "afterUpdate", event => {
        updateCallbacks.forEach(callback => callback(event));
    });


    let started = false;


    return {

        engine,
        render,
        runner,

        onCollision(callback) {
            collisionCallbacks.push(callback);
        },

        onUpdate(callback) {
            updateCallbacks.push(callback);
        },

        onRender(callback) {
            Events.on(render, "afterRender", callback);
        },


        // Frucht erstellen und zunächst statisch hinzufügen
        addFruit(x, y, radius, color) {

            const fruit = Bodies.circle(x, y, radius, {
                restitution: settings.restitution,
                friction: settings.friction,
                frictionStatic: settings.frictionStatic,
                frictionAir: settings.frictionAir,
                density: settings.density,
                sleepThreshold: settings.sleepThreshold,

                render: {
                    visible: false,
                    fillStyle: color,
                    strokeStyle: "#ffffff",
                    lineWidth: 2
                }
            });

            Body.setInertia(fruit, Infinity);
            Body.setStatic(fruit, true);

            // Bis zum Abwurf keine Kollisionen
            fruit.collisionFilter.mask = 0;

            fruit.inGameWorld = true;

            Composite.add(engine.world, fruit);

            return fruit;
        },


        setFruitPosition(fruit, x, y) {
            Body.setPosition(fruit, { x, y });
        },


        // Frucht aktivieren
        dropFruit(fruit) {

            if (!fruit.inGameWorld) {
                Composite.add(engine.world, fruit);
                fruit.inGameWorld = true;
            }

            fruit.collisionFilter.mask = 0xFFFFFFFF;

            Body.setStatic(fruit, false);

            Sleeping.set(fruit, false);

            Body.setVelocity(fruit, {
                x: 0,
                y: 0
            });

            Body.setAngularVelocity(fruit, 0);
        },


        removeFruit(fruit) {

            if (fruit.inGameWorld) {
                Composite.remove(engine.world, fruit);
                fruit.inGameWorld = false;
            }
        },


        start() {
            if (started) return;

            started = true;

            Render.run(render);
            Runner.run(runner, engine);
        },


        stop() {
            if (!started) return;

            Render.stop(render);
            Runner.stop(runner);

            started = false;
        }

    };

}
