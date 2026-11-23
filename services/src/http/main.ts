// Entry point: `npm run dev` (watch) or `npm start` (built).
import { FileSnapshotStore } from '../adapters/file-snapshot-store.ts';
import { loadConfig } from '../config.ts';
import { CardRepository } from '../domain/card-repository.ts';
import { createApiServer, DEV_ORIGINS } from './server.ts';

const config = loadConfig();
const store = new FileSnapshotStore(config.dataDir);
const server = createApiServer({
  repository: new CardRepository(store),
  corsOrigins: config.nodeEnv === 'development' ? DEV_ORIGINS : [],
  log: (line) => console.log(line),
});
server.listen(config.port, () => {
  console.log(`services API on http://localhost:${config.port}/api (data: ${config.dataDir}, env: ${config.nodeEnv})`);
});
