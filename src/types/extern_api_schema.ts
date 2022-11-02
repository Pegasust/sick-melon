import { ImageFileUploadSchema } from "@pages/index";
import { z, ZodTypeAny } from "zod";

const UploadRequestSchema = z.object({
    key: z.string(),
    action: z.enum(["upload"]).default("upload"),
    source: z.string(),
    format: z.enum(["json", "redirect", "txt"]).default("json")
});

const SimpleImageResponseSchema = z.object({
    filename: z.string(),
    size: z.number(),
    width: z.number(),
    heigth: z.number(),
    ratio: z.number(),
    size_formatted: z.string(),
    mime: z.string(),
    channels: z.string().array().nullish(),
    url: z.string().url(),
    name: z.string(),
    extension: z.string(),
    bits: z.number(),
});
const ImageResponseSchema = SimpleImageResponseSchema.extend({
    storage_id: z.string().nullish(),
    description: z.string().nullish(),
    nsfw: z.enum(["0", "1", "true", "false"]),
    md5: z.string(),
    storage: z.string(),
    original_filename: z.string(),
    original_exifdata: z.string().nullish(),
    views: z.number(),
    id_encoded: z.string(),
    url_viewer: z.string().url(),
    medium: SimpleImageResponseSchema,
    thumb: SimpleImageResponseSchema,
    view_label: z.literal("views"),
    display_url: z.string().url(),
    how_long_ago: z.string(),
});

const UploadResponseSchema = z.object({
    status_code: z.number(),
    success: z.object({
        message: z.string(),
        code: z.number(),
    }),
    success_txt: z.string(),
    image: ImageResponseSchema,

});

const RestMethod = z.enum(["GET", "POST", "PUT", "DELETE", "HEAD", "PATCH", "OPTIONS"])
    .default("GET");

const ZodFetchSchema = <TFetch extends ZodTypeAny, TInput extends ZodTypeAny, TOutput extends ZodTypeAny>
    ({ fetchMeta, input, output }: {
        fetchMeta: TFetch,
        input: TInput,
        output: TOutput
    }) => z.function()
        .args(z.object({
            method: RestMethod,
            input,
            queryOpts: fetchMeta
        }))


const FreeImageHostFetch =
    ZodFetchSchema({
        fetchMeta: z.object({
            endpoint: z.string().url().default("https://freeimage.host/api/1/upload")
        }).default({ endpoint: "https://freeimage.host/api/1/upload" }),
        input: UploadRequestSchema,
        output: UploadResponseSchema
    }).implement(async ({ method, input, queryOpts }) => {
        const resp = await fetch(queryOpts.endpoint, {
            method: method,
            body: JSON.stringify(input),
        }).then(async (res) => {
            return await res.json();
        }).then(async ({ data, errors, ok }) => {
            if (!ok) {
                throw new Error(`Errors: ${errors}`);
            }
            return UploadResponseSchema.parseAsync(data);
        });
        return resp;
    });

export const FreeImageHost = {
    /// https://freeimage.host/api/1/upload
    UploadRequestSchema,
    UploadResponseSchema,
    fetch: FreeImageHostFetch
}
