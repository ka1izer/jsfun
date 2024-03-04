import { MainLoop } from '../../libs/gameloop.js';

// runs at the beginning of each frame and is typically used to process input
MainLoop.setBegin( (timestamp, frameDelta) => {
    
});
// runs zero or more times per frame depending on the frame rate. It is used to compute anything affected by time - typically physics and AI movements.
MainLoop.setUpdate(delta => {
    movePlayer(delta);
    ball.update(delta);
    
});
// should update the screen, usually by changing the DOM or painting a canvas.
MainLoop.setDraw(interpolationPercentage => {
    //const ctx = canvas.getContext("2d");
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    /*drawOpponent(ctx);
    // drawNet(ctx) (or setup clipping for opponent, maybe)
    // drawBall(ctx)?? It miiight be on top of player, even if usually it's not...
    drawPlayer(ctx);*/
    // going to 3d:
    const dx = canvasWidth / 2;
    const dy = canvasHeight / 2;
    for (const entity of entities) {
        entity.draw(ctx, dx, dy);
    }
});
// runs at the end of each frame and is typically used for cleanup tasks such as adjusting the visual quality based on the frame rate.
MainLoop.setEnd( (fps, panic) => {
    sendNewPosition(); // no need to send in update(), is it? Once each frame should be enough, surely?

    if (panic) {
        console.log("PANIC!! fps", fps);
        MainLoop.resetFrameDelta();
    }
});

let mainDiv = null;
let canvas = null;
let ctx = null;

let canvasHeight = null;
let canvasWidth = null;

let xRatio = null;
let yRatio = null;

const playArea = {
    sX: 700*2.4,
    sY: 700*1.0,
    sZ: 1000
};


/*const player = {
    x: playArea.sX/2, y: 600, // initial placement
}*/
let player = null;
/*const opponent = {
    //x: playArea.sX/2-100, y: 150, // initial placement
    x: -100, y: -150, // initial placement
    peer: null,
}*/
let opponent = null;
let ball = null;
const playerImages = {
    idle: null, running: null, hitting: null
};
const opponentImages = {
    idle: null, running: null, hitting: null
};

const keys = {
    left: false,
    right: false,
    up: false,
    down: false
}

let entities = [];
let camera = null;

let playerType = 1;

export function onNewPeer(peer, areWeServer) {
    opponent.peer = peer;
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
    }
}
export function onLostPeer(peer) {
    opponent.peer = null;
};
export function onMessage(peer, data) {
    // handle incoming messages...
    // should get {x: 1, y:2} or similar for now...
    opponent.position.x = -data.x;
    opponent.position.y = -data.y;
};

export function initialize() {
    // setup canvas etc....
    mainDiv = document.getElementById("mainDiv");
    mainDiv.style.zIndex = 0;
    mainDiv.className = "fullsize fullsizeImage";
    canvas = document.createElement('canvas');
    canvas.id = "mainCanvas";
    canvas.className = "fullsize";
    canvas.style.zIndex = 1;
    mainDiv.appendChild(canvas);

    
    // set background image on mainDiv (tennis court)
    mainDiv.style.backgroundImage = "url('./games/tennis/background_court.jpg')";

    // preload images/sprites
    
    // setup listeners (keys/mouse/touch++, 
    setupKeyListeners();
    
    // prolly need onresize, too, since that changes size of canvas...
    addEventListener("resize", onResize);
    onResize(); // get initial size

    createEntities();

    // start gameloop..?MainLoop.start() ? Or in allImagesLoaded() maybe???

}

function createEntities() {
    //entities.push(new Court()); // for visualizing the court, and making sure camera is in proper position, etc..
    //entities.push(new Court(2));
    

    const promises = [];
    /*promises.push(loadPlayerImages() );
    promises.push(loadOpponentImages() );*/
    player = new Player(new Vertex(150,-180,0));
    promises.push(player.loadImages("./games/tennis/guy_idle.png") );
    entities.push(player);

    opponent = new Player(new Vertex(-150,180,0));
    promises.push(opponent.loadImages("./games/tennis/frog_idle.png") );
    entities.push(opponent);

    ball = new Ball(new Vertex(0,0,200)); // just for fun, for now...
    promises.push(ball.loadImages() );
    entities.push(ball);

    Promise.all(promises).then(allImagesLoaded); // allImagesLoaded is called when all images are done loading


    //camera = new Camera(new Vertex(0, -185, 517), new Vertex(0, 0, 0));
    //camera = new Camera(new Vertex(0, -200, 617), new Vertex(0, 350, 0));
    camera = new Camera(new Vertex(0, -1500, 1000), new Vertex(0, 800, 0));
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
    }
    else if (e.code === "Space" || e.code === "Enter") {
        // not sure yet...   
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
    }
    else if (e.code === "Space" || e.code === "Enter") {
        const plr = player; // testing with close player
        ball.reset(plr);
        ball.testShoot(plr);
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

function allImagesLoaded() {
    // start gameloop here!???
    MainLoop.start();
}

function loadPlayerImages() {
    const img = new Image();
    img.src = "./games/tennis/guy_idle.png";
    const promise = new Promise(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });

    playerImages.idle = img;
    playerImages.idleMax = 10;
    playerImages.idleStep = 0;

    return promise;
}

