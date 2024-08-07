import { MainLoop } from '../../libs/gameloop.js';
import * as Sounds from '../../libs/sound.js';

const peers = [];
let weAreServer = true;
const gameFolder = "./games/learnToDrive/";

export function onNewPeer(peer, areWeServer) {
    weAreServer = areWeServer;
    peers.push(peer);

    
    const plr = getPlayerByNick(peer.nick);
    if (plr) {
        plr.peer = peer;
    }

    /*opponent.peer = peer;
    console.log("got new peer", peer);
    if (areWeServer) {
        playerType = 1;
        player.loadImages("./games/tennis/guy_idle.png");
        opponent.loadImages("./games/tennis/frog_idle.png");
    }
    else {
        playerType = 2;
        player.loadImages("./games/tennis/frog_idle.png");
        opponent.loadImages("./games/tennis/guy_idle.png");
    }*/
}
export function onLostPeer(peer) {
    const plr = getPlayerByNick(peer.nick);
    if (plr) {
        plr.peer = null;
        // should remove player??
        // NOTDONE!
    }
    //opponent.peer = null;
};
export function onMessage(peer, data) {
    // handle incoming messages...
    // should get {x: 1, y:2} or similar for now...
    //const plr = players.filter(p => p.nick == peer.nick);
    // THIS NEEDS TO BE CHANGED! (need which players position, and should also have ball position (and velocities?))
    //opponent.position.x = -data.x;
    //opponent.position.y = -data.y;
    
    getNewState(peer, data);
};


// runs at the beginning of each frame and is typically used to process input
MainLoop.setBegin( (timestamp, frameDelta) => {
    
});
// runs zero or more times per frame depending on the frame rate. It is used to compute anything affected by time - typically physics and AI movements.
MainLoop.setUpdate(delta => {
    /*movePlayer(delta);
    ball.update(delta);
    player.bat.update(delta);*/
    updatePedals(delta);
    stick.updateStick(delta);
    player.car.update(delta);
});
// should update the screen, usually by changing the DOM or painting a canvas.
MainLoop.setDraw(interpolationPercentage => {
    //const ctx = canvas.getContext("2d");
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const dx = canvasWidth / 2;
    const dy = canvasHeight / 2;
    /*const arrDrawOps = [];
    for (const entity of entities) {
        entity.draw(ctx, arrDrawOps, dx, dy);
    }
    arrDrawOps.sort((a,b) => {
        if (a.z < b.z) {
            return -1;
        }
        else if (a.z > b.z) {
            return 1;
        }
        return 0;
    });
    arrDrawOps.forEach(d => d.draw());*/

    // draw sprites...
    // put z-order in sprite-class, draw according to that order...
    for (const sprite of entities.filter((spr) => spr.zOrder == 0) ) {
        sprite.draw(ctx, dx, dy);
    }
    for (const sprite of entities.filter((spr) => spr.zOrder == 1) ) {
        sprite.draw(ctx, dx, dy);
    }
    for (const sprite of entities.filter((spr) => spr.zOrder == 2) ) {
        sprite.draw(ctx, dx, dy);
    }
    for (const sprite of entities.filter((spr) => spr.zOrder == 3) ) {
        sprite.draw(ctx, dx, dy);
    }
    for (const sprite of entities.filter((spr) => spr.zOrder == 4) ) {
        sprite.draw(ctx, dx, dy);
    }

});
let lastFps = 0;
// runs at the end of each frame and is typically used for cleanup tasks such as adjusting the visual quality based on the frame rate.
MainLoop.setEnd( (fps, panic) => {
    lastFps = fps;
    // commented out this one for now
    //sendNewState(); // no need to send in update(), is it? Once each frame should be enough, surely?

    if (panic) {
        console.log("PANIC!! fps", fps);
        MainLoop.resetFrameDelta();
    }
});

class Position {
    /**
     * @type {number}
     */
    x;
    /**
     * @type {number}
     */
    y;
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Rectangle {
    /**
     * 
     * @param {Position} topLeft 
     * @param {Position} topRight 
     * @param {Position} bottomLeft 
     * @param {Position} bottomRight 
     */
    constructor(topLeft, topRight, bottomLeft, bottomRight) {
        this.topLeft = topLeft;
        this.topRight = topRight;
        this.bottomLeft = bottomLeft;
        this.bottomRight = bottomRight;
    }

    isTouching(x, y) {
        if (x > this.topLeft.x && x < this.topRight.x 
                && y > this.topLeft.y && y < this.bottomLeft.y) {
            return true;
        }
        return false;
    }

    moveX(x) {
        this.topLeft.x += x;
        this.topRight.x += x;
        this.bottomLeft.x += x;
        this.bottomRight.x += x;
    }

    moveY(y) {
        this.topLeft.y += y;
        this.topRight.y += y;
        this.bottomLeft.y += y;
        this.bottomRight.y += y;
    }
}

class Road {

    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} dx 
     * @param {number} dy 
     */
    draw(ctx, dx, dy) {
        //ctx.drawImage(img.img, 0+(32*img.step), 0, 32, 32, p.x+dx - p.z*192/2, -p.y+dy, p.z * 192, -p.z * 192);
        // must take canvas size into account!
        const canvasFactorX = canvasWidth/1000;
        const scaledWidth = this.width*this.scale * canvasFactorX;
        const scaledHeight = this.height*this.scale * canvasFactorX;

    }
}

class Sprite {

    /**
     * @type {Position}
     */
    position;
    /**
     * @type {number}
     */
    angle = 0;
    /**
     * @type {HTMLImageElement}
     */
    img;
    /**
     * @type {number}
     */
    zOrder = 0;
    /**
     * @type {number}
     */
    width;
    /**
     * @type {number}
     */
    height;
    /**
     * @type {number}
     */
    scale = 1;
    /**
     * @type {boolean}
     */
    isGUI = false;
    /**
     * @type {boolean}
     */
    isGUIControl = false;
    /**
     * @type {Rectangle}
     */
    touchBox;
    /**
     * @type {Position}
     */
    center;

    /**
     * 
     * @param {Position} position 
     * @param {number} width 
     * @param {number} height 
     * @param {number} scale 
     */
    constructor(position, width, height, scale, isGUI) {
        this.position = position;
        this.width = width;
        this.height = height;
        this.scale = scale;
        if (typeof(isGUI) != "undefined") {
            this.isGUI = isGUI;
        }
    }

