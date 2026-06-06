import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

const HARDWARE_PRICES = {
  edgePrice: 4.5,
  hingePrice: 8,
  slidePrice: 35,
  assemblyKit: 25,
};

const ACCESSORY_PRICES: Record<string, number> = {
  LED_STRIP: 45.0,
  SLIDING_SYSTEM: 180.0,
  MIRROR_DOOR: 450.0,
  CLOTHES_RAIL: 35.0,
  PANTS_RACK: 120.0,
  TRASH_CAN: 180.0,
  PAPER_HOLDER: 65.0,
  GLASS_TOP: 250.0,
  FURNITURE_LEGS: 45.0,
  UPHOLSTERY: 300.0,
  GAS_PISTON: 30.0,
  INVISIBLE_BRACKET: 15.0,
  POWER_BOX: 85.0,
  ALUMINUM_PROFILE: 65.0,
  MACHINED_HANDLE: 25.0,
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

      const w = (mod.width || 0) / 1000;
      const h = mod.height / 1000;
      const d = mod.depth / 1000;

      let cost = 0;
      let mainAreaUsed = 0;
      let doorAreaUsed = 0;

      if (mod.isGermanCorner) {
        const wA = (mod.widthA || 0) / 1000;
        const wB = (mod.widthB || 0) / 1000;

        if (wA === 0 || wB === 0) {
          throw new AppError(
            'O Canto Alemão exige as medidas das duas paredes (widthA e widthB).',
            400,
          );
        }

        const effectiveWb = Math.max(0, wB - d);
        const areaA = wA * h * 2 + wA * d * 3;
        const areaB = effectiveWb * h * 2 + effectiveWb * d * 3;
        const areaSides = 2 * (h * d);

        mainAreaUsed = areaA + areaB + areaSides;
        mainAreaUsed = mainAreaUsed * 1.2;
        cost += mainAreaUsed * mdfPrice;

        const GAS_PISTON_PRICE = 30;
        cost += 4 * GAS_PISTON_PRICE;
        cost += 6 * HARDWARE_PRICES.hingePrice;

        const edges = (wA + wB + h * 2) * 2;
        cost +=
          edges * HARDWARE_PRICES.edgePrice + HARDWARE_PRICES.assemblyKit * 2;
      } else if (mod.isSlattedPanel) {
        mainAreaUsed = w * h * 2;
        cost += mainAreaUsed * mdfPrice;
      } else {
        const shelvesCount = mod.shelves || 0;
        const partitionsCount = mod.partitions || 0;

        const backPanelArea = mod.hasBackPanel !== false ? w * h : 0;

        mainAreaUsed =
          2 * (h * d) +
          2 * (w * d) +
          backPanelArea +
          shelvesCount * w * d +
          partitionsCount * h * d;

        if (mod.drawers > 0) {
          const verticalSpaces = partitionsCount + 1;
          const drawerWidth = w / verticalSpaces;
          const drawerMdfArea = drawerWidth * d * 1.5;

          mainAreaUsed += mod.drawers * drawerMdfArea;
          cost += mod.drawers * (HARDWARE_PRICES.slidePrice + 20);
        }

        if (mod.hasDoors) {
          doorAreaUsed = w * h;

          const currentDoorType = mod.doorType || 'HINGED';

          if (currentDoorType === 'SLIDING') {
            const isAlreadyInAccessories =
              mod.accessories &&
              mod.accessories.some((a: any) => a.id === 'SLIDING_SYSTEM');
            const slidingCost = isAlreadyInAccessories
              ? 0
              : ACCESSORY_PRICES['SLIDING_SYSTEM'];

            cost += slidingCost + doorAreaUsed * doorMdfPrice;
          } else {
            cost +=
              HARDWARE_PRICES.hingePrice * 2 + doorAreaUsed * doorMdfPrice;
          }
        }

        cost += mainAreaUsed * mdfPrice;

        const edges = 2 * (w + h + d);
        cost += edges * HARDWARE_PRICES.edgePrice + HARDWARE_PRICES.assemblyKit;
      }

      if (mod.accessories && mod.accessories.length > 0) {
        mod.accessories.forEach((acc: any) => {
          const accPrice = ACCESSORY_PRICES[acc.id] || 0;
          cost += accPrice * acc.quantity;
        });
      }

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

    let extraWasteCost = 0;

    areaPerMaterial.forEach((totalAreaUsed, matId) => {
      const mat = materialMap.get(matId);

      if (mat?.chargeFullSheet && mat?.sheetArea) {
        const safeTotalArea = Number(totalAreaUsed.toFixed(4));
        const sheetsNeeded = Math.ceil(safeTotalArea / mat.sheetArea);
        const paidArea = sheetsNeeded * mat.sheetArea;
        const wastedArea = paidArea - safeTotalArea;

        if (wastedArea > 0) {
          extraWasteCost += wastedArea * mat.pricePerM2;
        }
      }
    });

    subtotal += extraWasteCost;
    const finalTotal = subtotal * (1 + margin / 100) + extras;

    return { computedModules, total: Number(finalTotal.toFixed(2)) };
  }

  static async create(userId: string, data: any) {
    const { clientId, margin, extras, modules } = data;

    const { computedModules, total } = await this.runEngine(
      userId,
      modules,
      margin,
      extras,
    );

    const newBudget = await prisma.budget.create({
      data: {
        clientId,
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
      include: {
        client: {
          select: { name: true },
        },
      },
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
      include: {
        client: true,
      },
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

    const { clientId, margin, extras, modules } = data;

    const { computedModules, total } = await this.runEngine(
      userId,
      modules,
      margin,
      extras,
    );

    return prisma.budget.update({
      where: { id: budgetId },
      data: { clientId, total, margin, extras, modules: computedModules },
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
