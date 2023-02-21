import { Reflection } from "@colyseus/schema";
export class SchemaSerializer {
    state;
    setState(rawState) {
        return this.state.decode(rawState);
    }
    getState() {
        return this.state;
    }
    patch(patches) {
        return this.state.decode(patches);
    }
    teardown() {
        this.state?.['$changes']?.root.clearRefs();
    }
    handshake(bytes, it) {
        if (this.state) {
            const reflection = new Reflection();
            reflection.decode(bytes, it);
        }
        else {
            this.state = Reflection.decode(bytes, it);
        }
    }
}
//# sourceMappingURL=SchemaSerializer.js.map