    /**
     * 
     * @param {string} url 
     * @returns {Promise}
     */
    loadImage(url) {
        this.img = new Image();
        this.img.src = url;
        const promise = new Promise(resolve => {
            this.img.onload = () => resolve();
            this.img.onerror = () => resolve();
        });
        return promise;
    }

    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} dx 
     * @param {number} dy 
     */
    draw(ctx, dx, dy) {
        //ctx.drawImage(img.img, 0+(32*img.step), 0, 32, 32, p.x+dx - p.z*192/2, -p.y+dy, p.z * 192, -p.z * 192);
        // must take canvas size into account!
        const canvasFactorX = canvasWidth/1000;
        let scaledWidth = this.width*this.scale * canvasFactorX;
        let scaledHeight = this.height*this.scale * canvasFactorX;

        //const dashHeight = dash.height*dash.scale * canvasFactorX *0.5; // could calc in onResize, save a few cycles...

        // now missing: canvas width/heigth must effect x/y positioning of sprites!! Or stuff will be placed differently on different size screens...
        // treat these sprites as GUI. Must use canvasHeight to calculate where they start from on the y-axis... 
        // Track, etc, must use canvasHeight to calculate where they end on the y-axis...
        // Should probably redo positions for all current sprites (GUI), so they start from 0 y... and then add the y offset calculated... (should only recalc on resize...)
        let posY = 0;
        if (this.isGUI) {
            //offsetY = guiStartY - dy; // don't start at center, so subtrct dy.
            // need to subtract some of the height of the dash, too, so dash top is always same relative height from bottom...
            posY = canvasHeight + this.position.y*canvasFactorX - dash.calculatedDashHeight;
        }
        else {
            posY = this.position.y /*+ offsetY + dy*/;
        }
        let posX = this.position.x *canvasFactorX + dx - scaledWidth/2;
        if (this == stick) {
            posX += stick.headPosition.x*canvasFactorX;
            posY += stick.headPosition.y*canvasFactorX;
        }
        else {
            
        }
        //console.log("y placed", this.position.y + offsetY + dy, this)

        if (this instanceof Pedal) {
            // draw pedal root first... need to draw from this.position.y to dash...
            let rootPosY = posY;
            const rootScaledWidth = this.rootWidth*this.scale * canvasFactorX;
            const rootScaledHeight = this.rootHeight*this.scale * canvasFactorX;
            const topPosY = canvasHeight + dash.position.y*canvasFactorX - dash.calculatedDashHeight + 150*canvasFactorX;
            do {
                ctx.drawImage(this.rootImage, 0, 0, this.rootWidth, this.rootHeight, posX, rootPosY, rootScaledWidth, rootScaledHeight);
                rootPosY -= rootScaledHeight;
            } while (rootPosY > topPosY);
        }
        
        if (this.angle != 0) {
            ctx.save();
            ctx.translate(this.center.x, this.center.y);
            ctx.rotate(this.angle);
            ctx.translate(-this.center.x, -this.center.y);
        }
        ctx.drawImage(this.img, 0, 0, this.width, this.height, posX, posY, scaledWidth, scaledHeight);
        if (this.angle != 0) {
            ctx.restore();
        }
        //ctx.strokeText("0", p.x+dx, -p.y+dy);
        /*if (img.maxSteps == img.step) {
            img.step = 0;
        }
        else {
            img.step++;
        }*/
    }

    reCalcTouchBox() {
        if (this.isGUIControl) {
            const canvasFactorX = canvasWidth/1000;
            const scaledWidth = this.width*this.scale * canvasFactorX;
            const scaledHeight = this.height*this.scale * canvasFactorX;

            const dx = canvasWidth / 2;
            //const dy = canvasHeight / 2;

            //const dashHeight = dash.height*dash.scale * canvasFactorX *0.5; // could calc in onResize, save a few cycles...

            let posY = canvasHeight - dash.calculatedDashHeight + this.position.y*canvasFactorX;

            this.touchBox = new Rectangle(new Position(this.position.x *canvasFactorX + dx - scaledWidth/2, posY), new Position(this.position.x *canvasFactorX + dx + scaledWidth/2, posY),
                                        new Position(this.position.x *canvasFactorX + dx - scaledWidth/2, posY + scaledHeight), new Position(this.position.x *canvasFactorX + dx + scaledWidth/2, posY + scaledHeight) );
            //console.log("touchbox", this, this.touchBox)
            this.reCalcCenter();
        }
    }

    reCalcCenter() {

        this.center = new Position(
            this.touchBox.bottomLeft.x + (this.touchBox.bottomRight.x-this.touchBox.bottomLeft.x)/2,
            this.touchBox.topLeft.y + (this.touchBox.bottomLeft.y - this.touchBox.topLeft.y)/2
        );
    }
}

// track should ideally be drawn on an image on resize, and the image should be drawn each draw()
class Track extends Sprite {
    //offscreenCanvas = document.createElement("canvas");
    /**
     * @type {number}
     */
    //cWidth;
    /**
     * @type {number}
     */
    //cHeight;
    /**
     * @type {HTMLImageElement}
     */
    guideImg;
    constructor() {
        super(new Position(0,0), 800, 600, 1);
        this.zOrder = 0;
    }

    loadImage() {
        //return new Promise();
        return super.loadImage(gameFolder + "track.png");
    }

    loadGuideImage() {
        this.guideImg = new Image();
        this.guideImg.src = gameFolder + "track_guide.png";
        const promise = new Promise(resolve => {
            this.guideImg.onload = () => resolve();
            this.guideImg.onerror = () => resolve();
        });
        return promise;
    }

    reCalcTouchBox() {
        
    }

    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} dx 
     * @param {number} dy 
     */
    draw(ctx, dx, dy) {
        ctx.drawImage(this.img, 0, 0, this.width, this.height, this.position.x, this.position.y, canvasWidth, wheel.touchBox.topLeft.y);
    }

    /*detectCollision(car) {
        // size guideImg same as track img (canvasWidth, wheel.touchBox.topLeft.y) and check for red/blue pixels on guideImg vs car...
    }*/


    /*reCalcTouchBox() {
        // called from onResize()

        // draw track on image
        
        if (wheel) {
            const canvasFactorX = canvasWidth/1000;
            this.cWidth = canvasWidth;
            this.cHeight = wheel.touchBox.topLeft.y;
            this.offscreenCanvas.width = this.cWidth;
            this.offscreenCanvas.height = this.cHeight;

            const ctx = this.offscreenCanvas.getContext("2d");
            ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
            ctx.lineWidth = 160*canvasFactorX;
            //ctx.fillStyle = 'rgba(0, 150, 255, 1)';

            ctx.clearRect(0, 0, this.cWidth, this.cHeight);

            ctx.beginPath();
            ctx.moveTo(120*canvasFactorX, this.cHeight/2);
            ctx.lineTo(120*canvasFactorX, 340*canvasFactorX);
            ctx.quadraticCurveTo(120*canvasFactorX, 0, 420*canvasFactorX, 200*canvasFactorX);
            ctx.quadraticCurveTo(this.cWidth+120*canvasFactorX, 340*canvasFactorX, this.cWidth - 420*canvasFactorX, 400*canvasFactorX);
            ctx.lineTo(340*canvasFactorX, 420*canvasFactorX);
            ctx.quadraticCurveTo(120*canvasFactorX, 420*canvasFactorX, 620*canvasFactorX, 620*canvasFactorX);
            ctx.quadraticCurveTo(this.cWidth+120*canvasFactorX, 720*canvasFactorX, 420*canvasFactorX, 920*canvasFactorX);
            ctx.quadraticCurveTo(120*canvasFactorX, this.cHeight/2 + 120*canvasFactorX, 120*canvasFactorX, this.cHeight/2);
            ctx.stroke();


            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            const startX = 160*canvasFactorX/2;
            ctx.moveTo(120*canvasFactorX-startX, this.cHeight/2);
            ctx.lineTo(120*canvasFactorX-startX, 340*canvasFactorX);
            ctx.quadraticCurveTo(120*canvasFactorX-startX, 0-startX, 420*canvasFactorX, 200*canvasFactorX-startX);

            ctx.quadraticCurveTo(this.cWidth+120*canvasFactorX+startX, 340*canvasFactorX-startX/2, this.cWidth - 420*canvasFactorX+startX, 400*canvasFactorX+startX);
            ctx.lineTo(340*canvasFactorX+startX*2, 420*canvasFactorX+startX);
            //ctx.quadraticCurveTo(120*canvasFactorX, 420*canvasFactorX, 620*canvasFactorX, 620*canvasFactorX);
            //ctx.quadraticCurveTo(this.cWidth+120*canvasFactorX, 720*canvasFactorX, 420*canvasFactorX, 920*canvasFactorX);
            //ctx.quadraticCurveTo(120*canvasFactorX, this.cHeight/2 + 120*canvasFactorX, 120*canvasFactorX, this.cHeight/2);
            ctx.stroke();
            
            

            console.log("cwidth", this.cWidth, this.cHeight)

        }
    }

    /
      
      @param {CanvasRenderingContext2D} ctx 
      @param {number} dx 
      @param {number} dy 
     /
    draw(ctx, dx, dy) {
        // draw image of track
        if (wheel) {
            ctx.drawImage(this.offscreenCanvas, 0, 0);
        }
    }*/

}

const CarImageByIndex = [
    {x: 65, y: 79, width: 27, height: 50}, // 0
    {x: 93, y: 83, width: 27, height: 49},
    {x: 149, y: 88, width: 28, height: 48},
    {x: 86, y: 133, width: 28, height: 49}, // 3
    {x: 114, y: 134, width: 29, height: 49},
    {x: 144, y: 137, width: 29, height: 49}, // 5
];

const CarInitialPositionByIndex = [
    new Position(400, 90), // 0
    new Position(380, 120), // 1
    new Position(370, 150),
    new Position(360, 180), // 3
    new Position(350, 210),
    new Position(340, 240), // 5
]

class Car extends Sprite {
    /**
     * @type {{x: number, y: number, width: number, height: number}}
     */
    carImg;
    /**
     * @type {number}
     */
    rpm = 500;
    /**
     * @type {number}
     */
    speed = 0;
    /**
     * @type {boolean}
     */
    engineRunning = true;
    constructor(index) {
        super(new Position(0,0), 0, 0, 1);
        this.carImg = CarImageByIndex[index];
        this.width = this.carImg.width;
        this.height = this.carImg.height;
        this.position = CarInitialPositionByIndex[index];
        this.angle = Math.PI/2;
    }
    // samme coordinates som track? Endrer seg ved resize. Må kanskje ha eget coordssystem for bilene,
    // som regnes om til track sitt ved drawing og collision-detection, osv??

    reCalcTouchBox() {
    }

    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        // må size ut fra canvas (width bare?)
        const canvasFactorX = canvasWidth/1000;
        const scaledWidth = this.width*this.scale * canvasFactorX;
        const scaledHeight = this.height*this.scale * canvasFactorX;

        const posX = this.position.x*canvasFactorX;
        const posY = this.position.y* (wheel.touchBox.topLeft.y/1000);

        this.center = new Position(posX + scaledWidth/2, posY + scaledHeight/1.5);

        //ctx.drawImage(this.img, 0, 0, this.width, this.height, posX, posY, canvasWidth, wheel.touchBox.topLeft.y);


