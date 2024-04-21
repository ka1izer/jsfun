import { MainLoop } from '../../libs/gameloop.js';
import { Quaternion } from '../../libs/quaternion.js';
import * as Sounds from '../../libs/sound.js';



// runs at the beginning of each frame and is typically used to process input
MainLoop.setBegin( (timestamp, frameDelta) => {
    
});
// runs zero or more times per frame depending on the frame rate. It is used to compute anything affected by time - typically physics and AI movements.
MainLoop.setUpdate(delta => {
    if (keys.hit > 0) {
        if (ball.state == BallState.AboutToServe) {
            keys.hit = 0;
        }
        else {
            keys.hit -= delta * 10.1; // times with 10, basically just have 1 hit now.. lazy, didnt bother to remove the code with it...
        }
        player.hit();
    }
    else {
        keys.hit = 0;
    }
    movePlayer(delta);
    ball.update(delta);
    player.bat.update(delta);
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
    const arrDrawOps = [];
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
    arrDrawOps.forEach(d => d.draw());

    drawScores(ctx);
});
// runs at the end of each frame and is typically used for cleanup tasks such as adjusting the visual quality based on the frame rate.
MainLoop.setEnd( (fps, panic) => {
    sendNewState(); // no need to send in update(), is it? Once each frame should be enough, surely?

    if (panic) {
        console.log("PANIC!! fps", fps);
        MainLoop.resetFrameDelta();
    }
});

class Vertex {
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    constructor(x, y, z) {
        this.x = parseFloat(x);
        this.y = parseFloat(y);
        this.z = parseFloat(z);
    }
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
class Vertex2D {
    constructor(x, y) {
        this.x = parseFloat(x);
        this.y = parseFloat(y);
    }
}

/**
 * @property {number} vertAngle - "look" up/down from perspective of camera. In radians!
 * @property {number} horizAngle - "look" left/right from perspective of camera. In radians!
 */
class Camera {
    vertAngle; // "look" up/down from perspective of camera. In radians!
    horizAngle; // "look" left/right from perspective of camera. In radians!
    position;
    target;
    /**
     * 
     * @param {Vertex} position 
     * @param {Vertex} target 
     */
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

    /**
     * 
     * @param {Vertex} vertex 
     * @returns {Vertex} 
     */
    toView(vertex) {
        // first, subtract camera position
        const x = vertex.x - this.position.x;
        const y = vertex.y - this.position.y;
        const z = this.position.z - vertex.z;

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

        // URK, bug here, forgot to use adjustedX/Y/Z, so camera pos is off... urk

        return new Vertex(tx, ty, tz);
    }

    // reverse operation of toView
    fromView(vertex) {

        // First, adjust for the camera position
        const x = vertex.x - this.position.x;
        const y = vertex.y - this.position.y;
        //const z = vertex.z - this.position.z;
        const z = this.position.z - vertex.z;

        // Reverse the rotation...
        const tx = this.horizAngle === 0 ? x : x * Math.cos(-this.horizAngle) + z * Math.sin(-this.horizAngle);
        const tz = this.horizAngle === 0 ? z : z * Math.cos(-this.horizAngle) - x * Math.sin(-this.horizAngle);
        const ty = this.vertAngle === 0 ? y : y * Math.cos(-this.vertAngle) + tz * Math.sin(-this.vertAngle);
        const adjustedZ = this.vertAngle === 0 ? tz : tz * Math.cos(-this.vertAngle) - y * Math.sin(-this.vertAngle);

        // Adjust back to the world position
        const worldX = tx + this.position.x;
        const worldY = ty + this.position.y;
        const worldZ = this.position.z - adjustedZ; // Reverse the Z-coordinate back

        // URK, bug in toView(), forgot to use adjustedX/Y/Z, so camera pos is off... so skip here too?

        return new Vertex(worldX, worldY, worldZ);
        //return new Vertex(tx, ty, adjustedZ);
    }
}

class BoundingRectangle {
    offset = new Vertex(0,0,0);
    vertices = [this.offset, this.offset, this.offset, this.offset, this.offset, this.offset, this.offset, this.offset]; // [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z), (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    /**
     * 
     * @param {Vertex} offset 
     * @param {Array.Vertex} vertices 
     * @param {number} width 
     * @param {number} height 
     */
    constructor(offset, vertices, width, height) {
        if (offset) {
            this.offset = offset;
        }
        if (vertices) {
            this.vertices = vertices;
        }
        else if (width && height) {
            const bulk = width/2;
            const zHeight = height/2;
            this.vertices = [
                new Vertex(-bulk, -bulk, -zHeight),
                new Vertex(bulk, -bulk, -zHeight),
                new Vertex(bulk, bulk, -zHeight),
                new Vertex(-bulk, bulk, -zHeight),
                new Vertex(-bulk, -bulk, zHeight),
                new Vertex(bulk, -bulk, zHeight),
                new Vertex(bulk, bulk, zHeight),
                new Vertex(-bulk, bulk, zHeight)
            ]
        }
    }

    collidesWith(thisCenter, otherCenter, otherBound) {
        // assume no rotation...
        //debugger;
        if (thisCenter.x + this.offset.x + this.vertices[0].x > otherCenter.x + otherBound.offset.x + otherBound.vertices[1].x) {
            // lower left corner of this bottom is to right of lower right corner of other, cannot collide
            return false;
        }
        if (thisCenter.y + this.offset.y + this.vertices[0].y > otherCenter.y + otherBound.offset.y + otherBound.vertices[3].y) {
            // lower left corner of this bottom is above (y-axis) upper right corner of other bottom, cannot collide
            return false;
        }
        if (thisCenter.z + this.offset.z + this.vertices[0].z > otherCenter.z + otherBound.offset.z + otherBound.vertices[4].z) {
            // lower left corner of this bottom is above (z-axis) lower left corner of other top, cannot collide
            return false;
        }

        if (thisCenter.x + this.offset.x + this.vertices[1].x < otherCenter.x + otherBound.offset.x + otherBound.vertices[0].x) {
            // lower right corner of this bottom is to left of lower left corner of other, cannot collide
            return false;
        }
        if (thisCenter.y + this.offset.y + this.vertices[3].y < otherCenter.y + otherBound.offset.y + otherBound.vertices[0].y) {
            // upper right corner of this bottom is below (y-axis) lower left corner of other bottom, cannot collide
            return false;
        }
        if (thisCenter.z + this.offset.z + this.vertices[4].z < otherCenter.z + otherBound.offset.z + otherBound.vertices[0].z) {
            // lower left corner of this top is below (z-axis) lower left corner of other bottom, cannot collide
            return false;
        }
        return true;
    }
}
// entities:
/**
 * @property {BoundingRectangle} boundingRect 
 */
class Entity {
    position = new Vertex(0,0,0);
    size = 1;
    vertices = [];
    faces = [];
    boundingRect = new BoundingRectangle(); // initialized just for IDE help
    constructor(position) {
        this.position = position;
    }

    collidesWith(otherEntity) {
        // return true if this entity collides with otherEntity
        // need position and size? maybe width+height? players have their position/base on the bottom... Ball in center... and cuboid or sphere? ball should be sphere, but cube would prolly work more than good enough
        // maybe rectangle with offset? 8 vertices + offset?
        return this.boundingRect.collidesWith(this.position, otherEntity.position, otherEntity.boundingRect);
    }

    updatePos(sameTeam, newPos) {
        if (sameTeam) {
            this.position.set(newPos.x, newPos.y, newPos.z);
        }
        else {
            this.position.set(-newPos.x, -newPos.y, newPos.z);
        }
    }

    updateVel(sameTeam, newVel) {
        if (sameTeam) {
            this.velocity.set(newVel.x, newVel.y, newVel.z);
        }
        else {
            this.velocity.set(-newVel.x, -newVel.y, newVel.z);
        }
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

    // Reverse projection, 2D to 3D
    unProject(vertex) {
        // x = vx * (d /vz)
        // y = vy * (d /vz)
        // z = d/vz

        // vx = x / (d/vz)
        // vy = y / (d/vz)
        // vz = d/z


        /*const d = canvasWidth * 0.55; // silly fov here, but..... (around 600...)
        const r = d / vertex.z;

        return new Vertex(vertex.x/r, vertex.y/r, r);*/

        const d = canvasWidth * 0.55;
        const r = vertex.z;
    
        return new Vertex(vertex.x / r, vertex.y / r, d / r);
    }

    moveToWorldCoordinate(vertex) {
        // bare pluss på position...
        return new Vertex(this.position.x + vertex.x, this.position.y + vertex.y, this.position.z + vertex.z); // maybe optimization: remove all the "new Vertext()", reuse a single one...
    }

    toSize(vertex) {
        return new Vertex(vertex.x * this.size, vertex.y * this.size, vertex.z * this.size);
    }

    rotate(vertex) {
        return vertex;
    }

    draw(ctx, arrDrawOps, dx, dy) {
        // 3d draw...

        for (const face of this.faces) {

            // do any rotation (by default none)
            let v = this.rotate(face[0]);

            // size it...
            v = this.toSize(v);

            // plasser mesh der den skal være i verden (translate ut fra position)
            // have a bug in the sprite moveToWorldCoordinate (shouldn't have called it for sprite, it has no vertices to move... but camera is centered on sprites, so need to have the same bug here)
            // Same bug as for Sprite: add world coordinates twice...
            v = this.moveToWorldCoordinate(v);
            v = this.moveToWorldCoordinate(v);
            
            // så, gjør om fra world til camera...
            v = camera.toView(v);

            // project
            //let p = this.project(face[0]);
            let p = this.project(v);

            arrDrawOps.push({z:p.z, draw: () => {

                ctx.beginPath();
                // draw first vertex
                ctx.moveTo(p.x + dx, -p.y + dy);
                //ctx.strokeText("0", p.x+dx, -p.y+dy);
                //ctx.lineTo(p.x + dx+5, -p.y + dy+5);
                //console.log("draw", p.x + dx, -p.y + dy)

                // draw other vertices
                for (let i=1; i < face.length; i++) {
                    //p = this.project(face[i]);

                    v = this.rotate(face[i]);
                    v = this.toSize(v);
                    // have a bug in the sprite moveToWorldCoordinate (shouldn't have called it for sprite, it has no vertices to move... but camera is centered on sprites, so need to have the same bug here)
                    // Same bug as for Sprite: add world coordinates twice...
                    v = this.moveToWorldCoordinate(v);
                    v = this.moveToWorldCoordinate(v);

                    v = camera.toView(v);
                    p = this.project(v);
                    ctx.lineTo(p.x + dx, -p.y + dy);
                    //ctx.strokeText(""+i, p.x+dx, -p.y+dy);
                    //console.log("draw2", p.x + dx, -p.y + dy)
                }

                // close path (and draw face, if we want...)
                ctx.closePath();
                ctx.stroke();
                ctx.fill(); // may want to turn this off, or set transparent fill color or something...
            } } );
        }
    }
}
class Sprite extends Entity { // sprites: players, possibly ball,...? Rackets?
    // bounding rect? 
    // (player/racket will want to have position at their "bottom", but ball in it's center... compared to height/width/etc + bounding rect)
    images = {
        idle: {
            img: null, maxSteps: 0, step: 0,
        },
    };
    imagePromises = [];
    width;
    height;
    scale = 1;
    constructor(position, width, height, scale) {
        super(position);
        this.width = width;
        this.height = height;
        this.scale = scale;
    }

