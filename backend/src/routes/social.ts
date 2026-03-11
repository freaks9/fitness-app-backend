// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { prisma } from '../db';

export default async function socialRoutes(fastify: FastifyInstance) {
    // Helper to create notifications
    const createNotification = async (userId: string, senderId: string, type: string, referenceId: string, message: string) => {
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    senderId,
                    type,
                    referenceId,
                    message
                }
            });
        } catch (error) {
            console.error('Failed to create notification:', error);
        }
    };

    // GET /api/social/reports
    fastify.get('/reports', async (request, reply) => {
        try {
            const reports = await prisma.labReport.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    profile: {
                        select: { nickname: true }
                    },
                    labLikes: {
                        select: { userId: true }
                    },
                    _count: {
                        select: {
                            labLikes: true,
                            labComments: true
                        }
                    }
                }
            });

            const mapped = reports.map(report => ({
                id: report.id,
                userId: report.userId,
                mealName: report.dishName,
                userName: report.profile?.nickname || '研究員',
                date: report.createdAt.toISOString(),
                nutrients: report.nutrients,
                memo: report.comment || '',
                imageUrl: report.imageUrl,
                methodTag: report.methodTag || 'other',
                isRecommended: report.isRecommended || false,
                likesCount: report._count.labLikes,
                commentsCount: report._count.labComments,
                likedByUser: report.labLikes.map(l => l.userId)
            }));

            return mapped;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    // POST /api/social/like
    fastify.post('/like', async (request, reply) => {
        const { userId, reportId } = request.body as { userId: string, reportId: string };

        if (!userId || !reportId) {
            return reply.code(400).send({ error: 'Missing userId or reportId' });
        }

        try {
            const existingLike = await prisma.labLike.findUnique({
                where: {
                    userId_reportId: { userId, reportId }
                }
            });

            if (existingLike) {
                await prisma.labLike.delete({
                    where: { id: existingLike.id }
                });
                return { liked: false };
            } else {
                await prisma.labLike.create({
                    data: { userId, reportId }
                });

                // Notify report owner
                const report = await prisma.labReport.findUnique({ where: { id: reportId } });
                if (report && report.userId !== userId) {
                    const sender = await prisma.profile.findUnique({ where: { id: userId } });
                    await createNotification(
                        report.userId,
                        userId,
                        'like',
                        reportId,
                        `${sender?.nickname || '誰か'}があなたの投稿に「いいね」しました。`
                    );
                }

                return { liked: true };
            }
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    // POST /api/social/comment
    fastify.post('/comment', async (request, reply) => {
        const { userId, reportId, content, parentId } = request.body as {
            userId: string,
            reportId: string,
            content: string,
            parentId?: string
        };

        if (!userId || !reportId || !content) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        try {
            const comment = await prisma.labComment.create({
                data: { userId, reportId, content, parentId }
            });

            // Notify report owner
            const report = await prisma.labReport.findUnique({ where: { id: reportId } });
            if (report && report.userId !== userId) {
                const sender = await prisma.profile.findUnique({ where: { id: userId } });
                await createNotification(
                    report.userId,
                    userId,
                    'comment',
                    reportId,
                    `${sender?.nickname || '誰か'}があなたの投稿にコメントしました。`
                );
            }

            // If it's a reply, notify the parent comment owner
            if (parentId) {
                const parentComment = await prisma.labComment.findUnique({ where: { id: parentId } });
                if (parentComment && parentComment.userId !== userId && parentComment.userId !== report?.userId) {
                    const sender = await prisma.profile.findUnique({ where: { id: userId } });
                    await createNotification(
                        parentComment.userId,
                        userId,
                        'reply',
                        reportId,
                        `${sender?.nickname || '誰か'}があなたのコメントに返信しました。`
                    );
                }
            }

            return comment;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    // GET /api/social/notifications/:userId
    fastify.get('/notifications/:userId', async (request, reply) => {
        const { userId } = request.params as { userId: string };

        try {
            const notifications = await prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    sender: {
                        select: { nickname: true }
                    }
                }
            });

            return notifications;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    // POST /api/social/save
    fastify.post('/save', async (request, reply) => {
        const { userId, reportId } = request.body as { userId: string, reportId: string };

        if (!userId || !reportId) {
            return reply.code(400).send({ error: 'Missing userId or reportId' });
        }

        try {
            const existingSave = await prisma.savedMenu.findUnique({
                where: {
                    userId_reportId: { userId, reportId }
                }
            });

            if (existingSave) {
                await prisma.savedMenu.delete({
                    where: { id: existingSave.id }
                });
                return { saved: false };
            } else {
                await prisma.savedMenu.create({
                    data: { userId, reportId }
                });
                return { saved: true };
            }
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });
}
