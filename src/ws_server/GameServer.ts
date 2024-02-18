import WebSocket from 'ws';
import { AuthData, Message, MessageType, RegResponse, User } from './types';


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

    this.webSocketServer = new WebSocket.Server({
        port: this.port
      },
      () => {
        console.log(`WebSockets server has just been started on port ${this.port}`);
      }
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
      const messageRawParsed: Message = JSON.parse(message.toString());

      switch (messageRawParsed.type) {
        case 'reg': {
          const data: AuthData = JSON.parse(messageRawParsed.data);
          this.processReg(data, client)
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
        index: this.users.size
      };

      this.users.set(userPk, newUser);
    }

    const user = this.users.get(userPk);

    const responseData: RegResponse = {
      name: user.name,
      index: user.index,
      error: false,
      errorText: ''
    };

    const response: Message = {
      type: 'reg',
      data: JSON.stringify(responseData),
      id: 0
    };

    client.send(JSON.stringify(response));
  }
}
