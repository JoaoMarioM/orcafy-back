import { Router } from 'express';
import { ClientController } from '../controllers/client.controller';
import { authMiddleware } from '../middlewares/auth';

const clientRoutes = Router();
const clientController = new ClientController();

clientRoutes.use(authMiddleware);

clientRoutes.post('/', clientController.create);
clientRoutes.get('/', clientController.index);
clientRoutes.get('/:id', clientController.show);

export { clientRoutes };