import { z } from "zod";
import { protectedProcedure, router } from "@server/trpc/trpc";

const ImageUploadSchema = z.object({
    imageDisplayName: z.string(),
    imageUrl: z.string(),
    namespace: z.string().default("unsorted"),
});

export const userImageRouter = router({
    reportUpload: protectedProcedure.input(ImageUploadSchema).mutation(async ({ input, ctx }) => {
        return await ctx.prisma.userImage.create({
            data: {
                user: {
                    connect: {
                        id: ctx.session.user.id
                    }
                },
                imageUrl: input.imageUrl,
                imageDisplayName: input.imageDisplayName,
                namespace: input.namespace,
            }
        });
    }),
    reportMultiUpload: protectedProcedure.input(z.array(ImageUploadSchema)).mutation(async ({ input, ctx }) => {
        return await ctx.prisma.userImage.createMany({
            data: input.map(upload=>({
                userId: ctx.session.user.id,
                imageDisplayName: upload.imageDisplayName,
                imageUrl: upload.imageUrl,
                namespace: upload.namespace,
            }))
        })
    }),
    listUploads: protectedProcedure.input(z.object({
        namespace: z.string().optional()
    })).query(async ({ input, ctx }) => {
        return await ctx.prisma.userImage.findMany({
            where: { namespace: input.namespace },
        })
    })

})
