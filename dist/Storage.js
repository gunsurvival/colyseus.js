let storage;
function getStorage() {
    if (!storage) {
        storage = (typeof (cc) !== 'undefined' && cc.sys && cc.sys.localStorage)
            ? cc.sys.localStorage
            : typeof (window) !== "undefined" && window.localStorage
                ? window.localStorage
                : {
                    cache: {},
                    setItem: function (key, value) { this.cache[key] = value; },
                    getItem: function (key) { this.cache[key]; },
                    removeItem: function (key) { delete this.cache[key]; },
                };
    }
    return storage;
}
export function setItem(key, value) {
    getStorage().setItem(key, value);
}
export function removeItem(key) {
    getStorage().removeItem(key);
}
export function getItem(key, callback) {
    const value = getStorage().getItem(key);
    if (typeof (Promise) === 'undefined' ||
        !(value instanceof Promise)) {
        callback(value);
    }
    else {
        value.then((id) => callback(id));
    }
}
//# sourceMappingURL=Storage.js.map