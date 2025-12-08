import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { logger } from './utils/logger';
import fs from 'fs/promises';
import path from 'path';

/**
 * Seed script to populate the database with:
 * 1. Sample users (admin, facilitator, student)
 * 2. All 11 simulations from simulations-data.json
 * 3. Sample demand pattern for Fruit Beer
 */
async function seed() {
  try {
    logger.info('Starting database seeding...');

    // 1. Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Admin
    const admin = await prisma.user.upsert({
      where: { email: 'admin@parasmani.local' },
      update: {},
      create: {
        email: 'admin@parasmani.local',
        password_hash: hashedPassword,
        full_name: 'Admin User',
        role: 'ADMIN',
        email_verified: true,
      },
    });

    // 2 Facilitators
    const facilitator1 = await prisma.user.upsert({
      where: { email: 'facilitator1@parasmani.local' },
      update: {},
      create: {
        email: 'facilitator1@parasmani.local',
        password_hash: hashedPassword,
        full_name: 'Prof. Viral Bhatt',
        role: 'FACILITATOR',
        email_verified: true,
      },
    });

    const facilitator2 = await prisma.user.upsert({
      where: { email: 'facilitator2@parasmani.local' },
      update: {},
      create: {
        email: 'facilitator2@parasmani.local',
        password_hash: hashedPassword,
        full_name: 'Prof. Vasanthi Srinivasan',
        role: 'FACILITATOR',
        email_verified: true,
      },
    });

    // 5 Students
    const student1 = await prisma.user.upsert({
      where: { email: 'student1@parasmani.local' },
      update: {},
      create: {
        email: 'student1@parasmani.local',
        password_hash: hashedPassword,
        full_name: 'Rahul Kumar',
        role: 'STUDENT',
        email_verified: true,
      },
    });

    const student2 = await prisma.user.upsert({
      where: { email: 'student2@parasmani.local' },
      update: {},
      create: {
        email: 'student2@parasmani.local',
        password_hash: hashedPassword,
        full_name: 'Priya Sharma',
        role: 'STUDENT',
        email_verified: true,
      },
    });

    const student3 = await prisma.user.upsert({
      where: { email: 'student3@parasmani.local' },
      update: {},
      create: {
        email: 'student3@parasmani.local',
        password_hash: hashedPassword,
        full_name: 'Amit Patel',
        role: 'STUDENT',
        email_verified: true,
      },
    });

    const student4 = await prisma.user.upsert({
      where: { email: 'student4@parasmani.local' },
      update: {},
      create: {
        email: 'student4@parasmani.local',
        password_hash: hashedPassword,
        full_name: 'Sneha Verma',
        role: 'STUDENT',
        email_verified: true,
      },
    });

    const student5 = await prisma.user.upsert({
      where: { email: 'student5@parasmani.local' },
      update: {},
      create: {
        email: 'student5@parasmani.local',
        password_hash: hashedPassword,
        full_name: 'Vikash Lanjhikar',
        role: 'STUDENT',
        email_verified: true,
      },
    });

    logger.info('8 sample users created (1 admin, 2 facilitators, 5 students)');

    // 2. Seed simulations
    const dataPath = path.join(process.cwd(), '..', 'simulations-data.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const simulations = JSON.parse(data);

    for (const sim of simulations) {
      await prisma.simulation.upsert({
        where: { slug: sim.slug },
        create: {
          slug: sim.slug,
          name: sim.name,
          type: sim.type,
          author: sim.author,
          description: sim.description,
          duration_minutes: sim.duration_minutes,
          difficulty_level: sim.difficulty_level,
          learning_objectives: sim.learning_objectives,
          max_players: sim.max_players,
          min_players: sim.min_players,
          supports_bots: sim.supports_bots,
          tags: sim.tags,
        },
        update: {},
      });
    }

    logger.info(`${simulations.length} simulations seeded`);

    // 3. Create sample demand pattern for Fruit Beer
    await prisma.fruitBeerDemandPattern.upsert({
      where: { id: 'classic-4-to-8' },
      create: {
        id: 'classic-4-to-8',
        name: 'Classic 4→8 Step',
        description: '4 units for first 4 weeks, then 8 units',
        pattern: Array(20)
          .fill(0)
          .map((_, i) => ({ week: i + 1, demand: i < 4 ? 4 : 8 })),
      },
      update: {},
    });

    logger.info('Sample demand pattern created');

    logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ✅  Database seeded successfully!                       ║
║                                                            ║
║   👑 ADMIN:                                                ║
║   - admin@parasmani.local (password: password123)         ║
║                                                            ║
║   👨‍🏫 FACILITATORS:                                        ║
║   - facilitator1@parasmani.local (password: password123)  ║
║   - facilitator2@parasmani.local (password: password123)  ║
║                                                            ║
║   👥 STUDENTS:                                             ║
║   - student1@parasmani.local (password: password123)      ║
║   - student2@parasmani.local (password: password123)      ║
║   - student3@parasmani.local (password: password123)      ║
║   - student4@parasmani.local (password: password123)      ║
║   - student5@parasmani.local (password: password123)      ║
║                                                            ║
║   🎮 Simulations: ${String(simulations.length).padEnd(39)} ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
