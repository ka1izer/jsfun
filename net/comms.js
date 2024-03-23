// communication stuff (webRTC, via firebase startup signaling)
import * as Signaler from './signaler.js';


// Calling the REST API TO fetch the TURN Server Credentials
/*const response = 
  await fetch("https://bellfuns.metered.live/api/v1/turn/credentials?apiKey=76faa25f2b49e846694cdebb76fa6c4d458c");

// Saving the response in the iceServers array
const iceServers = await response.json();
console.log("ICESERVERS;", iceServers)*/

// Using the iceServers array in the RTCPeerConnection method
/*var myPeerConnection = new RTCPeerConnection({
  iceServers: iceServers
});*/
//{urls: 'turn:global.relay.metered.ca:80', username: '1f489fe5f0b6f44d14c10a37', credential: 'tWaD6rt1HET5NTYW'}
//{urls: 'turn:global.relay.metered.ca:443', username: '1f489fe5f0b6f44d14c10a37', credential: 'tWaD6rt1HET5NTYW'}
//{urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '1f489fe5f0b6f44d14c10a37', credential: 'tWaD6rt1HET5NTYW'}
//{urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '1f489fe5f0b6f44d14c10a37', credential: 'tWaD6rt1HET5NTYW'}
const config = {
    iceServers: [
        //{urls: ['stun:stun1.l.google.com:19305', 'stun:stun4.l.google.com:19302', 'stun:stun2.l.google.com:19305', 'stun:stun2.l.google.com:19302']},
        //{urls: 'stun:stun.nextcloud.com:3478'},
        //{urls: 'stun:stun.sip.us:3478'},
        //{urls: 'stun:stun.siptrunk.com:3478'},
        //{urls: 'stun:stun.easybell.de:3478'},
        //{urls: 'stun:stun.sipglobalphone.com:3478'},
        //{urls: 'stun:stun4.l.google.com:19305'},
        //{urls: 'stun:stun.l.google.com:19305'},
        {urls: 'stun:stun.l.google.com:19302'},
        
        // try without turn first, out of curiosity.... And with turn, check ping...
        //{urls: 'stun:freeturn.net:5349' },
        //{urls: 'stun:freeturn.net:3478' },
        //{urls: 'TURN:freeturn.net:3478', username: 'free', credential: 'free' }, // unencrypted UDP/TCP
        {urls: 'TURNS:freeturn.net:5349', username: 'free', credential: 'free' }, // encrypted TLS
        // Firefox says: Using more than two STUN/TURN servers slows down discovery
                    // And using 5 or more causes problems (according to firefox)
    ],
    //iceServers: iceServers,
};


