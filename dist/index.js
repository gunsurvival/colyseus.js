import './legacy';
export { Client } from './Client';
export { Protocol, ErrorCode } from './Protocol';
export { Room } from './Room';
export { Auth, Platform } from "./Auth";
import { SchemaSerializer } from "./serializer/SchemaSerializer";
import { NoneSerializer } from "./serializer/NoneSerializer";
import { registerSerializer } from './serializer/Serializer';
export { registerSerializer, SchemaSerializer };
registerSerializer('schema', SchemaSerializer);
registerSerializer('none', NoneSerializer);
//# sourceMappingURL=index.js.map