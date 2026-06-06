import { prisma } from '../lib/prisma';

interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  userId: string;
}

export class ClientService {
  async create({ name, email, phone, userId }: CreateClientRequest) {
    const client = await prisma.client.create({
      data: { name, email, phone, userId },
    });
    return client;
  }

  async findAll(userId: string) {
    const clients = await prisma.client.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return clients;
  }

  async findById(id: string, userId: string) {
    const client = await prisma.client.findFirst({
      where: { id, userId },
      include: {
        budgets: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      throw new Error('Cliente não encontrado.');
    }

    return client;
  }
}