// hovedscript for index.html
// Bruk comms.js som module... (import ....)
import * as Comms from './net/comms.js';
import QrCode from './libs/qrcode.mjs';
import QrScanner from './libs/qr-scanner.min.js';

class Game {
    id = "";
    name = "";
    maxTeams = 0;
    maxPlayersPerTeam = 0;
    players = [[]]; // 2-dim array, first is teams, second is players, so [["a", "c"], ["b"]] would be 2 players on team 1 and 1 player on team 2.
    img;
    constructor(id, name, maxTeams, maxPlayersPerTeam) {
        this.id = id;
        this.name = name;
        this.maxTeams = maxTeams;
        this.maxPlayersPerTeam = maxPlayersPerTeam;
    }

    add(peer) {}
    remove(peer) {
        console.log("remove", peer, this.players);
        for (const team of this.players) {
            const index = team.indexOf(peer);
            console.log("index", index);
            if (index > -1) {
                team.splice(index, 1);
                console.log("found!, removed", team);
                return;
            }
        }
    }
    startGame() {
        gameStarted = true;
    }
}
let selectedGame = null;
let gameStarted = false;

class Tennis extends Game {
    constructor() {
        super("tennis", "Tennis", 2, 2);
        this.players = [[], []]; // initialize teams
        // should load image for this game...
    }

    add(peer) {
        // want to add first to first team, second to second team, third to first team and fourth to second team...
        if (this.players[0].length == 0) {
            this.players[0].push(peer);
        }
        else if (this.players[0].length == 1 && this.players[1].length == 0) {
            this.players[1].push(peer);
        }
        else if (this.players[0].length == 1 && this.players[1].length >= 1) {
            this.players[0].push(peer);
        }
        else if (this.players[0].length == 2 && this.players[1].length == 1) {
            this.players[1].push(peer);
        }
    }

    startGame() {
        super.startGame();
        // could maybe place this in Game class? Just have path to module?? lets see with next game...?
        import("./games/tennis/tennis.js").then((module) => {

            // show canvas and hide others
            hideForms();
            document.getElementById("mainDiv").style.display = "";

            setOnNewPeer( (peer, areWeServer) => {
                console.log("onNewPeerrer!",peer);
                console.log("we are server?", areWeServer);
                module.onNewPeer(peer, areWeServer);
            });
            
            setOnLoosePeer(peer => {
                console.log("lost pewer", peer);
                module.onLostPeer(peer);
            });
            
            setOnMessage((peer, data) => {
                //console.log("got message", data);
                module.onMessage(peer, data);
            });
    
            // SHould send players! also peers, but dont handle peers as players! And we already have teams defined, so send with those!
            // Next step is to properify the tennis game, to handle players properly and stuff. After that we can look at actual gameplay, with ball etc...
            module.setPlayers(this.players, weAreServer, nick);
            // send peers...
            for (const peer of peers) {
                module.onNewPeer(peer, weAreServer);
            }

            module.initialize();
        });
    }
}

function startGame(gameToPlay) {
    // find lockedIn game and start it...
    if (weAreServer) {
        sendStartGame(gameToPlay);
    }
    const game = findGameById(gameToPlay);
    game.startGame();
}

const games = [new Tennis()];


let roomId = null;

let nick = document.cookie.split("; ")
        .find((row) => row.startsWith("nickname="))
        ?.split("=")[1];
if (nick != null && typeof(nick) != "undefined") {
    document.getElementById('nickname').value = nick;
    // have nick set, should just go to next step?
    document.getElementById("labelNick").innerHTML = nick;
    goToChooseRoomStep();
}

const thisPeer = {us: true, nick: nick};

let lockedGame = false;

const peers = [];
let peersOtherThanServer = [];
let weAreServer = true;

let game_onNewPeer = ()=>{};
let game_onLoosePeer = ()=>{};
let game_onMessage = ()=>{};

