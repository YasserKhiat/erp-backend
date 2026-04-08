import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser({ email, fullName, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role,
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      fullName,
      role,
      passwordHash,
      isActive: true,
    },
  });
}

async function upsertCategory(name) {
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function upsertIngredient({ name, unit, minStockLevel, currentStock }) {
  return prisma.ingredient.upsert({
    where: { name },
    update: {
      unit,
      minStockLevel,
      inventory: {
        upsert: {
          create: { currentStock },
          update: { currentStock },
        },
      },
    },
    create: {
      name,
      unit,
      minStockLevel,
      inventory: {
        create: {
          currentStock,
        },
      },
    },
  });
}

async function upsertMenuItem({ name, description, price, categoryId, isAvailable = true }) {
  const existing = await prisma.menuItem.findFirst({
    where: { name, categoryId },
    select: { id: true },
  });

  if (!existing) {
    return prisma.menuItem.create({
      data: { name, description, price, categoryId, isAvailable },
    });
  }

  return prisma.menuItem.update({
    where: { id: existing.id },
    data: { description, price, isAvailable },
  });
}

async function main() {
  console.log('Seeding users...');
  await upsertUser({
    email: 'admin@restaurant.local',
    fullName: 'ERP Admin',
    role: UserRole.ADMIN,
    password: 'Admin123!',
  });

  await upsertUser({
    email: 'client@restaurant.local',
    fullName: 'ERP Client',
    role: UserRole.CLIENT,
    password: 'Client123!',
  });

  console.log('Seeding categories...');
  const burgers = await upsertCategory('Burgers');
  const drinks = await upsertCategory('Drinks');

  console.log('Seeding menu items...');
  await upsertMenuItem({
    name: 'Classic Burger',
    description: 'Beef patty, lettuce, tomato, house sauce',
    price: '8.90',
    categoryId: burgers.id,
  });
  await upsertMenuItem({
    name: 'Double Cheese Burger',
    description: 'Double beef, cheddar, pickles, onion',
    price: '11.50',
    categoryId: burgers.id,
  });
  await upsertMenuItem({
    name: 'Fresh Orange Juice',
    description: 'Pressed daily',
    price: '3.80',
    categoryId: drinks.id,
  });

  console.log('Seeding ingredients and inventory...');
  await upsertIngredient({
    name: 'Beef Patty',
    unit: 'pcs',
    minStockLevel: '20',
    currentStock: '120',
  });
  await upsertIngredient({
    name: 'Burger Bun',
    unit: 'pcs',
    minStockLevel: '30',
    currentStock: '160',
  });
  await upsertIngredient({
    name: 'Orange',
    unit: 'kg',
    minStockLevel: '5',
    currentStock: '24',
  });

  const totals = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.ingredient.count(),
  ]);

  console.log(`Seed complete: users=${totals[0]} categories=${totals[1]} menuItems=${totals[2]} ingredients=${totals[3]}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
