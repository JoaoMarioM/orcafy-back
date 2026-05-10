import { z } from 'zod';

export const authSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nome muito curto'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
  }),
});

export const materialSchema = z.object({
  body: z.object({
    name: z.string().min(1,'Nome do material é obrigatório' ),
    thickness: z.number().min(0.1, 'Espessura é obrigatória'),
    sheetWidth: z.number().optional(),
    sheetLength: z.number().optional(),
    sheetPrice: z.number().optional(),
    chargeFullSheet: z.boolean().optional(),
  }),
});

export const budgetSchema = z.object({
  body: z.object({
    client: z.string().min(1, 'Cliente obrigatório'),
    margin: z.number().default(30),
    extras: z.number().default(0),
    modules: z
      .array(
        z.object({
          name: z.string(),
          width: z.number().int(),
          height: z.number().int(),
          depth: z.number().int(),
          hasDoors: z.boolean(),
          drawers: z.number().int(),
          materialId: z.string().uuid(),
          partitions: z.number().optional(),
          shelves: z.number().optional(),
          isSlattedPanel: z.boolean().optional(),
          doorMaterialId: z.string().nullable().optional(),
        }),
      )
      .min(1, 'Adicione pelo menos um módulo'),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'RASCUNHO',
      'ENVIADO',
      'APROVADO',
      'RECUSADO',
      'FINALIZADO',
      'CANCELADO',
    ]),
  }),
});
