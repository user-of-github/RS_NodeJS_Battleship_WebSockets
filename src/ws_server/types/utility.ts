import WebSocket from 'ws';

export interface WithUserIndex extends WebSocket.WebSocket {
  userIndex: number;
}

export interface WithId extends WebSocket.WebSocket {
  id: string;
}





