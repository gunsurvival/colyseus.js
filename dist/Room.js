import * as msgpack from './msgpack';
import { Connection } from './Connection';
import { Protocol, utf8Length, utf8Read } from './Protocol';
import { getSerializer } from './serializer/Serializer';
import { createNanoEvents } from 'nanoevents';
import { createSignal } from './core/signal';
import { decode, encode } from '@colyseus/schema';
import { CloseCode } from './errors/ServerError';
export class Room {
    roomId;
    sessionId;
    reconnectionToken;
    name;
    connection;
    onStateChange = createSignal();
    onError = createSignal();
    onLeave = createSignal();
    onJoin = createSignal();
    serializerId;
    serializer;
    hasJoined = false;
    rootSchema;
    onMessageHandlers = createNanoEvents();
    constructor(name, rootSchema) {
        this.roomId = null;
        this.name = name;
        if (rootSchema) {
            this.serializer = new (getSerializer("schema"));
            this.rootSchema = rootSchema;
            this.serializer.state = new rootSchema();
        }
        this.onError((code, message) => console.warn(`colyseus.js - onError => (${code}) ${message}`));
        this.onLeave(() => this.removeAllListeners());
    }
    get id() { return this.roomId; }
    connect(endpoint, devModeCloseCallback, room = this) {
        const connection = new Connection();
        room.connection = connection;
        connection.events.onmessage = Room.prototype.onMessageCallback.bind(room);
        connection.events.onclose = function (e) {
            if (!room.hasJoined) {
                console.warn(`Room connection was closed unexpectedly (${e.code}): ${e.reason}`);
                room.onError.invoke(e.code, e.reason);
                return;
            }
            if (e.code === CloseCode.DEVMODE_RESTART && devModeCloseCallback) {
                devModeCloseCallback();
            }
            else {
                room.onLeave.invoke(e.code);
                room.destroy();
            }
        };
        connection.events.onerror = function (e) {
            console.warn(`Room, onError (${e.code}): ${e.reason}`);
            room.onError.invoke(e.code, e.reason);
        };
        connection.connect(endpoint);
    }
    leave(consented = true) {
        return new Promise((resolve) => {
            this.onLeave((code) => resolve(code));
            if (this.connection) {
                if (consented) {
                    this.connection.send([Protocol.LEAVE_ROOM]);
                }
                else {
                    this.connection.close();
                }
            }
            else {
                this.onLeave.invoke(CloseCode.CONSENTED);
            }
        });
    }
    onMessage(type, callback) {
        return this.onMessageHandlers.on(this.getMessageHandlerKey(type), callback);
    }
    send(type, message) {
        const initialBytes = [Protocol.ROOM_DATA];
        if (typeof (type) === "string") {
            encode.string(initialBytes, type);
        }
        else {
            encode.number(initialBytes, type);
        }
        let arr;
        if (message !== undefined) {
            const encoded = msgpack.encode(message);
            arr = new Uint8Array(initialBytes.length + encoded.byteLength);
            arr.set(new Uint8Array(initialBytes), 0);
            arr.set(new Uint8Array(encoded), initialBytes.length);
        }
        else {
            arr = new Uint8Array(initialBytes);
        }
        this.connection.send(arr.buffer);
    }
    sendBytes(type, bytes) {
        const initialBytes = [Protocol.ROOM_DATA_BYTES];
        if (typeof (type) === "string") {
            encode.string(initialBytes, type);
        }
        else {
            encode.number(initialBytes, type);
        }
        let arr;
        arr = new Uint8Array(initialBytes.length + (bytes.byteLength || bytes.length));
        arr.set(new Uint8Array(initialBytes), 0);
        arr.set(new Uint8Array(bytes), initialBytes.length);
        this.connection.send(arr.buffer);
    }
    get state() {
        return this.serializer.getState();
    }
    removeAllListeners() {
        this.onJoin.clear();
        this.onStateChange.clear();
        this.onError.clear();
        this.onLeave.clear();
        this.onMessageHandlers.events = {};
    }
    onMessageCallback(event) {
        const bytes = Array.from(new Uint8Array(event.data));
        const code = bytes[0];
        if (code === Protocol.JOIN_ROOM) {
            let offset = 1;
            const reconnectionToken = utf8Read(bytes, offset);
            offset += utf8Length(reconnectionToken);
            this.serializerId = utf8Read(bytes, offset);
            offset += utf8Length(this.serializerId);
            if (!this.serializer) {
                const serializer = getSerializer(this.serializerId);
                this.serializer = new serializer();
            }
            if (bytes.length > offset && this.serializer.handshake) {
                this.serializer.handshake(bytes, { offset });
            }
            this.reconnectionToken = `${this.roomId}:${reconnectionToken}`;
            this.hasJoined = true;
            this.onJoin.invoke();
            this.connection.send([Protocol.JOIN_ROOM]);
        }
        else if (code === Protocol.ERROR) {
            const it = { offset: 1 };
            const code = decode.number(bytes, it);
            const message = decode.string(bytes, it);
            this.onError.invoke(code, message);
        }
        else if (code === Protocol.LEAVE_ROOM) {
            this.leave();
        }
        else if (code === Protocol.ROOM_DATA_SCHEMA) {
            const it = { offset: 1 };
            const context = this.serializer.getState().constructor._context;
            const type = context.get(decode.number(bytes, it));
            const message = new type();
            message.decode(bytes, it);
            this.dispatchMessage(type, message);
        }
        else if (code === Protocol.ROOM_STATE) {
            bytes.shift();
            this.setState(bytes);
        }
        else if (code === Protocol.ROOM_STATE_PATCH) {
            bytes.shift();
            this.patch(bytes);
        }
        else if (code === Protocol.ROOM_DATA) {
            const it = { offset: 1 };
            const type = (decode.stringCheck(bytes, it))
                ? decode.string(bytes, it)
                : decode.number(bytes, it);
            const message = (bytes.length > it.offset)
                ? msgpack.decode(event.data, it.offset)
                : undefined;
            this.dispatchMessage(type, message);
        }
        else if (code === Protocol.ROOM_DATA_BYTES) {
            const it = { offset: 1 };
            const type = (decode.stringCheck(bytes, it))
                ? decode.string(bytes, it)
                : decode.number(bytes, it);
            this.dispatchMessage(type, new Uint8Array(bytes.slice(it.offset)));
        }
    }
    setState(encodedState) {
        this.serializer.setState(encodedState);
        this.onStateChange.invoke(this.serializer.getState());
    }
    patch(binaryPatch) {
        this.serializer.patch(binaryPatch);
        this.onStateChange.invoke(this.serializer.getState());
    }
    dispatchMessage(type, message) {
        const messageType = this.getMessageHandlerKey(type);
        if (this.onMessageHandlers.events[messageType]) {
            this.onMessageHandlers.emit(messageType, message);
        }
        else if (this.onMessageHandlers.events['*']) {
            this.onMessageHandlers.emit('*', type, message);
        }
        else {
            console.warn(`colyseus.js: onMessage() not registered for type '${type}'.`);
        }
    }
    destroy() {
        if (this.serializer) {
            this.serializer.teardown();
        }
    }
    getMessageHandlerKey(type) {
        switch (typeof (type)) {
            case "function": return `$${type._typeid}`;
            case "string": return type;
            case "number": return `i${type}`;
            default: throw new Error("invalid message type.");
        }
    }
}
//# sourceMappingURL=Room.js.map