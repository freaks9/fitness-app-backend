import dotenv from 'dotenv';
import Fastify from 'fastify';
import { prisma } from './db';

dotenv.config();

const fastify = Fastify({ logger: true });
// const prisma = new PrismaClient();

// Register Routes
import aiRoutes from './routes/ai';
import foodRoutes from './routes/food';
import logRoutes from './routes/logs';

fastify.register(foodRoutes, { prefix: '/api/food' });
fastify.register(logRoutes, { prefix: '/api/logs' });
fastify.register(aiRoutes, { prefix: '/api' });

fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    console.error('Fastify Global Error Handler:', error);
    const errorMessage = (error as any).message || 'Unknown Error';
    reply.status(500).send({ error: 'Internal Server Error', message: errorMessage });
});

// Health Check
fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
});

fastify.get('/', async (request, reply) => {
    return { status: 'ok', message: 'Fitness App API is running' };
});

const start = async () => {
    try {
        await prisma.$connect();
        fastify.log.info('Connected to Database');

        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
