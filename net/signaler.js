// signaler channel (firebase)
import { nanoid } from '../libs/nanoid.js';

const baseUrl = "https://murderface-86"+"c1a-defa"+"ult-rtdb"+".eur"+"ope-wes"+"t1.fire"+"based"+"atab"+"ase.a"+"pp/murd"+"erface/rooms/";

export let uniqueId = document.cookie.split("; ")
    .find((row) => row.startsWith("uniqueId="))
    ?.split("=")[1];
if (!uniqueId) {
    uniqueId = nanoid(10); // only generate if we haven't already...
    document.cookie = "uniqueId="+uniqueId;
    console.log("!!!!!!!!!!Created new uniqueId!", uniqueId);
}

// Looks like we need a queue system here... So that we only run fetch on one at a time, for push(), send(), removeChannels(), at least... Otherwise we may run out of connections, and all of them will be stuck...
// ser ut til at vi også trenger getInitialSignals() men den er await... må gjøre om der vi kaller dem opp...
// use array.push(o), o = array.shift() to simulate queue (shift can be slow on big arrays, but should be fine for this...)
// ISSUE: we use await for most of these calls (not sure if really needed, though... think its just because they sometimes froze, and this is prolly because of the above reason...)
const netQueue = [];
let pendingPromise = false;

function queue(action) {
    return new Promise((resolve, reject) => {
        netQueue.push({ action, resolve, reject });
        dequeue();
    });
}

async function dequeue() {
    if (pendingPromise) return false;
    
    const item = netQueue.shift();
    if (!item) return false;

    try {
        pendingPromise = true;

        const payload = await item.action();

        pendingPromise = false;
        item.resolve(payload);
    }
    catch (err) {
        console.log("err", err);
        pendingPromise = false;
        item.reject(err);
    }
    finally {
        dequeue(); // handle next in queue
    }

    return true;
}



//export const localId = nanoid(6); // to identify this client, and avoid fetching signals from ourselves... new each time reloads etc...
export let localId;
generateLocalId();

export function generateLocalId() {
    localId = nanoid(6);
}

// register our localId in firebase
export async function register(roomId) {
    await fetch(baseUrl + roomId + "/participants.json", { 
        method: 'POST',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
            'Content-type': 'application/json'
        },
        body: `{"id": "${localId}", "uniqueId": "${uniqueId}", "time": {".sv": "timestamp"}}`,
        signal: AbortSignal.timeout(15000)
      });
}


export async function getServer(roomId) {
    const response = await fetch(baseUrl + roomId + "/server.json", { 
        method: 'GET',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
            'Accept': 'application/json',
            'X-Firebase-ETag': true
        },
        signal: AbortSignal.timeout(15000)
      });
    const server = await response.json();
    return {'etag': response.headers.get('ETag'), 'server': server};
}

export async function registerAsServer(roomId, etag, force) {
    let headers = {
        'Content-type': 'application/json'
    };
    if (!force) {
        headers['if-match'] = etag;
    }
    try {
        const response = await fetch(baseUrl + roomId + "/server.json", { 
            method: 'PUT',  // PATCH: update, PUT: replace`, POST: push/add
            headers: headers,
            body: `{"id": "${localId}", "uniqueId": "${uniqueId}", "time": {".sv": "timestamp"}}`,
            signal: AbortSignal.timeout(15000)
        });
        await response.json();
        return response.status >= 200 && response.status < 300;
    }
    catch (err) {
        console.log("got errrrr", err);
        return false;
    }
}

