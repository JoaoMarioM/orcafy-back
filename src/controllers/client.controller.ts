// src/controllers/ClientController.ts
import { Request, Response } from 'express';
import { ClientService } from '../services/client.service';

const clientService = new ClientService();

export class ClientController {
  async create(req: Request, res: Response) {
    try {
      const { name, email, phone } = req.body;
      // @ts-ignore
      const userId = req.userId;

      const client = await clientService.create({ name, email, phone, userId });
      return res.status(201).json(client);
    } catch (error) {
      console.log(17, error);
      return res.status(400).json({ error: 'Erro ao criar cliente' });
    }
  }

  async index(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.userId;

      const clients = await clientService.findAll(userId);
      return res.json(clients);
    } catch (error) {
      return res.status(400).json({ error: 'Erro ao buscar clientes' });
    }
  }

  async show(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // @ts-ignore
      const userId = req.userId;

      const client = await clientService.findById(id as string, userId);
      return res.json(client);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }
}
