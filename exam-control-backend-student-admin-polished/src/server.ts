import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: env.clientUrl, credentials: true } });

  io.on("connection", socket => {
    socket.on("join_exam_room", (examId: string) => socket.join(`exam:${examId}`));
    socket.on("leave_exam_room", (examId: string) => socket.leave(`exam:${examId}`));
  });

  app.set("io", io);
  server.listen(env.port, () => console.log(`Backend running on http://localhost:${env.port}`));
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
