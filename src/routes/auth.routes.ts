import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();

// Endpoint de Cadastro
router.post('/register', validate(registerSchema), AuthController.register);

// Endpoint de Login
router.post('/login', validate(loginSchema), AuthController.login);

export default router;