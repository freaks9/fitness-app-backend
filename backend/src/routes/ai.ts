import { FastifyInstance } from 'fastify';
import { analyzeLabelImage, analyzeMealImage } from '../services/aiAnalysis';

export default async function aiRoutes(fastify: FastifyInstance) {
    fastify.post('/analyze-meal', async (request, reply) => {
        const { image } = request.body as { image: string };
        fastify.log.info('--- Received /analyze-meal request ---');

        if (!image) {
            return reply.code(400).send({ error: 'Image data is required' });
        }

        try {
            const base64Image = image.replace(/^data:image\/\w+;base64,/, "");
            const analysis = await analyzeMealImage(base64Image);

            if (analysis) {
                return { analysis };
            } else {
                return reply.code(500).send({ error: 'Failed to analyze meal image' });
            }
        } catch (error: any) {
            fastify.log.error('AI Meal Analysis Route Error:', error);
            const msg = error.message || '';
            if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('Overloaded')) {
                return reply.code(503).send({ error: 'AI Service Temporarily Unavailable', message: 'The AI service is currently experiencing high traffic. Please try again in a few minutes.' });
            }
            return reply.code(500).send({ error: 'Internal Server Error', message: msg });
        }
    });

    fastify.post('/analyze-label', async (request, reply) => {
        const { image } = request.body as { image: string };
        fastify.log.info('--- Received /analyze-label request ---');

        if (!image) {
            return reply.code(400).send({ error: 'Image data is required' });
        }

        try {
            // Pass URI to analyzeLabelImage
            // The frontend now sends the URI, but wait, the backend expects a base64 string because the service function `analyzeLabelImage` takes base64.
            // In the previous step, I changed the frontend to send URI to `useMealAnalysis` hook.
            // The `useMealAnalysis` hook then resizes the image and GETS the base64 from `manipulateAsync`.
            // So `useMealAnalysis` hook calls `analyzeLabel` service in frontend.
            // `analyzeLabel` service in frontend sends a POST request to backend with `image` body.
            // The `manipulateAsync` result `.base64` IS a base64 string.
            // So the backend still receives a base64 string.
            // The issue is simply the logging.

            const base64Image = image.replace(/^data:image\/\w+;base64,/, "");
            const analysis = await analyzeLabelImage(base64Image);

            if (analysis) {
                return { analysis };
            } else {
                return reply.code(500).send({ error: 'Failed to analyze label image' });
            }
        } catch (error) {
            fastify.log.error('AI Label Analysis Route Error:', error as any);
            return reply.code(500).send({ error: 'Internal Server Error', message: (error as any).message });
        }
    });
}
