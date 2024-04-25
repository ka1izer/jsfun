

const peers = [];
let weAreServer = true;

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

let parentClass = null;

export function initialize(parentClss) {
    parentClass = parentClss;
    /*// setup canvas etc....
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

    loadSounds();
    
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

    //playState.teamWon(0);*/
}

export function uninitialize() {
    MainLoop.stop();

    /*playState.reset();
    
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

    unLoadSounds(); // does nothing for now...

    // remove canvas etc...
    canvas.remove();
    // need to clean up everything so that callin initialize() again works fine (clean slate)
    players = [];*/

    // remove comms listeners, clean up in parent script...
    parentClass.stopGame();
}