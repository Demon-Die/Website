const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    const passwordHash = await bcrypt.hash('admin', 10);
    await prisma.admin.create({
      data: {
        email: 'admin@omnikon.org',
        passwordHash,
        name: 'Local Admin',
        role: 'SUPERADMIN'
      }
    });
    
    await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', unstopUrl: 'https://unstop.com' }
    });

    console.log('Admin seeded. Email: admin@omnikon.org | Password: admin');
  } else {
    console.log('Admin already exists.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
