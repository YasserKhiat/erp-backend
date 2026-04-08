import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = process.argv[2];

try {
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    console.log(`DB_USER_FOUND=${Boolean(user)}`);
    console.log(`DB_USER_ID=${user?.id ?? ''}`);
  } else {
    const count = await prisma.user.count();
    console.log(`USER_COUNT=${count}`);
  }
} catch (error) {
  console.error(`PRISMA_ERR=${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
