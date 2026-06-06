// src/controllers/budget.controller.ts
import { Request, Response } from 'express';
import { BudgetService } from '../services/budget.service';

export class BudgetController {
  static async create(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.userId;
      
      if (!req.body.clientId) {
        return res.status(400).json({ error: 'O ID do cliente (clientId) é obrigatório.' });
      }

      const budget = await BudgetService.create(userId, req.body);

      return res.status(201).json(budget);
    } catch (error) {
      console.error('Erro no controller de orçamentos:', error);
      return res
        .status(500)
        .json({ error: 'Erro interno ao gerar o orçamento.' });
    }
  }

  static async update(req: Request, res: Response) {
    // @ts-ignore
    const userId = req.userId;
    const { id } = req.params;
    const budget = await BudgetService.update(userId, id as string, req.body);
    return res.json(budget);
  }

  static async updateStatus(req: Request, res: Response) {
    // @ts-ignore
    const userId = req.userId;
    const { id } = req.params;
    const { status } = req.body;

    const budget = await BudgetService.updateStatus(
      userId,
      id as string,
      status,
    );
    return res.json({ message: `Orçamento atualizado para ${status}`, budget });
  }

  static async recalculate(req: Request, res: Response) {
    // @ts-ignore
    const userId = req.userId;
    const { id } = req.params;
    const budget = await BudgetService.recalculate(userId, id as string);
    return res.json({
      message: 'Orçamento atualizado com os preços de hoje!',
      budget,
    });
  }

  static async list(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.userId;

      const budgets = await BudgetService.list(userId);

      return res.status(200).json(budgets);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar orçamentos.' });
    }
  }

  static async show(req: Request, res: Response) {
    // @ts-ignore
    const userId = req.userId;
    const { id } = req.params;

    const budget = await BudgetService.findById(userId, id as string);
    return res.json(budget);
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await BudgetService.delete(id as string);

      return res
        .status(200)
        .json({ message: 'Orçamento excluído com sucesso.' });
    } catch (error: any) {
      if (error.message === 'Orçamento não encontrado.') {
        return res.status(404).json({ error: error.message });
      }

      console.error('Erro ao deletar orçamento:', error);
      return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  }
}