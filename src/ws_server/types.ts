export interface AuthData {
  readonly name: string;
  readonly password: string;
}

export interface User extends AuthData {
  readonly index: number;
  wins: number;
}

export type MessageType = 'reg' | 'create_game' | 'start_game' | 'turn' | 'attack' | 'finish' | 'update_room' | 'update_winners';

export interface Message {
  readonly type: MessageType;
  readonly data: string;
  readonly id: 0;
}

export interface RegResponseData extends Omit<User, 'password' | 'wins'> {
  readonly error: boolean;
  readonly errorText: string;
}
