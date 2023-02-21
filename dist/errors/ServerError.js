export var CloseCode;
(function (CloseCode) {
    CloseCode[CloseCode["CONSENTED"] = 4000] = "CONSENTED";
    CloseCode[CloseCode["DEVMODE_RESTART"] = 4010] = "DEVMODE_RESTART";
})(CloseCode || (CloseCode = {}));
export class ServerError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "ServerError";
        this.code = code;
    }
}
//# sourceMappingURL=ServerError.js.map