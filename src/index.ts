import { httpServer } from './http_server';
import { GameServer } from './ws_server/GameServer';
import { HTTP_PORT } from './http_server/constants';
import { WS_PORT } from './ws_server/constants';


const main = (): void => {
  const gameWebSocketServer = new GameServer(WS_PORT);
  gameWebSocketServer.runServer();

  httpServer.listen(HTTP_PORT, (): void => {
    console.log(`Start static http server on the ${HTTP_PORT} port!`);
  });
};

main();
