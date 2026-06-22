const http = require("http");
const { Server } = require("socket.io");

const env = require("./config/env");
const { createApp } = require("./app");
const { handleSocketAuth } = require("./middlewares/auth");
const { registerChatHandlers } = require("./modules/chat/chat.socket");
const { scheduleCronJobs } = require('./jobs/cronJobs');

function createHttpServer() {
  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.corsOrigins,
      credentials: true
    }
  });

  app.set("io", io);
  io.use(handleSocketAuth);

  io.on("connection", (socket) => {
    registerChatHandlers(io, socket);
  });

  return { app, server, io };
}

function startServer() {
  const { server, io } = createHttpServer();

  scheduleCronJobs(io);

  server.listen(env.PORT, () => {
    if (env.NODE_ENV !== "test") {
      process.stdout.write(`SplitBill backend listening on port ${env.PORT}\n`);
    }
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createHttpServer,
  startServer
};