    loadImages(url) {
        const img = new Image();
        img.src = url;
        const promise = new Promise(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });

        this.images.idle.img = img;
        this.images.idle.maxSteps = 0;
        this.images.idle.step = 0;
        
        this.imagePromises.push(promise);
        return promise;
    }

    getImages() {
        return this.images.idle;
    }

    draw(ctx, arrDrawOps, dx, dy) {
        // sprite draw... (need camera etc, too?)
        // size it...
        //let v = this.toSize(face[0]);

        // plasser mesh der den skal være i verden (translate ut fra position)
        //console.log("world position", this.position)
        let v = this.moveToWorldCoordinate(this.position); // This seems to be totally wrong, but will probably break things if we change now... :-/
        //console.log("afterwolrd", v)
        //if (this.playPosition && (keys.left || keys.right || keys.up || keys.down) ) console.log("pl worlv", v)
        
        // så, gjør om fra world til camera...
        v = camera.toView(v);
        //if (this.playPosition && (keys.left || keys.right || keys.up || keys.down) ) console.log("pl camv", v)

        // project
        //let p = this.project(face[0]);
        let p = this.project(v);
        //if (this.playPosition && (keys.left || keys.right || keys.up || keys.down) ) console.log("pl projectv", p)

        //console.log("player coords", p.x+dx, p.y+dy)
        arrDrawOps.push({z:p.z, draw: () => {

            //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) sx, sy = draw from first corner of img, with sWidth, sHeight.
            // dx, dy = coordinates on canvas to place image on, dWidth, dHeight = how big to make img on canvas
            this.drawImage(ctx, dx, dy, p);
        }});
    }

    drawImage(ctx, dx, dy, p) {
        const img = this.getImages();
        //ctx.drawImage(img.img, 0+(32*img.step), 0, 32, 32, p.x+dx - p.z*192/2, -p.y+dy, p.z * 192, -p.z * 192);
        const scaleFactorX = this.width*this.scale;
        const scaleFactorY = this.height*this.scale;
        ctx.drawImage(img.img, 0+(this.width*img.step), 0, this.width, this.height, p.x+dx - p.z*scaleFactorX/2, -p.y+dy, p.z * scaleFactorX, -p.z * scaleFactorY);
        //ctx.strokeText("0", p.x+dx, -p.y+dy);
        if (img.maxSteps == img.step) {
            img.step = 0;
        }
        else {
            img.step++;
        }
    }
}
function drawScores(ctx) {
    const ourTeam = player.playPosition[0];
    const otherTeam = ourTeam == 0? 1 : 0;
    const ourScore = playState.scores[ourTeam];
    const otherScore = playState.scores[otherTeam];

    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    ctx.strokeText("Us:       " + ourScore, 10, 10);
    ctx.strokeText("Them:   " + otherScore, 10, 20);
    ctx.strokeText("To win: " + players.length*4, 10, 30);
}
const PlayerState = {
    AboutToServe: 0, Serving: 1, HitBall: 2, MissedBall: 3, Idle: 4
};
const GameState = {
    AboutToServe: 0, BallInPlay: 1, GameOver: 2
};
const BallState = {
    AboutToServe: 0, InPlay: 1, OutOfBounds: 2, AtRest: 3
}
let gameState = GameState.AboutToServe;
// noen skal serve: hvem. Noen slår ballen: hvem (hvilken side). Ballen spretter første gang. Ballen spretter igjen: hvilken side kom den fra. Poeng. Bytte hvem som server...
// strengt tatt bør server ha 2 forsøk om bommer på ballen første gang (og stopper ved første sprett uten treff på serve...)
// currently, endrer bare local player sin state, og gameState aldri endret etter initialize.
// lar hver peer bestemme, hvis de sender over at de traff ballen, stol på det...
// server sender til andre peers...
class PlayState {
    gameState = GameState.AboutToServe;
    lastPlayerToHitBall = null;
    ballBounces = 0; // only player actually hitting (or trying to hit in case of serving) should update this
    lastPlayerToServe = null;
    attemptsToServe = 0;
    serves = 0; // just switch server on 4 serves for now?
    scores = [0,0]; // scores for team1 and team2...
    changedState = {}; // {playerMoved: nick, pos}, {aboutToServe: nick}, {serving: nick, ball:{pos, vel}}, {hit: nick, ball:{pos, vel}}, {score: [1,0]}, {newPlayerToServe: nick} , {aboutToServe: nick}, {playerSwinging: nick, angleToBall, angleOfHit}, {playerStoppedSwinging: nick}

    /**
     * @type {{type: string, value: any, id: number, peer: {nick: string, channel: RTCDataChannel}, when: number}[]}
     */
    awaitingConfirmation = [];

    playerMoved(plr) {
        // can get multiple of these between times we send(?), so should maybe use array or something here...?
        this.changedState.playerMoved = plr.peer.nick; // should prolly change to send keys/touch-equiv instead, with position only occasionally, but...
        this.changedState.pos = plr.position;
    }

    /**
     * 
     * @param {string} type 
     * @param {number} packageId 
     */
    confirm(type, packageId) {
        if (!this.changedState.confirm) {
            this.changedState.confirm = {};
        }
        this.changedState.confirm[type] = packageId;
    }

    /**
     * 
     * @param {{changedState: object, id: number}} state 
     * @param {{nick: string, channel: RTCDataChannel}} peer 
     */
    mayNeedConfirmation(state, peer) {
        // state: {changedState: prunedState, id: toSend.id}
        const requireConfirmation = ["teamWon", "score", "hit", "serving", "aboutToServe"];
        for (const key of Object.keys(state.changedState)) {
            if (requireConfirmation.includes(key)) {
                // requires confirmation...
                this.awaitingConfirmation.push({type: key, value: state.changedState[key], id: state.id, peer: peer, when: Date.now()});
            }
        }
    }

    /**
     * 
     * @param {{nick: string, channel: RTCDataChannel}} peer 
     */
    resendUnconfirmed(peer) {
        const tooOld = Date.now() - 300;
        for (const ob of this.awaitingConfirmation) {
            if (ob.peer.nick == peer.nick && ob.when <= tooOld) {
                /*const state = {};
                state[ob.type] = ob.value;*/
                ob.peer.channel.send(JSON.stringify({changedState: ob.value, id: ob.id}));
                ob.when = Date.now();
            }
        }
    }

    /**
     * 
     * @param {string} type 
     * @param {number} id 
     * @param {{nick: string, channel: RTCDataChannel}} peer 
     */
    receivedConfirmation(type, id, peer) {
        for (let i = this.awaitingConfirmation.length - 1; i >= 0; i--) {
            const ob = this.awaitingConfirmation[i];
            if (ob.peer.nick == peer.nick && ob.type == type && id == ob.id) {
                this.awaitingConfirmation.slice(i, 1);
                return;
            }
        }
    }
    