// Ny flow:
/*
    DONE Alle får generert og lagret i cookie en unik, "permanent", kode (nanoid(10)).
            --"server" venter, subscriber til participants på firebase (dette vil jo egentlig gjelde alle, "server" eller "klient")
            --Alle henter ned participants fra firebase. 
    Alle henter ned <roomId>/server.json. Enklere...
        DONE Hvis er første der, blir "server", ELLER, hvis er en i participants som er server, sjekk om uniqueId er lik, i tilfelle er det server som har reconnected (reload?), skal fremdeles være server, most likely.
            DONE For å unngå race conditions her, bør vel bruke conditional request (mot firebase) (SJEKK AT FUNKER MED orderBy/startAt osv... slik at kan hente ut kun server=true! Hvis ikke må vi ha egen position for server (kanskje like greit??)):
                DONE Hent ned alle participants med server=true (skal aldri være flere enn 1), med header X-Firebase-ETag: true
                    DONE Ta vare på ETAG vi får tilbake i response header ("ETag").
                    DONE Hvis er 0 servere -> insert med header if-match: <etag-value>
                    DONE Hvis er 1 server (og den fremdeles er samme som denne) -> update (patch/put?) med header if-match: <etag-value>
                        DONE Hvis det er to som prøver å sette seg som server samtidig, så skal dette faile for en av dem... Må da håndtere og sikkert restarte hele greia for den (vil da bli klient)
            DONE Legg inn seg selv under participants (med timestamp + uniqueId)
        DONE Subscriber til participants på firebase
        DONE Legger inn flag på egen participant greie om at er "server", pluss timestamp (eget timestamp på det? Eller holder med en timestamp?)
        DONE En ny kommer, "server" ser det er ny participant
            DONE OBS, hvis ser at en annen participant er flagget som server, med nyere timestamp, gå over til klient-mode i stedet...
            DONE server start comms mot den nye (på egen "kanal" for de 2 spesifikt, så f.eks signals/serverId_clientId)
                DONE De to setter opp rtc via den kanalen
        DONE En ny kommer, repeat...
        DONEish Ser ut til å være noe surr med å starte med ikke-tom database (roomId). Vet ikke hvorfor, men får ikke koblet sammen, da... 
        Tror vi bør ha en slags keepalive i participants. Hver participant kjøre periodisk en update på time eller noe på sin, så kan vi se om noen er faktisk borte...?
        Skip for now... Hvis en klient blir borte (mister rtc-connection), "server" fjerner klienten fra participants (og kanalen fra signals/xxx)... (tror vi må vente litt med å fjerne... i tilfelle server er den som mistet rtc-connection...)
            peerConnection blir borte... Så må ha ny connection uansett...?
                DONE Denne må vi ha: Dette krever at klienten får ny localId ved disconnect, og registrerer ny participant med denne...
        DONE Hvis klienten reconnecter, blir det med ny kanal (ny localId), som ovenfor...
            DONE Bør vel nå sjekke om finnes gammel participant/signal med samme unike kode som denne, og da fjerne den gamle...
        Hvis "server" disconnecter, må de som er igjen kommunisere via firebase og velge ny "server"...
            MEN, hvis "server" bare reloader eller noe, og kommer raskt tilbake, hva da? Bør jo fremdeles være "server". (samme med hvis slår av wifi og har 5g eller whatever, vil da stenge webrtc som sikkert går over wifi, men ha connection til firebase...)
                DONE første ting klient som er disconnected bør gjøre er vel å prøve å connecte på nytt. Kanskje få ny localid og restarte regla? Må sannsyligvis det, tviler på at man kan gjenbruke forrige signaling? eller?
            DONE START HER! kanal "signals/disconnected", hvor hver klient som mister comms med serveren pusher "lost server" eller noe (inkl timestamp (sett timestamp: {".sv": "timestamp"}, så får vi timestamp: 12314 (unix time millis))).
                DONE Må være under signals. Feks signals/disconnected..
                    DONE Da kanskje signals/disconnected/<localId> {id=<localId>, time=<now()>, uniqueId=<uniqueId>}
                DONE Alle klienter subscriber til denne kanalen (subscriber til signals, så får opp ting herfra også)
                    Først:
                        Server får også opp disse, og må "svare" eller noe, på samme kanal, at den er "i live".
                            Hvis ikke det skjer innen x sekunder, gå ut fra at server er borte...? (i tilfelle, se nedenfor)    
                            Evt spørre klientene om de skal vente mer? Bør kanskje helst det, siden spill nok må resette state om server blir borte/byttet...
                                Hvordan? Må vel rett og slett gjøre slik at hvis dette skjer, så står vi og venter, med mulighet for å velge en annen som server, og deretter setter en som server
                                    Burde kanskje ha noe slik: En foreslår seg selv som server, de andre voter? Om alle er enige, blir den server? Kan ha det enklere til å begynne med: En setter seg selv som server, og blir det...
                                        Bør vel også være mulig å switche server selv om de er koblet på server, men kanskje ikke i utgangspunktet (fra gui i hvert fall)...?
                    Hvis en klient har mistet comms med server, og får at en annen klient også har det -> ny "server"
                    (dette kan skje om en klient (mobil) er koblet på rtc med wifi, og slår av wifi. Vil da ha kobling mot firebase, men ikke rtc. Burde jo reconnecte, da... Det bør kanskje være første ting å prøve...)
                        Kan vel si at første (basert på timestamp) som mistet server blir ny "server" (evt kanskje lagre average ping der også? og la lavest ping+først = server?)
                            Alle klienter sjekker, ser om de selv er først, i tilfelle->start som "server", med connections til andre i participants
                                Hvis det i løpet av 1 sek (eller noe sånt?) ikke er ny "server" (f.eks den klienten ble også borte), alle sjekker igjen, og ser om de er neste på time->Prøver igjen... repeat...
                                Ny "server" sletter alt fra "signals/disconnected"-kanalen (bør sikkert vente litt, og se om får koblet opp de andre først? Evt ha noe med klienter som ikke får reconnected kan legge seg selv inn igjen der?).
                                    Sletter gammel server også...Må sette seg selv som sever!
        
        Må passe på: Hvis gammel server har internett nede, og kommer tilbake etter at det er valgt ny server - Da bør den bli klient! Hvordan?
            I utgangspunktet vil den tro at den fremdeles er server, vil ikke ha noen rtc connections. Den vil sannsynligvis få listen med participants på nytt fra firebase, så begynner å sette opp nye channels
                MEN, hvis en av de participants nå er flagget som server, så bør den vel skjønne tegninga?

        Ha mulighet for å manuelt sette "server"? I tilfelle det er litt krevende for en mobil f.eks, er det jo bedre om beafy mobil/pc er "server"...? og praktisk å kunne endre underveis...
        DONE Test hva som skjer med SSE om vi på mobil kobler opp via wifi først, og deretter slår av wifi. Må vi reconnecte, eller skjer det automagisk?
            DONE Må catche error, og reconnecte manuelt...
*/

