const serializers = {};
export function registerSerializer(id, serializer) {
    serializers[id] = serializer;
}
export function getSerializer(id) {
    const serializer = serializers[id];
    if (!serializer) {
        throw new Error("missing serializer: " + id);
    }
    return serializer;
}
//# sourceMappingURL=Serializer.js.map