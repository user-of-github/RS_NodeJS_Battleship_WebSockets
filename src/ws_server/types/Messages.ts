import {AttackStatus, Position, Ship, User} from './domain';


export type MessageType = 'reg' | 'create_room' | 'add_user_to_room' | 'create_game' | 'add_ships' | 'start_game' | 'turn' | 'attack' | 'randomAttack' | 'finish' | 'update_room' | 'update_winners';

export interface Message {
    readonly type: MessageType;
    readonly data: string;
    readonly id: 0;
}

export interface RegResponseData extends Omit<User, 'password' | 'wins'> {
    readonly error: boolean;
    readonly errorText: string;
}

export interface CreateGameResponseData {
    readonly idGame: number;
    readonly idPlayer: number;
}

export interface AddShipsRequestData {
    readonly gameId: number;
    readonly ships: Ship[];
    readonly indexPlayer: number;
}

export interface StartGameResponse {
    readonly ships: Ship[];
    readonly currentPlayerIndex: number;
}

export interface AttackRequestData {
    readonly gameId: number;
    readonly x: number;
    readonly y: number;
    readonly indexPlayer: number;
}

export interface AttackResponseData {
    readonly position: Position;
    readonly currentPlayer: number;
    status: AttackStatus;
}


export interface CurrentTurnResponse {
    readonly currentPlayer: number;
}