        if (this.angle != 0) {
            ctx.save();
            ctx.translate(this.center.x, this.center.y);
            ctx.rotate(this.angle);
            ctx.translate(-this.center.x, -this.center.y);
        }
        ctx.drawImage(this.img, this.carImg.x, this.carImg.y, this.width, this.height, posX, posY, scaledWidth, scaledHeight);
        if (this.angle != 0) {
            ctx.restore();
        }
    }

    startedSound = false;
    prevRPM = null;

    /**
     * 
     * @param {boolean} stalled 
     */
    missGeared(stalled) {
        console.log("misgeared!, stall?", stalled)
        if (stalled) {
            // play stall sound
        }
        else {
            // play misGear sound
        }
        this.rpm = 0;
        this.engineRunning = false;
        button.engineStopped();
    }

    startEngine() {
        // play engine start sound?
        this.engineRunning = true;
        button.engineStarted();
    }

    minTimeBetweenChange = 100;
    timeBetweenChange = 100;
    playCarSounds(delta) {
        if (soundsLoaded) {
            if (this.engineRunning) {
                if (!this.startedSound) {
                    sound.engine.s.loop = true;
                    sound.engine.s.volume = 1;
                    sound.engine.s.play();
                    this.startedSound = true;
                }
                //sound.engine.s.
                // pitch from 1 to 4 or so... gas is 0 to 100. 0 gas => 1 pitch, 100 gas => 4ish pitch
                // TODO: sound clips now, when changing gas, since we stop and restart.. should do something to not update each run or something, less clipping..
                if ( (this.prevRPM == null && this.rpm > 0)
                        || this.prevRPM != this.rpm) {
                    this.timeBetweenChange += delta;
                    if (this.timeBetweenChange > this.minTimeBetweenChange) {
                        sound.engine.s.pause();
                        sound.engine.s.playbackRate =  this.rpm/1200; //this.rpm*this.rpm/250000;
                        //console.log("sound.engine.s.playbackRate", sound.engine.s.playbackRate)
                        sound.engine.s.play();
                        this.prevRPM = this.rpm;
                        this.timeBetweenChange = 0;
                    }
                }
            }
            else {
                if (this.startedSound) {
                    sound.engine.s.pause();
                    this.startedSound = false;
                }
            }
        }
    }

    /**
     * Called in MainLoop.update(). Only called on Player's car
     * @param {number} delta 
     */
    update(delta) {
        this.playCarSounds(delta);
        // if car in gear, move according to gear and gas... or stop engine or something if geared too high??

        // need to calc rpms... and stuff
        // rpms from 500 to 5000, say, with best between 1500 to 3000.
        // struggles under 500 and over 5000

        // calculate target rpm/speed from gas*clutch*gear-ratio

        const rpmChangeRate = 0.8;
        //const speedChangeRate = 0.05;
        
        if (!this.engineRunning || clutch.percentEngaged >= 80) {
            // gear doesnt matter...
            // speed should be gradually decreased...
            // TODO: if engine stopped and is in gear, would be like hitting the brakes, I guess..?
            this.speed -= .002*delta; //need testing
            if (this.speed < 0) {
                this.speed = 0;
            }
        }

        
        const deltaFactor = delta*0.01;

        let gearRatio = 65;
        let dragRatio = 0;
        let gearSpeedRatio = 0;
        let gearLowerLimit = 500;
        let gearUpperLimit = 10000;


        if (this.engineRunning && clutch.percentEngaged < 80) {
            if (stick.inGear == Gear.First) {
                
                gearRatio = 65;
                dragRatio = 10;
                gearSpeedRatio = 0.05;
                gearLowerLimit = 500;
                gearUpperLimit = 10000;
            }
            else if (stick.inGear == Gear.Second) {
                // speed from 15ish to 60ish. 
                // if speed was under 15ish, problem!
                // if speed was over 60ish, problem!!

                gearRatio = 60;
                dragRatio = 20;
                gearSpeedRatio = 0.08;
                gearLowerLimit = 900;
                gearUpperLimit = 10000;
            }
            else if (stick.inGear == Gear.Third) {
                // speed from 35ish to 70ish. 
                // if speed was under 35ish, problem!
                // if speed was over 70ish, problem!!

                gearRatio = 50;
                dragRatio = 25;
                gearSpeedRatio = 0.018;
                gearLowerLimit = 1500;
                gearUpperLimit = 10000;
            }
            else if (stick.inGear == Gear.Fourth) {
                // speed from 45ish to 90ish. 
                // if speed was under 45ish, problem!
                // if speed was over 90ish, problem!!

                gearRatio = 45;
                dragRatio = 30;
                gearSpeedRatio = 0.025;
                gearLowerLimit = 1500;
                gearUpperLimit = 10000;
            }
            else if (stick.inGear == Gear.Fifth) {
                // speed from 55ish to 100ish. 
                // if speed was under 55ish, problem!
                // if speed was over 100ish, problem!!

                gearRatio = 40;
                dragRatio = 35;
                gearSpeedRatio = 0.030;
                gearLowerLimit = 1500;
                gearUpperLimit = 10000;
            }
            else if (stick.inGear == Gear.Sixth) {
                // speed from 75ish to 120ish. 
                // if speed was under 75ish, problem!

                gearRatio = 35;
                dragRatio = 40;
                gearSpeedRatio = 0.035;
                gearLowerLimit = 1500;
                gearUpperLimit = 10000;
            }
            else if (stick.inGear == Gear.Rev) {
                // speed from 0 to -20ish.
                // should be impossible to put in Rev if speed is > 0.
                gearRatio = 60;
                dragRatio = 10;
                gearSpeedRatio = -0.007;
                gearLowerLimit = 1500;
                gearUpperLimit = 10000;
            }
        }

        //const canvasFactorX = canvasWidth/1000;

        //const targetRPM = gas.percentEngaged*((100-clutch.percentEngaged)/100)*gearRatio;
        //const targetSpeed = targetRPM * gearSpeedRatio;
        let targetRPM = (10+gas.percentEngaged)*gearRatio;
        // drag from car if clutch is not > 80% engaged:
        let drag = (90-clutch.percentEngaged)*dragRatio;
        notDone! // use speed to affect drag, so more speed = less drag! and up dragRatio of higher gears... find proper rpms/speeds of gears first, then find proper limits...
        // car drags with x amount of force. If engine outputs less force than that, engine stalls? blalal
        targetRPM -= drag;
        if (targetRPM < 0) {
            targetRPM = 0;
        }

        const targetSpeed = targetRPM * gearSpeedRatio * ((90-clutch.percentEngaged)/100);
        
        console.log("targetRPM, speed", targetRPM, targetSpeed, this.rpm, this.speed, (targetRPM - this.rpm)*deltaFactor*rpmChangeRate)

        // move rpm towards targetRPM
        // move speed towards targetSpeed
        // if rpm goes below 500 or above 5000 or so, missgear...
        let rpmChange = (targetRPM - this.rpm)*deltaFactor*rpmChangeRate;
        if (Math.abs(rpmChange) > 450) {
            this.missGeared(rpmChange > 0? true : false);
            return;
        }

        if (Math.abs(rpmChange) < 1) {
            this.rpm = targetRPM;
        }
        else {
            this.rpm += rpmChange;
        }
        let speedChange = (targetSpeed - this.speed)*deltaFactor*rpmChangeRate;
        if (speedChange < 0 && (stick.inGear == null || clutch.percentEngaged > 0) ) {
            // Kan ikke gå rett til 0 her, om har trykket inn clutch++/fri!!!
            let brakingFactor = 1;
            if (stick.inGear) {
                brakingFactor = 0.05 + ((100-clutch.percentEngaged)/100) * 0.5;
            }
            else {
                brakingFactor = 0.05;
            }
            speedChange *= brakingFactor;
        }
        if (Math.abs(speedChange) < 0.3) {
            this.speed = targetSpeed;
        }
        else {
            this.speed += speedChange;
        }

        //console.log("new rpm,speed", this.rpm, this.speed)

        // Need to take speed into account on drag
        let rpmFromSpeed = targetRPM;
        if (Math.abs(this.speed) > 0 && gearSpeedRatio != 0) {
            rpmFromSpeed = (this.speed * ((100-clutch.percentEngaged)/100) )/gearSpeedRatio;
        }

        //  probably need custom check for each gear for stalling++...
        const rpmToCheck = Math.max(targetRPM, rpmFromSpeed);
        //if (stick.inGear == Gear.First || stick.inGear == Gear.Second) {
        /*if (stick.inGear) {
            if (rpmToCheck < 500) {
                this.missGeared(true);
            }
            else if (rpmToCheck > 10000) {
                this.missGeared(false);
            }
        }*/
        gearLowerLimit = gearLowerLimit + 150 * (clutch.percentEngaged)/100;
        gearUpperLimit = gearUpperLimit + 150 * (clutch.percentEngaged)/100;
        if (rpmToCheck < gearLowerLimit) {
            this.missGeared(true);
            return;
        }
        else if (rpmToCheck > gearUpperLimit) {
            this.missGeared(false);
            return;
        }

        /*if (this.rpm < 500 || (this.inGear != Gear.Rev && targetRPM < 0)) {
            this.missGeared(true);
            return;
        }
        else if (this.rpm > 6000) {
            this.missGeared(false);
            return;
        }*/

        if (this.speed != 0) {
            // move car according to speed and wheel.angle. Adjust this.angle gradually...
            this.moveCar(delta);
        }
    }

    moveCar(delta) {

        // use this.speed and wheel.angle to move car and adjust this.angle
        // "center" of turn will be closer to car the steeper the angle of turn. Relative y-"center" should be approximately where the front wheels are..

        // find x and y from speed and angle..
        const canvasFactorX = canvasWidth/1000;
        const speedFactor = delta * canvasFactorX * 0.001;
        const turnFactor = 0.03;
        //console.log("this.speed", this.speed);
        
        let x = -Math.sin(this.angle + Math.PI) * this.speed;;
        let y = Math.cos(this.angle + Math.PI) * this.speed;

        if (Math.abs(x) > 0 || Math.abs(y) > 0) {
            //console.log("old pos", this.position)
            this.position.x += x*speedFactor;
            this.position.y += y*speedFactor;
            //console.log("new pos", this.position)

            // gradually adjust angle according to wheel angle...
            const targetAngle = (this.angle + wheel.angle);
            //console.log("this angle, wheel.angle", this.angle, wheel.angle+Math.PI/2, targetAngle)
            //debugger;
            const adjustment = (targetAngle - this.angle)/4;

            this.angle += adjustment*this.speed*speedFactor*turnFactor;

        }
    }

}

class Dash extends Sprite {
    /**
     * @type {number}
     */
    calculatedDashHeight;
    constructor() {
        super(new Position(0,0), 1024, 1024, 1, true);
        this.zOrder = 1;
    }

    loadImage() {
        return super.loadImage(gameFolder + "dash.png");
    }

    reCalcTouchBox() {
        const canvasFactorX = canvasWidth/1000;
        this.calculatedDashHeight = this.height*this.scale * canvasFactorX *0.5; // could calc in onResize, save a few cycles...
        super.reCalcTouchBox();
    }
}

class DashShadow extends Sprite {
    constructor() {
        super(new Position(0,0), 1024, 1024, 1, true);
        this.zOrder = 2;
    }

    loadImage() {
        return super.loadImage(gameFolder + "dash_shadow.png");
    }
}

class Wheel extends Sprite {

    constructor() {
        super(new Position(-30, -80), 642, 642, 0.55, true);
        this.zOrder = 4;
        this.isGUIControl = true;
    }

    loadImage() {
        return super.loadImage(gameFolder + "wheel.png");
    }
}

class Button extends Sprite {

    /**
     * @type {HTMLImageElement}
     */
    imgEngineOn;
    /**
     * @type {HTMLImageElement}
     */
    imgEngineOff;

    constructor() {
        super(new Position(-410, 30), 35, 35, 2, true);
        this.zOrder = 2;
        this.isGUIControl = true;
    }

    clicked() {
        if (this.img == this.imgEngineOff) {
            // start engine...
            player.car.startEngine();
        }
    }

    engineStopped() {
        this.img = this.imgEngineOff;
    }