function onNewPeer(peer, areWeServer) {
    peers.push(peer);
    weAreServer = areWeServer;
    if (!gameStarted) {
        renderPeers();
        if (weAreServer) {
            for (const peer of peers) {
                sendPeers(peer);
            }
            sendGamesStates(peer);
        }
    }
    game_onNewPeer(peer, areWeServer);
}
function onLoosePeer(peer) {
    peers.filter((value, index, arr) => {
        if (value.nick == peer.nick) {
            arr.splice(index, 1);
            return true;
        }
        return false;
    });
    if (!gameStarted) {
        renderPeers();
        if (weAreServer) {
            for (const peer of peers) {
                sendPeers(peer);
            }
            sendGamesStates();
        }
    }
    game_onLoosePeer(peer);
}
function onMessage(peer, data) {
    // some messages should only be handled here...
    //console.log("got data", data);
    if (data.lobby) {
        if (data.choseGame) {
            const game = findGameById(data.choseGame);
            game.add(peer);
            renderGames();
        }
        else if (data.unChoseGame) {
            const game = findGameById(data.unChoseGame);
            game.remove(peer);
            renderGames();
        }
        else if (data.lockSelection || data.lockSelection === false) {
            const actualPeer = findPeerByNick(peer.nick);
            actualPeer.lockedIn = data.lockSelection;
            const gameToPlayNow = readyToPlayGame();
            if (gameToPlayNow) {
                startGame(gameToPlayNow);
            }
            renderGames();
        }
        else if (data.gamesWithPlayers) {

            // get this:
            //[{id: <gameid>, players: [[{nick: <nickname>, lockedIn: true/false}]]}]
            // dette er kun for ikke-servere...
            for (const g of data.gamesWithPlayers) {
                const game = findGameById(g.id);
                game.players = g.players;
            }
            renderGames();
        }
        else if (data.peers) {
            // Kun for ikke-servere...
            peersOtherThanServer = data.peers;
            renderPeers();
        }
        else if (data.gameToPlay) {
            // start game!
            startGame(data.gameToPlay);
        }


        if (weAreServer) {
            sendGamesStates();
        }

    }
    else {
        game_onMessage(peer, data);
    }
}
Comms.setOnNewPeer(onNewPeer);
Comms.setOnLoosePeer(onLoosePeer);
Comms.setOnMessage(onMessage);
function setOnNewPeer(func) {
    game_onNewPeer = func;
}
function setOnLoosePeer(func) {
    game_onLoosePeer = func;
}
function setOnMessage(func) {
    game_onMessage = func;
}

function findPeerByNick(peerNick) {
    return peers.filter((value, index, arr) => {
        if (value.nick == peerNick) {
            return true;
        }
        return false;
    })[0];
}
function findGameById(gameId) {
    return games.filter((value, index, arr) => {
        if (value.id == gameId) {
            return true;
        }
        return false;
    })[0];
}

function readyToPlayGame() {
    if (lockedGame && peers.filter((p, index, arr) => p.lockedIn == true).length == peers.length) {
        // need to also check that we have a majority for one game? should return the game in that case?
        const gamesWithCntPlayers = games.map(g => {
            return {id: g.id, playerCnt: g.players.reduce( (acc, curr) => acc+curr.reduce( (acc2, curr2) => acc2+1, 0) , 0) };
        });
        //console.log("gamesWithCntPlayers", gamesWithCntPlayers)
        //NOTDONE! Should really only start if all players select the same game...
        let gameWithMost = null;
        let highestCount = 0;
        for (const g of gamesWithCntPlayers) {
            if (g.playerCnt > highestCount) {
                gameWithMost = g.id;
                highestCount = g.playerCnt;
            }
        }
        return gameWithMost;
    }
    return null;
}

export function goToNickStep() {
    //document.getElementById("chooseRoomForm").style.display = "NONE";
    hideForms();
    document.getElementById("nickForm").style.display = "";
}

function goToChooseRoomStep() {
    //document.getElementById("nickForm").style.display = "NONE";
    hideForms();
    document.getElementById("chooseRoomForm").style.display = "";
}

export function showQRCode() {
    document.getElementById("showQr").style.display = "NONE";
    document.getElementById("roomIdQR").style.display = "";
}

export function hideQRCode() {
    document.getElementById("showQr").style.display = "";
    document.getElementById("roomIdQR").style.display = "NONE";
}

function goToRoomStep() {
    // show room, with roomId very visible, and QR code for it.
    // Show peers connected to room (nicknames)
    // Show games to choose from
    // peers can choose which game, and choose to be observer or player
        // can they choose other roles? (player1 or player2, etc? for example a doubles match in tennis, can choose team?)
    // "lock in" their choice, and when everyone has locked in, start game...
    //document.getElementById("nickForm").style.display = "NONE";
    //document.getElementById("chooseRoomForm").style.display = "NONE";
    hideForms();
    document.getElementById("roomForm").style.display = "";

    document.getElementById("roomId").innerHTML = roomId;

    //https://github.com/danielgjackson/qrcodejs
    const matrix = QrCode.generate(window.location.href);
    const uri = QrCode.render("svg-uri", matrix, {white: true});
    document.getElementById("roomIdQR").src = uri;

    // show peers connected
    renderPeers();
    
    // show games...
    renderGames();
    

    // commented out for now... noisy
    Comms.startComms(roomId, nick);
}

