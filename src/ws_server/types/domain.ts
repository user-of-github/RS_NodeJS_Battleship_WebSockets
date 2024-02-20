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
    readonly roomId: number;
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
    readonly position: Position;
    readonly direction: boolean;
    readonly length: number;
    readonly type: ShipSize;
    aliveCells: boolean[];
}

export interface PlayerInGame {
    readonly index: number;
    ships: Ship[];
    attacks: Position[];
}
export interface Game {
    readonly id: number;
    readonly players: [PlayerInGame, PlayerInGame];
    turn: number;
}

export type AttackStatus = 'miss' | 'killed' | 'shot';

export interface AttackResult {
    gameIndex: number;
    status: AttackStatus;
    damagedShip?: Ship;
}