    engineStarted() {
        this.img = this.imgEngineOn;
        // play engine start sound..?
    }

    loadImage() {
        const promise = super.loadImage(gameFolder + "button.png");
        this.imgEngineOn = this.img;
        return promise;
    }

    loadImageEngineOff() {
        const promise = super.loadImage(gameFolder + "button_lit.png");
        this.imgEngineOff = this.img;
        if (this.imgEngineOn) {
            this.img = this.imgEngineOn;
        }
        return promise;
    }
}

class GearBase extends Sprite {

    constructor() {
        super(new Position(330, -120), 431, 571, 0.6, true);
        this.zOrder = 3;
    }

    loadImage() {
        return super.loadImage(gameFolder + "stick_base.png");
    }
}

const Gear = {
    Rev: -1, First: 1, Second: 2, Third: 3, Fourth: 4, Fifth: 5, Sixth: 6
};

class GearStick extends Sprite {

    /**
     * @type {Position}
     */
    headPosition;
    /**
     * @type {Gear}
     */
    inGear = null;

    constructor() {
        super(new Position(330, -90), 431, 571, 0.6, true);
        this.zOrder = 4;
        this.isGUIControl = true;
        this.headPosition = new Position(0,0);
    }

    loadImage() {
        return super.loadImage(gameFolder + "stick_alone.png");
    }

    /**
     * 
     * @param {number} moveX 
     * @param {number} moveY 
     * @param {boolean} doubleTouch
     */
    move(moveX, moveY, doubleTouch) {
        
        // needs to move along "tracks". 
        // Doubleclick or something first, to allow reverse?
        // need rotation or something after tracks movement is working... should be "connected" to base...
        // should start in neutral... may need to adjust angle/pos from what it currently is...

        const canvasFactorX = canvasWidth/1000;
        const moveXScaled = moveX / canvasFactorX;
        const moveYScaled = moveY / canvasFactorX;

        /*
        R      1     3      5   -20y
        |      |     |      |
        -30x  -10 ---0----- 20
               |     |      |
               2     4      6  20y
        */

        if (clutch.percentEngaged >= 80) {
            if (this.headPosition.x >= -40 && this.headPosition.x < -30) {
                // reverse, can move between 0 and -20 along y-axis..
                this.headPosition.y += moveYScaled;
                if (this.headPosition.y > 0 && moveYScaled > 0) {
                    this.headPosition.y = 0;
                }
                if (this.headPosition.y <= -15 && moveYScaled < 0) {
                    this.headPosition.y = -20;
                    // in Reverse
                    this.inGear = Gear.Rev;
                    //console.log("Rev")
                }
            }
            else if (this.headPosition.x >= -25 && this.headPosition.x <= -15) {
                // can move on y-axis from -20 to 20 (1st to 2nd gear)
                this.headPosition.y += moveYScaled;
                if (this.headPosition.y > 15 && moveYScaled > 0) {
                    this.headPosition.y = 20;
                    // in 2nd gear
                    this.inGear = Gear.Second;
                    //console.log("2nd")
                }
                if (this.headPosition.y <= -15 && moveYScaled < 0) {
                    this.headPosition.y = -20;
                    // in 1st gear
                    this.inGear = Gear.First;
                    //console.log("1st")
                }
            }
            else if (this.headPosition.x >= -5 && this.headPosition.x <= 5) {
                // can move on y-axis from -20 to 20  (3rd to 4th gear)
                this.headPosition.y += moveYScaled;
                if (this.headPosition.y > 15 && moveYScaled > 0) {
                    this.headPosition.y = 20;
                    // in 4th gear
                    this.inGear = Gear.Fourth;
                    //console.log("4th")
                }
                if (this.headPosition.y <= -15 && moveYScaled < 0) {
                    this.headPosition.y = -20;
                    // in 3rd gear
                    this.inGear = Gear.Third;
                    //console.log("3rd")
                }
            }
            else if (this.headPosition.x >= 15 && this.headPosition.x <= 20) {
                // can move on y-axis from -20 to 20  (5th to 6th gear)
                this.headPosition.y += moveYScaled;
                if (this.headPosition.y > 15 && moveYScaled > 0) {
                    this.headPosition.y = 20;
                    // in 6th gear
                    this.inGear = Gear.Sixth;
                    //console.log("6th")
                }
                if (this.headPosition.y <= -15 && moveYScaled < 0) {
                    this.headPosition.y = -20;
                    // in 5th gear
                    this.inGear = Gear.Fifth;
                    //console.log("5th")
                }
            }
        }

        if (Math.abs(this.headPosition.y) < 15) {
            this.inGear = null;
        }

        // TODO: Ikke tillat bevegelser under -25 x hvis gir gass eller har fart!!! (skal ikek vaære mulig å sette i revers da)
        if (Math.abs(this.headPosition.y) <= 5) {
            // free on x-axis
            this.headPosition.x += moveXScaled;
            if ((!doubleTouch || Math.abs(player.car.speed) > 0 || gas.percentEngaged > 0) && this.headPosition.x < -25) {
                // don't allow rev if 
                this.headPosition.x = -25;
            }
            if (this.headPosition.x < -30) {
                this.headPosition.x = -40;
            }
            if (this.headPosition.x > 20) {
                this.headPosition.x = 20;
            }
        }
        else {
            // locked on x-axis..
        }

        //console.log("headspos", this.headPosition)
        this.reCalcTouchBox();
    }

    updateStick(delta) {
        // if none are touching stick + stick not in "locked" or completely neutral position (0,0), move towards neutral position...
        if (ongoingTouches.filter(t => t.touching).length == 0) {
            if (this.inGear == null
                    && (this.headPosition.x != 0 || this.headPosition.y != 0) ) {
                const canvasFactorX = canvasWidth/1000;
                const moveScaled = delta / canvasFactorX;
                if (this.headPosition.x > 0) {
                    this.headPosition.x -= moveScaled;
                    if (this.headPosition.x < 0) {
                        this.headPosition.x = 0;
                    }
                }
                else {
                    this.headPosition.x += moveScaled;
                    if (this.headPosition.x > 0) {
                        this.headPosition.x = 0;
                    }
                }
                if (this.headPosition.y > 0) {
                    this.headPosition.y -= moveScaled;
                    if (this.headPosition.y < 0) {
                        this.headPosition.y = 0;
                    }
                }
                else {
                    this.headPosition.y += moveScaled;
                    if (this.headPosition.y > 0) {
                        this.headPosition.y = 0;
                    }
                }
                this.reCalcTouchBox();
                
            }
        }
    }

    reCalcTouchBox() {
        super.reCalcTouchBox();

        // need to add headPosition...
        this.touchBox.moveX(this.headPosition.x);
        this.touchBox.moveY(this.headPosition.y);
    }
}

class Pedal extends Sprite {
    /**
     * @type {string}
     */
    pedalPic;
    /**
     * @type {string}
     */
    rootPic;
    /**
     * @type {Image}
     */
    rootImage;
    /**
     * @type {number}
     */
    rootWidth;
    /**
     * @type {number}
     */
    rootHeight;
    /**
     * @type {number}
     */
    minY;
    /**
     * @type {number}
     */
    maxY;
    /**
     * @type {number}
     */
    percentEngaged;

    constructor(position, width, height, scale, pedalPic, rootWidth, rootHeight, rootPic) {
        super(position, width, height, scale, true);
        this.zOrder = 0;
        this.pedalPic = pedalPic;
        this.rootPic = rootPic;
        this.rootWidth = rootWidth;
        this.rootHeight = rootHeight;
        this.isGUIControl = true;
    }

