// src/middlewares/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

// Agora usamos ZodSchema, que é o tipo universal suportado pela versão mais recente
export const validate = (schema: ZodSchema) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Tenta validar o Body, Query Params e URL Params
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Se passou na validação, libera a catraca para o Controller
      return next();
    } catch (error) {
      // Usamos error.issues ao invés de error.errors na versão nova do Zod
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos ou faltando.',
          details: error.issues.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message
          }))
        });
      }
      return res.status(400).json({ error: 'Erro de validação na requisição.' });
    }
};