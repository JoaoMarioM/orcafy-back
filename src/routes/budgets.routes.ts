// src/routes/budgets.routes.ts
import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { budgetSchema, updateStatusSchema } from '../schemas/app.schema';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(budgetSchema), BudgetController.create);
router.get('/', BudgetController.list);
router.get('/:id', BudgetController.show);
router.put('/:id', validate(budgetSchema), BudgetController.update);
router.patch('/:id/recalculate', BudgetController.recalculate);
router.delete('/:id', BudgetController.delete);
router.patch(
  '/:id/status',
  validate(updateStatusSchema),
  BudgetController.updateStatus,
);

export default router;
