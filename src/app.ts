import express from 'express';
import statusRoutes from './routes/status.routes';
import cepRoutes from './routes/cep.routes';

const app = express();

app.use(express.json());

app.use('/health', statusRoutes);
app.use('/cep', cepRoutes)

export default app;