    loadImage() {
        return super.loadImage(gameFolder + this.pedalPic);
    }

    loadRootImage() {
        this.rootImage = new Image();
        this.rootImage.src = gameFolder + this.rootPic;
        const promise = new Promise(resolve => {
            this.rootImage.onload = () => resolve();
            this.rootImage.onerror = () => resolve();
        });
        return promise;
    }

    reCalcTouchBox() {
        super.reCalcTouchBox();
        const canvasFactorX = canvasWidth/1000;
        const scaledHeight = this.height*this.scale * canvasFactorX;
        this.minY = wheel.touchBox.bottomLeft.y + scaledHeight;
        this.maxY = canvasHeight;

        const fullRange = this.maxY - this.minY;
        const current = this.maxY - this.touchBox.bottomLeft.y;
        this.percentEngaged = current * 100 / fullRange;
        if (this.percentEngaged < 0) {
            this.percentEngaged = 0;
        }
    }

    /**
     * Move both position and touchBox, with correct scaling...
     * @param {number} deltaY
     */
    moveY(deltaY) {
        const canvasFactorX = canvasWidth/1000;
        const moveScaled = deltaY / canvasFactorX;
        //const dashHeight = dash.height*dash.scale * canvasFactorX *0.5; // could calc in onResize, save a few cycles...
        if (this.touchBox.topLeft.y + moveScaled < wheel.touchBox.bottomLeft.y && moveScaled < 0) {
            //let posY = canvasHeight - dashHeight + this.position.y*canvasFactorX;
            // boxY = ch - dh + y*factorx
            // boxy - ch + dh = y*factorX
            // y = (boxy - ch + dh)/factorX
            //this.position.y = dashHeight/canvasFactorX + wheel.touchBox.bottomLeft.y
            this.position.y = (wheel.touchBox.bottomLeft.y - canvasHeight + dash.calculatedDashHeight)/canvasFactorX;
        }
        else if (this.touchBox.bottomLeft.y + moveScaled >= canvasHeight && moveScaled > 0) {
            //let posY = canvasHeight - dashHeight + this.position.y*canvasFactorX;
            // boxY = ch - dh + y*factorx
            // boxy - ch + dh = y*factorX
            // y = (boxy - ch + dh)/factorX
            // boxY = ch, so => y = dh/factorx
            this.position.y = dash.calculatedDashHeight/canvasFactorX - this.height*this.scale;
        }
        else {
            this.position.y += moveScaled;
        }
        //this.touchBox.moveY(moveScaled);
        this.reCalcTouchBox();
    }
    
}

class Gas extends Pedal {

    constructor() {
        super(new Position(280, 330), 161, 216, 0.6, "accelerator_pedal.png", 161, 10, "accelerator_root.png");
    }
}

class Clutch extends Pedal {
    constructor() {
        super(new Position(-250, 330), 191, 237, 0.6, "clutch_pedal.png", 191, 21, "clutch_root.png");
    }
}

class Brake extends Pedal {
    constructor() {
        super(new Position(80, 330), 207, 185, 0.6, "brake_pedal.png", 207, 34, "brake_root.png");
    }
}

class Foot extends Sprite {

}

class Player extends Sprite {
    /**
     * @type {{nick: string, channel: RTCDataChannel}}
     */
    peer;
    /**
     * @type {Car}
     */
    car;
    constructor(position, peer) {
        super(position);
        this.peer = peer;
    }
}

/**
 * @type {Player}
 */
let player;
let nick = null;
/**
 * @type {Array.<Player>}
 */
let players = [];
/**
 * @type {HTMLDivElement}
 */
let mainDiv = null;
/**
 * @type {HTMLCanvasElement}
 */
let canvas = null;
/**
 * @type {CanvasRenderingContext2D}
 */
let ctx = null;
/**
 * @type {number}
 */
let canvasHeight = null;
/**
 * @type {number}
 */
let canvasWidth = null;

/**
 * @type {Array.<Sprite>}
 */
let entities = [];

const sound = {
    engine: {src: null, s: null},
};
let soundsLoaded = false;

const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    clutch: false,
}

/**
 * @type {Wheel}
 */
let wheel = null;
/**
 * @type {Dash}
 */
let dash = null;
/**
 * @type {GearStick}
 */
let stick = null;
/**
 * @type {Gas}
 */
let gas = null;
/**
 * @type {Brake}
 */
let brake = null;
/**
 * @type {Clutch}
 */
let clutch = null;
/**
 * @type {Button}
 */
let button = null;
/**
 * @type {Track}
 */
let track = null;

/**
 * 
 * @param {Array} allPlayers 
 * @param {boolean} areWeServer 
 * @param {string} ourNick 
 */
export function setPlayers(allPlayers, areWeServer, ourNick) {
    weAreServer = areWeServer;
    nick = ourNick;

    allPlayers.forEach((team, teamIndex, teamArr) => {
        team.forEach((plrPeer, plrIndex, plrArr) => {
            const plr = new Player(new Position(0,0), plrPeer);
            if (plrPeer.nick == nick) {
                player = plr;
            }
            plr.playPosition = [teamIndex, plrIndex];
            /*if (teamIndex == 0) {
                if (plrIndex == 0) {
                    // Should have other images for sprites facing away from camera...!!
                    // NOTDONE!
                    plr.loadImages("./games/tennis/guy_idle.png");
                }
                else {
                    plr.loadImages("./games/tennis/frog_idle.png");
                }
            }
            else {
                if (plrIndex == 0) {
                    plr.loadImages("./games/tennis/pink_idle.png");
                }
                else {
                    plr.loadImages("./games/tennis/mask_idle.png");
                }
            }*/
            players.push(plr);
        });
    });
}

function getPlayerByNick(nickToFind) {
    for (const plr of players) {
        if (plr.peer.nick == nickToFind) {
            return plr;
        }
    }
    return null;
}

function onResize(event) {
    //canvas.width = canvas.offsetWidth;
    //canvas.height = canvas.offsetHeight;

    canvasWidth = canvas.offsetWidth;
    canvasHeight = canvas.offsetHeight;

    console.log("dims", canvasWidth, canvasHeight, canvas.width, canvas.height)
  
    // If the screen device has a pixel ratio over 1
    // We render the canvas twice bigger to make it sharper (e.g. Retina iPhone)
    if (window.devicePixelRatio > 1) {
        console.log("RETINA!!")
        canvas.width = canvas.clientWidth * 2;
        canvas.height = canvas.clientHeight * 2;
        ctx = canvas.getContext("2d");
        ctx.scale(2, 2);
    } else {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    }

    for (const entity of entities) {
        entity.reCalcTouchBox(); // dash is first, and needs to be first, since it recalculates dash.calculatedDashHeight, which is used in the others...
    }

    if (wheel) {
        const topOfWheel = canvasHeight - wheel.touchBox.topLeft.y;
        const centerWheel = canvasHeight - wheel.center.y;
        mainDiv.style.backgroundImage = `linear-gradient(0, #EEE ${centerWheel}px, green ${topOfWheel}px)`;
    }
}

/**
 * 
 * @returns {Array.<Promise>}
 */
