import { Room, RoomAvailable } from './Room';
import { SchemaConstructor } from './serializer/SchemaSerializer';
export type JoinOptions = any;
export declare class MatchMakeError extends Error {
    code: number;
    constructor(message: string, code: number);
}
export interface EndpointSettings {
    hostname: string;
    port: number;
    useSSL: boolean;
}
export declare class Client {
    protected settings: EndpointSettings;
    constructor(settings?: string | EndpointSettings);
    joinOrCreate<T>(roomName: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    create<T>(roomName: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    join<T>(roomName: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    joinById<T>(roomId: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    reconnect<T>(reconnectionToken: string, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    getAvailableRooms<Metadata = any>(roomName?: string): Promise<RoomAvailable<Metadata>[]>;
    consumeSeatReservation<T>(response: any, rootSchema?: SchemaConstructor<T>, previousRoom?: Room): Promise<Room<T>>;
    protected createMatchMakeRequest<T>(method: string, roomName: string, options?: JoinOptions, rootSchema?: SchemaConstructor<T>): Promise<Room<T>>;
    protected createRoom<T>(roomName: string, rootSchema?: SchemaConstructor<T>): Room<T>;
    protected buildEndpoint(room: any, options?: any): string;
    protected getHttpEndpoint(segments: string): string;
    protected getEndpointPort(): string;
}
