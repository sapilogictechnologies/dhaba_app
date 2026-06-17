import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { initSocket } from './sockets/socket.js';

const server = http.createServer(app);
initSocket(server);

const start = async () => {
  await connectDB();
  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
};

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
