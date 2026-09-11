import { createClient, RedisClientType } from 'redis';

export const redisClient: RedisClientType = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => console.error('Erro no Redis', err));

export async function connectRedis(): Promise<RedisClientType> {
  await redisClient.connect();
  console.log('Redis conectado');
  return redisClient;
}