function loadOpponentImages() {
    const img = new Image();
    img.src = "./games/tennis/frog_idle.png";
    const promise = new Promise(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });

    opponentImages.idle = img;
    opponentImages.idleMax = 10;
    opponentImages.idleStep = 0;

    return promise;
}

function movePlayer(delta) {
    if (keys.down) {
        player.position.y -= .5 * delta;
        if (player.position.y < -450) {
            player.position.y = -450;
        }
    }
    else if (keys.up) {
        player.position.y += .5 * delta;
        /*if (player.position.y > 210) {
            player.position.y = 210;
        }*/
        if (player.position.y > -10) {
            player.position.y = -10;
        }
    }
    if (keys.left) {
        player.position.x -= .6 * delta;
        if (player.position.x < -580) {
            player.position.x = -580;
        }
    }
    else if (keys.right) {
        player.position.x += .6 * delta;
        if (player.position.x > 580) {
            player.position.x = 580;
        }
    }
    //console.log("player pos", player.position);


    /*// TEMP:
    // move angle
    if (keys.down) {
        //camera.position.z -= .05*delta;
        //console.log("camera.z", camera.position.z)
        
        camera.position.y -= .05* delta;
        console.log("camera.y", camera.position.y)
        camera.reCalculateAngles();
    }
    else if (keys.up) {
        //camera.position.z += .05*delta;
        //console.log("camera.z", camera.position.z)
        
        camera.position.y += .05* delta;
        console.log("camera.y", camera.position.y)
        camera.reCalculateAngles();
    }
    if (keys.right) {
        camera.position.x += .05* delta;
        console.log("camera.x", camera.position.x)
        //camera.reCalculateAngles();
    }
    else if (keys.left) {
        camera.position.x -= .05* delta;
        console.log("camera.x", camera.position.x)
        //camera.reCalculateAngles();
    }*/
    

    // need checks, so dont move more up than net, not below screen, and not outside court?
}

function sendNewPosition() {
    if (opponent.peer?.channel) {
        const ch = opponent.peer.channel;
        ch.send(JSON.stringify(player.position));
    }
}

function drawOpponent(ctx) {

    const img = opponentImages.idle; // only using idle for now...
    //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) sx, sy = draw from first corner of img, with sWidth, sHeight.
    // dx, dy = coordinates on canvas to place image on, dWidth, dHeight = how big to make img on canvas

    // need to move player from virtual playArea to screen. Just simple for now, before 3d...
    // need to flip it compared to player, since opponent is on "other side of the screen"...
    // how to flip? rotate playArea-ish...?
    //notDone!; // go to 3d!! (https://www.sitepoint.com/building-3d-engine-javascript/)
    const x = (playArea.sX/2 - opponent.x) * xRatio; // this needs calibration, or I should just go to 3d...?
    const y = (playArea.sY/2 - opponent.y) * yRatio;

    //console.log("x,y", x,y, canvas.width, canvas.height)

    ctx.drawImage(img, 0+(32*opponentImages.idleStep), 0, 32, 32, x, y, 32, 32);
    if (opponentImages.idleMax == opponentImages.idleStep) {
        opponentImages.idleStep = 0;
    }
    else {
        opponentImages.idleStep++;
    }
}

function drawPlayer(ctx) {

    const img = playerImages.idle; // only using idle for now...
    //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) sx, sy = draw from first corner of img, with sWidth, sHeight.
    // dx, dy = coordinates on canvas to place image on, dWidth, dHeight = how big to make img on canvas

    // need to move player from virtual playArea to screen. Just simple for now, before 3d...
    const x = player.x * xRatio;
    const y = player.y * yRatio;

    //console.log("x,y", x,y, canvas.width, canvas.height)

    ctx.drawImage(img, 0+(32*playerImages.idleStep), 0, 32, 32, x, y, 32, 32);
    if (playerImages.idleMax == playerImages.idleStep) {
        playerImages.idleStep = 0;
    }
    else {
        playerImages.idleStep++;
    }
}

