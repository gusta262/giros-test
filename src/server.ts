import 'dotenv/config';
import app from './app';
import { connectMongo } from './config/db';
import { connectRedis } from './config/redis';

const PORT = process.env.PORT || 3000;

async function start() {
  await connectMongo();
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Erro ao iniciar o servidor', err);
  process.exit(1);
});
