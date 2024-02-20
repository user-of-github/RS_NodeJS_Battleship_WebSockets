import WebSocket from 'ws';
import {WithId, WithUserIndex } from './types/utility';
import { uuidv4 } from './utils';
import {
  AddToRoomData,
  AttackResult,
  AttackStatus,
  AuthData,
  Game,
  PlayerInGame, Position,
  Room,
  Ship,
  User
} from './types/domain';
import {
  AddShipsRequestData, AttackRequestData, AttackResponseData,
  CreateGameResponseData, CurrentTurnResponse,
  Message,
  RegResponseData,
  StartGameResponse
} from './types/Messages';
import {BOARD_SIZE} from './constants';


export class GameServer {
  private usersIdCounter: number = 0;
  private roomsIdCounter: number = 0;
  private gamesIdCounter: number = 0;

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

    this.rooms.length = 0;
    this.users.length = 0;
    this.games.length = 0;

    this.webSocketServer.on('connection', (client: WebSocket.WebSocket): void => {
      const id = uuidv4();

      (client as WithId).id = id;

      client.on('connection', () => {
        console.log(`New client connected. Gave him ID: ${id}`);
      });

      client.on('message', (message): void => {
        this.processClientMessage(client, message);
      });

      client.on('close', () => {
        this.removeUserAndItsData(client);
      });
    });

