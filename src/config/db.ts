import mongoose from 'mongoose';

export async function connectMongo(): Promise<typeof mongoose> {
  await mongoose.connect(process.env.MONGO_URI as string, {
    dbName: process.env.MONGO_DB_NAME,
  });
  console.log('MongoDB conectado');
  return mongoose;
}
