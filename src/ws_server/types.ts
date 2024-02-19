import WebSocket from 'ws';

export interface AuthData {
  readonly name: string;
  readonly password: string;
}

export interface WithUserIndex extends WebSocket.WebSocket {
  userIndex: number;
}

export interface WithId extends WebSocket.WebSocket {
  id: string;
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

export interface Game {
  readonly id: string;
  player1: number;
  player2: number;
}

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

