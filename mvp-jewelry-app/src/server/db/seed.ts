import { prisma } from './client';
async function main() {
  await prisma.user.upsert({
    where: { id: 'demo' },
    update: {},
    create: { id: 'demo', storeName: 'Demo Store' }
  });
  console.log('Seeded demo user.');
}
main().finally(() => process.exit(0));
