
export const CONFIG = {

    // Größe des Spielfeldes
    gameWidth: 360,
    gameHeight: 560,

    // Spielfeldbegrenzungen
    wallThickness: 10,

    // Darstellung
    backgroundColor: "#303030",
    wallColor: "#ffffff",

    // Startposition der Früchte
    fruitStartY: 5,

    // Fruchtstufen
    fruitLevels: [
        { radius: 24, color: "#004433" },
        { radius: 30, color: "#DD8245" },
        { radius: 38, color: "#E85D5D" },
        { radius: 48, color: "#B76AD4" },
        { radius: 60, color: "#6495ED" }
    ],

    // Physik-Einstellungen
    physics: {

        gravity: 1,

        // Leichter Rückprall
        restitution: 0.009,

        // Reibung beim Kontakt
        friction: 0.09,
        frictionStatic: 0.9,

        // Weniger Luftwiderstand
        frictionAir: 0.015,

        density: 4,

        enableSleeping: true,
        sleepThreshold: 45,

        positionIterations: 8,
        velocityIterations: 6,
        constraintIterations: 2,

        // Zeitsteuerung
        fixedTimeStep: 1 / 60,
        maxFrameDelta: 0.1,
        maxSubSteps: 6,

        // Verschmelzung
        mergeClearance: 2,
        mergeSearchStep: 4
    }

};
