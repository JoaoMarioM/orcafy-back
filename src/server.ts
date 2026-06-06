
import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './middlewares/error';
import authRoutes from './routes/auth.routes';
import materialsRoutes from './routes/materials.routes';
import budgetsRoutes from './routes/budgets.routes';
import { clientRoutes } from './routes/client.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/budgets', budgetsRoutes);
app.use('/api/v1/materials', materialsRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Orçafy API: Motor Escalável rodando na porta ${PORT}`);
});