let roomId = null; // should maybe send in from script.js through calling functions here instead, not sure... Maybe redo as class or something...
/*if (window.location.hash != null && window.location.hash != "") {
    roomId = window.location.hash.substring(1); // remove leading hash (#)
}*/

let prevPing = null;
function ping(channel) {
    prevPing = new Date();
    channel.send("ping"); // redo if we want it...
    setTimeout(() => {
        ping(channel);
    }, 1000);
}

let cntPeers = 0;

let stopServing = false;

let ourNick = null;

let startedComms = false;
export function isCommsStarted() {
    return startedComms;
}

export function resetComms() {
    cntPeers = 0;
    peers = [];
    ourNick = null;
    stopServing = false;
    roomId = null;
    forceServer = false;
    forceClient = false;
}

export async function startComms(room, nick) {

    startedComms = true;
    roomId = room;
    if (!ourNick) {
        ourNick = nick;
    }
    // Etter at ting funker, gjør om her, slik at "serveren" kan ha x antall peerConnections, en til hver "client"...
    // "Server" bør være impolite, "client"s polite...
    // i tillegg, skal det automagisk bli valgt en ny "server" om forrige blir borte... Reloads skal automagisk funke...
    /*await Signaler.register(roomId);

    const participants = await Signaler.getParticipants(roomId);
    console.log("participants", participants);
    console.log("parts.length", Object.keys(participants).length);
    const polite = Object.keys(participants).length > 1;*/

    let server = await Signaler.getServer(roomId);
    console.log("server", server);
    console.log("Signaler.uniqueId", Signaler.uniqueId);
    let isServer = false;
    if (server.server == null || server.server?.uniqueId == Signaler.uniqueId) {
        console.log("We think we are server!");
        if (forceClient) {
            console.log("but we should be client!");
            setTimeout(() => startComms(roomId), 500);
            return;
        }
        isServer = await Signaler.registerAsServer(roomId, server.etag);
        if (isServer) {
            console.log("Yes, we are server!");
        }
        else {
            // someone else beat us to it, restart comms...
            console.log("no, we are not server");
            startComms(roomId);
            return;
        }
    }
    forceClient = false;
    console.log("isServer?", isServer);
    if (!isServer && forceServer) {
        // need to force us as server!
        isServer = await Signaler.registerAsServer(roomId, null, true);
        if (isServer) {
            console.log("We forced ourselves as server! Muhahaha");
            server = await Signaler.getServer(roomId);
        }
        else {
            console.log("Failed to force ourselves as server!!? Woot??");
        }
    }
    forceServer = false;

    const polite = !isServer;

    // clean up any previous instance of this (uniqueId)
    await cleanUpBeforeOurselves();
    await Signaler.register(roomId);
    
    if (isServer) {
        Signaler.listenForParticipants(roomId, async (peer) => {
            // ny peer! wooo...
            if (stopServing) {
                console.log("NOTSERVER!!");
                stopServing = false;
                return true;
            }
            if (peer.uniqueId != Signaler.uniqueId) {
                console.log("new peer!", peer);
                newPeerConnection(peer, polite);
            }
        });
    }
    else {
        newPeerConnection(server, polite);
    }
}

