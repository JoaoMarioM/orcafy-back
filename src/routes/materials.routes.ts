import { Router } from 'express';
import { MaterialController } from '../controllers/material.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { materialSchema } from '../schemas/app.schema';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(materialSchema), MaterialController.create);
router.get('/', MaterialController.list);

export default router;