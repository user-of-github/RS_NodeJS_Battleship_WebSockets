import WebSocket from 'ws';
import { User } from './types';


export class GameServer {
  private readonly users: Map<string, User> = new Map<string, User>();
  private readonly connections: Map<any, any> = new Map<any, any>();
  private webSocketServer: WebSocket.Server;
  private isStarted: boolean = false;

  public constructor(private readonly port: number) {
  }

  public runServer(): void {
    if (this.isStarted) {
      console.warn(`Server already running on port ${this.port}`);
      return;
    }

    this.webSocketServer = new WebSocket.Server(
      {port: this.port},
      () => console.log(`WebSockets server has just been started on port ${this.port}`)
    );

    this.isStarted = true;

    this.webSocketServer.on('connection', (client: WebSocket.WebSocket): void => {
      client.on('message', (message): void => {
        this.processClientMessage(client, message);
      });
    });
  }

  private processClientMessage(client: WebSocket.WebSocket, message: WebSocket.RawData): void {
    try {
      const messageRawParsed = JSON.parse(message.toString());
    } catch {

    }
  }
}