    reset() {
        this.gameState = GameState.AboutToServe;
        this.lastPlayerToHitBall = null;
        this.ballBounces = 0; // only player actually hitting (or trying to hit in case of serving) should update this
        this.lastPlayerToServe = null;
        this.attemptsToServe = 0;
        this.serves = 0; // just switch server on 4 serves for now?
        this.scores = [0,0]; // scores for team1 and team2...
        this.changedState = {};
    }
    /**
     * 
     * @param {Player} plr 
     */
    playerSwinging(plr) {
        this.changedState.playerSwinging = plr.peer.nick;
        this.changedState.angleToBall = plr.bat.angleToBall;
        this.changedState.angleOfHit = plr.bat.angleOfHit;
    }
    /**
     * 
     * @param {Player} plr 
     */
    playerStoppedSwinging(plr) {
        this.changedState.playerStoppedSwinging = plr.peer.nick;
    }
    aboutToServe(plr) {
        // this is always called by player about to serve (not just server)
        this.changedState.aboutToServe = plr.peer.nick;
    }
    serving(plr) {
        // this is always called by player doing the serving (not just server)
        this.lastPlayerToServe = plr;
        this.ballBounces = 0;
        this.attemptsToServe++;
        this.changedState.serving = this.lastPlayerToServe.peer.nick;
        this.changedState.ball = {pos: ball.position, vel: ball.velocity};
    }
    miss(plr) {
        // this is always called by player doing the missing (not just server)
        // no need yet..... since we don't animate hits yet...
    }
    hit(plr) {
        // this is always called by player doing the hitting (not just server)
        
        this.attemptsToServe = 0;
        this.lastPlayerToHitBall = plr;
        this.ballBounces = 0;
        this.changedState.hit = this.lastPlayerToHitBall.peer.nick;
        this.changedState.ball = {pos: ball.position, vel: ball.velocity};
    }
    teamWon(team) {
        const bannerBackground = document.createElement("div");
        bannerBackground.className = "bannerBackground";
        mainDiv.appendChild(bannerBackground);

        const bannerBg = document.createElement("div");
        bannerBg.className = "bannerBg";
        
        const banner = document.createElement("img");
        banner.src = "./games/tennis/banner_blue.png";
        banner.className = "bannerImage";
        bannerBg.appendChild(banner);

        const winnerText = document.createElement("div");
        winnerText.innerHTML = "WINNER";
        winnerText.className = "winnerText";
        bannerBg.appendChild(winnerText);

        const winnerNames = document.createElement("div");
        
        let names = "";
        for (const plr of players) {
            if (plr.playPosition[0] == team) {
                if (names.length > 0) {
                    names += " & ";
                }
                names += plr.peer.nick;
            }
        }
        winnerNames.innerHTML = names;
        winnerNames.className = "winnerNames";
        bannerBg.appendChild(winnerNames);

        const thumb = document.createElement("img");
        thumb.src = "./games/tennis/" + (team == player.playPosition[0]? "thumbsUp.png" : "thumbsDown.png");
        thumb.className = "thumb";
        bannerBg.appendChild(thumb);

        mainDiv.appendChild(bannerBg);

        bannerBg.addEventListener("click", () => {
            mainDiv.removeChild(bannerBackground);
            mainDiv.removeChild(bannerBg);
            uninitialize();
        });
    }
    /**
     * 
     * @param {number} team 
     */
    pointScored(team) {
        this.scores[team]++;
        this.changedState.score = this.scores;
        if (this.scores[team] >= players.length*4 && this.scores[team]-1 > this.scores[team==0? 1 : 0]) {
            // team has won!
            this.teamWon(team);
            this.changedState.teamWon = team;
        }
    }
    ballBounce() {
        // this is only called by server
        this.ballBounces++;
        let fail = false;
        if (this.attemptsToServe > 0) {
            // was from serve... failed
            this.ballBounces = 0;
            this.attemptsToServe++;
            if (this.attemptsToServe > 2) {
                this.attemptsToServe = 0;
                this.serves++;
                const team = this.getTeamOfPlayer(this.lastPlayerToServe);
                this.pointScored(team == 0? 1 : 0);
            }
            fail = true;
        }
        else if (this.ballBounces > 1) {
            this.ballBounces = 0;
            this.attemptsToServe = 0;
            this.serves++;
            // lastPlayerToHitBall's team should get a point...
            const team = this.getTeamOfPlayer(this.lastPlayerToHitBall);
            this.pointScored(team);
            fail = true;
        }
        if (fail) {
            if (this.serves >= 4) {
                this.serves = 0;
                this.attemptsToServe = 0;
                // should give serve to next after lastPlayerToServe....
                this.lastPlayerToServe.lastServed = Date.now();
                this.lastPlayerToServe.changeState(PlayerState.Idle);
                this.lastPlayerToHitBall = null;
                // find next player to serve
                const prevTeam = this.getTeamOfPlayer(this.lastPlayerToServe);
                const playersOnOtherTeam = players.filter((plr, index, arr) => this.getTeamOfPlayer(plr) != prevTeam);
                if (playersOnOtherTeam.length == 1) {
                    this.lastPlayerToServe = playersOnOtherTeam[0];
                }
                else if (playersOnOtherTeam.length == 2) {
                    //ball.changeState(BallState.AboutToServe, playersOnOtherTeam[0]);
                    // need to alternate... choose the one whose lastServed is oldest..
                    this.lastPlayerToServe = playersOnOtherTeam.sort((a,b) => a.lastServed - b.lastServed)[0];
                }
                else {
                    // noone on other team...?
                    // dont change server
                }
                ball.changeState(BallState.AboutToServe, this.lastPlayerToServe);
                //this.changedState.newPlayerToServe = this.lastPlayerToServe.peer.nick;
                this.changedState.aboutToServe = this.lastPlayerToServe.peer.nick;
                //this.changedState.ball = {pos: ball.position, vel: ball.velocity};
            }
            else {
                // lastPlayerToServe should ready next serve...
                ball.changeState(BallState.AboutToServe);
                this.changedState.aboutToServe = this.lastPlayerToServe.peer.nick;
                this.lastPlayerToServe.changeState(PlayerState.AboutToServe);
            }
        }
        
    }
    ballOutOfBounds() {
        // only called by server
        if (this.attemptsToServe > 0) {
            // was from serve...
            this.ballBounces = 0;
            this.attemptsToServe = 0;
            this.serves++;
            const team = this.getTeamOfPlayer(this.lastPlayerToHitBall);
            this.pointScored(team);
        }
        else {
            this.serves++;
            let team;
            if (this.ballBounces > 0) {
                team = this.getTeamOfPlayer(this.lastPlayerToHitBall);
            }
            else {
                // team opposite lastPlayerToHitBall should get a point...
                team = this.getTeamOfPlayer(this.lastPlayerToHitBall) == 0? 1 : 0;
            }
            this.pointScored(team);
            this.ballBounces = 0;
        }
        if (this.serves >= 4) {
            this.serves = 0;
            this.attemptsToServe = 0;
            // should give serve to next after lastPlayerToServe....
            this.lastPlayerToServe.lastServed = Date.now();
            this.lastPlayerToServe.changeState(PlayerState.Idle);
            this.lastPlayerToHitBall = null;
            // find next player to serve
            const prevTeam = this.getTeamOfPlayer(this.lastPlayerToServe);
            const playersOnOtherTeam = players.filter((plr, index, arr) => this.getTeamOfPlayer(plr) != prevTeam);
            if (playersOnOtherTeam.length == 1) {
                this.lastPlayerToServe = playersOnOtherTeam[0];
            }
            else if (playersOnOtherTeam.length == 2) {
                //ball.changeState(BallState.AboutToServe, playersOnOtherTeam[0]);
                // need to alternate... choose the one whose lastServed is oldest..
                this.lastPlayerToServe = playersOnOtherTeam.sort((a,b) => a.lastServed - b.lastServed)[0];
            }
            else {
                // noone on other team...?
                // dont change server
            }
            ball.changeState(BallState.AboutToServe, this.lastPlayerToServe);
            //this.changedState.newPlayerToServe = this.lastPlayerToServe.peer.nick;
            this.changedState.aboutToServe = this.lastPlayerToServe.peer.nick;
        }
        else {
            // lastPlayerToServe should ready next serve...
            ball.changeState(BallState.AboutToServe);
            this.changedState.aboutToServe = this.lastPlayerToServe.peer.nick;
            this.lastPlayerToServe.changeState(PlayerState.AboutToServe);
        }
        
    }

    getTeamOfPlayer(plr) {
        return plr.playPosition[0]; // 0 or 1 for team 1 or 2...
    }
}
const playState = new PlayState();
class Player extends Sprite {
    peer;
    /**
     * @type {Array.number}
     */
    playPosition = []; // [0, 0] is team1, first player, [0,1] is same team, second player. [1,0] is second team first player, etc...
    state = PlayerState.Idle;
    lastServed = Date.now();
    /**
     * @type {Bat}
     */
    bat = null;
    constructor(position, peer) {
        super(position, 32, 32, 6);
        this.peer = peer;
        const playerWidth = 50;
        const playerHeight = 130;
        this.boundingRect = new BoundingRectangle(new Vertex(0, 0, playerHeight/2), null, playerWidth, playerHeight);
        this.bat = new Bat(this);
    }

    changeState(newState) {
        if (newState == PlayerState.AboutToServe && this.state != PlayerState.AboutToServe) {
            playState.aboutToServe(this);
        }
        this.state = newState;
        // if newState == AboutToServe, move ball-position to player and lock it there (x = player.x - 5, y = player.y, z = 10 ish...) // Should have ball state too
    }

    draw(ctx, arrDrawOps, dx, dy) {
        // draw player
        super.draw(ctx, arrDrawOps, dx, dy);

        // draw bat (commented out for now)
        this.bat.draw(ctx, arrDrawOps, dx, dy);
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

        this.imagePromises.push(promise);

        //notDone!; // Load racket image? just need one image, so should load it outside or static or something! Maybe skip racket visuals to begin with. Not realllly needed...
        return promise;
    }

    getImages() {
        return this.images.idle;
    }

    hit() {
        //let checkForHit = true;
        if (this.state == PlayerState.AboutToServe) {
            // throw ball in the air...
            //checkForHit = false;
            ball.state = BallState.InPlay;
            this.state = PlayerState.Idle;
            ball.serve();
            playState.serving(player);
        }
        else if (this.state == PlayerState.Idle) {
            this.bat.swing();
            // try to hit ball, must check that it is close enough... Add target+spin etc later...
            // Will need collision detection anyway, so use general code...
        }
        /*if (checkForHit) {
            if (this.bat.collidesWith(ball)) {
                //console.log("HIT!z", ball.position.z)
                keys.hit = 0;
                ball.hit();
                playState.hit(player);
            }
            else {
                playState.miss(player);
                //console.log("MISS", ball.position, this.position);
            }
        }*/
    }
}
class Ball extends Sprite {
    velocity = new Vertex(0,0,0); // use vertex as vectors...
    state = BallState.AboutToServe;
    /**
     * @type {Player}
     */
    player = null;
    hitByUs = false;
    images = {
        // only animation should be spinning(?) and deformation on bounce.. but just use the bouncing orange for everything for now... :-)
        idle: {
            img: null, maxSteps: 0, step: 0,
        },
        shadow: {
            img: null, maxSteps: 0, step: 0,
        },
    }
    constructor(position) {
        super(position, 32, 32, 3);
        this.player = null;
        const ballWidth = 10;
        const ballHeight = ballWidth;
        this.boundingRect = new BoundingRectangle(new Vertex(0, 0, 0), null, ballWidth, ballHeight);
    }

    changeState(newState, lockOnPlayer) {
        this.state = newState;
        if (newState == BallState.AtRest || newState == BallState.OutOfBounds) {
            //console.log("ball at rest!")
            this.player.changeState(PlayerState.AboutToServe);
            this.changeState(BallState.AboutToServe, this.player);
            return;
        }
        if (lockOnPlayer) {
            this.player = lockOnPlayer;
        }
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

        const shadow = new Image();
        shadow.src = "./games/tennis/ball_shadow.png";
        const promise2 = new Promise(resolve => {
            shadow.onload = () => resolve();
            shadow.onerror = () => resolve();
        });

        this.images.shadow.img = shadow;
        this.images.shadow.maxSteps = 1;
        this.images.shadow.step = 0;

        return Promise.all([promise, promise2]);
    }

