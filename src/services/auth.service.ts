import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export class AuthService {
  
  static async register(data: any) {
    const { email, password, name } = data;

    // 1. Verifica se já existe
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      throw new AppError('E-mail já cadastrado no sistema.', 400);
    }

    // 2. Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Cria usuário e configurações na mesma transação
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        settings: {
          create: { defaultMargin: 30, defaultExtras: 0 }
        }
      }
    });

    // 4. Gera o Token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    return { 
      user: { id: user.id, name: user.name, email: user.email }, 
      token 
    };
  }

  static async login(data: any) {
    const { email, password } = data;

    // 1. Busca o usuário
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('E-mail ou senha incorretos.', 401);
    }

    // 2. Verifica a senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('E-mail ou senha incorretos.', 401);
    }

    // 3. Gera o Token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    return { 
      user: { id: user.id, name: user.name, email: user.email }, 
      token 
    };
  }
}