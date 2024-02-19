export interface AuthData {
    readonly name: string;
    readonly password: string;
}

export interface User extends AuthData {
    readonly index: number;
    wins: number;
}
export type UserInRoom = Pick<User, 'index'> & Pick<AuthData, 'name'>;
export interface Room {
    roomUsers: UserInRoom[];
    roomId: number;
}

export interface AddToRoomData {
    indexRoom: number;
}

export interface Position {
    x: number;
    y: number;
}

export type ShipSize = 'small' | 'medium' | 'large' | 'huge';

export interface Ship {
    position: Position;
    direction: boolean;
    length: number;
    type: ShipSize;
}

export interface PlayerInGame {
    index: number;
    ships: Ship[];
}
export interface Game {
    readonly id: string;
    readonly players: [PlayerInGame, PlayerInGame];
}
