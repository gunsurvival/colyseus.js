import { WebSocketTransport } from "./transport/WebSocketTransport";
export class Connection {
    transport;
    events = {};
    constructor() {
        this.transport = new WebSocketTransport(this.events);
    }
    send(data) {
        this.transport.send(data);
    }
    connect(url) {
        this.transport.connect(url);
    }
    close(code, reason) {
        this.transport.close(code, reason);
    }
}
//# sourceMappingURL=Connection.js.map