function createEntities() {

    const promises = [];

    dash = new Dash();
    entities.push(dash);
    promises.push(dash.loadImage());

    const dashShadow = new DashShadow();
    entities.push(dashShadow);
    promises.push(dashShadow.loadImage());

    button = new Button();
    entities.push(button);
    promises.push(button.loadImage());
    promises.push(button.loadImageEngineOff());

    wheel = new Wheel();
    entities.push(wheel);
    promises.push(wheel.loadImage());

    const gearBase = new GearBase();
    entities.push(gearBase);
    promises.push(gearBase.loadImage());

    stick = new GearStick();
    entities.push(stick);
    promises.push(stick.loadImage());

    gas = new Gas();
    entities.push(gas);
    promises.push(gas.loadImage());
    promises.push(gas.loadRootImage());

    brake = new Brake();
    entities.push(brake);
    promises.push(brake.loadImage());
    promises.push(brake.loadRootImage());

    clutch = new Clutch();
    entities.push(clutch);
    promises.push(clutch.loadImage());
    promises.push(clutch.loadRootImage());

    track = new Track();
    entities.push(track);
    promises.push(track.loadImage());
    promises.push(track.loadGuideImage());

    const carImg = new Image();
    carImg.src = gameFolder + "cars.png";
    const promise = new Promise(resolve => {
        carImg.onload = () => resolve();
        carImg.onerror = () => resolve();
    });
    promises.push(promise);

    for (let i=0; i < players.length; i++) {
        const plr = players[i];
        plr.car = new Car(i);
        plr.car.img = carImg;
        entities.push(plr.car);
    }
    // Just for testing with one player. REMEMBER TO REMOVE!:
    let car = new Car(1);
    car.img = carImg;
    entities.push(car);
    car = new Car(2);
    car.img = carImg;
    entities.push(car);
    car = new Car(3);
    car.img = carImg;
    entities.push(car);
    car = new Car(4);
    car.img = carImg;
    entities.push(car);
    car = new Car(5);
    car.img = carImg;
    entities.push(car);
        
    

    return promises;
}
function destroyEntities() {
    entities = [];
    dash = null;
    wheel = null;
    stick = null;
    gas = null;
    brake = null;
    clutch = null;
    track = null;
    for (const plr of players) {
        plr.car = null;
    }
}

/**
 * 
 * @param {Pedal} pedal 
 */
function movePedalToStartPosition(pedal, delta) {
    if (ongoingTouches.filter((t) => t.touching == pedal).length == 0) {
        // none touching
        if (pedal.touchBox.bottomLeft.y < canvasHeight) {
            pedal.moveY(delta*0.2);
        }
    }
}

function updatePedals(delta) {
    if (keys.up) {
        gas.moveY(-delta*0.1);
    }
    else if (keys.down) {
        gas.moveY(delta*0.1);
    }
    else {
        //movePedalToStartPosition(gas, delta);
    }
    movePedalToStartPosition(brake, delta);
    if (keys.clutch) {
        clutch.moveY(-delta*0.2);
    }
    else {
        movePedalToStartPosition(clutch, delta);
    }
}

/**
 * 
 * @returns {Array.<Promise>}
 */
function loadSounds() {
    const promises = [];

    sound.engine.src = gameFolder + "engine_fixed.mp3";

    Sounds.sounds.load([sound.engine.src]);

    const promise = new Promise(resolve => {
        Sounds.sounds.whenLoaded = () => {
            sound.engine.s = Sounds.sounds[sound.engine.src];
            soundsLoaded = true;
            resolve();
        };
    });
    promises.push(promise);

    return promises;
}
function unLoadSounds() {
    // not found way to unload yet... (not really looked hard, either...)
}

function assetsLoaded() {
    MainLoop.start();
}



function keyDown(e) {
    if (e.code === "ArrowUp" || e.key.toUpperCase() == "W") {
        keys.up = true;
    } else if (e.code === "ArrowDown" || e.key.toUpperCase() == "S") {
        keys.down = true;
    } else if (e.code === "ArrowLeft" || e.key.toUpperCase() == "A") {
        keys.left = true;
    } else if (e.code === "ArrowRight" || e.key.toUpperCase() == "D") {
        keys.right = true;
    } else if (e.key.toUpperCase() == "Q") {
        keys.clutch = true;
    }
    else if (e.code === "Space" || e.code === "Enter") {
        // not sure yet...   
        //keys.hit = true;
        
    }
}

function keyUp(e) {
    if (e.code === "ArrowUp" || e.key.toUpperCase() == "W") {
        keys.up = false;
    } else if (e.code === "ArrowDown" || e.key.toUpperCase() == "S") {
        keys.down = false;
    } else if (e.code === "ArrowLeft" || e.key.toUpperCase() == "A") {
        keys.left = false;
    } else if (e.code === "ArrowRight" || e.key.toUpperCase() == "D") {
        keys.right = false;
    } else if (e.key.toUpperCase() == "Q") {
        keys.clutch = false;
    }
    else if (e.code === "Space" || e.code === "Enter") {
        /*const plr = player; // testing with close player
        ball.reset(plr);
        ball.testShoot(plr);*/
        //keys.hit = false;
        //keys.hit = 10;
        //player.hit();
    }
}


/**
 * @type {Array.<{identifier: string, pageX: number, pageY: number, touching: Sprite, doubleTouch: boolean}>}
 */
let ongoingTouches = [];

/**
 * 
 * @param {{ identifier: string, pageX: number, pageY: number }} param0 
 * @returns {{identifier: string, pageX: number, pageY: number, touching: Sprite, doubleTouch: boolean}}
 */
function copyTouch({ identifier, pageX, pageY }) {
    return { identifier, pageX, pageY, doubleTouch: false };
}

function ongoingTouchIndexById(idToFind) {
    for (let i = 0; i < ongoingTouches.length; i++) {
        const id = ongoingTouches[i].identifier;

        if (id === idToFind) {
            return i;
        }
    }
    return -1; // not found
}

/**
 * @type {{identifier: string, pageX: number, pageY: number, touching: Sprite, when: number}}
 */
let lastTouch = null;

/**
 * 
 * @param {TouchEvent} event 
 */
function touchStart(event) {
    event.preventDefault();

    for (const touch of event.changedTouches) {
        const t = copyTouch(touch);
        ongoingTouches.push(t);
        // find entity to associate with touch..
        // need to know actual position of the different GUI entities..
        //console.log("touch.pos, ", touch.pageX, touch.pageY, wheel.position)
        for (const entity of entities) {
            if (entity.touchBox && entity.touchBox.isTouching(touch.pageX, touch.pageY)) {
                //console.log("touching", entity)
                t.touching = entity;
            }
        }

        if (lastTouch != null && lastTouch.touching == t.touching && Date.now() - lastTouch.when <= 300) {
            // doubletouch..
            t.doubleTouch = true;
        }
        else {
            if (t.touching) {
                lastTouch = t;
                lastTouch.when = Date.now();
            }
            t.doubleTouch = false;
        }
    }
}

/**
 * 
 * @param {TouchEvent} event 
 */