/*// background image is 500x361 (currently)
const imageWidth = 500;
const imageHeight = 361;
const imageRatio = imageWidth/imageHeight;*/

function onResize(event) {
    //canvas.width = canvas.offsetWidth;
    //canvas.height = canvas.offsetHeight;

    canvasWidth = canvas.offsetWidth;
    canvasHeight = canvas.offsetHeight;

    //console.log("dims", canvasWidth, canvasHeight, canvas.width, canvas.height)
  
    // If the screen device has a pixel ratio over 1
    // We render the canvas twice bigger to make it sharper (e.g. Retina iPhone)
    if (window.devicePixelRatio > 1) {
        canvas.width = canvas.clientWidth * 2;
        canvas.height = canvas.clientHeight * 2;
        ctx = canvas.getContext("2d");
        ctx.scale(2, 2);
    } else {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    }

}

export function uninitialize() {
    // stop gameloop..?MainLoop.stop()
    // remove comms listeners...
    // remove listeners (keys/mouse/touch++)
    removeEventListener("resize", onResize);
    removeKeyListeners();
    // unload images?? (possible?) (should be just to remove any references to them...)
    // remove canvas etc...
    
    
}


class Vertex {
    constructor(x, y, z) {
        this.x = parseFloat(x);
        this.y = parseFloat(y);
        this.z = parseFloat(z);
    }
}
class Vertex2D {
    constructor(x, y) {
        this.x = parseFloat(x);
        this.y = parseFloat(y);
    }
}

class Camera {
    vertAngle; // "look" up/down from perspective of camera. In radians!
    horizAngle; // "look" left/right from perspective of camera. In radians!
    position;
    target;
    constructor(position, target) {
        this.position = position;
        this.target = target;
        this.horizAngle = 0;
        this.vertAngle = 0;
        this.reCalculateAngles();
    }

    reCalculateAngles() {
        // calculate angles!
        // tan(vertAngle) = pos.y - target.y/ (pos.z - target.z) => vertAngle = atan ( (pos.y-target.y)/(pos.z-target.z) )
        //this.vertAngle = /*Math.PI/2 - */ Math.atan( (this.position.y - this.target.y) / (this.position.z - this.target.z) );
        this.vertAngle = Math.atan2(this.position.y - this.target.y, this.position.z - this.target.z);
        //console.log("vertAngle", this.vertAngle)
    }

    toView(vertex) {
        // first, subtract camera position
        let x = vertex.x - this.position.x;
        let y = vertex.y - this.position.y;
        let z = this.position.z - vertex.z;

        // then rotate...
        const tx = this.horizAngle == 0? x : x * Math.cos(this.horizAngle) + z * Math.sin(this.horizAngle); // if horizAngle == 0, this is unneded, since it just gives x.
        let tz = this.horizAngle == 0? z : z * Math.cos(this.horizAngle) - x * Math.sin(this.horizAngle); // if horizAngle == 0, this is unneded, since it just gives z.
        const ty = this.vertAngle == 0? y : y * Math.cos(this.vertAngle) + tz * Math.sin(this.vertAngle); // if vertAngle == 0, this is unneded, since it just gives y.
        tz = this.vertAngle == 0? tz : tz * Math.cos(this.vertAngle) - y * Math.sin(this.vertAngle); // if vertAngle == 0, this is unneded, since it just gives tz.

        // Adjust back the camera position
        const adjustedX = tx + this.position.x;
        const adjustedY = ty + this.position.y;
        const adjustedZ = this.position.z - tz; // Reverse the Z-coordinate back
        //const adjustedZ = tz + this.position.z;

        //return new Vertex(tx, ty, tz);
        return new Vertex(tx, ty, tz);
    }
}

// entities:
class Entity {
    position;
    size = 1;
    vertices = [];
    faces = [];
    constructor(position) {
        this.position = position;
    }

    project(vertex) {
        //return new Vertex2D(vertex.x, vertex.y); // orthographic (no perspective)
        // d = Distance between the camera and the plane
        // should skip if is too close (vertex.z < 1?), but fuck it... don't think I need here (would get division by zero if z is 0, though...)
        if (vertex.z < 1) {
            // just place way off camera...
            return new Vertex(-10000, 0, 0);
        }
        //var d = 240;
        //const d = canvasWidth * 0.22;
        const d = canvasWidth * 0.55; // silly fov here, but..... (around 600...)
        const r = d / vertex.z;

        //console.log("project", vertex.x, vertex.y, r, r*vertex.x, r*vertex.y)

        return new Vertex(r * vertex.x, r * vertex.y, r);
    }

