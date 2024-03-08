// hovedscript for index.html
// Bruk comms.js som module... (import ....)
import * as Comms from './net/comms.js';
import QrCode from './libs/qrcode.mjs';
import QrScanner from './libs/qr-scanner.min.js';

let playTennis = true;
if (playTennis) {
    import("./games/tennis/tennis.js").then((module) => {

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
    /*const qrcode = new QRCode(document.getElementById("roomIdQR"), {
        text: window.location.href,
        width: 128,
        height: 128,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });*/
}

// fetch roomId from hash if have...
if (window.location.hash != null && window.location.hash != "") {
    roomId = window.location.hash.substring(1); // remove leading hash (#)
    //startComms();
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
    
    // commented out for now... noisy
    //Comms.startComms(roomId, nick);
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

    // commented out for now...
    //Comms.startComms(roomId, nick);
}

export function scanQR(event) {
    //https://github.com/nimiq/qr-scanner
    //QrScanner
    event.preventDefault();
    document.getElementById("qrscanner").style.display = "";
    const videoEl = document.getElementById("scannerVideo");
    const qrScanner = new QrScanner(videoEl, 
        result => {
            console.log("scanned qr", result);
            qrScanner.stop();
        },
        {
            returnDetailedScanResult: true, highlightScanRegion: true
        });
    qrScanner.start();
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