async function cleanUpBeforeOurselves() {
    // check for any participant with our uniqueId (previous attempt)
    const previousSelves = await Signaler.getParticipantWithOurId(roomId);
    //console.log("previousr", previousSelves);
    const arrKeysToRemove = Object.keys(previousSelves);
    // remove..
    if (arrKeysToRemove.length > 0) {
        // need to signal that we are removing the signaling channel first...
        for (const peer of Object.values(previousSelves)) {
            /*let channel = polite
                ? server.server.id+"_"+peer.id // peer=server, so goes first
                : localId+"_"+peer.id;
            Signaler.pushChannel(roomId, polite, peer, {closeChannel: true});*/
            const channels = await Signaler.getChannelsWithOldId(roomId, peer.id);
            //console.log("chanenl", channels);
            let channelKeys = Object.keys(channels);
            //console.log("channelsToDelete1: ", channelKeys);
            channelKeys = channelKeys.filter(key => key.indexOf(Signaler.localId) == -1 && key != "disconnected"); // dont want to remove our current channel or the "disconnected" channel by mistake
            //console.log("channelsToDelete2, Signaler.localId: ", channelKeys, Signaler.localId);
            for (const channel of channelKeys) {
                //console.log("signnaling to channel to close", channel);
                Signaler.pushChannel(roomId, channel, {closeChannel: true});
            }
            // Need to also remove the signaling channels
            setTimeout(() => Signaler.removeChannels(roomId, channelKeys), 500);
        }
        //console.log("delete!");
        await Signaler.removeParticipants(roomId, arrKeysToRemove);
        
    }
}

export function disconnect() {
    // close all connections...
    Signaler.stopListening();
    for (const peer of peers) {
        peer.connection.close();
    }
    //connections = [];
    //channels = [];
    peers = [];
}

let forceServer = false;
let forceClient = false;

export function newNick(newNick) {
    ourNick = newNick;

    for (const peer of peers) {
        peer.channel.send(JSON.stringify({lobby:true, nick: ourNick}));
    }
}

export function becomeServer() {
    // take over as server!
    forceServer = true;
    for (const peer of peers) {
        //channel.send("newServer");
        peer.channel.send(JSON.stringify({newServer:true}));
    }
    Signaler.generateLocalId();
    disconnect();
    //startComms(roomId); // dont want to call this, it will be auto-called on close channel...
}

// Gjør om disse til å bare ha en array, med {connection: xx, channel: xx, nick: xx}, f.eks.... kanskje også avgPing... og lastPing?
// Legg til peer-liste med ping på siden...
// Finn ut hva vi skal sende frem og tilbake over channel (json-string, array eller hva. Array virker å være mest performant network-wise, men usikker... json er lettest... går jo an å endre i ettertid, meeeen.......)
// Så, rydd opp litt, gjør klar comms for bruk utenfra... (gameloop osv...)
let peers = [];
//let connections = [];
//let channels = [];

// event handlers
let onMessage = (fromPeer, message) => {};
let onNewPeer = (newPeer, areWeServer) => {};
let onLoosePeer = (lostPeer) => {};

