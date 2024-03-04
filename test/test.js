class Person {
    gender = null;
    constructor(name, face, hair, mouth, eyes) {
        this.name = name;
        this.face = face;
        this.hair = hair;
        this.mouth = mouth;
        this.eyes = eyes;
    }

    isSameAs(other) {
        return this.face == other.face && this.hair == other.hair && this.mouth == other.mouth && this.eyes == other.eyes;
    }

    isHintFor(person) {
        if (typeof(this.face) != "undefined") {
            return this.face == person.face;
        }
        if (typeof(this.hair) != "undefined") {
            return this.hair == person.hair;
        }
        if (typeof(this.mouth) != "undefined") {
            return this.mouth == person.mouth;
        }
        if (typeof(this.eyes) != "undefined") {
            return this.eyes == person.eyes;
        }
        return false;
    }
}

function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
    return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
}

function sfc32(a, b, c, d) {
    return function() {
      a |= 0; b |= 0; c |= 0; d |= 0; 
      var t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// with 12 faces, need amnt colors divisible with 12 (2, 3, 4, 6, 12)
var faceColors = ["brownFace", "yellowFace", "whiteFace"];
var hairColors = ["yellowHair", "greyHair", "blackHair", "brownHair"];
var eyeColors = ["brownEyes", "blueEyes"];

/*function randomPart(rand, options) {
    let index = Math.floor( rand() * options.length);
    return options.splice(index, 1)[0]; // remove element at index and return element (splice returns array of removed elements)
}*/

function randomPart(rand, options) {
    let index = Math.floor( rand() * options.length);
    return options[index];
}



var colors = ["black", "brown", "blue", "green"];
function randomColor(rand) {
    return colors[Math.floor( rand() * colors.length )];
}

function isUnique(person, persons) {
    for (const per of persons) {
        if (person.isSameAs(per)) {
            return false;
        }
    }
    return true;
}

var hints = [];
var hintTexts = [];
var myHints = [];
var myHintTexts = [];
var myHints2 = [];
var myHintTexts2 = [];
var currentPlayer = 1;

var roomId = null;
var playerCount = 1;
var baseUrl = "https://murderface-86c1a-default-rtdb.europe-west1.firebasedatabase.app/murderface/";

function generateFaces(rand, players) {
    /*const hairColors = ['yellowHair', 'blackHair', 'brownHair'];
    const skinColors = ['brownFace', 'yellowFace', 'whiteFace'];
    const eyeColors = ['brownEyes', 'blueEyes', 'greenEyes'];*/
    const hairColors = ['yellowHair', 'blackHair', 'brownHair', 'greyHair'];
    const skinColors = ['brownFace', 'yellowFace', 'whiteFace', 'redFace'];
    const eyeColors = ['brownEyes', 'blueEyes', 'greenEyes', 'redEyes'];

    const prefixes = ["Økse", "Spade", "Hakke", "Grise", "Esel", "Potet", "Oste", "Lempe", "Riste", "Pølse", "Suppe", "Kne", "Lompe", "Rødme", "Heste", "Katte", "Hunde", "Slite", "Drepe", "Bille", "Flue", "Soppe", "Rote", "Tøyse", "Tulle", "Morro", "Kjøtt"];
    const postfixes = ["hode", "nese", "øre", "tryne", "fot", "hale", "hals", "nakke", "rygg", "munn", "klump", "stein", "hår", "lår", "kne", "tå", "mus", "rull", "kopp", "nes", "gård", "bukse"];

    const faces = [];

    /*const hairColorCount = x / hairColors.length;
    const skinColorCount = x / skinColors.length;
    const eyeColorCount = x / eyeColors.length;*/

    // notDone: If 3 players, should just use xxxColorCount = 3! (so that amount of each variables is divisible with cntPlayers!)
    // notDone: If 2 players, should have divisible by 2 amounts of variables (2 or 4 etc), so f.ex. drop eyeColors..
    const hairColorCount = hairColors.length;
    const skinColorCount = skinColors.length;
    let eyeColorCount = eyeColors.length;
    if (players == 2) {
        eyeColorCount = 1;
    }

    let male = true;
    for (let i = 0; i < hairColorCount; i++) {
        for (let j = 0; j < skinColorCount; j++) {
            for (let k = 0; k < eyeColorCount; k++) {
                let name = "";
                const hairColor = hairColors[i % hairColors.length];
                const skinColor = skinColors[j % skinColors.length];
                const eyeColor = eyeColors[k % eyeColors.length];
                do {
                    if (male) {
                        name = "Herr ";
                    }
                    else {
                        name = "Fru ";
                    }
                    name += prefixes[Math.floor(rand()*prefixes.length) ] + postfixes[Math.floor( rand() * postfixes.length) ];
                } while (!nameIsUnique(name, faces));
                const face = new Person(name, skinColor, hairColor, "black", eyeColor);
                if (male) {
                    face.gender = "male";
                }
                else {
                    face.gender = "female";
                }
                male = !male;
                faces.push(face);
            }
        }
    }
    return faces;
}

function nameIsUnique(name, persons) {
    for (const per of persons) {
        if (per.name == name) {
            return false;
        }
    }
    return true;
}

var global_cntPlayers = 2;

var guiltyPerson = null;
var guiltyIndex = -1;

function setup(cntPlayers, initialSeed) {

    global_cntPlayers = cntPlayers;

    let frames = "";
    //let cntFaces = 12; // Bør kanskje ha antall faces ut fra antall spillere (slik at kan få rettferdig fordeling av hint). Evt fordeling av farger osv..
    //let cntPlayers = 3;
    

    /*// Create cyrb128 state:
    var seed = cyrb128("apples");
    // Four 32-bit component hashes provide the seed for sfc32.
    var rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

    // Only one 32-bit component hash is needed for mulberry32.
    var rand = mulberry32(seed[0]);

    // Obtain sequential random numbers like so:
    rand();
    rand();*/

    let seed = cyrb128(initialSeed); // seed-string må funke noe slikt: En oppretter game, og får generert en string, deretter deler url til andre, så de får samme string... (hvis ikke skal ha server) Må ha egen url per spiller, slik at de får forskjellige hint!!!
    var rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
    
    // må vel ha egen for face colors, hair colors, osv... sikkert. Og kanskje passe på at ikke face og eye for eksempel får samme farge (med mindre vi har faste svarte rammer rundt øyne eller noe sånt)

    // må kontrollere slik at ikke er helt random (for eksempel max 2 med grønt hår, max 2 med blå øyne, osv)
    // må også programmatisk "huske" de forskjellige fargene osv, slik at kan sette en "skyldig", og gi hint...


    /*
    12 faces
    1 skyldig
    starter med hver spiller har en eller 2 regler for uskyldige (for eksempel, morderen har IKKE svart hår, eller har IKKE blå øyne, eller har IKKE hår, eller har IKKE hatt, eller har IKKE briller... 
        (bør enten være vanskelighetsgrad, eller at hvert hint er like effektivt) )
        MÅ ha slik at ut fra alle hint så er det kun ett mulig svar.
            Bør kanskje regne ut hint etter at frames er generert, med alle variabler lagret, slik at kan regne ut hva som trengs til hver spiller (må vite antall spillere først!)
    bør da være slik at 2 ansikt kan elimineres (bør eliminere automatisk? Slik at hvis blir spurt så kan(?) de ikke ta feil?)
    Spiller 1:
        Spør spiller 2 om ansikt X kan være skyldig.
            Spiller 2 sier ja (er ikke en av de 2 som hen vet er uskyldige)
            Spiller 3 sier nei (er en av de 2 som hen vet er uskyldig)
                Må spiller 2 avsløre noe nå?

                Skal det være slik at om alle sier Ja-kan være skyldig, så er den skyldig?
                    Ellers er det vel ikke mulig å finne ut av???
                    Da må alle ha flere hint, i tilfelle! Kanskje få antall hint ut fra hvor mange som spiller? Evt generere antall ansikter ut fra hvor mange som spiller?

            2 svarte, rødt/grønt hår, blå/brune øyne
            2 brune
            2 gule
            2 hvite
    Elementært: Alle faces må ha unik kombinasjon av farger osv...

    liste med alle genererte faces. (som har egne farger osv)
        generer alle mulige hint
            fjern hint som passer på den skyldige?
                fjern duplikater(?)
                fordel på antall spillere
                    Pass på at går ordentlig opp? (er delelig på antall spillere. Bør kanskje sjekkes før vi genererer?) Må være slik at alle hint til sammen gir svaret, så alle hint må fordeles.
    
    når genererer faces, pass på at alle får unik kombinasjon, og ikke for mange med samme
        faceColor: brun, gul, hvit * med cntFaces/3 => 12 cntFaces gir 4 brune, 4 gule, 4 hvite
        hairColor: rød, blond(gul), svart, grå, grønn, blå * cntFaces/6 (antall farger) => 2 med hver
        osv..

    Hvis uten server: Må ha slik at når en spiller "Beskylder" et face så må de gjøre det i appen og vise til de andre (face går fullscreen, slik at de ikke ser noe av spillerens hint osv)... 
    Kan da nekte hvis de prøver å "Beskylde" et face de har hint på ikke er skyldig... Så ikke juks/feil..

    */

    //GJØR OM!
    // Ta heller utgangspunkt i antall spillere, og gi hint for morderen, ikke de uskyldige. Finn ut hvor mange variasjoner vi da trenger. Hvis det for eksempel er 2 spillere, gjør slik at en spiller får hint: Har brun hud, grått hår. Eller noe sånt. 
    // Den andre får blå øyne, (sort munn? :-) ). Så må gi generere de andre slik at det blir halvparten med brun hud og grått hår, og halvparten med blå øyne osv....
    // Hvis det er 2 spillere, 2 hint, 3 spillere -> 3 hint osv..?  Altså, 3 spillere -> 3 variabler (hud, hår, øyne), 4 spiller gir 4 variabler (hud, hår, øyne, ???) osv... Bør sikkert da ha egentlig flere variabler, men som ikke gjør noe.. (hatt, briller, osv..)
    // hvordan generere? 
    /*function generateFaces(x) {
        const hairColors = ['brown', 'blonde', 'black'];
        const skinColors = ['light', 'medium', 'dark'];
        const eyeColors = ['blue', 'green', 'brown'];
        const faces = [];

        const hairColorCount = x / hairColors.length;
        const skinColorCount = x / skinColors.length;
        const eyeColorCount = x / eyeColors.length;

        for (let i = 0; i < hairColorCount; i++) {
            for (let j = 0; j < skinColorCount; j++) {
                for (let k = 0; k < eyeColorCount; k++) {
                    const hairColor = hairColors[i % hairColors.length];
                    const skinColor = skinColors[j % skinColors.length];
                    const eyeColor = eyeColors[k % eyeColors.length];
                    const face = { hairColor, skinColor, eyeColor };
                    faces.push(face);
                }
            }
        }
        return faces;
        }
        */

    //let persons = [];

    const persons = generateFaces(rand, cntPlayers);
    // shuffle persons:
    persons.sort(() => rand() - 0.5);

    const cntFaces = persons.length;

    guiltyIndex = Math.floor( rand() * cntFaces);

    //for (let i=0; i < cntFaces; i++) {
    for (let i=0; i < persons.length; i++) {

        /*let person = null;

        do {
            let faceColor = randomPart(rand, faceColors);
            let hairColor = randomPart(rand, hairColors);
            let eyeColor = randomPart(rand, eyeColors);

            let mouthColor = "black";//randomColor(rand);

            person = new Person(faceColor, hairColor, mouthColor, eyeColor);
        } while (!isUnique(person, persons));
        
        persons[persons.length] = person;*/

        const person = persons[i];

        let frameTemplate = `
        <div class="frame">
            <div class="component face ${person.face}">
                <svg>
                    <use href="ink/sprites.svg#face1"/>
                </svg>
            </div>
            <div class="component mouth ${person.mouth}">
                <svg>
                    <use href="ink/sprites.svg#mouth1"/>
                </svg>
            </div>
            <div class="component eyes ${person.eyes}">
                <svg>
                    <use href="ink/sprites.svg#eyes1"/>
                </svg>
            </div>
            <div class="component hair ${person.hair}">
                <svg>
                    <use href="ink/sprites.svg#hair1"/>
                </svg>
            </div>
            <div class="component overlay person_${i}" onclick="toggleGray(${i});">
            </div>
            <div class="component name" onclick="accuse(${i}, '${person.name}');">
                ${person.name}
            </div>
        </div>
        `;

        frames += frameTemplate;
    }

    console.log("guilty:", guiltyIndex+1);

    /*liste med alle genererte faces. (som har egne farger osv)
        generer alle mulige hint
            fjern hint som passer på den skyldige?
                fjern duplikater(?)
                fordel på antall spillere
                    Pass på at går ordentlig opp? (er delelig på antall spillere. Bør kanskje sjekkes før vi genererer?) Må være slik at alle hint til sammen gir svaret, så alle hint må fordeles.*/

    // Gjør om hint!
    // bruk i utgangspunktet guiltyFace. Del opp. Hvis antall clues ikke går opp i antall spillere (2 spillere, 3 clues (skin, hair, eyes), gi en spiller skinColor, den andre hairColor, og hver får 1 eyeColor som murderer ikke har?? (kan de identifisere murderer, da??))

    
    guiltyPerson = persons[guiltyIndex];
    hints.push(new Person(null, guiltyPerson.face, null, null, null));
    hints.push(new Person(null, null, guiltyPerson.hair, null, null));
    if (cntPlayers == 3) {
        hints.push(new Person(null, null, null, null, guiltyPerson.eyes));
    }
    //hints.push(new Person(null, null, null, ));
    /*for (let i=0; i < persons.length; i++) {
        if (i != guiltyIndex) {
            let per = persons[i];
            hints.push(new Person(per.face, per.hair, per.mouth, per.eyes));
        }
    }

    // remove duplicates
    for (const hint of hints) {
        for (const hint2 of hints) {
            if (hint != hint2) {
                if (hint2.face == hint.face) {
                    hint2.face = null;
                }
                if (hint2.hair == hint.hair) {
                    hint2.hair = null;
                }
                if (hint2.mouth == hint.mouth) {
                    hint2.mouth = null;
                }
                if (hint2.eyes == hint.eyes) {
                    hint2.eyes = null;
                }
            }
        }
    }

    // remove empties
    // remove those matching guiltyface
    for (let i = hints.length-1; i >= 0; i--) {
        let hint = hints[i];
        if (hint.face == null && hint.hair == null && hint.mouth == null && hint.eyes == null) {
            hints.splice(i, 1);
        }
        else {
            if (hint.face == guiltyPerson.face) {
                hint.face = null;
            }
            if (hint.hair == guiltyPerson.hair) {
                hint.hair = null;
            }
            if (hint.mouth == guiltyPerson.mouth) {
                hint.mouth = null;
            }
            if (hint.eyes == guiltyPerson.eyes) {
                hint.eyes = null;
            }
            if (hint.face == null && hint.hair == null && hint.mouth == null && hint.eyes == null) {
                hints.splice(i, 1);
            }
        }
    }*/

    // generate hint-texts
    for (const hint of hints) {
        if (hint.face != null) {
            hintTexts.push(hint.face);
        }
        if (hint.hair != null) {
            hintTexts.push(hint.hair);
        }
        if (hint.mouth != null) {
            hintTexts.push(hint.mouth);
        }
        if (hint.eyes != null) {
            hintTexts.push(hint.eyes);
        }
    }
    console.log("hintTexts", hintTexts);

    /*myHintTexts = hintTexts.slice(0, hintTexts.length/cntPlayers);
    myHintTexts2 = hintTexts.slice(hintTexts.length/cntPlayers);*/

    document.getElementById("frames").innerHTML = frames;

}

function showInfo1(ev) {
    alert(myHintTexts);
    ev.preventDefault();
    return false;
}

function showInfo2(ev) {
    alert(myHintTexts2);
    ev.preventDefault();
    return false;
}

function toggleGray(index) {
    let overlay = document.getElementsByClassName("person_"+index)[0];
    console.log("style", overlay.style.opacity);
    if (overlay.style.opacity == 0.3) {
        overlay.style.opacity = 0;
    }
    else {
        overlay.style.opacity = 0.3;
    }
}

function sendHi(channel) {
    channel.send("new Hi!");
    console.log("sent new hi");
    setTimeout(() => sendHi(channel), 5000);
}

async function startConnection() {
    // funker det å sette url i android webview/firefox?? test... Usikker på hvordan ellers sette...
    const peerConnection = new RTCPeerConnection({iceServers: [
        {url: 'stun:stun1.l.google.com:19305'},
        {url: 'stun:stun.nextcloud.com:3478'},
        {url: 'stun:stun4.l.google.com:19302'},
        {url: 'stun:stun.sip.us:3478'},
        {url: 'stun:stun2.l.google.com:19305'},
        {url: 'stun:stun2.l.google.com:19302'},
        {url: 'stun:stun.siptrunk.com:3478'},
        {url: 'stun:stun.easybell.de:3478'},
        {url: 'stun:stun.sipglobalphone.com:3478'},
        {url: 'stun:stun4.l.google.com:19305'},
        {url: 'stun:stun.l.google.com:19305'},
        {url: 'stun:stun.l.google.com:19302'},
    ]});
    // få unik channel-name (guid?)
    if (roomId == null) {
        roomId = self.crypto.randomUUID();
    }
    const channel = peerConnection.createDataChannel("data");
    channel.onopen = (event) => {
        console.log("channel open, sending Hi");
        channel.send("Hi you!");
        sendHi(channel);
      };
      channel.onmessage = (event) => {
        console.log(event.data);
      };
      channel.onclose = (event) => {
        console.log("cloased channel");
      }

    let localDesc = await prepareOfferSDP(peerConnection);
    await receiveAnswerSDP(peerConnection, localDesc);
}

async function prepareOfferSDP(peerConnection) {
    const localOffer = await peerConnection.createOffer();
    console.log("localOffer", localOffer);
    await peerConnection.setLocalDescription(localOffer);
    console.log("localDescOffer", peerConnection.localDescription);
    await waitForAllICE(peerConnection);
    const localOfferWithICECandidates = peerConnection.localDescription;
    console.log("localOfferWithICECandidates:");
    console.log(JSON.stringify(localOfferWithICECandidates));
    return JSON.stringify(localOfferWithICECandidates);
}

async function receiveAnswerSDP(peerConnection, localDesc) {
    console.log("Will wait for answer");
    //const remoteAnswerString = prompt("Peer answer");

    // Ser ut til at MÅ ha en signaling server! (For å kunne sette opp webRTC connection (sende initial descriptions frem og tilbake))...

    // prøver med firebase (https://murderface-86c1a-default-rtdb.europe-west1.firebasedatabase.app/)
    //baseUrl
    
    //notdone; // Should redo the whole start of connection bit, and start with a redirect to get roomId in the url (or just put it in the url with #hash?), so that reload of page doesnt loose roomId (would need to reconnect all players if 1st player reloads page, though)
    // Best would be to have some automatic reconnection on reload/connection loss, I guess... Should be towards 1st player, which is the "server", with possibly possibility to let another player be "server"? Overkill for this, but would be snazzy...
    // Sjekk Perfect_negotiation (https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)
    
    // Gjør om slik:
    //              Først, bruker skriver inn brukernavn (huskes, enten cookie, eller etter hvert pwa med local storage)
    //              Deretter, lager nytt rom eller skriver inn rom-kode (eller whatever)... (får da ny url, slik at reloads ikke fucker opp...)
    //              Skal da automagisk kobles opp mot "server" der... Bruk perfect_negotiation... Om mister kobling, skal automagisk reconnecte, samme med reloads
    //              Start med nye html-sider + js osv...
    //              Bruk js modules??
    //              Se på mulighet for lightweight static web server etterhvert??

    const response = await fetch(baseUrl + roomId + "/"+ playerCount + "/sdp.json", { 
        method: 'PUT', 
        headers: { 
          'Content-type': 'application/json'
        },
        //body: JSON.stringify(data) 
        body: localDesc // already stringyFied...
      });
    console.log("PUTted");

    const initialSeed = "seed" + Math.random(); // should store this, but whatever for now...

    //setup(cntPlayers, initialSeed); // skip this one for now...

    // eventually, prolly show qr-code now, so other players can join, can just print url to console for testing.... Then need to implement other side with firebase and webRTC...
    let address = window.location.href;
    if (address.indexOf("?") == -1) {
        address += "?";
    }
    else {
        address += "&";
    }
    console.log(address+"seed="+initialSeed+"&player=2&players="+playerCount+"&roomId="+roomId); // unsure about playerCount here, may need to redo that, prolly...

    // We have sent localDesc to firebase, so other party should now read that via firebase... 
    // Wait for response here?
    // Polling or SSE (supported by firebase)
    // prolly easiest with just polling...
    //1notDone;
    let remoteAnswerJson = await waitForRemoteAnswer();

    //const remoteAnswerString = '{"aaa":"maybe"}';
    //const remoteAnswer = JSON.parse(remoteAnswerString);
    //peerConnection.setRemoteDescription(remoteAnswer);
    peerConnection.setRemoteDescription(remoteAnswerJson);
}

async function waitForRemoteAnswer() {

    let remote = null;
    do {
        const response = await fetch(baseUrl + roomId  + "/"+ playerCount + "/answer.json", {
            method: 'GET', 
            headers: { 
            'Content-type': 'application/json'
            }
        });
        //console.log("got: ", await response.json());
        remote = await response.json();
        if (remote == null) {
            // sleep 1 sec
            await new Promise(r => setTimeout(r, 1000));
            console.log("waiting for remote...");
        }
    }
    while (remote == null);
    return remote;
}

function waitForAllICE(peerConnection) {
    return new Promise((fufill, reject) => {
        peerConnection.onicecandidate = (iceEvent) => {
            if (iceEvent.candidate === null) {
                fufill();
            }
            else {
                // send candidate to other party, which uses peerConnection.addIceCandidate(candidate) (or something like that), with signaling (firebase)
                // should prolly have something that polls for new iceCandiates from firebase??
                fetch(baseUrl + roomId + "/"+ playerCount + "/ice.json", { 
                    method: 'POST',  // POST = push
                    headers: {
                      'Content-type': 'application/json'
                    },
                    //body: JSON.stringify(data) 
                    body: JSON.stringify(iceEvent.candidate)
                  });
                console.log("sent ice", iceEvent.candidate);
            }
        };
        setTimeout(() => {
            console.log("Waited too long for ice candidates");
            reject("Waited too long for ice candidates");
        }, 1000);
    }).catch(() => {});
  }

function addConnectionStateHandler(peerConnection) {
    peerConnection.onconnectionstatechange = function () {
        console.log(peerConnection.connectionState);
    };
}

function startGame(cntPlayers) {

    startConnection();

    if (true) {
        return; // for now
    }
    
    const initialSeed = "seed" + Math.random();

    setup(cntPlayers, initialSeed);

    // skjul intro
    // vise qr-kode
    // og knapp for å starte
    // knapp for å starte= skjul intro, vis faces...
    // må ha noe å klikke for å se clues
    document.getElementsByClassName("intro")[0].style.display = "none";

    let address = window.location.href;
    if (address.indexOf("?") == -1) {
        address += "?";
    }
    else {
        address += "&";
    }
    console.log(cntPlayers)

    document.getElementsByClassName("qr-codes")[0].style.display = "";
    const qrDiv1 = document.querySelector(".qr-code2");
    qrDiv1.style.display = "";
    var qrcode = new QRCode(qrDiv1, {
        text: `${address+"seed="+initialSeed+"&player=2&players="+cntPlayers}`,
        width: 180, //default 128
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    if (cntPlayers == 3) {
        const qrDiv2 = document.querySelector(".qr-code3");
        const newNode = document.createElement("span");
        newNode.innerHTML = "Player3:";
        qrDiv2.parentNode.insertBefore(newNode, qrDiv2);
        qrDiv2.style.display = "";
        var qrcode2 = new QRCode(qrDiv2, {
            text: `${address+"seed="+initialSeed+"&player=3&players="+cntPlayers}`,
            width: 180, //default 128
            height: 180,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }

    // Hvis 2 spillere, kun 1 qr-kode, for player 2.
    // Hvis 3 spillere, en qr-kode for player 2, og en for player 3.
    // hva trenger vi i url? seed=<seed>&p=2/3.

}

async function startJoin(cntPlayers) {
    const peerConnection = initializeBeforeReceivingOffer();

    peerConnection.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onopen = (event) => {
            console.log("channel back open, sending hi back");
          channel.send("Hi back!");
        };
        channel.onmessage = (event) => {
          console.log(event.data);
          alert(event.data);
        };
        channel.onclose = (event) => {
            console.log("closed channel 2");
          }
      };

    await receiveOfferSDP(peerConnection,cntPlayers);
    await sendAnswerSDP(peerConnection,cntPlayers);

    
}

function initializeBeforeReceivingOffer() {
    const peerConnection = new RTCPeerConnection({iceServers: [
        {url: 'stun:stun1.l.google.com:19305'},
        {url: 'stun:stun.nextcloud.com:3478'},
        {url: 'stun:stun4.l.google.com:19302'},
        {url: 'stun:stun.sip.us:3478'},
        {url: 'stun:stun2.l.google.com:19305'},
        {url: 'stun:stun2.l.google.com:19302'},
        {url: 'stun:stun.siptrunk.com:3478'},
        {url: 'stun:stun.easybell.de:3478'},
        {url: 'stun:stun.sipglobalphone.com:3478'},
        {url: 'stun:stun4.l.google.com:19305'},
        {url: 'stun:stun.l.google.com:19305'},
        {url: 'stun:stun.l.google.com:19302'},
    ]});
    //notDone;
    addConnectionStateHandler(peerConnection);
    return peerConnection;
}

async function receiveOfferSDP(peerConnection, cntPlayers) {
    //const remoteOfferString = prompt("Peer offer");
    console.log("url", baseUrl + roomId +"/" +cntPlayers + "/sdp.json");
    const response = await fetch(baseUrl + roomId +"/" +cntPlayers + "/sdp.json", { 
        method: 'GET', 
        headers: { 
          'Content-type': 'application/json'
        }
      });
    const remoteOfferJson = await response.json();
    console.log("remoteOffer", remoteOfferJson );
    //const remoteOfferString = '{"aaa":"maybe"}';
    //const remoteOffer = new RTCSessionDescription(JSON.parse(remoteOfferString));
    const remoteOffer = new RTCSessionDescription(remoteOfferJson);
    await peerConnection.setRemoteDescription(remoteOffer);
}

async function sendAnswerSDP(peerConnection, cntPlayers) {
    const localAnswer = await peerConnection.createAnswer();
    console.log("localAnswer", localAnswer);
    await peerConnection.setLocalDescription(localAnswer);
    console.log("answer", peerConnection.localDescription);

    // send answer (peerConnection.localDescription)...
    const response = await fetch(baseUrl + roomId + "/"+ cntPlayers + ".json", { 
        method: 'PATCH', 
        headers: { 
          'Content-type': 'application/json'
        },
        //body: JSON.stringify(data) 
        body: '{"answer": '+JSON.stringify(peerConnection.localDescription)+'}'
      });
    console.log("answered", await response.json());

    await waitForIceFromSignaling(peerConnection, cntPlayers);
    await waitForAllICE(peerConnection);
    /*const localAnswerWithICECandidates = peerConnection.localDescription;
    console.log("localAnswerWithICECandidates:");
    console.log(JSON.stringify(localAnswerWithICECandidates));*/
    //1notDone; // Should send localAnswerWithICECandidates back, I guess???? Or have we sent enough back and just wait for connection, now???
}

async function waitForIceFromSignaling(peerConnection, cntPlayers) {
    const response = await fetch(baseUrl + roomId  + "/"+ playerCount + "/ice.json", {
        method: 'GET', 
        headers: { 
        'Content-type': 'application/json'
        }
    });
    //console.log("got: ", await response.json());
    ices = await response.json();
    if (ices == null) {
        // sleep 1 sec
        await new Promise(r => setTimeout(r, 1000));
        console.log("waiting for ices...");
    }
    else {
        console.log("ices", JSON.stringify(ices));
        for (let iceName in ices) {
            console.log("icece", ices[iceName]);
            peerConnection.addIceCandidate(ices[iceName]);
        }
    }
}

function joinGame() {

}

function actuallyStartGame() {
    window.addEventListener('beforeunload', function (event) {
        event.preventDefault();
        return (event.returnValue = "");
      });
    startGameByShowingFaces();
}

function startGameByShowingFaces() {
    document.getElementsByClassName("qr-codes")[0].style.display = "NONE";
    document.getElementById("frames").style.display = "";
    document.getElementById("cluesButton").style.display = "";
}

function setupFromUrl() {

    const queryString = window.location.search;
    if (queryString.indexOf("seed=") != -1) {
        const urlParams = new URLSearchParams(queryString);
        const initialSeed = urlParams.get('seed');
        const player = urlParams.get('player');
        const cntPlayers = urlParams.get('players');
        roomId = urlParams.get('roomId');
        

        currentPlayer = player;
        setup(cntPlayers, initialSeed);

        document.getElementsByClassName("intro")[0].style.display = "none";
        startJoin(cntPlayers);
        startGameByShowingFaces();
    }

}

function showClues() {
    // hintTexts
    // currentPlayer, global_cntPlayers
    alert("Morderen har " + hintTexts[currentPlayer-1]);
}

function beep() {
    var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
    snd.play();
}

function accuse(index, name) {
    if (confirm("Vil du virkelig anklage " + name + "?")) {
        //setTimeout(beep, 1);
        if (index == guiltyIndex) {
            alert("KORREKT! Du vant (kanskje, om ingen andre fant morderen før deg, da)!");
        }
        else {
            setTimeout(beep, 1);
            setTimeout(beep, 1500);
            alert("Feil, du anklaget en uskyldig! Skam deg!!");
        }
    }
}

window.addEventListener('load', setupFromUrl);