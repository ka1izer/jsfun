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

    moveY(y) {
        this.topLeft.y += y;
        this.topRight.y += y;
        this.bottomLeft.y += y;
        this.bottomRight.y += y;
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
     * @type {Image}
     */
    image;
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
        const scaledWidth = this.width*this.scale * canvasFactorX;
        const scaledHeight = this.height*this.scale * canvasFactorX;

        const dashHeight = dash.height*dash.scale * canvasFactorX *0.5; // could calc in onResize, save a few cycles...

        // now missing: canvas width/heigth must effect x/y positioning of sprites!! Or stuff will be placed differently on different size screens...
        // treat these sprites as GUI. Must use canvasHeight to calculate where they start from on the y-axis... 
        // Track, etc, must use canvasHeight to calculate where they end on the y-axis...
        // Should probably redo positions for all current sprites (GUI), so they start from 0 y... and then add the y offset calculated... (should only recalc on resize...)
        let posY = 0;
        if (this.isGUI) {
            //offsetY = guiStartY - dy; // don't start at center, so subtrct dy.
            // need to subtract some of the height of the dash, too, so dash top is always same relative height from bottom...
            posY = canvasHeight + this.position.y*canvasFactorX - dashHeight;
        }
        else {
            posY = this.position.y + offsetY + dy;
        }
        //console.log("y placed", this.position.y + offsetY + dy, this)

        if (this instanceof Pedal) {
            // draw pedal root first... need to draw from this.position.y to dash...
            let rootPosY = posY;
            const rootScaledWidth = this.rootWidth*this.scale * canvasFactorX;
            const rootScaledHeight = this.rootHeight*this.scale * canvasFactorX;
            const topPosY = canvasHeight + dash.position.y*canvasFactorX - dashHeight + 150*canvasFactorX;
            do {
                ctx.drawImage(this.rootImage, 0, 0, this.rootWidth, this.rootHeight, this.position.x *canvasFactorX + dx - scaledWidth/2, rootPosY, rootScaledWidth, rootScaledHeight);
                rootPosY -= rootScaledHeight;
            } while (rootPosY > topPosY);
        }
        
        if (this.angle != 0) {
            ctx.save();
            ctx.translate(this.center.x, this.center.y);
            ctx.rotate(this.angle);
            ctx.translate(-this.center.x, -this.center.y);
        }
        ctx.drawImage(this.img, 0, 0, this.width, this.height, this.position.x *canvasFactorX + dx - scaledWidth/2, posY, scaledWidth, scaledHeight);
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

            const dashHeight = dash.height*dash.scale * canvasFactorX *0.5; // could calc in onResize, save a few cycles...

            let posY = canvasHeight - dashHeight + this.position.y*canvasFactorX;

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

    /**
     * Move both position and touchBox, with correct scaling...
     * @param {number} deltaY 
     */
    moveY(deltaY) {
        const canvasFactorX = canvasWidth/1000;
        const moveScaled = deltaY / canvasFactorX;
        if (this.touchBox.topLeft.y + moveScaled < wheel.touchBox.bottomLeft.y && moveScaled < 0) {
            return;
        }
        if (this.touchBox.bottomLeft.y + moveScaled >= canvasHeight && moveScaled > 0) {
            return;
        }
        this.position.y += moveScaled;
        //this.touchBox.moveY(moveScaled);
        this.reCalcTouchBox();
    }
}

class Track extends Sprite {
    constructor() {
        super(new Position(0,0), 1024, 1024, 1);
        this.zOrder = 0;
    }
}

class Dash extends Sprite {
    constructor() {
        super(new Position(0,0), 1024, 1024, 1, true);
        this.zOrder = 1;
    }

    loadImage() {
        return super.loadImage(gameFolder + "dash.png");
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

class GearBase extends Sprite {

    constructor() {
        super(new Position(280, -80), 431, 571, 0.6, true);
        this.zOrder = 3;
    }

    loadImage() {
        return super.loadImage(gameFolder + "stick_base.png");
    }
}

class GearStick extends Sprite {

    constructor() {
        super(new Position(280, -80), 431, 571, 0.6, true);
        this.zOrder = 4;
        this.isGUIControl = true;
    }

    loadImage() {
        return super.loadImage(gameFolder + "stick_alone.png");
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
        entity.reCalcTouchBox();
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
    
    

    return promises;
}
function destroyEntities() {
    entities = [];
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
    movePedalToStartPosition(gas, delta);
    movePedalToStartPosition(brake, delta);
    movePedalToStartPosition(clutch, delta);
}

/**
 * 
 * @returns {Array.<Promise>}
 */
function loadSounds() {
    const promises = [];


    return promises;
}
function unLoadSounds() {

}

function assetsLoaded() {
    MainLoop.start();
}


/**
 * @type {Array.<{identifier: string, pageX: number, pageY: number, touching: Sprite}>}
 */
let ongoingTouches = [];

function copyTouch({ identifier, pageX, pageY }) {
    return { identifier, pageX, pageY };
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
                    const maxAngle = Math.PI*2-Math.PI/4;
                    if (wheel.angle >= maxAngle) {
                        wheel.angle = maxAngle;
                    }
                    else if (wheel.angle <= -maxAngle) {
                        wheel.angle = -maxAngle;
                    }
                    //console.log("wheel.angale", wheel.angle, oldAngle, newAngle)
                }
                else if (entity instanceof Pedal) {
                    const origPosY = entity.position.y;
                    const canvasFactorX = canvasWidth/1000;
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

            ongoingTouches.splice(idx, 1); // remove touch..
        }
    }
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
    mainDiv.style.backgroundColor = "white";
    /*mainDiv.style.backgroundImage = "url('./games/learnToDrive/dash.png')";
    mainDiv.style.backgroundSize = "100%";
    mainDiv.style.backgroundPositionY = "37px";*/
    mainDiv.style.position = "absolute";
    mainDiv.style.height = "100vh";
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
    touchDiv.appendChild(touchImg);

    // setup listeners (keys/mouse/touch++, 
    setupKeyListeners();
    setupMouseListeners();*/
    registerTouchListeners();
    
    // prolly need onresize, too, since that changes size of canvas...
    addEventListener("resize", onResize);
    onResize(); // get initial size
    
    const promises = createEntities();
    const allPromises = promises.concat(loadSounds());
    Promise.all(promises).then(assetsLoaded());

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

    /*// remove listeners (keys/mouse/touch++)
    removeEventListener("resize", onResize);
    removeKeyListeners();
    removeMouseListeners();*/
    unRegisterTouchListeners();
    /*// unload images?? (possible?) (should be just to remove any references to them...)

    // remove canvas etc...
    canvas.remove();
    // need to clean up everything so that callin initialize() again works fine (clean slate)
    players = [];*/

    // remove comms listeners, clean up in parent script...
    parentClass.stopGame();
}