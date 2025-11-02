import z from 'zod';
export declare const triggerYoutubeVideoScrapeTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    url: z.ZodString;
}, z.core.$strip>, string, {
    url: string;
}, any>;
export declare const retrievalTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    query: z.ZodString;
    video_id: z.ZodString;
}, z.core.$strip>, {
    query: string;
    video_id: string;
}, {
    query: string;
    video_id: string;
}, string>;
export declare const retrieveSimilarVideosTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    query: z.ZodString;
}, z.core.$strip>, {
    query: string;
}, {
    query: string;
}, string>;
export declare const retrieveStoredVideosTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    query: z.ZodString;
}, z.core.$strip>, {
    query: string;
}, {
    query: string;
}, string>;
