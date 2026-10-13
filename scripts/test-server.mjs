// A single-process production server for browser tests, avoiding orphan CLI workers on Windows.
import next from 'next';
import { createServer } from 'node:http';
const app = next({ dev: false, hostname: 'localhost', port: 3000 });
await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((request, response) => handler(request, response));
server.listen(3000, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
    setTimeout(() => process.exit(0), 1000).unref();
  });
