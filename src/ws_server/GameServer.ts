import WebSocket from 'ws';
import {
  AddToRoomData,
  AuthData,
  CreateGameResponseData,
  Game,
  Message,
  RegResponseData,
  Room,
  User,
  WithId,
  WithUserIndex
} from './types';
import { uuidv4 } from './utils';


export class GameServer {
  private usersIdCounter: number = 0;
  private roomsIdCounter: number = 0;

  private readonly users: User[] = [];
  private readonly rooms: Room[] = [];
  private readonly games: Game[] = [];
  private webSocketServer!: WebSocket.Server;
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

      (client as WithId).id = id;

      client.on('connection', () => {
        console.log(`New client connected. Gave him ID: ${id}`);
      });

      client.on('message', (message): void => {
        this.processClientMessage(client, message);
      });
    });
  }

  private processClientMessage(client: WebSocket.WebSocket, message: WebSocket.RawData): void {
    try {
      const messageRawParsed: Message = JSON.parse(message.toString());
      console.log(messageRawParsed);

      switch (messageRawParsed.type) {
        case 'reg': {
          const data: AuthData = JSON.parse(messageRawParsed.data);
          this.processReg(data, client);
          this.sendFreeRooms();
          this.updateWinners();
          break;
        }
        case 'create_room': {
          this.createRoom(client as WithUserIndex);
          this.sendFreeRooms();
          break;
        }
        case 'add_user_to_room': {
          const data: AddToRoomData = JSON.parse(messageRawParsed.data);
          console.log(data)
          const roomIndex = this.addToRoom(client as WithUserIndex, data);
          this.sendFreeRooms();
          this.createGame(roomIndex);

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

    let tryFind = this.users.find(u => GameServer.getUserPk(u.name, u.password) === userPk);

    if (!this.users.find(u => GameServer.getUserPk(u.name, u.password) === userPk)) {
      const newUser: User = {
        ...messageData,
        index: this.usersIdCounter++,
        wins: 0
      };

      this.users.push(newUser);
      tryFind = newUser;
    }

    const user = tryFind as User;

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

    (client as WithUserIndex).userIndex = user.index;
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

  private createRoom(client: WithUserIndex): void {
    const currentUser = this.users.find(u => u.index === client.userIndex);

    if (!currentUser) {
      return;
    }

    const newRoom: Room = {
      roomUsers: [{name: currentUser.name, index: currentUser.index}],
      roomId: this.roomsIdCounter++
    };

    this.rooms.push(newRoom);
  }

  private addToRoom(client: WithUserIndex, data: AddToRoomData): number {
     const { indexRoom } = data;

    const index = this.rooms.findIndex(r => r.roomId === indexRoom);

    if (index < 0) {
      throw Error('addToRoom: index not found');
    }

    const { userIndex } = client;

    if (!userIndex) {
      throw Error('NOT FOUND');
    }

    const currentUser = this.users.find(u => u.index === client.userIndex);

    if (!currentUser) {
      throw Error('NOT FOUND');
    }

    this.rooms[index].roomUsers.push({
      name: currentUser.name,
      index: currentUser.index
    });

    return index;
  }

  private sendFreeRooms(): void {
    const free = this.rooms.filter(r => r.roomUsers.length === 1);
    const stringified = JSON.stringify(free);
    const response: Message = {
      type: 'update_room', data: stringified, id: 0
    };
    const stringifiedResponse = JSON.stringify(response);

    this.webSocketServer.clients.forEach(client => client.send(stringifiedResponse))
  }

  private createGame(roomIndex: number) {
    console.log(`creating game ${roomIndex}`)
    const id = uuidv4();
    const player1 = this.rooms[roomIndex].roomUsers[0].index;
    const player2 = this.rooms[roomIndex].roomUsers[1].index;

    this.games.push({id, player1, player2});

    const data: CreateGameResponseData = {
      idGame: id,
      idPlayer: player2
    };

    const message: Message = {
      type: 'create_game', id: 0, data: JSON.stringify(data)
    };

    const json = JSON.stringify(message);

    const player1Client = this.findClient(player1);
    const player2Client = this.findClient(player2);

    if (player1Client) {
      player1Client.send(json);
    } else {
      console.error('Didnt find player1Client');
    }

    if (player2Client) {
      player2Client.send(json);
    } else {
      console.error('Didnt find player1Client');
    }
  }

  private findClient(index: number): WebSocket.WebSocket | undefined {
    return [...this.webSocketServer.clients.values()].find(ws => (ws as WithUserIndex).userIndex === index);
  }

}
