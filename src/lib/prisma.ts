import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
    log: ['query'], // mostra as query do DB no log do server
}); 