import WebSocket from 'ws';
import { AuthData, Message, MessageType, RegResponseData, User } from './types';
import { uuidv4 } from './utils';


export class GameServer {
  private readonly users: Map<string, User> = new Map<string, User>();
  private readonly connections: Map<string, WebSocket.WebSocket> = new Map<string, WebSocket.WebSocket>();
  private webSocketServer: WebSocket.Server;
  private isStarted: boolean = false;

  public constructor(private readonly port: number) {
  }

  public runServer(): void {
    if (this.isStarted) {
      console.warn(`Server already running on port ${this.port}`);
      return;
    }

    this.webSocketServer = new WebSocket.Server({
        port: this.port
      },
      () => {
        console.log(`WebSockets server has just been started on port ${this.port}`);
      }
    );

    this.isStarted = true;

    this.webSocketServer.on('connection', (client: WebSocket.WebSocket): void => {
      const id = uuidv4();
      this.connections.set(id, client);

      client.on('connection', () => {
        console.log(`New client connected. Gave him ID: ${id}`);
      });

      client.on('message', (message): void => {
        this.processClientMessage(client, message);
      });

      client.on('close', () => {
        this.connections.delete(id);
      });
    });
  }

  private processClientMessage(client: WebSocket.WebSocket, message: WebSocket.RawData): void {
    try {
      const messageRawParsed: Message = JSON.parse(message.toString());

      switch (messageRawParsed.type) {
        case 'reg': {
          const data: AuthData = JSON.parse(messageRawParsed.data);
          this.processReg(data, client);
          this.updateWinners();
          break;
        }
      }
    } catch {

    }
  }

  private static getUserPk(name: string, password: string): string {
    return name + password;
  }
  private processReg(messageData: AuthData, client: WebSocket.WebSocket): void {
    const userPk = GameServer.getUserPk(messageData.name, messageData.password);

    if (!this.users.has(userPk)) {
      const newUser: User = {
        ...messageData,
        index: this.users.size,
        wins: 0
      };

      this.users.set(userPk, newUser);
    }

    const user = this.users.get(userPk);

    const responseRegData: RegResponseData = {
      name: user.name,
      index: user.index,
      error: false,
      errorText: ''
    };

    const responseReg: Message = {
      type: 'reg',
      data: JSON.stringify(responseRegData),
      id: 0
    };

    client.send(JSON.stringify(responseReg));
  }

  private updateWinners(): void {
    if (!this.webSocketServer) {
      return;
    }

    const responseUpdateData = [...this.users.values()].map(({name, wins}) => ({
      name, wins
    }));

    const responseUpdate: Message = {
      type: 'update_winners',
      data: JSON.stringify(responseUpdateData),
      id: 0
    };

    const stringified = JSON.stringify(responseUpdate);

    this.webSocketServer.clients.forEach(client => {
      client.send(stringified);
    });
  }
}