function renderPeers() {
    const peersDiv = document.getElementById("peers");
    peersDiv.innerHTML = "";
    for (const peer of peers) {
        const peerDiv = document.createElement("div");
        peerDiv.className = "peer";
        //peerDiv.id = peer.nick;
        peerDiv.innerHTML = peer.nick;
        // NOTDONE! Should show something (crown?) if peer is server!
        peersDiv.appendChild(peerDiv);
    }
    if (!weAreServer) {
        for (const peer of peersOtherThanServer) {
            const peerDiv = document.createElement("div");
            peerDiv.className = "peer";
            //peerDiv.id = peer.nick;
            peerDiv.innerHTML = peer.nick;
            // NOTDONE! Should show something (crown?) if peer is server!
            peersDiv.appendChild(peerDiv);
        }
    }
    else {
        // show ourselves
        const peerDiv = document.createElement("div");
        peerDiv.className = "peer";
        //peerDiv.id = peer.nick;
        peerDiv.innerHTML = nick;
        // NOTDONE! Should show something (crown?) if peer is server!
        peersDiv.appendChild(peerDiv);
    }
}

function renderGames() {
    const gamesDiv = document.getElementById("gamesGrid");
    gamesDiv.innerHTML = "";
    for (const game of games) {
        const gameDiv = document.createElement("div");
        gameDiv.className = "game";
        gameDiv.id = game.id;
        
        const maxPlayers = game.maxTeams*game.maxPlayersPerTeam;
        gameDiv.innerHTML = game.name + " (2-"+maxPlayers+")";
        gameDiv.addEventListener("click", () => chooseGame(game));
        for (let i=0; i < game.players.length; i++) {
            const team = game.players[i];
            for (const player of team) {
                const div = document.createElement("div");
                div.innerHTML = player.nick;
                // should show if player has locked in their selection here... padlock icon or something? checkmark?
                div.className = "player team"+(i+1);
                if (player.lockedIn) {
                    div.className += " lockedIn";
                }
                gameDiv.appendChild(div);
            }
        }
        gamesDiv.appendChild(gameDiv);
        // *should* have visual tags for different team spots etc.., so players could add themselves to them... skip for now...
    }
}

function chooseGame(game) {
    if (lockedGame) {
        lockInGame(); // unlock
    }
    const lockButt = document.getElementById("lockInGame");
    if (selectedGame == game) {
        selectedGame = null;
        game.remove(thisPeer);
        lockButt.style.display = "none";
        if (!weAreServer) {
            peers.forEach(p => {
                p.channel.send(JSON.stringify({lobby:true, unChoseGame: game.id}));
            });
        }
        else {
            // send state now, not just last change
            sendGamesStates();
        }
    }
    else {
        selectedGame = game;
        game.add(thisPeer);
        lockButt.style.display = "";
        if (!weAreServer) {
            peers.forEach(p => {
                p.channel.send(JSON.stringify({lobby:true, choseGame: game.id}));
            });
        }
        else {
            // send state now, not just last change
            sendGamesStates();
        }
    }
    renderGames();
}

function sendStartGame(gameToPlay) {
    peers.forEach(p => {
        p.channel.send(JSON.stringify({lobby: true, gameToPlay: gameToPlay}) );
    });
}

function sendPeers(peer) {
    const peersToSend = peers.map(p => {
        return {nick: p.nick};
    });
    peer.channel.send(JSON.stringify({lobby: true, peers: peersToSend}));
}

function sendGamesStates(peer) {
    const gamesWithPlayers = games.map(g => {
        return {id: g.id, players: g.players.map(t => t.map(p => {
            return {nick: p.nick, lockedIn: p.lockedIn};
        })) };
    });
    if (peer) {
        peer.channel.send(JSON.stringify({lobby: true, gamesWithPlayers: gamesWithPlayers}));
    }
    else {
        peers.forEach(p => {
            p.channel.send(JSON.stringify({lobby: true, gamesWithPlayers: gamesWithPlayers}));
        });
    }
}

let originalLockinGameButtonText = null;
export function lockInGame(event) {
    if (event) {
        event.preventDefault();
    }
    lockedGame = !lockedGame;
    thisPeer.lockedIn = lockedGame;
    const gameToPlayNow = readyToPlayGame();
    if (gameToPlayNow) {
        startGame(gameToPlayNow);
    }
    if (lockedGame) {
        originalLockinGameButtonText = document.getElementById("lockInGame").innerHTML;
        document.getElementById("lockInGame").innerHTML = "Unlock selection";
        if (!weAreServer) {
            peers.forEach(p => {
                p.channel.send(JSON.stringify({lobby:true, lockSelection: true}));
            });
        }
        else {
            // send state now, not just last change
            sendGamesStates();
        }
    }
    else {
        document.getElementById("lockInGame").innerHTML = originalLockinGameButtonText;
        if (!weAreServer) {
            peers.forEach(p => {
                p.channel.send(JSON.stringify({lobby:true, lockSelection: false}));
            });
        }
        else {
            // send state now, not just last change
            sendGamesStates();
        }
    }
    renderGames();
}

