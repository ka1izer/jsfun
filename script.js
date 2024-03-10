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
        for (const team of this.players) {
            const index = team.indexOf(peer);
            if (index > -1) {
                team.splice(index, 1);
                return;
            }
        }
    }
    startGame() {}
}
let selectedGame = null;

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
        // could maybe place this in Game class? Just have path to module?? lets see with next game...?
        import("./games/tennis/tennis.js").then((module) => {

            // Må nok gjøre om disse, muligens (må ha onNewPeer ihvertfall tilgjengelig i script.js, ikke bare i tennis.js...)

            Comms.setOnNewPeer( (peer, areWeServer) => {
                console.log("onNewPeerrer!",peer);
                console.log("we are server?", areWeServer);
                module.onNewPeer(peer, areWeServer);
            });
            
            Comms.setOnLoosePeer(peer => {
                console.log("lost pewer", peer);
                module.onLostPeer(peer);
            });
            
            Comms.setOnMessage((peer, data) => {
                //console.log("got message", data);
                module.onMessage(peer, data);
            });
    
            module.initialize();
        });
    }
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
    const peersDiv = document.getElementById("peers");
    // Må muligens gjøre om fra setOnNewPeer til addNewPeerListener, eller noe sånt...
    
    // NOTDONE!

    // show games...
    const gamesDiv = document.getElementById("gamesGrid");
    for (const game of games) {
        const gameDiv = document.createElement("div");
        gameDiv.id = game.id;
        
        const maxPlayers = game.maxTeams*game.maxPlayersPerTeam;
        gameDiv.innerHTML = game.name + " (2-"+maxPlayers+")";
        gameDiv.addEventListener("click", () => chooseGame(game));
        for (const player of game.players) {

        }
        // *should* have visual tags for different team spots etc.., so players could add themselves to them...
    }
    // NOTDONE!

    // commented out for now... noisy
    //Comms.startComms(roomId, nick);
}

function chooseGame(game) {
    if (selectedGame == game) {
        selectedGame = null;
        // remove us from game.players
        game.remove({us: true, nick: nick});
        // NOTDONE!
    }
    else {
        selectedGame = game;
        // add us to game.players
        game.add({us: true, nick: nick});
        //NOTDONE!
    }
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


