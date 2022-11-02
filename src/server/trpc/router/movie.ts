import { protectedProcedure, router } from "@server/trpc/trpc";
import { z } from "zod";
import { publicProcedure } from "@server/trpc/trpc";
import { MovieMutationForm } from "@pages/index";



export const movieRouter = router({
    publicFeed: publicProcedure.input(z.object({
        cursor: z.date().nullish(),
        take: z.number().min(1).max(50).default(3),
    })).query(async ({ input, ctx }) => {
        return await ctx.prisma.movie.findMany({
            orderBy: [{
                cursor: 'desc'
            }],
            cursor: input.cursor ? {
                cursor: input.cursor
            } : undefined,
            take: input.take + 1,// take the next element for the cursor value
        }).then(retval => {
            const hasNext = retval.length == input.take + 1;
            const nextCursor = retval[retval.length - 1]?.cursor;
            if (hasNext) {
                retval.pop();
            }
            return { data: retval, nextCursor, hasNext }
        })
    }),
    get: publicProcedure.input(z.object({
        movieId: z.string(),
    })).query(async ({ input, ctx }) => {
        return await ctx.prisma.movie.findFirstOrThrow({
            where: { id: input.movieId }
        })
    }),
    upsert: protectedProcedure.input(z.object({
        movieId: z.string().optional(),
        updateForm: MovieMutationForm
    })).mutation(async ({ input, ctx }) => {
        const prisma_data = {
            originalTitle: input.updateForm.originalTitle,
            primaryTitle: input.updateForm.primaryTitle,
            runtimeMinutes: input.updateForm.runtimeMinutes,
            rating: input.updateForm.contentRating,
            endDate: input.updateForm.endDate,
            releaseDate: input.updateForm.releaseDate,
            MovieGenre: {
                createMany: {
                    data: input.updateForm.genre.map(g => ({
                        genre: g
                    }))
                }
            },
            MovieKeyword: {
                createMany: {
                    data: input.updateForm.keywords.map(k => ({
                        keyword: k
                    }))
                }
            }
        };
        return await (input.movieId
            ? ctx.prisma.movie.update({
                where: { id: input.movieId },
                data: prisma_data
            })
            : ctx.prisma.movie.create({
                data: prisma_data
            }))
    })
})
