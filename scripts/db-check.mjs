import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const count = await prisma.user.count();
  console.log(`USER_COUNT=${count}`);
} catch (error) {
  console.error(`PRISMA_ERR=${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
