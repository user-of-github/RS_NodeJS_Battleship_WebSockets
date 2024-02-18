import { httpServer } from './http_server';
import { GameServer } from './ws_server/GameServer';
import { HTTP_PORT } from './http_server/constants';
import { WS_PORT } from './ws_server/constants';


const main = (): void => {
  const gameWebSocketServer = new GameServer(WS_PORT);
  gameWebSocketServer.runServer();

  httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP server has just been started on port ${HTTP_PORT}`);
  });
};

main();