    this.webSocketServer.on('close', () => {
      console.log('WS Server closed');
      this.clearServer();
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
          const roomIndex = this.addToRoom(client as WithUserIndex, data);
          this.sendFreeRooms();
          this.createGame(roomIndex);

          break;
        }
        case 'add_ships': {
          const data: AddShipsRequestData = JSON.parse(messageRawParsed.data);
          const gameIndex = this.addShips(data);
          if (this.games[gameIndex].players.every(p => p.ships.length !== 0)) {
            console.log('STARTING GAME');
            this.startGame(gameIndex);
            this.switchTurn(gameIndex);
          }
          break;
        }
        case 'attack': {
          const data: AttackRequestData = JSON.parse(messageRawParsed.data);
          const attackResult = this.attack(data);
          if (attackResult) {
            if (attackResult.status === 'killed' && attackResult.damagedShip) {
              this.setMissStateAfterShipKill(attackResult.gameIndex, attackResult.damagedShip);
              break;
            }
            if (attackResult.status === 'miss') {
              this.switchTurn(attackResult.gameIndex);
            }
          }

          break;
        }
      }
    } catch (error) {
      console.error(error);
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

    if (userIndex === undefined) {
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

    this.webSocketServer.clients.forEach(client => client.send(stringifiedResponse));
  }

  private createGame(roomIndex: number) {
    const id = this.gamesIdCounter++;
    const player1 = this.rooms[roomIndex].roomUsers[0].index;
    const player2 = this.rooms[roomIndex].roomUsers[1].index;

    console.log(`creating game ${roomIndex}; With players: ${player1} (creator) and ${player2} (added himself (herself))`);

    this.games.push({
      id,
      players: [{
        index: player1,
        ships: [],
        attacks: []
      }, {
        index: player2,
        ships: [],
        attacks: []
      }],
      turn: player1
    });

    [player1, player2].forEach(player => {
      const client = this.findClient(player);
      if (!client) {
        throw Error('createGame: client not found');
      }

      const data: CreateGameResponseData = {idGame: id, idPlayer: player };
      const message: Message = {type: 'create_game', id: 0, data: JSON.stringify(data)};
      client.send(JSON.stringify(message));
    });
  }

  private findClient(index: number): WebSocket.WebSocket | undefined {
    return [...this.webSocketServer.clients.values()].find(ws => (ws as WithUserIndex).userIndex === index);
  }

  private addShips(data: AddShipsRequestData): number {
    const gameIndex = this.games.findIndex(game => game.id === data.gameId);

    if (gameIndex < 0) {
      throw Error(`Game with id ${data.gameId} not found`);
    }

    const playerIndex = this.games[gameIndex].players.findIndex(p => p.index === data.indexPlayer);

    if (playerIndex < 0) {
      throw Error(`addShips: Player with id ${data.indexPlayer} not found`);
    }

    this.games[gameIndex].players[playerIndex].ships.push(...data.ships.map(ship => ({
      ...ship,
      aliveCells: new Array(ship.length).fill(true)
    })));

    return gameIndex;
  }

  private startGame(gameIndex: number): void {
    this.games[gameIndex].players.forEach(player => {
      const client = this.findClient(player.index);
      if (!client) {
        throw Error('startGame: WS Client not found');
      }

      const data: StartGameResponse = {
        currentPlayerIndex: player.index,
        ships: player.ships
      };

      const message: Message = {
        id: 0,
        type: 'start_game',
        data: JSON.stringify(data)
      };

      client.send(JSON.stringify(message));
    });
  }

  private attack(data: AttackRequestData): null | AttackResult {
    const gameIndex = this.gameIndexById(data.gameId);

    if (gameIndex < 0) {
      throw Error('attack: game not found');
    }

    if (data.indexPlayer !== this.games[gameIndex].turn) {
      return null;
    }

    const game = this.games[gameIndex];

    const enemyIndex: 0 | 1 = game.players[0].index === data.indexPlayer ? 1 : 0;
    const selfIndex: 0 | 1 = game.players[0].index === data.indexPlayer ? 0 : 1;

    if (game.players[selfIndex].attacks.find(a => a.y === data.y && a.x === data.x)) {
      return null;
    }

    const attackStatus = this.detectAttackStatus(game.players[enemyIndex], data.x, data.y);

    game.players.forEach(player => {
      const client = this.findClient(player.index);

      if (!client) {
        throw Error('createGame: client not found');
      }

      const attackResponseData: AttackResponseData = {
        position: {x: data.x, y: data.y},
        status: attackStatus.status,
        currentPlayer: data.indexPlayer
      }; // TODO ? for every player its or just attackers id for both ?

      const message: Message = {type: 'attack', id: 0, data: JSON.stringify(attackResponseData)};
      client.send(JSON.stringify(message));
    });

    this.games[gameIndex].players[selfIndex].attacks.push({
      x: data.x,
      y: data.y
    });

    return { gameIndex: gameIndex, status: attackStatus.status, damagedShip: attackStatus.damagedShip};
  }

  private detectAttackStatus(playerInGame: PlayerInGame, attackX: number, attackY: number): Omit<AttackResult, 'gameIndex'> {
    for (const ship of playerInGame.ships) {
      if (!(ship.position.x === attackX || ship.position.y === attackY)) {
        continue;
      }

      if (ship.direction && ship.position.x === attackX) { // vertical
        for (let y = ship.position.y; y < ship.position.y + ship.length; ++y) {
          if (y === attackY) {
            ship.aliveCells[y - ship.position.y] = false;

            if (ship.aliveCells.every(cell => !cell)) {
              return {status: 'killed', damagedShip: ship};
            } else {
              return {status: 'shot', damagedShip: ship};
            }
          }
        }
      } else if (!ship.direction && ship.position.y === attackY) {
        for (let x = ship.position.x; x < ship.position.x + ship.length; ++x) {
          if (x === attackX) {
            ship.aliveCells[x - ship.position.x] = false;

            if (ship.aliveCells.every(cell => !cell)) {
              return { status: 'killed', damagedShip: ship};
            } else {
              return { status: 'shot', damagedShip: ship};
            }
          }
        }
      }
    }

    return { status: 'miss'};
  }

  private setMissStateAfterShipKill(gameIndex: number, damagedShip: Ship): void {
    const game = this.games[gameIndex];
    const currentTurn = game.turn;
    const enemyIndex: 0 | 1 = game.players[0].index === currentTurn ? 1 : 0;
    const enemy = game.players[enemyIndex].index;

    game.players.forEach(player => {
      const client = this.findClient(player.index);

      if (!client) {
        throw Error('createGame: client not found');
      }

      const positions = this.generateMissesAroundKilledShip(game, damagedShip);

      positions.forEach(position => {
        const attackResponseData: AttackResponseData = {
          position: {x: position.x, y: position.y},
          status: 'miss',
          currentPlayer: enemy
        };

        const message: Message = { type: 'attack', id: 0, data: JSON.stringify(attackResponseData)};

        client.send(JSON.stringify(message));
      });
    });
  }

  private generateMissesAroundKilledShip(game: Game, ship: Ship): Position[] {
    const positions: Position[] = [];
    const isValidPosition = (position: Position) => {
      return position.x >= 0 && position.x < BOARD_SIZE && position.y >= 0 && position.y < BOARD_SIZE;
    };

    if (ship.direction) { // vertical
      let shipY = ship.position.y;
      let shipX = ship.position.x;
      // row before ship
      for (let x = shipX - 1; x <= shipX + 1; ++x) {
        if (isValidPosition({x, y: shipY - 1})) {
          positions.push({x, y: shipY - 1});
        }
      }
      // while ship
      for (let y = shipY; y < shipY + ship.length; ++y) {
        if (isValidPosition({y, x: shipX - 1})) {
          positions.push({y, x: shipX - 1});
        }

        if (isValidPosition({y, x: shipX + 1})) {
          positions.push({y, x: shipX + 1});
        }
      }
      //row after ship
      for (let x = shipX - 1; x <= shipX + 1; ++x) {
        if (isValidPosition({x, y: shipY + ship.length})) {
          positions.push({x, y: shipY + ship.length});
        }
      }
    } else if (!ship.direction) { // horizontal
      let shipY = ship.position.y;
      let shipX = ship.position.x;
      // col before ship
      for (let y = shipY - 1; y <= shipY + 1; ++y) {
        if (isValidPosition({y, x: shipX - 1})) {
          positions.push({y, x: shipX - 1});
        }
      }
      // while ship
      for (let x = shipX; x < shipX + ship.length; ++x) {
        if (isValidPosition({x, y: shipY - 1})) {
          positions.push({x, y: shipY - 1});
        }

        if (isValidPosition({x, y: shipY + 1})) {
          positions.push({x, y: shipY + 1});
        }
      }
      //col after ship
      for (let y = shipY - 1; y <= shipY + 1; ++y) {
        if (isValidPosition({y, x: shipX + ship.length})) {
          positions.push({y, x: shipX + ship.length});
        }
      }
    }

    return positions;
  }

  private gameIndexById(id: number) {
    return this.games.findIndex(game => game.id === id);
  }

  private switchTurn(gameIndex: number): void {
    if (gameIndex < 0) {
      return;
    }
    const game = this.games[gameIndex];

    const currentTurn = game.turn;
    // Sorry for such if :)
    if (currentTurn === game.players[0].index) {
      game.turn = game.players[1].index;
    } else if (currentTurn === game.players[1].index) {
      game.turn = game.players[0].index;
    }

    const newTurn = this.games[gameIndex].turn;

    game.players.forEach(player => {
      const client = this.findClient(player.index);

      if (!client) {
        throw Error('createGame: client not found');
      }

      const turnResponseData: CurrentTurnResponse = {currentPlayer: newTurn};
      const message: Message = {type: 'turn', id: 0, data: JSON.stringify(turnResponseData)};
      client.send(JSON.stringify(message));
    });
  }

  private removeUserAndItsData(client: WebSocket.WebSocket): void {
    const userIndex = (client as WithUserIndex).userIndex;

    let index: number;

    do {
      index = this.rooms.findIndex(room => room.roomUsers.find(user => user.index === userIndex));
      if (index >= 0) {
        this.rooms.splice(index, 1);
      }
    } while (index >= 0);

    do {
      index = this.games.findIndex(game => game.players.find(user => user.index === userIndex));
      if (index >= 0) {
        this.games.splice(index, 1);
      }
    } while (index >= 0);

    do {
      index = this.users.findIndex(user => user.index === userIndex);
      if (index >= 0) {
        this.users.splice(index, 1);
      }
    } while (index >= 0);

    this.updateWinners();
    this.sendFreeRooms();
  }

  private clearServer(): void {
    this.rooms.length = 0;
    this.users.length = 0;
    this.games.length = 0;
    this.isStarted = false;
  }
}