// fetch roomId from hash if have...
if (window.location.hash != null && window.location.hash != "") {
    roomId = window.location.hash.substring(1); // remove leading hash (#)
    goToRoomStep();
}

export function changeNick(event) {
    let newNick = document.getElementById('nickname').value;
    document.cookie = "nickname="+newNick;
    event.preventDefault();
    nick = newNick;
    //Comms.changedNick(nick);
    document.getElementById("labelNick").innerHTML = nick;
    thisPeer.nick = nick;
    goToChooseRoomStep();
    return false;
}

function generateRoomId() {
    // https://github.com/ai/nanoid
    // NOTDONE!
}

export function createRoom() {
    //roomId = self.crypto.randomUUID();
    roomId = "testRoomId";
    window.location.hash = roomId;
    // Bør vel sette noe ala ?main=true eller noe, og starte fra load, ikke direkte herfra...
    // Da vil denne være "server", selv om reloader by accident... Om trykker back og joiner room, så må det bli ny "server"... Sett ?main=true på den som blir server, og passe på at andre ikke har det satt?
    // Må sannsynligvis bruke signaling for å finne ut av main, og bør kanskje håndteres i comms.js?
    // Tror hvert par må vite partner sin localId...
    // Gjøre om litt, tror jeg:
        // Første er "server"
            // Første som joiner-> server og den kobler sammen
            // Neste som joiner -> server og den kobler sammen..
            // Rethink signaling. Tenk på den som en server-side, som skal koble sammen to og to klienter...?

    goToRoomStep();
}

function hideForms() {
    document.querySelectorAll("body > .form").forEach(el => el.style.display = "none");
}

export function joinRoom() {
    // show options for joining room (input roomid, scan qr-code)
    hideForms();
    document.getElementById("joinRoomForm").style.display = "";

    //NOTDONE!

    /*roomId = "testRoomId";
    window.location.hash = roomId;
    console.log("joinRomm!");

    //goToRoomStep();

    Comms.startComms(roomId, nick);*/
}

export function joinRoomByCode() {
    const roomCode = document.getElementById("roomCodeInput").value;
    if (!roomCode || roomCode.trim().length == 0) {
        alert("You need to fill in the room id"); // there are nice ways to notify... oh well
        return;
    }
    // should prolly test to see if room id exists before trying to join? or just go for it?
    roomId = roomCode;
    window.location.hash = roomId;

    goToRoomStep();
}

let scanning = false;
let originalScanButtonText = null;
export function scanQR(event) {
    //https://github.com/nimiq/qr-scanner
    //QrScanner
    event.preventDefault();
    if (!scanning) {
        scanning = true;
        originalScanButtonText = document.getElementById("scanQR").innerHTML;
        document.getElementById("scanQR").innerHTML = "Close scanner";
        document.getElementById("qrscanner").style.display = "";
        const videoEl = document.getElementById("scannerVideo");
        // Size issue ser ut til å ha noe med mobile device view å gjøre. Hvis velger dekstop view så fungerer det bedre... Og hvis zoomer litt ut på mobile view... How to fix??? Google først...
        const qrScanner = new QrScanner(videoEl, 
            result => {
                //alert("scanned qr!"+result.data+": ", result.data);
                const uri = ""+result.data;
                if (uri.indexOf("#") != -1) {
                    roomId = uri.substring(uri.indexOf("#")+1);
                    window.location.hash = roomId;
                    qrScanner.stop();
                    qrScanner.destroy();

                    scanning = false;
                    document.getElementById("scanQR").innerHTML = originalScanButtonText;
                    document.getElementById("qrscanner").style.display = "NONE";
                    goToRoomStep();
                }
                else {
                    alert("no room id found in qr code...?");
                }
            },
            {
                returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true
            });
        qrScanner.start();
    }
    else {
        scanning = false;
        document.getElementById("scanQR").innerHTML = originalScanButtonText;
        document.getElementById("qrscanner").style.display = "NONE";
    }
    return false;
}

export function disconnect() {
    Comms.disconnect();
}

export function becomeServer() {
    Comms.becomeServer();
}


/*document.getElementById('localId').innerHTML = Signaler.localId;
    document.getElementById('uniqueId').innerHTML = Signaler.uniqueId;
    document.getElementById('isServer').innerHTML = isServer;


    document.getElementById("cntPeers").innerHTML = ""+cntPeers;
    document.getElementById("cntPeers").innerHTML = ""+cntPeers;*/

/*function startComms() {
    //...
}*/