    getImages() {
        return this.images.idle;
    }

    draw(ctx, arrDrawOps, dx, dy) {
        // draw ball
        super.draw(ctx, arrDrawOps, dx, dy);

        // draw shadow
        let shadowPos = new Vertex(this.position.x, this.position.y, -this.position.z);
        //let v = shadowPos;
        let v = this.moveToWorldCoordinate(shadowPos);
        // så, gjør om fra world til camera...
        v = camera.toView(v);
        // project
        let p = this.project(v);
        arrDrawOps.push({z:p.z, draw: () => {

            //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) sx, sy = draw from first corner of img, with sWidth, sHeight.
            // dx, dy = coordinates on canvas to place image on, dWidth, dHeight = how big to make img on canvas
            //this.drawImage(ctx, dx, dy, p);

            ctx.save(); // save context, so can restore to default alpha
            // alpha closer to 1 the closer ball.position.z is to 0 (up to max 0.5?).
            if (ball.position.z > 800) {
                ctx.globalAlpha = 0.01;
            }
            else {
                ctx.globalAlpha = 0.5*(800-ball.position.z)/1600;
            }
            const shadow = this.images.shadow.img;
            const scaleFactorX = 64*this.scale/(15 * ctx.globalAlpha);
            const scaleFactorY = 37*this.scale/(15 * ctx.globalAlpha);
            ctx.drawImage(shadow, 0, 0, 64, 37, p.x+dx - p.z*scaleFactorX/2, -p.y+dy + p.z*scaleFactorY/2, p.z*scaleFactorX, -p.z*scaleFactorY);

            ctx.restore(); // restore default alpha
        }});
    }

    drawImage(ctx, dx, dy, p) {
        // no need to draw ball unless it is in play...
        const img = this.getImages();
        //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) sx, sy = draw from first corner of img, with sWidth, sHeight.
        // dx, dy = coordinates on canvas to place image on, dWidth, dHeight = how big to make img on canvas
        //ctx.drawImage(img.img, 0+(32*img.step), 0, 32, 32, p.x+dx - p.z*96/2, -p.y+dy + p.z*96/2, p.z*96, -p.z*96);
        const scaleFactorX = this.width*this.scale;
        const scaleFactorY = this.height*this.scale;
        ctx.drawImage(img.img, 0+(this.width*img.step), 0, this.width, this.height, p.x+dx - p.z*scaleFactorX/2, -p.y+dy + p.z*scaleFactorY/2, p.z*scaleFactorX, -p.z*scaleFactorY);
        //ctx.strokeText("0", p.x+dx, -p.y+dy);
        if (img.maxSteps == img.step) {
            img.step = 0;
        }
        else {
            //img.step++;
        }
    }

