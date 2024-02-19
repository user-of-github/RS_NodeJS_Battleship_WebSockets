import {Ship, User} from './domain';


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
    idGame: string;
    idPlayer: number;
}

export interface AddShipsRequestData {
    gameId: string;
    ships: Ship[];
    indexPlayer: number;
}

export interface StartGameResponse {
    ships: Ship[];
    currentPlayerIndex: number;
}