export function setOnMessage(fun) {
    onMessage = fun;
}
export function setOnNewPeer(fun) {
    onNewPeer = fun;
}
export function setOnLoosePeer(fun) {
    onLoosePeer = fun;
}

async function newPeerConnection(peer, polite) {

    let connected = false;

    const peerConnection = new RTCPeerConnection(config);

    let makingOffer = false;
    
    peerConnection.onnegotiationneeded = async () => {
        try {
            makingOffer = true;
            await peerConnection.setLocalDescription();
            //console.log("SEND OFFER!!!!!!!!!!!!!!!!!!!");
            await Signaler.send(roomId, polite, peer, { description: peerConnection.localDescription });
        }
        catch (err) {
            console.error(err);
        }
        finally {
            makingOffer = false;
        }
    };
    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === "failed") {
            peerConnection.restartIce();
        }
    };

    peerConnection.onicecandidate = async ({ candidate }) => {
        // candidate = {"candidate": xxx}
        if (candidate && candidate.candidate) {
            //console.log("SEND CANDIATATETE!");
            Signaler.push(roomId, polite, peer, { candidate })
        }
    }; 

    if (polite) {
        peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            channel.onopen = (ev) => {
                //console.log("channel back open, sending hi back");
                //channel.send("Hi back!");
                //ping(channel);
                cntPeers++;
                connected = true;
                //connections.push(peerConnection);
                //channels.push(channel);
                peers.push({connection: peerConnection, channel: channel, nick: null});
                // remove any disconnected messages we have sent...
                Signaler.cleanupDisconnectMessages(roomId);
            };
            channel.onmessage = (ev) => {
                /*if (ev.data == "ping") {
                    channel.send("pong");
                }
                else if (ev.data == "pong") {
                    console.log("ping: " + (new Date().getTime() - prevPing.getTime() ) );
                }*/
                const data = JSON.parse(ev.data);
                let p = null;
                peers.filter((value, index, arr) => {
                    if (value.connection == peerConnection) {
                        p = value;
                        return true;
                    }
                    return false;
                });
                if (data.nick != null) {
                    // peer sends nick
                    p.nick = data.nick;
                    // send our nick back
                    if (!data.lobby) {
                        // new peer?
                        onNewPeer(p, false);
                    }
                    //console.log("seindfinfn back", ourNick, JSON.stringify({nick: ourNick}))
                    channel.send(JSON.stringify({nick: ourNick}));
                }
                else {
                    onMessage(p, data);
                }
                //console.log("RECEIVED", ev.data);
            };
            channel.onclose = (ev) => {
                //console.log("closed channel 2");
                if (connected) cntPeers--;
                connected = false;
                // remove connection from connections
                /*connections.filter((value, index, arr) => {
                    if (value == peerConnection) {
                        arr.splice(index, 1);
                        return true;
                    }
                    return false;
                });
                channels.filter((value, index, arr) => {
                    if (value == channel) {
                        arr.splice(index, 1);
                        return true;
                    }
                    return false;
                });*/
                peers.filter((value, index, arr) => {
                    if (value.connection == peerConnection) {
                        onLoosePeer(value);
                        arr.splice(index, 1);
                        return true;
                    }
                    return false;
                });
                
                // should now generate new localId and try to restart connection...
                Signaler.generateLocalId();
                Signaler.lostServer(roomId);
                startComms(roomId);
            }
        };
    }

    if (!polite) {
        const channel = peerConnection.createDataChannel("data", {ordered: false, maxRetransmits: 0});
        channel.onopen = (event) => {
            //console.log("channel open, sending nick");
            //channel.send("Hi you!");
            channel.send(JSON.stringify({nick: ourNick}));
            //sendHi(channel);
            //ping(channel);
            connected = true;
            cntPeers++;
            //connections.push(peerConnection);
            //channels.push(channel);
            peers.push({connection: peerConnection, channel: channel, nick: null});
        };
        channel.onmessage = (event) => {
            /*if (event.data == "ping") {
                channel.send("pong");
            }
            else if (event.data == "pong") {
                console.log("ping: " + (new Date().getTime() - prevPing.getTime() ) );
            }
            else*/
            const ob = JSON.parse(event.data);
            //console.log("GOOOOOOTTT MESSSAGE", ob)
            let p = null;
            peers.filter((value, index, arr) => {
                if (value.connection == peerConnection) {
                    p = value;
                    return true;
                }
                return false;
            });
            if (ob.nick) {
                p.nick = ob.nick;
                onNewPeer(p, true);
            }
            //if (event.data == "newServer") {
            else if (ob.newServer) {
                console.log("Someone else wants to be server, disconnecting");
                Signaler.generateLocalId();
                stopServing = true;
                forceClient = true;
                disconnect();
                startComms(roomId);
            }
            else {
                onMessage(p, ob);
            }
            //console.log("got message", event.data);
        };
        channel.onclose = (event) => {
            //console.log("cloased channel");
            // lost connection with peer...
            if (connected) cntPeers--;
            connected = false;
            // remove connection from connections
            /*connections.filter((value, index, arr) => {
                if (value == peerConnection) {
                    arr.splice(index, 1);
                    return true;
                }
                return false;
            });
            channels.filter((value, index, arr) => {
                if (value == channel) {
                    arr.splice(index, 1);
                    return true;
                }
                return false;
            });*/
            peers.filter((value, index, arr) => {
                if (value.connection == peerConnection) {
                    onLoosePeer(value);
                    arr.splice(index, 1);
                    return true;
                }
                return false;
            });
        }
    }


    // listen for signaling incoming (from firebase):
    let ignoreOffer = false;

    const callback = async ({ description, candidate, closeChannel, lostServer, serverIsUp } ) => {
        try {
            if (closeChannel) {
                //console.log("CLOSE channel!!");
                peerConnection.close();
                if (polite) {
                    if (!connected) {
                        // were not connected, so need to restart here, cant rely on channel.close...
                        Signaler.generateLocalId();
                        startComms(roomId);
                    }
                }
            }
            else if (description) {
                const offerCollision =
                    description.type === "offer" &&
                    (makingOffer || peerConnection.signalingState !== "stable");

                ignoreOffer = !polite && offerCollision;
                if (ignoreOffer) {
                    return;
                }
                //console.log("offer from signaling...", description);

                await peerConnection.setRemoteDescription(description);
                if (description.type === "offer") {
                    await peerConnection.setLocalDescription();
                    await Signaler.send(roomId, polite, peer, { description: peerConnection.localDescription });
                }
            }
            else if (candidate) {
                //console.log("candidate from signaling");
                if (peerConnection.remoteDescription != null) {
                    try {
                        await peerConnection.addIceCandidate(candidate);
                    }
                    catch (err) {
                        if (!ignoreOffer) {
                            throw err;
                        }
                    }
                }
                else {
                    // got candidate before description... add a small delay
                    //console.log("dDELELELLAYYY");
                    setTimeout(async () => await peerConnection.addIceCandidate(candidate), 500);
                }
            }
            else if (lostServer) {
                if (!polite) {
                    // client lost connection with us! need to say we are still here!!
                    Signaler.serverIsUp(roomId);
                }
                else {
                    // should client react on other client loosing connection with server??
                }
            }
            else if (serverIsUp) {
                if (polite) {
                    // server sent back that it's up!...
                    // may be new localId for server, so check that!
                    //console.log("SERVER IS UPPPPPP!!");
                }
            }
        }
        catch (err) {
            console.error(err);
        }
    };

    Signaler.listenForSignals(roomId, polite, peer, callback);

    /*const signals = await Signaler.getInitialSignals(roomId, polite, peer);
    if (signals) {
        for (const signal of Object.values(signals)) {
            if (signal.localId != Signaler.localId) {
                callback(signal.payload);
            }
        }
    }*/
    Signaler.getInitialSignals(roomId, polite, peer, signals => {
        if (signals) {
            for (const signal of Object.values(signals)) {
                if (signal.localId != Signaler.localId) {
                    callback(signal.payload);
                }
            }
        }
    });
}