    update(delta) {
        /*if (ball.state == BallState.AboutToServe && player.state == PlayerState.AboutToServe) {
            // ball should be "locked" on to position of this.player 
            this.velocity.set(0,0,0);

            const playerPos = this.player.position;
            this.position.set(playerPos.x - 40, playerPos.y+10, 10); // prolly needs refining, but...
            //console.log("ballPos", this.position)
        }*/
        if (ball.state == BallState.AboutToServe && this.player?.state == PlayerState.AboutToServe) {
            // ball should be "locked" on to position of this.player 
            this.velocity.set(0,0,0);

            const playerPos = this.player.position;
            if (this.player.playPosition[0] == player.playPosition[0]) {
                // our team
                this.position.set(playerPos.x - 40, playerPos.y+10, 10); // prolly needs refining, but...
            }
            else {
                // other side
                this.position.set(playerPos.x + 40, playerPos.y-10, 10); // prolly needs refining, but...
            }
        }
        else if (ball.state == BallState.InPlay) {

            // should have velocity (in x, y and z direction)
            // should fall, if in the air (not still on ground, or held by player or something...)
            //  so, should accelerate downwards in that case (-z) towards 0, and then maybe bounce, depending on speed down...
            if (this.position.z > 0) {
                this.velocity.z += .05 * delta;
            }

            const factor = delta * .01;
            
            this.position.x += this.velocity.x * factor;
            this.position.y += this.velocity.y * factor;
            this.position.z -= this.velocity.z * factor;
            if (this.position.z <= 0) {
                // bounce?
                if(this.velocity.z > 10) {
                    this.velocity.z = -this.velocity.z + 10; // bounce, with a bit loss in velocity
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
                if (weAreServer) {
                    playState.ballBounce();
                }
            }
            if (this.position.z == 0 && this.velocity.z == 0) {
                ball.changeState(BallState.AtRest);
            }
            if (this.position.y > 650 || this.position.y < -650) {
                //ball.changeState(BallState.OutOfBounds);
                if (weAreServer) {
                    playState.ballOutOfBounds();
                }
            }
            if (this.position.z > 1000) {
                this.position.z = 1000;
                this.velocity.z = 0;
            }
        }
        else if (ball.state == BallState.OutOfBounds) {
            if (weAreServer) {
                playState.ballOutOfBounds();
            }
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

    serve() {
        // throw ball in the air...
        this.velocity.z = -Math.random() * 20 - 40;
        // should also add some random x and y axis velocity here (small ones)...
    }

    hit() {
        /*this.velocity.z = -Math.random() * 50 - 10;
        this.velocity.y = Math.random() * 20 + 20; 
        */

        // need to do a reverse projection to world coordinates!
        /*
            this is the projection we need to reverse
            // plasser mesh der den skal være i verden (translate ut fra position)
            v = this.moveToWorldCoordinate(v);
            
            // så, gjør om fra world til camera...
            v = camera.toView(v);

            // project
            //let p = this.project(face[0]);
            let p = this.project(v);*/
        //camera = new Camera(new Vertex(0, -1500, 1000), new Vertex(0, 800, 0));
        // how to calculate initial z value? Should be distance from camera to target?
        /*const a = Math.abs(camera.position.y - camera.target.y);
        const b = Math.abs(camera.position.z - camera.target.z);
        const c = Math.sqrt(a*a + b*b);
        console.log("dist: ", c)
        let target = new Vertex(keys.clickedX, keys.clickedY, 0.3473539549328028);

        const dx = canvasWidth / 2;
        const dy = canvasHeight / 2;
        target.x = target.x - dx;
        target.y = -target.y + dy;
        console.log("target", target)

        let v = this.unProject(target);
        console.log("v camera",v);

        v = camera.fromView(v);
        console.log("v world",v);*/

        // fake it...
        let target = new Vertex(keys.clickedX, keys.clickedY, 0);

        const dx = canvasWidth / 2;
        const dy = canvasHeight / 2;
        target.x = target.x - dx;
        target.y = -target.y + dy + canvasHeight/10;

        // 0,0 should now be bottom of horizontal center of net
        target.y = target.y / (canvasHeight/100);
        // (0,11ish) should now be middle of court, far top.
        target.x = target.x / (canvasWidth/100);
        // (-23ish, 11ish) should now be upper left corner, and (24ish, 11ish) should be upper right corner
        // (-32.5ish, 0.6ish) should now be lower left corner, and (33ish, 0.6ish) should be lower right corner
        

        // "guess" correct target from here (find world coordinates that correspond at z=0, and go from there...)
        // court is approx -580 to 580 x, 10 to 450 y(?)
        
        // VERY hacky solution, just have several horizontal "bands", where we calculate x,y with differnt factors for each band...
        let xFactor = 1;
        let yFactor = 1;
        if (target.y < 0.6) {
            target.y = 0.6;
        }
        let band = 1;
        //console.log("targetr", target);
        if (target.y >= 0.6 && target.y < 2) {
            xFactor = 550/33;
            yFactor = 20/0.6;
            band = 1;
        }
        else if (target.y >= 2 && target.y < 4) {
            xFactor = 450/33;
            yFactor = 450/10.5;
            band = 2;
        }
        else if (target.y >= 4 && target.y < 6) {
            xFactor = 550/33;
            yFactor = 300/10.5;
            band = 3;
        }
        else if (target.y >= 6 && target.y < 8) {
            xFactor = 600/33;
            yFactor = 250/10.5;
            band = 4;
        }
        else if (target.y >= 8 && target.y <= 11) {
            xFactor = 650/33;
            yFactor = 300/10.5;
            band = 5;
        }
        target.x = target.x * xFactor;
        target.y = target.y * yFactor;
        target.z = 0;

        // ignore click below net for now.
        //console.log("target", target)

        // make sure target is within bounds? skip for now

        // try to calculate velocities for ball to hit target...
        // calc distance for x and y
        const xDist = target.x - ball.position.x;
        const yDist = target.y - ball.position.y;
        //console.log("x,y dist", xDist, yDist)
        /*const netHeight = 80; // guess
        let velocityZ = -5; //?? guess
        ball.velocity.x = xDist / 6;
        ball.velocity.y = yDist / 6;
        console.log("ball.position.z", ball.position.z)
        if (ball.position.z < netHeight) {
             velocityZ = (ball.position.z - netHeight) ; // need to get negative number, since z velocity is subtracted, not added... stupidly... // ? guess
             // need to slow down x and y if we have more z...
             const slowDown = Math.abs(velocityZ)/2;
             const factX = ball.velocity.x / ball.velocity.y;
             const factY = ball.velocity.y / ball.velocity.x;
             if (ball.velocity.x < 0) {
                ball.velocity.x += slowDown * factX;
             }
             else {
                ball.velocity.x -= slowDown * factX;
             }
             ball.velocity.y -= slowDown * factY;
        }
        ball.velocity.z = velocityZ;*/
        // how hard do we hit? (divide distance by amount of "frames" we want ball to take from source to target... trial and error)
        //NOTDONE! Not working right now...
        
        // first, calculate distance directly to target (actual distance)
        const actualDist = Math.sqrt(xDist*xDist + yDist*yDist);
        //console.log("actualDist", actualDist)
        // new coord-system, parallell to dist
        const nSource = new Vertex(0, ball.position.z);
        const nTarget = new Vertex(actualDist, 0);
        const netHeight = 80; // guess
        const nAngle = Math.atan2(xDist, yDist);
        const yDistToNet = 0 - ball.position.y;
        const xDistToNet = yDistToNet * Math.tan(nAngle);
        //console.log("xDistToNet", xDistToNet, nAngle)
        const nDistToNet = Math.sqrt(xDistToNet*xDistToNet + yDistToNet*yDistToNet);
        const nBarrier = new Vertex(nDistToNet, netHeight);
        const gravity = .5; // from ball.update calc...
        //console.log("source, trarget, barrier", nSource, nTarget, nBarrier)
        const nVelocities = this.calculateInitialVelocities(gravity, nSource, nTarget, nBarrier);
        //console.log("calculated nVelocities", nVelocities)
        // nVelocities.x is x/y velocities (need to calc them from nVelocities.x)
        // nVelocities.y = z velocity
        nVelocities.x *= 2;
        nVelocities.y *= 2;
        ball.velocity.z = -nVelocities.y;
        ball.velocity.x = nVelocities.x * Math.sin(nAngle);
        ball.velocity.y = nVelocities.x * Math.cos(nAngle);

        // Nowhere near perfect, but sick and tired of it...

        //console.log("ball.vel", ball.velocity)

        // if we are not server, need to tell server that we hit the ball!! and tell server velocities and stuff...
        if (!weAreServer) {
            this.hitByUs = true;
        }
    }

    calculateInitialVelocities(gravity, source, target, barrier) {
        let timeToBarrier, timeFromBarrierToTarget, totalTime, initialVelocityX, initialVelocityY;
        
        if (source.y == barrier.y) {
            source.y -= 1;
        }

        if (source.y > barrier.y) {
            timeToBarrier = (barrier.x - source.x) / Math.sqrt(2 * gravity * (source.y - barrier.y));
        }

        //if (source.y >= barrier.y) {
            // wrong: // If the source is at or above the barrier height, calculate time based on horizontal distance
            // time to fall to barrier height from source height.
            /*if (source.y == barrier.y) {
                timeToBarrier = 0;
            }
            else {
                timeToBarrier = Math.sqrt((2 * (source.y - barrier.y) ) / gravity);
            }*/
        else {
            // If the source is below the barrier height, calculate time based on vertical distance
            //timeToBarrier = Math.sqrt((barrier.y - source.y) / (0.5 * gravity));
            timeToBarrier = (barrier.x - source.x) / Math.sqrt(2 * gravity * (barrier.y - source.y));
        }

        // Calculate the time from barrier to target
        timeFromBarrierToTarget = Math.sqrt((2 * (barrier.y - target.y) ) / (0.5 * gravity));

        // Total time of flight
        totalTime = timeToBarrier + timeFromBarrierToTarget;

        // Calculate initial velocities
        initialVelocityX = (target.x - source.x) / totalTime;
        initialVelocityY = gravity * totalTime;

        return { x: initialVelocityX*2, y: initialVelocityY/2 };
    }

    /*function calculateInitialVelocities(gravity, source, target, barrier) {
    // Calculate distances
    let dx = target.x - source.x;
    let dy = target.y - source.y;
    let bx = barrier.x - source.x;
    let by = barrier.y - source.y;

    // Calculate time to reach barrier in x direction
    let t1 = Math.sqrt((2 * by) / gravity);

    // Calculate initial x velocity
    let vx = bx / t1;

    // Calculate total time to reach target
    let t2 = Math.sqrt((2 * (dy + (gravity * t1 * t1 / 2))) / gravity);

    // Calculate initial y velocity
    let vy = gravity * t2;

    return { vx: vx, vy: vy };
}

let gravity = 9.8; // m/s^2
let source = { x: 0, y: 0 }; // Source coordinates
let target = { x: 100, y: 0 }; // Target coordinates
let barrier = { x: 50, y: 150 }; // Barrier coordinates

let velocities = calculateInitialVelocities(gravity, source, target, barrier);

console.log(`Initial velocities: vx = ${velocities.vx.toFixed(2)} m/s, vy = ${velocities.vy.toFixed(2)} m/s`);
//Initial velocities: vx = 15.65 m/s, vy = 31.30 m/s (50 high barr)
//Initial velocities: vx = 9.04 m/s, vy = 54.22 m/s (150 barr)*/
    
}
class Net extends Sprite {
    constructor(position) {
        super(position, 324, 29, 9);
    }

    loadImages() {
        return super.loadImages("./games/tennis/net2.png");
    }

    drawImage(ctx, dx, dy, p) {
        const img = this.getImages();
        //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) sx, sy = draw from first corner of img, with sWidth, sHeight.
        // dx, dy = coordinates on canvas to place image on, dWidth, dHeight = how big to make img on canvas
        // Need it's own function to hack it in proper place...
        const scaleFactorX = this.width*this.scale;
        const scaleFactorY = this.height*this.scale;
        ctx.drawImage(img.img, 0, 0, this.width, this.height, p.x+dx - p.z*scaleFactorX/2, -p.y+dy -(canvasHeight/45.8) + p.z*scaleFactorY/2, p.z*scaleFactorX, -p.z*scaleFactorY); // (canvasHeight/45.8) manually adjustment to make it fit the not quite symmetrical bakcground...
        
    }
}
class Bat extends Entity {
    plr = null;
    offsetFromPlayer = new Vertex(40, 10, 80);
    angleToBall = 0;
    angleOfHit = 0;
    swinging = false;
    constructor(plr) {
        super(new Vertex(0,0,0));
        if (plr?.position) {
            this.position.set(plr.position.x + this.offsetFromPlayer.x, plr.position.y + this.offsetFromPlayer.y, plr.position.z + this.offsetFromPlayer.z);
        }
        this.vertices = [
            new Vertex(-1, 1, 10),  //0
            new Vertex(1, 1, 10),   //1
            new Vertex(1, -1, 10),  //2
            new Vertex(-1, -1, 10), //3
            new Vertex(-1, 1, -10), //4
            new Vertex(1, 1, -10),  //5
            new Vertex(1, -1, -10), //6
            new Vertex(-1, -1, -10),//7
        ];
        this.faces = [
            [this.vertices[0], this.vertices[1], this.vertices[2], this.vertices[3]], // top
            [this.vertices[4], this.vertices[5], this.vertices[6], this.vertices[7]], // bottom
            [this.vertices[0], this.vertices[3], this.vertices[7], this.vertices[4]], // left side
            [this.vertices[1], this.vertices[2], this.vertices[6], this.vertices[5]], // right side
            [this.vertices[3], this.vertices[2], this.vertices[6], this.vertices[7]], // near side
            [this.vertices[1], this.vertices[0], this.vertices[4], this.vertices[5]], // far side
        ]
        this.size = 20;
        this.plr = plr;
        //this.boundingRect = new BoundingRectangle(new Vertex(0,0,0), this.vertices.map(v => new Vertex(v.x * this.size, v.y * this.size, v.z * this.size)));
        this.boundingRect = new BoundingRectangle(new Vertex(0,0,0), null, this.size * 10, 10 * this.size);
    }

    draw(ctx, arrDrawOps, dx, dy) {

        if (this.plr) {
            if (this.plr.playPosition[0] == player.playPosition[0]) {
                this.position.set(this.plr.position.x + this.offsetFromPlayer.x, this.plr.position.y + this.offsetFromPlayer.y, this.plr.position.z + this.offsetFromPlayer.z);
            }
            else {
                this.position.set(this.plr.position.x - this.offsetFromPlayer.x, this.plr.position.y - this.offsetFromPlayer.y, this.plr.position.z + this.offsetFromPlayer.z);
            }
        }
        const playerIndex = arrDrawOps.length-1;
        const playerZ = arrDrawOps[playerIndex].z;
        super.draw(ctx, arrDrawOps, dx, dy);
        // make sure bat is drawn in front of player: (HACKY AS F...)
        let adjustBy = 0.05;
        if (this.plr.playPosition[0] != player.playPosition[0]) {
            adjustBy = -adjustBy;
        }
        for (let i = playerIndex+1; i < arrDrawOps.length; i++) {
            const drawOp = arrDrawOps[i];
            drawOp.z-= adjustBy;
        }
    }

    update(delta) {
        if (this.swinging) {
            if (this.collidesWith(ball)) {
                //console.log("HIT!z", ball.position.z)
                keys.hit = 0;
                ball.hit();
                playState.hit(player);
            }
            else {
                playState.miss(player);
                //console.log("MISS", ball.position, this.position);
            }
        }
    }

    /**
     * 
     * @param {Entity} entity 
     * @returns {boolean}
     */
    collidesWith(entity) {

        // need to rotate entity.position around same center as bat rotation (bottom of bat), with opposite of bat angles... can then compare as if not rotated....
        // Need to first convert from world coordinates to entity coordinates, BUT centered on this(bat).position, so it rotates around bat's base (move from center to base is in rotate func)
        const batCenteredEntityPos = new Vertex(entity.position.x - this.position.x, entity.position.y - this.position.y, entity.position.z - this.position.z);
        const reverseRotatedEntityPos = this.rotate(batCenteredEntityPos, false);
        // then, put it back on world coordinates
        reverseRotatedEntityPos.set(reverseRotatedEntityPos.x + this.position.x, reverseRotatedEntityPos.y + this.position.y, reverseRotatedEntityPos.z + this.position.z);
        //console.log("collidesWith...", this.position, this.boundingRect, reverseRotatedEntityPos, entity.position, this.angleToBall);
        
        return this.boundingRect.collidesWith(this.position, reverseRotatedEntityPos, entity.boundingRect);
    }

    /**
     * 
     * @param {Vertex} vertex 
     * @param {boolean} forwardRotation 
     * @returns {Vertex}
     */
    rotate(vertex, forwardRotation) {
        // use both angles to rotate
        if (forwardRotation == null || typeof(forwardRotation) == "undefined") {
            forwardRotation = true;
        }
        
        // first, move vertices so centered on base
        /*let newV = new Vertex(vertex.x, vertex.y, vertex.z + this.vertices[0].z); // add z, so top z is 20 and bottom z is 0.
        
        // rotate
        const tx = this.angleToBall == 0? newV.x : newV.x * Math.cos(this.angleToBall) + newV.z * Math.sin(this.angleToBall); // if horizAngle == 0, this is unneded, since it just gives x.
        let tz = this.angleToBall == 0? newV.z : newV.z * Math.cos(this.angleToBall) - newV.x * Math.sin(this.angleToBall); // if horizAngle == 0, this is unneded, since it just gives z.
        
        // cannot do both rotations in same system, the second rotation will be around wrong axis...
        //const ty = this.angleOfHit == 0? newV.y : newV.y * Math.cos(this.angleOfHit) + tz * Math.sin(this.angleOfHit); // if vertAngle == 0, this is unneded, since it just gives y.
        //tz = this.angleOfHit == 0? tz : tz * Math.cos(this.angleOfHit) - newV.y * Math.sin(this.angleOfHit); // if vertAngle == 0, this is unneded, since it just gives tz.
        let ty = newV.y;
        // move back
        newV.set(tx, ty, tz - this.vertices[0].z);

        // other rotation?
        let otherV = new Vertex(vertex.x, vertex.y, vertex.z + this.vertices[0].z); // add z, so top z is 20 and bottom z is 0.
        const ty2 = this.angleOfHit == 0? otherV.y : otherV.y * Math.cos(this.angleOfHit) + otherV.z * Math.sin(this.angleOfHit); // if vertAngle == 0, this is unneded, since it just gives y.
        const tz2 = this.angleOfHit == 0? otherV.z : otherV.z * Math.cos(this.angleOfHit) - otherV.y * Math.sin(this.angleOfHit); // if vertAngle == 0, this is unneded, since it just gives tz.
        
        // move back
        otherV.set(otherV.x, ty2, tz2 - this.vertices[0].z);*/

        
        // have correct y value (just use otherV.y)
        
        //return new Vertex(newV.x, newV.y, newV.z);
        //return new Vertex(otherV.x, otherV.y, otherV.z);


        //const q = Quaternion.fromEulerLogical(this.angleToBall, this.angleOfHit, 0, 'XYZ');
        if (this.swinging) {
            let q;
            const refAngle = this.angleToBall%(2*Math.PI);

            const aHit = forwardRotation? this.angleOfHit : -this.angleOfHit;
            const aBall = forwardRotation? this.angleToBall : -this.angleToBall;
            if (Math.abs(refAngle) <= 0.4 || Math.abs(refAngle) >= 2*Math.PI-0.4) {
                //console.log("FDJSIOFJDS", aHit)
                q = Quaternion.fromEulerLogical(0, aHit, 0); // hit straight forward
            }
            else {
                q = Quaternion.fromEulerLogical(aBall, 0, aHit); // hit from side
            }
            
            const rotatedVec = q.rotateVector([vertex.x, vertex.y, vertex.z + this.vertices[0].z]);
            
            if (forwardRotation) {
                if (Math.abs(refAngle) <= 0.4 || Math.abs(refAngle) >= 2*Math.PI-0.4) {
                    // hitting straight forward..
                    if (this.angleOfHit <= -Math.PI/1.5) {
                        this.swinging = false;
                        if (this.plr == player) {
                            playState.playerStoppedSwinging(player);
                        }
                    }
                    else {
                        this.angleOfHit -= 0.01;
                    }
                }
                else if ( (refAngle > 0 && refAngle < Math.PI) || (refAngle < -Math.PI) ) {
                    // on right side
                    if (this.angleOfHit >= Math.PI/1.5) {
                        this.swinging = false;
                        if (this.plr == player) {
                            playState.playerStoppedSwinging(player);
                        }
                    }
                    else {
                        this.angleOfHit += 0.01;
                    }
                }
                else {
                    // on left side
                    if (this.angleOfHit <= -Math.PI/1.5) {
                        this.swinging = false;
                        if (this.plr == player) {
                            playState.playerStoppedSwinging(player);
                        }
                    }
                    else {
                        this.angleOfHit -= 0.01;
                    }
                }
                if (!this.swinging) {
                    this.angleOfHit = 0;
                    this.angleToBall = 0;
                }
            }

            return new Vertex(rotatedVec[0], rotatedVec[1], rotatedVec[2] - this.vertices[0].z);
        }
        else {
            return new Vertex(vertex.x, vertex.y, vertex.z);
        }
        
    }
    
    swing() {
        // should start a swing, rotate around base of player (or bat?), with end towards ball.
        // if start a new swing, abort old and start new...
        // should be gradual across x amount of frames (try...)
        // angleOfBall should be "pointing at" ball (x-z coords)
        // angleOfHit should be "animated" through hit (from pi/2 (or maybe back from 2PI/3) to 11PI/6 or so )
        //  (in y-z coords)
        let b = this.position.x - ball.position.x;
        let a = this.position.z - (this.vertices[0].z * this.size)/2 - ball.position.z; // centered on bottom of bat
        this.angleToBall = -(Math.atan2(a, b) + Math.PI/2); // relative to straight up

        // start by drawing bat back a bit
        const refAngle = this.angleToBall%(2*Math.PI);
        if (Math.abs(refAngle) <= 0.4 || Math.abs(refAngle) >= 2*Math.PI-0.4) {
            // straight forward-ish
            this.angleOfHit = 0.8;
        }
        else if ( (refAngle > 0 && refAngle < Math.PI) || (refAngle < -Math.PI) ) {
            // on right side
            this.angleOfHit = -0.8;
        }
        else {
            // on left side
            this.angleOfHit = 0.8;
        }
        this.swinging = true;
        playState.playerSwinging(player);
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

/**
 * @type {HTMLDivElement}
 */
let mainDiv = null;
/**
 * @type {HTMLDivElement}
 */
let touchDiv = null;
/**
 * @type {SVGSVGElement}
 */
let touchImg = null;
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
let player = new Player(); // just to let ide help us with type...
/*const opponent = {
    //x: playArea.sX/2-100, y: 150, // initial placement
    x: -100, y: -150, // initial placement
    peer: null,
}*/
/**
 * @type {Array.<Player>}
 */
let players = []; // [["player1", "player2"]], or up to [["player1", "player3"],["player2", "player4"]]
const peers = [];
let weAreServer = true;
//let opponent = null;
let ball = new Ball(new Vertex(0,0,200));
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
    down: false,
    hit: 0, // for now, unsure...
    clickedX: 0,
    clickedY: 0,
    touchX: 0,
    touchY: 0,
    touchIdentifier: null,
    movementSpeedX: 1,
    movementSpeedY: 1,
}

let entities = [];
let camera = new Camera(new Vertex(0,0,0), new Vertex(0,0,0));

let nick = null;
export function setPlayers(allPlayers, areWeServer, ourNick) {
    weAreServer = areWeServer;
    nick = ourNick;

    allPlayers.forEach((team, teamIndex, teamArr) => {
        team.forEach((plrPeer, plrIndex, plrArr) => {
            const plr = new Player(new Vertex(0,0,0), plrPeer);
            if (plrPeer.nick == nick) {
                player = plr;
            }
            plr.playPosition = [teamIndex, plrIndex];
            if (teamIndex == 0) {
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
            }
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
// Change this. Need to change from onNewPeer to addPlayer or something like that...
// Change from opponent to otherPlayers? Or something. Think about it...
// Maybe leave player as is, but add players, where player is one of them? Or maybe team1 and team2? No need for array for team, when we know there may max be 2? Or??
// Maybe best with players = [], so we don't have to reinvent for any other games?
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

    
    // set background image on mainDiv (tennis court)
    mainDiv.style.backgroundImage = "url('./games/tennis/background_court.jpg')";

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

    // preload images/sprites
    
    // setup listeners (keys/mouse/touch++, 
    setupKeyListeners();
    setupMouseListeners();
    setupTouchListeners();
    
    // prolly need onresize, too, since that changes size of canvas...
    addEventListener("resize", onResize);
    onResize(); // get initial size

    createEntities();

    initializeState();

    // start gameloop..?MainLoop.start() ? Or in allImagesLoaded() maybe???
    console.log("initialized tennis!")

    //playState.teamWon(0);
}

function initializeState() {
    // setup starting state of game, starting state of players...

    gameState = GameState.AboutToServe;

    for (const plr of players) {
        //plr.state = PlayerState.Idle;
        plr.changeState(PlayerState.Idle);
    }
    // first player in players should serve first...
    //if (weAreServer) {
        players[0].changeState(PlayerState.AboutToServe);
        ball.changeState(BallState.AboutToServe, players[0]);
    //}
}

function createEntities() {
    //entities.push(new Court()); // for visualizing the court, and making sure camera is in proper position, etc..
    //entities.push(new Court(2));
    

    const promises = [];
    /*promises.push(loadPlayerImages() );
    promises.push(loadOpponentImages() );*/
    //player = new Player(new Vertex(150,-180,0));
    /*promises.push(player.loadImages("./games/tennis/guy_idle.png") );
    entities.push(player);

    opponent = new Player(new Vertex(-150,180,0));
    promises.push(opponent.loadImages("./games/tennis/frog_idle.png") );
    entities.push(opponent);*/

    for (const plr of players) {
        for (const pr of plr.imagePromises) {
            promises.push(pr);
        }
        if (plr.playPosition[0] == 0 && plr.playPosition[1] == 0) {
            plr.position.x = 150;
            plr.position.y = -250;
        }
        else if (plr.playPosition[0] == 0 && plr.playPosition[1] == 1) {
            plr.position.x = -150;
            plr.position.y = -250;
        }
        else if (plr.playPosition[0] == 1 && plr.playPosition[1] == 0) {
            plr.position.x = -150;
            plr.position.y = 250;
        }
        else if (plr.playPosition[0] == 1 && plr.playPosition[1] == 1) {
            plr.position.x = 150;
            plr.position.y = 250;
        }
        if (player.playPosition[0] == 1) {
            // we are on the other team, switch around...
            plr.position.x *= -1;
            plr.position.y *= -1;
        }
        entities.push(plr);
    }

    //ball = new Ball(new Vertex(0,0,200)); // just for fun, for now...
    promises.push(ball.loadImages() );
    entities.push(ball);

    const net = new Net(new Vertex(40,0,0));
    promises.push(net.loadImages() );
    entities.push(net);

    Promise.all(promises).then(allImagesLoaded); // allImagesLoaded is called when all images are done loading


    //camera = new Camera(new Vertex(0, -185, 517), new Vertex(0, 0, 0));
    //camera = new Camera(new Vertex(0, -200, 617), new Vertex(0, 350, 0));
    camera = new Camera(new Vertex(0, -1500, 1000), new Vertex(0, 800, 0));
}

function destroyEntities() {
    camera = null;
    entities = [];
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

function setupKeyListeners() {
    addEventListener("keydown", keyDown);
    addEventListener("keyup", keyUp);
}

function removeKeyListeners() {
    removeEventListener("keydown", keyDown);
    removeEventListener("keyup", keyUp);
}

function setupMouseListeners() {
    canvas.addEventListener("click", clicked);
}

function removeMouseListeners() {
    if (canvas) {
        canvas.removeEventListener("click", clicked);
    }
}

function setupTouchListeners() {
    touchDiv.addEventListener("touchstart", touchStart);
    touchDiv.addEventListener("touchmove", touchMove);
    touchDiv.addEventListener("touchend", touchEnd);
    touchDiv.addEventListener("touchcancel", touchEnd);
    canvas.addEventListener("touchend", touchClicked);
}

function removeTouchListeners() {
    touchDiv.removeEventListener("touchstart", touchStart);
    touchDiv.removeEventListener("touchmove", touchMove);
    touchDiv.removeEventListener("touchend", touchEnd);
    touchDiv.removeEventListener("touchcancel", touchEnd);
    canvas.removeEventListener("touchend", touchClicked);
}

function touchClicked(event) {
    for (const touch of event.changedTouches) {
        if (keys.touchIdentifier != touch.identifier) {
            const evt = new MouseEvent("click", {
                bubbles: false,
                clientX: touch.pageX,
                clientY: touch.pageY
            });
            clicked(evt);
            return;
        }
    }
}

function showTouchImg(x, y) {
    touchImg.style.display = "";
    const svgBounds = touchImg.getBoundingClientRect();
    touchImg.style.left = "" + (x - svgBounds.width/2 - touchDiv.getBoundingClientRect().left) + "px";
    touchImg.style.top = "" + (y - svgBounds.height/2 - touchDiv.getBoundingClientRect().top) + "px";
}

function hideTouchImg() {
    touchImg.style.display = "none";
}

function touchStart(event) {
    if (event.changedTouches.length == 1 || keys.touchIdentifier == null) {
        keys.touchX = event.changedTouches[0].pageX;
        keys.touchY = event.changedTouches[0].pageY;
        keys.touchIdentifier = event.changedTouches[0].identifier;
        showTouchImg(keys.touchX, keys.touchY);
    }
    else {
        /*for (const touch of event.changedTouches) {
            if (keys.touchIdentifier != touch.identifier) {
                const evt = new MouseEvent("click", {
                    bubbles: false,
                    clientX: touch.pageX,
                    clientY: touch.pageY
                });
                //canvas.dispatchEvent(evt);
                clicked(evt);
                return;
            }
        };*/
    }
}

function touchMove(event) {
    const factor = 80;
    for (const touch of event.changedTouches) {
        if (keys.touchIdentifier == touch.identifier) {
            const newX = touch.pageX;
            const newY = touch.pageY;
            if (newX > keys.touchX) {
                keys.right = true;
                keys.left = false;
                keys.movementSpeedX = (newX - keys.touchX)/factor;
            }
            else if (newX < keys.touchX) {
                keys.right = false;
                keys.left = true;
                keys.movementSpeedX = (keys.touchX - newX)/factor;
            }
            else {
                keys.right = false;
                keys.left = false;
            }
            if (newY > keys.touchY) {
                keys.up = false;
                keys.down = true;
                keys.movementSpeedY = (newY - keys.touchY)/factor;
            }
            else if (newY < keys.touchY) {
                keys.up = true;
                keys.down = false;
                keys.movementSpeedY = (keys.touchY - newY)/factor;
            }
            else {
                keys.up = false;
                keys.down = false;
            }
            if (keys.movementSpeedX > 1) {
                keys.movementSpeedX = 1;
            }
            if (keys.movementSpeedY > 1) {
                keys.movementSpeedY = 1;
            }
            return;
        }
    }
}

function touchEnd(event) {
    for (const touch of event.changedTouches) {
        if (keys.touchIdentifier == touch.identifier && touch.force == 0) {
            keys.touchX = keys.touchY = 0;
            keys.left = keys.right = keys.up = keys.down = false;
            keys.touchIdentifier = null;
            hideTouchImg();
            return;
        }
    }

}

function clicked(event) {
    //console.log("clicked", event.clientX, event.clientY);
    // need to do a hit (unless we are in aboutToServe-mode)
    // if hit-> translate event.clientX/Y to world coords (z = 0), always on other side of net (y > 80 or so?), and prolly inside bounds?
    // calculate velocities to reach that target... give em to the ball...
    //touchDiv.innerHTML =  touchDiv.innerHTML + ". Clicked";
    keys.clickedX = event.clientX;
    keys.clickedY = event.clientY;
    keys.hit = 10;
}

function allImagesLoaded() {
    // start gameloop here!???
    console.log("starttting!");
    MainLoop.start();
}

/*function loadPlayerImages() {
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
}*/

function movePlayer(delta) {
    let moved = false;
    if (keys.down) {
        player.position.y -= .5 * delta * keys.movementSpeedY;
        if (player.position.y < -450) {
            player.position.y = -450;
        }
        /*ball.position.z -= .5 * delta;
        ball.position.y = -250;*/
        moved = true;
    }
    else if (keys.up) {
        player.position.y += .5 * delta * keys.movementSpeedY;
        if (player.position.y > -10) {
            player.position.y = -10;
        }
        //ball.position.z += .5 * delta;
        moved = true;
    }
    if (keys.left) {
        player.position.x -= .6 * delta * keys.movementSpeedX;
        if (player.position.x < -580) {
            player.position.x = -580;
        }
        //ball.position.x -= .5 * delta;
        moved = true;
    }
    else if (keys.right) {
        player.position.x += .6 * delta * keys.movementSpeedX;
        if (player.position.x > 580) {
            player.position.x = 580;
        }
        //ball.position.x += .5 * delta;
        moved = true;
    }
    if (player.state == PlayerState.AboutToServe) {
        if (player.position.y > -250) {
            player.position.y = -250;
            moved = true;
        }
    }
    if (moved) {
        playState.playerMoved(player);
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

/**
 * 
 * @param {string} plrNick 
 * @returns {Player}
 */
function findPlayerByNick(plrNick) {
    for (const plr of players) {
        if (plr.peer?.nick == plrNick) {
            return plr;
        }
    }
    return null;
}

function findPlayPositionOfPeer(peer) {
    for (const plr of players) {
        if (plr.peer?.nick == peer.nick) {
            return plr.playPosition;
        }
    }
    return null;
}

function getNewState(peer, data) {
    /*if (data.players) {
        // update from server
        for (let i = 0; i < players.length; i++) {
            if (players[i].peer.nick == nick) {
                // dont update ourselves... skip
                continue;
            }
            //playPosition [0, 0] is team1, first player, [0,1] is same team, second player. [1,0] is second team first player, etc...
            if (data.serverPosition[0] == player.playPosition[0]) {
                players[i].position.x = data.players[i].pos.x;
                players[i].position.y = data.players[i].pos.y;
                players[i].position.z = data.players[i].pos.z;
            }
            else {
                players[i].position.x = -data.players[i].pos.x;
                players[i].position.y = -data.players[i].pos.y;
                players[i].position.z = data.players[i].pos.z;
            }
        }
        ball.state = data.ball.state;
        if (data.serverPosition[0] == player.playPosition[0]) {
            ball.position.x = data.ball.pos.x;
            ball.position.y = data.ball.pos.y;
            ball.position.z = data.ball.pos.z;
        }
        else {
            ball.position.x = -data.ball.pos.x;
            ball.position.y = -data.ball.pos.y;
            ball.position.z = data.ball.pos.z;
        }
    }
    else if (data.player) {
        // update from player to server
        const plr = getPlayerByNick(peer.nick);
        if (plr) {
            if (player.playPosition[0] == plr.playPosition[0]) {
                plr.position.x = data.player.pos.x;
                plr.position.y = data.player.pos.y;
                plr.position.z = data.player.pos.z;
            }
            else {
                plr.position.x = -data.player.pos.x;
                plr.position.y = -data.player.pos.y;
                plr.position.z = data.player.pos.z;
            }
            if (data.ball?.hit) {
                if (player.playPosition[0] == plr.playPosition[0]) {
                    //data.ball.hit
                    ball.position.set(data.ball.pos.x, data.ball.pos.y, data.ball.pos.z);
                    ball.velocity.set(data.ball.vel.x, data.ball.vel.y, data.ball.vel.z);
                }
                else {
                    ball.position.set(-data.ball.pos.x, -data.ball.pos.y, data.ball.pos.z);
                    ball.velocity.set(-data.ball.vel.x, -data.ball.vel.y, data.ball.vel.z);
                }
            }
        }
    }*/
    const change = data.changedState;
    //console.log("change", change, data.id)

    // playerMoved, playerSwinging, playerStoppedSwinging are non-essential, don't need confirmation, but discard old packages, since they are outdated
    
    if (!peer.packageId || data.id > peer.packageId) { // make sure its a new package
        peer.packageId = data.id;
        // {playerMoved: nick, pos}, {aboutToServe: nick}, {serving: nick, ball:{pos, vel}}, {hit: nick, ball:{pos, vel}}, {score: [1,0]}
        if (change.playerMoved) {
            // {playerMoved: nick, pos}
            const plr = findPlayerByNick(change.playerMoved);
            const peerPlayPos = findPlayPositionOfPeer(peer);
            
            if (plr != player) {
                const sameTeamAsUs = peerPlayPos[0] == player.playPosition[0];
                //console.log("move to ", change.pos, sameTeamAsUs, plr)
                plr.updatePos(sameTeamAsUs, change.pos);
                if (weAreServer) {
                    // tell others about it...
                    playState.playerMoved(plr);
                }
            }
        }
        //, {playerSwinging: nick, angleToBall, angleOfHit}
        if (change.playerSwinging) {
            const plr = findPlayerByNick(change.playerSwinging);
            const peerPlayPos = findPlayPositionOfPeer(peer);
            if (plr != player) {
                plr.bat.swinging = true;
                const sameTeamAsUs = peerPlayPos[0] == player.playPosition[0];
                plr.bat.angleOfHit = sameTeamAsUs? change.angleOfHit : -change.angleOfHit;
                plr.bat.angleToBall = sameTeamAsUs? change.angleToBall : -change.angleToBall;
            }
        }
        //, {playerStoppedSwinging: nick}
        if (change.playerStoppedSwinging) {
            const plr = findPlayerByNick(change.playerStoppedSwinging);
            plr.bat.swinging = false;
            plr.bat.angleOfHit = 0;
            plr.bat.angleToBall = 0;
        }
    }
    // these next are essential, and we need to send confirmation that they have been received! If sender does not receive delivery confirmation within x ms (or something?), sender sends new copy of message
    if (change.aboutToServe) {
        // {aboutToServe: nick}
        const plr = findPlayerByNick(change.aboutToServe);

        playState.lastPlayerToServe = plr;
        
        // make sure other players are set to idle
        for (const p of players) {
            if (p != plr) {
                p.changeState(PlayerState.Idle);
            }
        }
        
        if (plr.state != PlayerState.AboutToServe) {
            plr.changeState(PlayerState.AboutToServe);
            ball.changeState(BallState.AboutToServe, plr);
            /*if (plr != player && weAreServer) {
                playState.aboutToServe(plr);
            }*/
        }
        playState.confirm("aboutToServe", data.id);
    }
    if (change.serving) {
        //{serving: nick, ball:{pos, vel}}
        const plr = findPlayerByNick(change.serving);
        playState.lastPlayerToServe = playState.lastPlayerToHitBall = plr;

        // make sure other players are set to idle
        for (const p of players) {
            if (p != plr) {
                p.changeState(PlayerState.Idle);
            }
        }

        if (plr != player && plr.state != PlayerState.Idle) {
            plr.changeState(PlayerState.Idle);
            const peerPlayPos = findPlayPositionOfPeer(peer);
            const sameTeamAsUs = peerPlayPos[0] == player.playPosition[0];
            ball.changeState(BallState.InPlay);
            ball.updatePos(sameTeamAsUs, change.ball.pos);
            ball.updateVel(sameTeamAsUs, change.ball.vel);
            if (plr != player && weAreServer) {
                playState.serving(plr);
            }
        }
        playState.confirm("serving", data.id);
    }
    if (change.hit) {
        //{hit: nick, ball:{pos, vel}}
        const plr = findPlayerByNick(change.hit);
        playState.lastPlayerToHitBall = plr;

        // make sure all players are set to idle
        for (const p of players) {
            p.changeState(PlayerState.Idle);
        }
        if (plr != player) {
            const peerPlayPos = findPlayPositionOfPeer(peer);
            const sameTeamAsUs = peerPlayPos[0] == player.playPosition[0];
            ball.changeState(BallState.InPlay);
            ball.updatePos(sameTeamAsUs, change.ball.pos);
            ball.updateVel(sameTeamAsUs, change.ball.vel);
            if (plr != player && weAreServer) {
                playState.hit(plr);
            }
        }
        playState.confirm("hit", data.id);
    }
    if (change.score) {
        //{score: [1,0]}
        // only server updates this...
        playState.scores = change.score;
        playState.confirm("score", data.id);
    }
    if (typeof(change.teamWon) != "undefined") {
        playState.teamWon(change.teamWon);
        playState.confirm("teamWon", data.id);
    }

    if (change.confirm) {
        //{confirm: {score|hit|etc: id}} (can be multiple... ex: {confirm: {score: 1, hit: 1....})
        for (const key of Object.keys(change.confirm)) {
            playState.receivedConfirmation(key, change.confirm[key], peer);
        }
    }
    
}

let packageId = 1;
//let prevPackage = null;
function sendNewState() {
    /*if (prevPackage != null) {
        // send twice for redundancy... :-) recipient should throw away duplicate packages (by id)
        if (weAreServer) {
            peers.forEach(p => {
                if (prevPackage.changedState?.playerMoved == p.nick
                        || prevPackage.changedState?.serving == p.nick
                        || prevPackage.changedState?.hit == p.nick) {
                    // is same player, no need to send to them...
                    // could be other changes we want to send, tho! should remove those, and send any other...
                    const prunedState = {};
                    for (const key of Object.keys(prevPackage.changedState)) {
                        if (key == 'playerMoved' && prevPackage.changedState.playerMoved == p.nick
                            || key == 'serving' && prevPackage.changedState.serving == p.nick
                            || key == 'hit' && prevPackage.changedState.hit == p.nick
                            || key == 'playerSwinging' && state.changedState.playerSwinging == p.nick
                            || key == 'playerStoppedSwinging' && state.changedState.playerStoppedSwinging == p.nick) {
                            // skip
                        }
                        else {
                            prunedState[key] = prevPackage.changedState[key];
                        }
                    }
                    if (Object.keys(prunedState).length > 0) {
                        p.channel.send(JSON.stringify({changedState: prunedState, id: prevPackage.id}));
                    }
                }
                else {
                    p.channel.send(JSON.stringify(prevPackage));
                }
            });
        }
        else {
            peers[0].channel.send(JSON.stringify(prevPackage));
        }
        
        prevPackage = null;
    }*/
    if (Object.keys(playState.changedState).length > 0) {
        const state = {changedState: playState.changedState, id: packageId};
        const toSend = JSON.stringify(state);
        if (weAreServer) {
            // send current state
            //Should only send ball data on changes to velocity (ball hit or reset etc.. dont send back to player who initially sent, either...)
            // send playState.changedState if not empty
            //const state = {serverPosition: player.playPosition, players: [], ball: {state: ball.state, pos: ball.position}};
            /*for (const plr of players) {

                state.players.push({pos: plr.position}); // assume fixed players-arrays, so all have same player in [0], etc..
            }*/
            // {playerMoved: nick, pos}, {aboutToServe: nick}, {serving: nick, ball:{pos, vel}}, {hit: nick, ball:{pos, vel}}, {score: [1,0]}
            peers.forEach(p => {
                if (state.changedState.playerMoved == p.nick
                        || state.changedState.serving == p.nick
                        || state.changedState.hit == p.nick) {
                    // is same player, no need to send to them...
                    // could be other changes we want to send, tho! should remove those, and send any other...
                    const prunedState = {};
                    for (const key of Object.keys(state.changedState)) {
                        if (key == 'playerMoved' && state.changedState.playerMoved == p.nick
                            || key == 'serving' && state.changedState.serving == p.nick
                            || key == 'hit' && state.changedState.hit == p.nick
                            || key == 'playerSwinging' && state.changedState.playerSwinging == p.nick
                            || key == 'playerStoppedSwinging' && state.changedState.playerStoppedSwinging == p.nick) {
                            // skip
                        }
                        else {
                            prunedState[key] = state.changedState[key];
                        }
                    }
                    if (Object.keys(prunedState).length > 0) {
                        const prunedStateToSend = {changedState: prunedState, id: toSend.id};
                        p.channel.send(JSON.stringify(prunedStateToSend));
                        playState.mayNeedConfirmation(prunedStateToSend, p);
                        playState.resendUnconfirmed(p);
                    }
                }
                else {
                    p.channel.send(toSend);
                    //prevPackage = state;
                    playState.mayNeedConfirmation(state, p);
                    playState.resendUnconfirmed(p);
                }
            });
        }
        else {
            // just send ourselves (+ ball on hit)
            /*notDone!; // send playState.changedState if not empty
            const ballData = {};
            if (ball.hitByUs) {
                ball.hitByUs = false;
                ballData.hit = true;
                ballData.pos = ball.position;
                ballData.vel = ball.velocity;
            }
            peers[0].channel.send(JSON.stringify({player: { pos: player.position}, ball: ballData, (serving/hitting/etc..) }));*/
            peers[0].channel.send(toSend);
            playState.mayNeedConfirmation(state, peers[0]);
            playState.resendUnconfirmed(peers[0]);
            //prevPackage = state;
        }
        packageId++;
        playState.changedState = {};
    }
    /*// change! server sends all positions to everyone, non-server sends their own position to server (need to send ball position from server, and prolly from non-server on ball-hit)
    if (opponent.peer?.channel) {
        const ch = opponent.peer.channel;
        ch.send(JSON.stringify(player.position));
    }*/
}

/*function drawOpponent(ctx) {

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
}*/

/*function drawPlayer(ctx) {

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
}*/

/*// background image is 500x361 (currently)
const imageWidth = 500;
const imageHeight = 361;
const imageRatio = imageWidth/imageHeight;*/

function onResize(event) {
    //canvas.width = canvas.offsetWidth;
    //canvas.height = canvas.offsetHeight;

    canvasWidth = canvas.offsetWidth;
    canvasHeight = canvas.offsetHeight;

    console.log("dims", canvasWidth, canvasHeight, canvas.width, canvas.height)
  
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
    MainLoop.stop();

    playState.reset();
    
    document.getElementById("touchDiv").remove();

    mainDiv.style = "display:none";
    mainDiv.className = "";
    
    destroyEntities();

    // remove listeners (keys/mouse/touch++)
    removeEventListener("resize", onResize);
    removeKeyListeners();
    removeMouseListeners();
    removeTouchListeners();
    // unload images?? (possible?) (should be just to remove any references to them...)
    // remove canvas etc...
    canvas.remove();
    // need to clean up everything so that callin initialize() again works fine (clean slate)
    players = [];

    // remove comms listeners, clean up in parent script...
    parentClass.stopGame();
}




// players (kun 1 vertex, center bottom (de er limt til court)? De trenger høyde (racket-høyde?) for å regne ut avstand til ball osv...?)
// ball (usikker på om skal bruke sprite eller faktisk 3d-entity for den... 1 vertex for center om sprite? Må jo nesten ha size osv for collision detection, da...?)
// net? For collision detection and to clip the opponent? Maybe? Maybe overkill? Unsure...
// evt fun other shit... birds, ref, whatever...


// sounds
// Can eventually have possibility to hit players? Other fun stuff?

