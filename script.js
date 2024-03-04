// hovedscript for index.html
// Bruk comms.js som module... (import ....)
import * as Comms from './net/comms.js';

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
    return false;
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

    
    Comms.startComms(roomId, nick);
}

export function joinRoom() {
    roomId = "testRoomId";
    window.location.hash = roomId;
    console.log("joinRomm!");
    Comms.startComms(roomId, nick);
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

