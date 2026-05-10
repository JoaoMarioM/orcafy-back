import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export class MaterialService {
  static async create(userId: string, data: any) {
    const {
      name,
      sheetWidth,
      sheetLength,
      sheetPrice,
      chargeFullSheet,
      thickness,
    } = data;

    let sheetArea = null;
    let pricePerM2 = 0;

    if (sheetWidth && sheetLength && sheetPrice) {
      sheetArea = (sheetWidth / 1000) * (sheetLength / 1000);
      pricePerM2 = sheetPrice / sheetArea;
    } else {
      pricePerM2 = data.pricePerM2;
    }

    const material = await prisma.material.create({
      data: {
        name,
        thickness,
        pricePerM2: Number(pricePerM2.toFixed(2)),
        sheetArea: sheetArea ? Number(sheetArea.toFixed(4)) : null,
        sheetWidth,
        sheetLength,
        sheetPrice,
        chargeFullSheet: chargeFullSheet || false,
        userId,
      },
    });

    return material;
  }

  static async listAll(userId: string) {
    return prisma.material.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }
}