// get localIds from firebase, use to figure out which is "server", and count and stuff... (HOW to handle if server reloads or drops out? If reload, should still be server, otherwise new server. HOW?????)
//                                                          "server" should maybe remove any rtc peers that drop out...? (remove from participants). And if client loses connection with server, vote for new "server"? (should be algorithm for this)
//                                                          Skip most of that for now, just use for which is "server"
export async function getParticipants(roomId) {
    const response = await fetch(baseUrl + roomId + "/participants.json", { 
        method: 'GET',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
    const participants = await response.json();
    return participants;
}

export async function getParticipantWithOurId(roomId) {
    const response = await fetch(baseUrl + roomId + `/participants.json?orderBy="uniqueId"&startAt="${uniqueId}"&endAt="${uniqueId}"`, { 
        method: 'GET',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
           'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
    const participants = await response.json();
    return participants;
}

export async function send(roomId, polite, peer, jsonPayload) {
    //console.log("payload: ", jsonPayload);
    let channel = null;
    let serverLocalId = null;
    if (polite) {
        serverLocalId = peer.server.id;
        channel = serverLocalId+"_"+localId; // peer=server, so goes first
    }
    else {
        serverLocalId = localId;
        channel = localId+"_"+peer.id;
    }
    jsonPayload.serverLocalId = serverLocalId;
    queue(() => {
        //console.log("sending offer on channel", channel);
        return fetch(baseUrl + roomId + "/signals/"+channel+".json?rand="+Math.random(), { 
            method: 'PATCH',  // PATCH: update, PUT: replace
            headers: {
                'Content-type': 'application/json'
            },
            body: `{"${localId}": {"localId": "${localId}", "payload": ${JSON.stringify(jsonPayload)}}}`,
            signal: AbortSignal.timeout(15000)
        });
        /*.then(response => response.text())
        .then(data => console.log("fromSendingOffer", data))*/;
    });
}

export function push(roomId, polite, peer, jsonPayload) {
    let channel = polite
        ? peer.server.id+"_"+localId // peer=server, so goes first
        : localId+"_"+peer.id;
    pushChannel(roomId, channel, jsonPayload);
}

export function pushChannel(roomId, channel, jsonPayload) {
    queue(() => {
        return fetch(baseUrl + roomId + "/signals/"+channel+".json?rand="+Math.random(), { 
            method: 'POST', // POST: push/add
            headers: { 
                'Content-type': 'application/json'
            },
            body: `{"localId": "${localId}", "payload": ${JSON.stringify(jsonPayload)}}`,
            signal: AbortSignal.timeout(15000)
        });
    });
}

export async function lostServer(roomId) {
    // kanal "signals/disconnected", hvor hver klient som mister comms med serveren pusher "lost server" eller noe (inkl timestamp (sett timestamp: {".sv": "timestamp"}, så får vi timestamp: 12314 (unix time millis))).

    fetch(baseUrl + roomId + "/signals/disconnected.json", { 
        method: 'POST', // POST: push/add
        headers: { 
            'Content-type': 'application/json'
        },
        body: `{"payload": {"lostServer": true, "localId": "${localId}", "uniqueId": "${uniqueId}", "time": {".sv": "timestamp"} }, "localId": "${localId}"}`,
        signal: AbortSignal.timeout(15000)
      });
}

export async function serverIsUp(roomId) {
    fetch(baseUrl + roomId + "/signals/disconnected.json", { 
        method: 'PUT',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
            'Content-type': 'application/json'
        },
        body: `{"payload": {"serverIsUp": true, "id": "${localId}", "uniqueId": "${uniqueId}", "time": {".sv": "timestamp"} }, "id": "${localId}", "uniqueId": "${uniqueId}"}`,
        signal: AbortSignal.timeout(15000)
    });
}

export async function getChannelsWithOldId(roomId, oldId) {
    const response = await fetch(baseUrl + roomId + `/signals.json?orderBy="$key"&startAt="${oldId}"`, { 
        method: 'GET',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
    const channels = await response.json();
    return channels;
}
/*export async function getChannelsWithOldId2(roomId, oldId) {
    const response = await fetch(baseUrl + roomId + `/signals.json?orderBy="$key"&endAt="${oldId}"`, { 
        method: 'GET',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
           'Accept': 'application/json'
        }
      });
    const channels = await response.json();
    return channels;
}*/

export function cleanupDisconnectMessages(roomId) {
    //console.log("loooooking", baseUrl + roomId + `/signals/disconnected.json?orderBy="payload/uniqueId"&startAt="${uniqueId}"`);
    //'Index not defined, add ".indexOn": "payload/unique…ms/testRoomId/signals/disconnected", to the rules'
    queue(() => fetch(baseUrl + roomId + `/signals/disconnected.json?orderBy="payload/uniqueId"&startAt="${uniqueId}"`, { 
        method: 'GET',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      }) )
        .then(response => response.json())
        .then(json => {
            //console.log("found:", json);
            for (const key of Object.keys(json)) {
                queue(() => fetch(baseUrl + roomId + "/signals/disconnected/"+key+".json", { 
                    method: 'DELETE', 
                    headers: { 
                       'Content-type': 'application/json'
                    },
                    signal: AbortSignal.timeout(15000)
                }) );
            }
        });
    

}

export function removeChannels(roomId, toDelete) {
    
    for (const part of toDelete) {
        //console.log("deleteing", part);
        queue(() => {
            return fetch(baseUrl + roomId + "/signals/"+part+".json?rand="+Math.random(), { 
                method: 'DELETE', 
                headers: { 
                'Content-type': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
            });
        });
        /*.then(response => response.text())
        .then(data => console.log("fromDeletle", data))*/;
    }
}

export async function removeParticipants(roomId, toDelete) {
    for (const part of toDelete) {
        //console.log("deleteing", part);
        fetch(baseUrl + roomId + "/participants/"+part+".json", { 
            method: 'DELETE', 
            headers: { 
               'Content-type': 'application/json'
            },
            signal: AbortSignal.timeout(15000)
        })
        /*.then(response => response.text())
        .then(data => console.log("fromDeletle", data))*/;
    }
}

export async function getInitialSignals(roomId, polite, peer, callback) {
    let channel = polite
        ? peer.server.id+"_"+localId // peer=server, so goes first
        : localId+"_"+peer.id;

    queue(() => {
        return fetch(baseUrl + roomId + `/signals/${channel}.json?rand=`+Math.random(), { 
            method: 'GET',  // PATCH: update, PUT: replace`, POST: push/add
            headers: {
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(15000)
        });
    })
    .then(async response => await response.json())
    .then(signals => callback(signals));
    /*const response = await fetch(baseUrl + roomId + `/signals/${channel}.json`, { 
        method: 'GET',  // PATCH: update, PUT: replace`, POST: push/add
        headers: {
            'Accept': 'application/json'
        }
        });
    const signals = await response.json();
    return signals;*/
}

let _serverLocalid = null;

export function listenForSignals(roomId, polite, peer, callback) {
    //console.log("listenForSignals peer", peer);

    // MÅ gjøre om her, siden vi ikke kan ha for mange connections åpne samtidig (fetch connections). Må lytte på hele roomId/signals, og filtrere det vi får til riktig peerConnection callback!!

    /*let channel = polite
        ? peer.server.id+"_"+localId // peer=server, so goes first
        : localId+"_"+peer.id;
    listen(roomId, callback, "signals/"+channel);*/
    /*let channel = polite
        ? peer.server.id+"_"+localId // peer=server, so goes first
        : localId+"_"+peer.id;*/
    let channel = null;
    let serverLocalId = null;
    if (polite) {
        serverLocalId = peer.server.id;
        channel = serverLocalId+"_"+localId; // peer=server, so goes first
    }
    else {
        serverLocalId = localId;
        channel = localId+"_"+peer.id;
    }
    _serverLocalid = serverLocalId;
    listen(roomId, callback, "signals", channel);
}

export function listenForParticipants(roomId, callback) {
    listen(roomId, callback, "participants");
}

export function stopListening() {
    //console.log("clearing channelListeners");
    channelListeners = [];
}

let channelListeners = [];
let listeningForSignals = false;

function listen(roomId, callback, type, channel) {
    //console.log("start listening on " + type, channel);
    let abortController = null;
    let aborted = false;
    if (channel) {
        // add to channelListeners
        channelListeners[channel] = callback;
        if (listeningForSignals) {
            // already listening, return
            return;
        }
        listeningForSignals = true;
    }
    else {
        abortController = new AbortController();
    }
    fetch(baseUrl + roomId +'/'+type+'.json?', {
        method: "GET",
        headers: {
            'Accept': 'text/event-stream'
        },
        signal: abortController?.signal
    }).then(response => {
        // Get the readable stream from the response body
        const stream = response.body;
        // Get the reader from the stream
        const reader = stream.getReader();
        let buffer = "";
        // Define a function to read each chunk
        const readChunk = () => {
            // Read a chunk from the reader
            reader.read()
                .then(async ({
                    value,
                    done
                }) => {
                    // Check if the stream is done
                    if (done) {
                        // Log a message
                        //console.log('Stream finished');
                        // wrong?// Return from the function
                        //return;
                        // Restart listener...
                        setTimeout(() => listen(roomId, callback, type, channel), 200); // restart subscription
                    }
                    // Convert the chunk value to a string
                    let chunkString = new TextDecoder().decode(value);
                    //console.log("chunkString from type:", type, chunkString, chunkString.trim().endsWith("}"));
                    if (buffer.length > 0) {
                        buffer += chunkString;
                        chunkString = buffer;
                    }
                    // enkleste: split på \n\nevent:, dropp alt før data:, pluss data:, trim....
                    const events = chunkString.split("\n\nevent:");
                    const arrJsonEvents = [];
                    for (const e of events) {
                        const event = e.substring(e.indexOf("data:") + "data:".length).trim();
                        if (event && event != "null") {
                            try {
                                const ob = JSON.parse(event);
                                arrJsonEvents.push(ob);
                            }
                            catch (err) {
                                // assume buffered, since json.parse failed, so read more and try again...
                                if (buffer != chunkString) { // in case we already appended orig chunkString to buffer...
                                    buffer += chunkString;
                                }
                                // read next chunk
                                readChunk();
                                return;
                            }
                        }
                    }
                    // If we get here, we are done with buffer for now, reset..
                    buffer = "";
                    for (const ob of arrJsonEvents) {
                        if (ob.data != null) {
                            //console.log("data", JSON.stringify(data));
                            let datas = [];
                            if (ob.path == "/") {
                                // ISSUE: first fetch (and possible some later) gives all updates in one json:
                                // Need to split them up!
                                // This is only for path = "/"
                                datas = Object.values(ob.data);
                            }
                            else {
                                datas = [ob.data]; // put data in array, so same format as above..
                            }
                            //console.log("type", type);

                            if (type == "participants") {
                                for (const d of datas) {
                                    if (type == "participants") {
                                        const stopListening = await callback(d);
                                        //console.log("stopListening", stopListening);
                                        if (stopListening) {
                                            aborted = true;
                                            abortController.abort();
                                            return;
                                        }
                                    }
                                }
                            }
                            else if (ob.path != "/") {
                                // need to split up for each channel
                                const nextSlash = ob.path.indexOf("/", 1);
                                const currentChannel = ob.path.substring(1, nextSlash != -1? nextSlash : ob.path.length); // path = "/<channel>[/xxx]", so remove leading / and any trailing slash++
                                
                                datas.sort((a,b) => a.payload?.description != null && !b.payload?.description ? -1 : 0 ); // want descriptions before candidates
                                //console.log("datas", JSON.stringify(datas));
                                for (const d of datas) {
                                    //console.log("d", d);
                                    let actualData = d;
                                    if (!actualData.localId) {
                                        actualData = Object.values(d)[0];
                                    }
                                    if (actualData.localId != localId) {
                                        //console.log("NOT SKIPPED");
                                        //callback(d.payload);
                                        //console.log("channelListeneres, currentChannel", channelListeners, currentChannel)
                                        //console.log("d, actualData", d, actualData);
                                        const newServerLocalId = actualData.payload?.serverLocalId;
                                        //console.log("newServerLocalId, _serverLocalid, localId, currentChanenl", newServerLocalId, _serverLocalid, localId, currentChannel, newServerLocalId && newServerLocalId != _serverLocalid && newServerLocalId != localId)
                                        //console.log("channelListeners", channelListeners);
                                        if (newServerLocalId && newServerLocalId != _serverLocalid && newServerLocalId != localId) {
                                            // ser ut til at server har ny localId, vi må lytte på riktig channel!
                                            // Vi lytter nå på feil kanal!!!
                                            const oldChannel = Object.keys(channelListeners)[0];
                                            const oldCallback = channelListeners[oldChannel];
                                            if (oldCallback) {
                                                //console.log("listening on wrong channel! newServerLocalId, serverLocalId", newServerLocalId, _serverLocalid)
                                                //channelListeners[oldChannel] = null;
                                                channelListeners = []; // need to completely reset channelListeners, to avoid bloat (we are now clients, and only have 1 channel anyway)
                                                oldCallback({closeChannel: true});
                                            }
                                            else {
                                                //console.log("channelListeners", channelListeners)
                                            }
                                        }
                                        if (channelListeners[currentChannel]) {
                                            // call callback function
                                            //console.log("calling callback!");
                                            channelListeners[currentChannel](actualData.payload);
                                            //console.log("done calling callback")
                                            if (actualData.payload.closeChannel) {
                                                //console.log("sending close to ", currentChannel);
                                                if (_serverLocalid == localId) {
                                                    channelListeners[currentChannel] = null;
                                                }
                                                else {
                                                    channelListeners = []; // need to completely reset channelListeners, to avoid bloat (we are now clients, and only have 1 channel anyway)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // chunkString should contain: '{"event": "put", "data": "<the actual data>"}', or '{"event": "keepalive", "data": null}' etc...
                    /*if (chunkString.indexOf("event:") == 0 && chunkString.indexOf("data: ") != -1) {
                        var val = JSON.parse(chunkString.substring(chunkString.indexOf("data: ") + "data: ".length));
                        console.log("val", val);
                        if (val.data) {
                            console.log("to comms: ", val);
                            //callback(val);
                        }
                    }*/
                    // Read the next chunk
                    readChunk();
                })
                .catch(error => {
                    // Log the error
                    if (aborted) {
                        return;
                    }
                    console.error(error);
                    //throw(error);
                    setTimeout(() => listen(roomId, callback, type, channel), 200); // restart subscription
                });
        };
        // Start reading the first chunk
        readChunk();

        
    })
    .catch(error => {
        // try again... after short rest
        if (aborted) {
            return;
        }
        console.error(error);
        setTimeout(() => listen(roomId, callback, type, channel), 200); // restart subscription
    });

}

// can get one chunk like this:
/*event: patch
data: {"path":"/","data":{"description":{"sdp":"v=0\r\no=- 8456162993355167478 3 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:IrYq\r\na=ice-pwd:CpVa1Rtal0jFmLFdbOE09uc9\r\na=ice-options:trickle\r\na=fingerprint:sha-256 A5:8D:7B:EC:30:05:B5:2F:98:4E:62:82:01:A8:36:44:4C:FC:30:CA:EC:C2:FE:90:F1:A0:9F:22:99:91:F4:D6\r\na=setup:active\r\na=mid:0\r\na=sctp-port:5000\r\na=max-message-size:262144\r\n","type":"answer"}}}

event: put
data: {"path":"/-NqdEnXnXFu2cYmBwnmd","data":{"candidate":{"candidate":"candidate:2049547718 1 udp 2113937151 f889323b-2b92-471e-8e8c-d679a28e42eb.local 54406 typ host generation 0 ufrag IrYq network-cost 999","sdpMLineIndex":0,"sdpMid":"0","usernameFragment":"IrYq"}}}*/
// keepalive:
/*event: keep-alive
data: null*/

/*function parseEvents(chunk) {
    const DATA = 'data:';
    const EVENT = 'event:';
    const ID = 'id:';
  
    let indexOfData = chunk.indexOf(DATA);
    let indexOfEvent = chunk.indexOf(EVENT);
    let indexOfId = chunk.indexOf(ID);

    const arrEvents = [];
    
    while (indexOfEvent != -1) {

        const keys = [
            { key: DATA, index: indexOfData },
            { key: EVENT, index: indexOfEvent },
            { key: ID, index: indexOfId },
          ];
        keys.sort((a,b) => a.index - b.index);

        for (let key of keys) {
            fdsfds
        }

        
        indexOfData = chunk.indexOf(DATA, indexOfData+1);
        indexOfEvent = chunk.indexOf(EVENT, indexOfEvent+1);
        indexOfId = chunk.indexOf(ID, indexOfId+1);
    }

}*/

// Need to convert this shit from typescript to javascript:
/*
const filteredQueue = this.stringMessagesQueue.filter(m => !m.complete);
      this.stringMessagesQueue = parseChunkToStringEvent(
        value,
        filteredQueue.length > 0 ? filteredQueue : undefined,
      );

      // now we need to parse those complete strings into objects
      // and do the onMessage stuff
      this.stringMessagesQueue
        .filter(m => m.complete)
        .map(m => parseStringEventToObject(m.message))
        .forEach(m => {
          this._onMessage(m);
        });

type ParsedStringEvent = {
    message: string;
    complete: boolean;
  };
  
type ObjectEvent = {
    data: string;
    event: string;
    id: string;
  };
  
  //
   // This function receives a chunk of data as a Uint8Array.
   // A chunk can contain 1 or more events. It can also contain part of one single event.
   //
   // The function parses those chunks and returns them as pair <string, boolean>
   // The string is the event value and the status is true if we have all of it, false otherwise
   //
   // The function revives an option initial state parameter which can typically
   // be used to pass incomplete previous events once we parse the next chunk
   //
   // @param event the chunk of Uint8Array that contains some event data
   // @param init the initial state. Typically, an incomplete event from a previous chunk parse
   //
  function parseChunkToStringEvent(
    event: Uint8Array,
    init: ParsedStringEvent[] = [{ message: '', complete: false }],
  ): ParsedStringEvent[] {
    try {
      return event.reduce((prev, curr, index, array) => {
        // OK, we have a \n
        if (String.fromCharCode(curr) === '\n') {
          // if next one is also a \n
          // add empty string
          if (String.fromCharCode(array[index + 1]) === '\n') {
            prev[prev.length - 1].complete = true;
            return [...prev, { message: '', complete: false }];
          }
          // otherwise, ignore \n
          return prev;
        }
  
        // we just add the character to its string
        prev[prev.length - 1].message =
          prev[prev.length - 1].message + String.fromCharCode(array[index]);
        return prev;
      }, init);
    } catch (error) {
      throw error;
    }
  }
  
  ///
   // This function takes the event as a string and returns is as an object.
   // i.e.: "data:somedata event:myevent" => { data: 'somedata', event: 'myevent' }
   //
   // @param stringEvent the event as a string
   //
  function parseStringEventToObject(stringEvent: string): ObjectEvent {
    // all the keys we need to find
    const DATA = 'data';
    const EVENT = 'event';
    const ID = 'id';
  
    // the index of our keys: in the string event
    const indexOfData = stringEvent.indexOf(DATA + ':');
    const indexOfEvent = stringEvent.indexOf(EVENT + ':');
    const indexOfId = stringEvent.indexOf(ID + ':');
  
    // we make a nice array of keys and their index
    const keys = [
      { key: DATA, index: indexOfData },
      { key: EVENT, index: indexOfEvent },
      { key: ID, index: indexOfId },
    ];
  
    // sort indexes and start the slicing
    const objectEvent: ObjectEvent = keys
      .sort((a, b) => a.index - b.index)
      .reduce(
        (prev, curr, index) => {
          const next = { ...prev };
          if (index + 1 < keys.length) {
            // if not the last key
            next[curr.key] = stringEvent.slice(
              curr.index + curr.key.length + 1,
              keys[index + 1].index,
            );
          } else {
            next[curr.key] = stringEvent.slice(curr.index + curr.key.length + 1);
          }
          return next;
        },
        {} as ObjectEvent,
      );
  
    return objectEvent;
  }*/




//export { send, push, listen, register, getParticipants };

/*// initial offer
const response = await fetch(baseUrl + roomId + "/"+ playerCount + "/sdp.json", { 
    method: 'PUT', 
    headers: { 
      'Content-type': 'application/json'
    },
    //body: JSON.stringify(data) 
    body: localDesc // already stringyFied...
  });
console.log("PUTted");

// wait for answer to initial offer
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

// send ice candidate
fetch(baseUrl + roomId + "/"+ playerCount + "/ice.json", { 
    method: 'POST',  // POST = push (add)
    headers: {
      'Content-type': 'application/json'
    },
    //body: JSON.stringify(data) 
    body: JSON.stringify(iceEvent.candidate)
  });

// receive initial offer
const response = await fetch(baseUrl + roomId +"/" +cntPlayers + "/sdp.json", { 
    method: 'GET', 
    headers: { 
      'Content-type': 'application/json'
    }
  });
const remoteOfferJson = await response.json();

// send answer (peerConnection.localDescription)...
const response = await fetch(baseUrl + roomId + "/"+ cntPlayers + ".json", { 
    method: 'PATCH', 
    headers: { 
      'Content-type': 'application/json'
    },
    //body: JSON.stringify(data) 
    body: '{"answer": '+JSON.stringify(peerConnection.localDescription)+'}'
  });

// wait for ice from signaling
const response = await fetch(baseUrl + roomId  + "/"+ playerCount + "/ice.json", {
    method: 'GET', 
    headers: { 
    'Content-type': 'application/json'
    }
});*/