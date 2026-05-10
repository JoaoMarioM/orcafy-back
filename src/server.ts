
import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './middlewares/error';
import authRoutes from './routes/auth.routes';
import materialsRoutes from './routes/materials.routes';
import budgetsRoutes from './routes/budgets.routes';

const app = express();

app.use(cors());
app.use(express.json());

// 1. Rotas da Aplicação
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/materials', materialsRoutes);
app.use('/api/v1/budgets', budgetsRoutes);

// 2. Tratamento Global de Erros (Sempre por último)
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Orçafy API: Motor Escalável rodando na porta ${PORT}`);
});