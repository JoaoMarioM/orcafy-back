// src/lib/prisma.ts
import 'dotenv/config'; // 👈 Força a leitura do .env logo na largada
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Calma lá! A DATABASE_URL não foi encontrada no arquivo .env');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });