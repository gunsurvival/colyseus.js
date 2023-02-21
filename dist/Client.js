import { post, get } from "httpie";
import { ServerError } from './errors/ServerError';
import { Room } from './Room';
export class MatchMakeError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, MatchMakeError.prototype);
    }
}
const DEFAULT_ENDPOINT = (typeof (window) !== "undefined" && typeof (window?.location?.hostname) !== "undefined")
    ? `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${(window.location.port && `:${window.location.port}`)}`
    : "ws://127.0.0.1:2567";
export class Client {
    settings;
    constructor(settings = DEFAULT_ENDPOINT) {
        if (typeof (settings) === "string") {
            const url = new URL(settings);
            const useSSL = (url.protocol === "https:" || url.protocol === "wss:");
            const port = Number(url.port || (useSSL ? 443 : 80));
            this.settings = {
                hostname: url.hostname,
                port,
                useSSL
            };
        }
        else {
            this.settings = settings;
        }
    }
    async joinOrCreate(roomName, options = {}, rootSchema) {
        return await this.createMatchMakeRequest('joinOrCreate', roomName, options, rootSchema);
    }
    async create(roomName, options = {}, rootSchema) {
        return await this.createMatchMakeRequest('create', roomName, options, rootSchema);
    }
    async join(roomName, options = {}, rootSchema) {
        return await this.createMatchMakeRequest('join', roomName, options, rootSchema);
    }
    async joinById(roomId, options = {}, rootSchema) {
        return await this.createMatchMakeRequest('joinById', roomId, options, rootSchema);
    }
    async reconnect(reconnectionToken, rootSchema) {
        if (typeof (reconnectionToken) === "string" && typeof (rootSchema) === "string") {
            throw new Error("DEPRECATED: .reconnect() now only accepts 'reconnectionToken' as argument.\nYou can get this token from previously connected `room.reconnectionToken`");
        }
        const [roomId, token] = reconnectionToken.split(":");
        return await this.createMatchMakeRequest('reconnect', roomId, { reconnectionToken: token }, rootSchema);
    }
    async getAvailableRooms(roomName = "") {
        return (await get(this.getHttpEndpoint(`${roomName}`), {
            headers: {
                'Accept': 'application/json'
            }
        })).data;
    }
    async consumeSeatReservation(response, rootSchema, previousRoom) {
        const room = this.createRoom(response.room.name, rootSchema);
        room.roomId = response.room.roomId;
        room.sessionId = response.sessionId;
        const options = { sessionId: room.sessionId };
        if (response.reconnectionToken) {
            options.reconnectionToken = response.reconnectionToken;
        }
        const targetRoom = previousRoom || room;
        room.connect(this.buildEndpoint(response.room, options), response.devMode && (async () => {
            console.info(`[Colyseus devMode]: ${String.fromCodePoint(0x1F504)} Re-establishing connection with room id '${room.roomId}'...`);
            let retryCount = 0;
            let retryMaxRetries = 8;
            const retryReconnection = async () => {
                retryCount++;
                try {
                    await this.consumeSeatReservation(response, rootSchema, targetRoom);
                    console.info(`[Colyseus devMode]: ${String.fromCodePoint(0x2705)} Successfully re-established connection with room '${room.roomId}'`);
                }
                catch (e) {
                    if (retryCount < retryMaxRetries) {
                        console.info(`[Colyseus devMode]: ${String.fromCodePoint(0x1F504)} retrying... (${retryCount} out of ${retryMaxRetries})`);
                        setTimeout(retryReconnection, 2000);
                    }
                    else {
                        console.info(`[Colyseus devMode]: ${String.fromCodePoint(0x274C)} Failed to reconnect. Is your server running? Please check server logs.`);
                    }
                }
            };
            setTimeout(retryReconnection, 2000);
        }), targetRoom);
        return new Promise((resolve, reject) => {
            const onError = (code, message) => reject(new ServerError(code, message));
            targetRoom.onError.once(onError);
            targetRoom['onJoin'].once(() => {
                targetRoom.onError.remove(onError);
                resolve(targetRoom);
            });
        });
    }
    async createMatchMakeRequest(method, roomName, options = {}, rootSchema) {
        const response = (await post(this.getHttpEndpoint(`${method}/${roomName}`), {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
        })).data;
        if (response.error) {
            throw new MatchMakeError(response.error, response.code);
        }
        if (method === "reconnect") {
            response.reconnectionToken = options.reconnectionToken;
        }
        return await this.consumeSeatReservation(response, rootSchema);
    }
    createRoom(roomName, rootSchema) {
        return new Room(roomName, rootSchema);
    }
    buildEndpoint(room, options = {}) {
        const params = [];
        for (const name in options) {
            if (!options.hasOwnProperty(name)) {
                continue;
            }
            params.push(`${name}=${options[name]}`);
        }
        let endpoint = (this.settings.useSSL)
            ? "wss://"
            : "ws://";
        if (room.publicAddress) {
            endpoint += `${room.publicAddress}`;
        }
        else {
            endpoint += `${this.settings.hostname}${this.getEndpointPort()}`;
        }
        return `${endpoint}/${room.processId}/${room.roomId}?${params.join('&')}`;
    }
    getHttpEndpoint(segments) {
        return `${(this.settings.useSSL) ? "https" : "http"}://${this.settings.hostname}${this.getEndpointPort()}/matchmake/${segments}`;
    }
    getEndpointPort() {
        return (this.settings.port !== 80 && this.settings.port !== 443)
            ? `:${this.settings.port}`
            : "";
    }
}
//# sourceMappingURL=Client.js.map