function touchMove(event) {
    for (const touch of event.changedTouches) {
        const idx = ongoingTouchIndexById(touch.identifier);
        if (idx >= 0) {
            // old pos in ongoingTouches[idx], new in touch
            const prevTouch = ongoingTouches[idx];
            const newTouch = copyTouch(touch);
            newTouch.doubleTouch = prevTouch.doubleTouch;
            const entity = prevTouch.touching;
            if (entity) {

                if (entity == wheel) {
                    // get angle from center of wheel to newTouch.x/y
                    // need to have a min/max on the wheel (1.5 times around, or something? 2?)
                    // use prevTouch to figure out which way to turn wheel...
                    //wheel.center
                    //angle = Math.atan2(farHeight, nearLength); // or angle = Math.atan2(y, x);
                    const oldX = prevTouch.pageX - wheel.center.x;
                    const oldY = prevTouch.pageY - wheel.center.y;
                    const oldAngle = Math.atan2(oldY, oldX);

                    const x = newTouch.pageX - wheel.center.x;
                    const y = newTouch.pageY - wheel.center.y;
                    const newAngle = Math.atan2(y, x);
                    
                    let angleDiff = newAngle - oldAngle;
                    if (Math.abs(angleDiff) > Math.PI*1.5) {
                        // when go from - angle to + angle or other way around, just set diff to 0 to avoid the issue
                        angleDiff = 0;
                    }
                    wheel.angle += angleDiff;
                    //const maxAngle = Math.PI*2-Math.PI/4;
                    const maxAngle = Math.PI*2; // max complete turn either way
                    if (wheel.angle >= maxAngle) {
                        wheel.angle = maxAngle;
                    }
                    else if (wheel.angle <= -maxAngle) {
                        wheel.angle = -maxAngle;
                    }
                    //console.log("wheel.angale", wheel.angle, oldAngle, newAngle)
                }
                else if (entity instanceof Pedal) {
                    //const origPosY = entity.position.y;
                    //const canvasFactorX = canvasWidth/1000;
                    const diff = newTouch.pageY - prevTouch.pageY;
                    //entity.position.y += diff/canvasFactorX;
                    
                    entity.moveY(diff);
                    if (entity == gas) {
                        // håndtere her eller i Gas-klassen, osv???
                    }
                    else if (entity == clutch) {
                        
                    }
                    else if (entity == brake) {
                        
                    }
                    //entity.touchBox.moveY( (entity.position.y - origPosY)*canvasFactorX );
                }
                else if (entity == stick) {
                    const diffX = newTouch.pageX - prevTouch.pageX;
                    const diffY = newTouch.pageY - prevTouch.pageY;

                    entity.move(diffX, diffY, prevTouch.doubleTouch);
                }

            }





            // replace old touch with new
            newTouch.touching = entity;
            ongoingTouches.splice(idx, 1, newTouch);
        }
    }
}

/**
 * 
 * @param {TouchEvent} event 
 */
function touchEnd(event) {
    for (const touch of event.changedTouches) {
        const idx = ongoingTouchIndexById(touch.identifier);
        if (idx >= 0) {
            const prevTouch = ongoingTouches[idx];

            // last movement in touch.pageX/Y...
            if (prevTouch.touching && prevTouch.touching.clicked) {
                prevTouch.touching.clicked();
            }
            
            ongoingTouches.splice(idx, 1); // remove touch..
        }
    }
}

function setupKeyListeners() {
    addEventListener("keydown", keyDown);
    addEventListener("keyup", keyUp);
}

function removeKeyListeners() {
    removeEventListener("keydown", keyDown);
    removeEventListener("keyup", keyUp);
}

function registerTouchListeners() {
    mainDiv.addEventListener("touchstart", touchStart);
    mainDiv.addEventListener("touchmove", touchMove);
    mainDiv.addEventListener("touchend", touchEnd);
    mainDiv.addEventListener("touchcancel", touchEnd);
}

function unRegisterTouchListeners() {
    mainDiv.removeEventListener("touchstart", touchStart);
    mainDiv.removeEventListener("touchmove", touchMove);
    mainDiv.removeEventListener("touchend", touchEnd);
    mainDiv.removeEventListener("touchcancel", touchEnd);
}

let parentClass = null;

export function initialize(parentClss) {
    parentClass = parentClss;
    // setup canvas etc....
    mainDiv = document.getElementById("mainDiv");
    mainDiv.style.zIndex = 0;
    mainDiv.className = "fullsize fullsizeImage";
    canvas = document.createElement('canvas');
    canvas.id = "mainCanvas";
    canvas.className = "fullsize";
    canvas.style.zIndex = 1;
    mainDiv.appendChild(canvas);

    // set dash + gear base as background image, figure out how/where to place the rest ()
    // need different layout than tennis. Want dash and stuff on the bottom, with race track above...
    //mainDiv.style.backgroundColor = "white";
    //background: linear-gradient(90deg, #FFC0CB 50%, #00FFFF 50%);
    // set background in onResize, since we need to know dimensions...
    /*mainDiv.style.backgroundImage = "url('./games/learnToDrive/dash.png')";
    mainDiv.style.backgroundSize = "100%";
    mainDiv.style.backgroundPositionY = "37px";*/
    mainDiv.style.position = "absolute";
    mainDiv.style.height = "100%";
    mainDiv.style.width = "100vw";
    mainDiv.style.bottom = "0";
    mainDiv.style.left = "0";
    mainDiv.style.top = "0";
    mainDiv.style.right = "0";
    mainDiv.style.margin = "0";
    mainDiv.style.border = "0";
    mainDiv.style.padding = "0";

    // vil helst ha locked til portrait mode... denne funker nesten:
    // @media screen and (orientation: landscape) {
    //     html {
    //       /* Rotate the content container */
    //       transform: rotate(-90deg);
    //       transform-origin: left top;
    //       /* Set content width to viewport height */
    //       width: 100vh;
    //       /* Set content height to viewport width */
    //       height: 100vw;
    //       overflow-x: hidden;
    //       position: absolute;
    //       top: 100%;
    //       left: 0;
    //     }
    //   }

    /*
    touchDiv = document.createElement("div");
    touchDiv.id = "touchDiv";
    touchDiv.className = "touchDiv";
    mainDiv.parentElement.appendChild(touchDiv);

    touchImg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    touchImg.style.width = "200px";
    touchImg.style.height = "200px";
    touchImg.style.position = "absolute";
    touchImg.style.left = touchDiv.getBoundingClientRect().width/2 - 100 + "px";
    touchImg.style.top = (window.innerHeight - touchDiv.getBoundingClientRect().top)/2 - 100 + "px";
    touchImg.id = "touchImg";
    touchImg.innerHTML = '<circle class="innerCircle" cx="100" cy="100" r="30" style="fill: red; stroke: black;"></circle> <circle class="outerCircle" cx="100" cy="100" r="90" style="fill: none; stroke: red; stroke-width: 3px"></circle>';
    touchDiv.appendChild(touchImg);*/

    // setup listeners (keys/mouse/touch++, 
    setupKeyListeners();
    //setupMouseListeners();
    registerTouchListeners();
    
    // prolly need onresize, too, since that changes size of canvas...
    addEventListener("resize", onResize);
    onResize(); // get initial size
    
    const promises = createEntities();
    const allPromises = promises.concat(loadSounds());
    Promise.all(allPromises).then(assetsLoaded());

    onResize(); // force touchBoxes calc...


    /*initializeState();

    // start gameloop..?MainLoop.start() ? Or in allImagesLoaded() maybe???
    console.log("initialized tennis!")

    //playState.teamWon(0);*/
}

export function uninitialize() {
    MainLoop.stop();

    /*playState.reset();
    
    document.getElementById("touchDiv").remove();

    mainDiv.style = "display:none";
    mainDiv.className = "";*/
    
    destroyEntities();
    unLoadSounds(); // does nothing for now...

    // remove listeners (keys/mouse/touch++)
    removeEventListener("resize", onResize);
    removeKeyListeners();
    //removeMouseListeners();
    unRegisterTouchListeners();
    /*// unload images?? (possible?) (should be just to remove any references to them...)

    // remove canvas etc...
    canvas.remove();
    // need to clean up everything so that callin initialize() again works fine (clean slate)
    players = [];*/

    // remove comms listeners, clean up in parent script...
    parentClass.stopGame();
}