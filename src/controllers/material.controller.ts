import { Request, Response } from 'express';
import { MaterialService } from '../services/material.service';

export class MaterialController {
  static async create(req: Request, res: Response) {
    // @ts-ignore
    const userId = req.userId;
    const material = await MaterialService.create(userId, req.body);
    res.status(201).json(material);
  }

  static async list(req: Request, res: Response) {
    // @ts-ignore
    const userId = req.userId;
    const materials = await MaterialService.listAll(userId);
    res.json(materials);
  }
}