    moveToWorldCoordinate(vertex) {
        // bare pluss på position...
        return new Vertex(this.position.x + vertex.x, this.position.y + vertex.y, this.position.z + vertex.z); // maybe optimization: remove all the "new Vertext()", reuse a single one...
    }

    toSize(vertex) {
        return new Vertex(vertex.x * this.size, vertex.y * this.size, vertex.z * this.size);
    }

    draw(ctx, dx, dy) {
        // 3d draw...

        for (const face of this.faces) {

            // size it...
            let v = this.toSize(face[0]);

            // plasser mesh der den skal være i verden (translate ut fra position)
            v = this.moveToWorldCoordinate(v);
            
            // så, gjør om fra world til camera...
            v = camera.toView(v);

            // project
            //let p = this.project(face[0]);
            let p = this.project(v);
            ctx.beginPath();
            // draw first vertex
            ctx.moveTo(p.x + dx, -p.y + dy);
            ctx.strokeText("0", p.x+dx, -p.y+dy);
            //ctx.lineTo(p.x + dx+5, -p.y + dy+5);
            //console.log("draw", p.x + dx, -p.y + dy)

            // draw other vertices
            for (let i=1; i < face.length; i++) {
                //p = this.project(face[i]);

                v = this.toSize(face[i]);
                v = this.moveToWorldCoordinate(v);

                v = camera.toView(v);
                p = this.project(v);
                ctx.lineTo(p.x + dx, -p.y + dy);
                ctx.strokeText(""+i, p.x+dx, -p.y+dy);
                //console.log("draw2", p.x + dx, -p.y + dy)
            }

            // close path (and draw face, if we want...)
            ctx.closePath();
            ctx.stroke();
            ctx.fill(); // may want to turn this off, or set transparent fill color or something...
        }
    }
}
class Sprite extends Entity { // sprites: players, possibly ball,...? Rackets?
    // bounding rect? 
    // (player/racket will want to have position at their "bottom", but ball in it's center... compared to height/width/etc + bounding rect)
    // images
    constructor(position, width, height) {
        super(position);
        this.width = width;
        this.height = height;
    }

    getImages() {
        return null;
    }

    draw(ctx, dx, dy) {
        // sprite draw... (need camera etc, too?)
        // size it...
        //let v = this.toSize(face[0]);

        // plasser mesh der den skal være i verden (translate ut fra position)
        //console.log("world position", this.position)
        let v = this.moveToWorldCoordinate(this.position);
        //console.log("afterwolrd", v)
        
        // så, gjør om fra world til camera...
        v = camera.toView(v);

        // project
        //let p = this.project(face[0]);
        let p = this.project(v);

        //console.log("player coords", p.x+dx, p.y+dy)

        //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) sx, sy = draw from first corner of img, with sWidth, sHeight.
        // dx, dy = coordinates on canvas to place image on, dWidth, dHeight = how big to make img on canvas
        this.drawImage(ctx, dx, dy, p);
    }

    drawImage(ctx, dx, dy, p) {
        const img = this.getImages();
        ctx.drawImage(img.img, 0+(32*img.step), 0, 32, 32, p.x+dx - p.z*192/2, -p.y+dy, p.z * 192, -p.z * 192);
        ctx.strokeText("0", p.x+dx, -p.y+dy);
        if (img.maxSteps == img.step) {
            img.step = 0;
        }
        else {
            img.step++;
        }
    }
}
class Player extends Sprite {
    images = {
        idle: {
            img: null, maxSteps: 0, step: 0,
        },
    };
    constructor(position) {
        super(position);
    }

    loadImages(url) {
        const img = new Image();
        img.src = url;
        const promise = new Promise(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });

        this.images.idle.img = img;
        this.images.idle.maxSteps = 10;
        this.images.idle.step = 0;

        return promise;
    }

    getImages() {
        return this.images.idle;
    }
}
class Ball extends Sprite {
    velocity = new Vertex(0,0,0); // use vertex as vectors...
    images = {
        // only animation should be spinning(?) and deformation on bounce.. but just use the bouncing orange for everything for now... :-)
        idle: {
            img: null, maxSteps: 0, step: 0,
        },
    }
    constructor(position) {
        super(position);
    }

    loadImages() {
        const img = new Image();
        img.src = "./games/tennis/Orange.png";
        const promise = new Promise(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });

