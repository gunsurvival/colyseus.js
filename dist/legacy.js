if (!ArrayBuffer.isView) {
    ArrayBuffer.isView = (a) => {
        return a !== null && typeof (a) === 'object' && a.buffer instanceof ArrayBuffer;
    };
}
if (typeof (globalThis) === "undefined" &&
    typeof (window) !== "undefined") {
    window['globalThis'] = window;
}
//# sourceMappingURL=legacy.js.map