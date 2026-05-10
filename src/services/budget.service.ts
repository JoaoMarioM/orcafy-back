// src/services/budget.service.ts
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

const HARDWARE_PRICES = {
  edgePrice: 4.5,
  hingePrice: 8,
  slidePrice: 35,
  assemblyKit: 25,
};

export class BudgetService {
  private static async runEngine(
    userId: string,
    modules: any[],
    margin: number,
    extras: number,
  ) {
    const userMaterials = await prisma.material.findMany({ where: { userId } });
    if (userMaterials.length === 0) {
      throw new AppError(
        'Nenhum material cadastrado. Cadastre um MDF antes.',
        422,
      );
    }

    const materialMap = new Map(userMaterials.map((m) => [m.id, m]));

    // RASTREADOR: Vai guardar quantos m² de cada MDF foram usados no projeto todo
    const areaPerMaterial = new Map<string, number>();

    const computedModules = modules.map((mod: any) => {
      const mat = materialMap.get(mod.materialId);
      if (!mat) {
        throw new AppError(
          `Material ID ${mod.materialId} não encontrado.`,
          404,
        );
      }

      const mdfPrice = mat.pricePerM2;
      const doorMdfPrice = mod.doorMaterialId
        ? materialMap.get(mod.doorMaterialId)?.pricePerM2 || mdfPrice
        : mdfPrice;

      const w = mod.width / 1000;
      const h = mod.height / 1000;
      const d = mod.depth / 1000;

      let cost = 0;
      let mainAreaUsed = 0;
      let doorAreaUsed = 0;

      // 1. CÁLCULO DE ÁREA E CUSTO
      if (mod.isSlattedPanel) {
        mainAreaUsed = w * h * 2; // Fator 2x consolidado
        cost += mainAreaUsed * mdfPrice;
      } else {
        const shelvesCount = mod.shelves || 0;
        const partitionsCount = mod.partitions || 0;

        mainAreaUsed =
          2 * (h * d) +
          2 * (w * d) +
          w * h +
          shelvesCount * w * d +
          partitionsCount * h * d;

        // Gavetas
        if (mod.drawers > 0) {
          const verticalSpaces = partitionsCount + 1;
          const drawerWidth = w / verticalSpaces;
          const drawerMdfArea = drawerWidth * d * 1.5;

          mainAreaUsed += mod.drawers * drawerMdfArea;
          cost += mod.drawers * (HARDWARE_PRICES.slidePrice + 20); // Ferragem gaveta
        }

        // Portas
        if (mod.hasDoors) {
          doorAreaUsed = w * h;
          cost += HARDWARE_PRICES.hingePrice * 2 + doorAreaUsed * doorMdfPrice;
        }

        cost += mainAreaUsed * mdfPrice;

        // Fita e Montagem
        const edges = 2 * (w + h + d);
        cost += edges * HARDWARE_PRICES.edgePrice + HARDWARE_PRICES.assemblyKit;
      }

      // 2. REGISTRA A ÁREA USADA NO RASTREADOR GERAL
      areaPerMaterial.set(
        mod.materialId,
        (areaPerMaterial.get(mod.materialId) || 0) + mainAreaUsed,
      );
      if (mod.hasDoors) {
        const doorMatId = mod.doorMaterialId || mod.materialId;
        areaPerMaterial.set(
          doorMatId,
          (areaPerMaterial.get(doorMatId) || 0) + doorAreaUsed,
        );
      }

      return {
        ...mod,
        cost: Number(cost.toFixed(2)),
        materialSnapshotPrice: mdfPrice,
      };
    });

    let subtotal = computedModules.reduce(
      (acc: number, m: any) => acc + m.cost,
      0,
    );

    // 3. A MÁGICA DO PREJUÍZO ZERO (Corrigida contra bugs de ponto flutuante)
    let extraWasteCost = 0;

    areaPerMaterial.forEach((totalAreaUsed, matId) => {
      const mat = materialMap.get(matId);

      // Se o material exige cobrar a chapa inteira e tem a área da chapa cadastrada
      if (mat?.chargeFullSheet && mat?.sheetArea) {
        // Arredondamento seguro para evitar a "falsa segunda chapa"
        const safeTotalArea = Number(totalAreaUsed.toFixed(4));

        const sheetsNeeded = Math.ceil(safeTotalArea / mat.sheetArea);
        const paidArea = sheetsNeeded * mat.sheetArea;
        const wastedArea = paidArea - safeTotalArea;

        if (wastedArea > 0) {
          extraWasteCost += wastedArea * mat.pricePerM2; // Cobra o valor da sobra
        }
      }
    });

    // Soma o custo das sobras de chapa no subtotal ANTES da margem de lucro
    subtotal += extraWasteCost;

    const finalTotal = subtotal * (1 + margin / 100) + extras;

    return { computedModules, total: Number(finalTotal.toFixed(2)) };
  }

  static async create(userId: string, data: any) {
    const { client, margin, extras, modules } = data;

    const { computedModules, total } = await this.runEngine(
      userId,
      modules,
      margin,
      extras,
    );

    const newBudget = await prisma.budget.create({
      data: {
        client,
        total,
        margin,
        extras,
        userId,
        modules: computedModules,
      },
    });

    return newBudget;
  }

  static async list(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const currentMaterials = await prisma.material.findMany({
      where: { userId },
    });
    const currentPrices = new Map(
      currentMaterials.map((m) => [m.id, m.pricePerM2]),
    );

    return budgets.map((budget) => {
      const modules = budget.modules as any[];

      const isOutdated = modules.some((mod) => {
        const precoDeHoje = currentPrices.get(mod.materialId);
        return precoDeHoje && mod.materialSnapshotPrice !== precoDeHoje;
      });

      return { ...budget, isOutdated };
    });
  }

  static async findById(userId: string, budgetId: string) {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget || budget.userId !== userId) {
      throw new AppError('Orçamento não encontrado.', 404);
    }

    const currentMaterials = await prisma.material.findMany({
      where: { userId },
    });
    const currentPrices = new Map(
      currentMaterials.map((m) => [m.id, m.pricePerM2]),
    );

    const modules = budget.modules as any[];
    const isOutdated = modules.some((mod) => {
      const precoDeHoje = currentPrices.get(mod.materialId);
      return precoDeHoje && mod.materialSnapshotPrice !== precoDeHoje;
    });

    return { ...budget, isOutdated };
  }

  static async update(userId: string, budgetId: string, data: any) {
    await this.findById(userId, budgetId);

    const { client, margin, extras, modules } = data;

    const { computedModules, total } = await this.runEngine(
      userId,
      modules,
      margin,
      extras,
    );

    return prisma.budget.update({
      where: { id: budgetId },
      data: { client, total, margin, extras, modules: computedModules },
    });
  }

  static async recalculate(userId: string, budgetId: string) {
    const budget = await this.findById(userId, budgetId);

    const { computedModules, total } = await this.runEngine(
      userId,
      budget.modules as any[],
      budget.margin,
      budget.extras,
    );

    return prisma.budget.update({
      where: { id: budgetId },
      data: { total, modules: computedModules },
    });
  }

  static async updateStatus(userId: string, budgetId: string, status: string) {
    await this.findById(userId, budgetId);

    return prisma.budget.update({
      where: { id: budgetId },
      data: { status },
    });
  }

  static async delete(id: string) {
    const budgetExists = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budgetExists) {
      throw new Error('Orçamento não encontrado.');
    }

    await prisma.budget.delete({
      where: { id },
    });

    return { message: 'Orçamento excluído com sucesso.' };
  }
}