        this.images.idle.img = img;
        this.images.idle.maxSteps = 17;
        this.images.idle.step = 0;

        return promise;
    }

    getImages() {
        return this.images.idle;
    }

    drawImage(ctx, dx, dy, p) {
        const img = this.getImages();
        //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) sx, sy = draw from first corner of img, with sWidth, sHeight.
        // dx, dy = coordinates on canvas to place image on, dWidth, dHeight = how big to make img on canvas
        ctx.drawImage(img.img, 0+(32*img.step), 0, 32, 32, p.x+dx - p.z*96/2, -p.y+dy + p.z*96/2, p.z*96, -p.z*96);
        //ctx.strokeText("0", p.x+dx, -p.y+dy);
        if (img.maxSteps == img.step) {
            img.step = 0;
        }
        else {
            //img.step++;
        }
        //console.log("ball", ball.position)
    }

    update(delta) {
        // should have velocity (in x, y and z direction)
        // should fall, if in the air (not still on ground, or held by player or something...)
        //  so, should accelerate downwards in that case (-z) towards 0, and then maybe bounce, depending on speed down...
        if (this.position.z > 0) {
            this.velocity.z += .18 * delta;
        }

        
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.position.z -= this.velocity.z;
        if (this.position.z <= 0) {
            // bounce?
            if(this.velocity.z > 1) {
                this.velocity.z = -this.velocity.z + 5; // bounce, with a bit loss in velocity
            }
            else {
                this.velocity.z = 0;
            }
            if (this.velocity.x > 1) {
                this.velocity.x -= 3;
            }
            else if (this.velocity.x < -1) {
                this.velocity.x += 3;
            }
            else {
                this.velocity.x = 0;
            }
            if (this.velocity.y > 1) {
                this.velocity.y -= 3;
            }
            else if (this.velocity.y < -1) {
                this.velocity.y += 3;
            }
            else {
                this.velocity.y = 0;
            }
            this.position.z = 0;
        }
    }

    reset(plr) {
        this.velocity.x = 0; this.velocity.y = 0; this.velocity.z = 0;
        this.position.x = plr.position.x; this.position.y = plr.position.y; this.position.z = plr.position.z; // will be on floor right now, but whatever...
    }

    testShoot(plr) {
        this.velocity.z = -Math.random() * 50 - 10;
        this.velocity.y = Math.random() * 20 + 20;
        if (plr.position.y <= -10) {
            // closest player
            // shoot with + y
        }
        else {
            // far player
            // shoot with - y
            this.velocity.y = -this.velocity.y;
        }
    }
}
// court (for å justere plassering i forhold til bakgrunn)
class Court extends Entity {
    constructor(dingo) {
        super(new Vertex(0, 0, 0)); // should always be in center of our game space
        this.vertices = [
            /*new Vertex(-1.4, -0.6, 0),
            new Vertex(1.4, -0.6, 0),
            new Vertex(1.4, 0.6, 0),
            new Vertex(-1.4, 0.6, 0),*/
            new Vertex(-0.8, -0.6, 0),
            new Vertex(0.8, -0.6, 0),
            new Vertex(0.8, 0.6, 0),
            new Vertex(-0.8, 0.6, 0),
        ];
        this.faces = [
            [this.vertices[0], this.vertices[1], this.vertices[2], this.vertices[3]]
        ];
        if (dingo) {
            this.size = 500;
            this.vertices = [
                new Vertex(-1.4, 0, 0),
                new Vertex(1.4, 0, 0),
                new Vertex(1.4, 0, 1.2),
                new Vertex(-1.4, 0, 1.2),

                new Vertex(-1.4, 0, 0),
                new Vertex(-1.4, 1.4, 0),
                new Vertex(-1.4, 1.4, 1.2),
                new Vertex(-1.4, 0, 1.2),
            ];
            this.faces = [
                [this.vertices[0], this.vertices[1], this.vertices[2], this.vertices[3]],
                [this.vertices[4], this.vertices[5], this.vertices[6], this.vertices[7]],
            ];
        }
        else {
            this.size = 1500;
        }
    }
}

// players (kun 1 vertex, center bottom (de er limt til court)? De trenger høyde (racket-høyde?) for å regne ut avstand til ball osv...?)
// ball (usikker på om skal bruke sprite eller faktisk 3d-entity for den... 1 vertex for center om sprite? Må jo nesten ha size osv for collision detection, da...?)
// net? For collision detection and to clip the opponent? Maybe? Maybe overkill? Unsure...
// evt fun other shit... birds, ref, whatever...