import { z } from "zod";

import { plainTextMultiLineSchema, plainTextSingleLineSchema } from "@/lib";

import { EVENT_CATEGORIES } from "../constants";

export const eventFormDialogBaseSchema = z.object({
  category: z.enum(EVENT_CATEGORIES, { message: "Category is required" }),
  title: plainTextSingleLineSchema
    .min(1, { message: "Title is required" })
    .max(100, { message: "Title must be 100 characters or less" }),
  body: plainTextMultiLineSchema
    .min(1, { message: "Body is required" })
    .max(800, { message: "Body must be 800 characters or less" }),
  day: z.string().min(1, { message: "Day is required" }),
  start_time: z
    .string()
    .min(1, { message: "Start time is required" })
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: "Start time must be in HH:mm format" }),
  end_time: z
    .string()
    .min(1, { message: "End time is required" })
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: "End time must be in HH:mm format" }),
  location: plainTextSingleLineSchema
    .min(1, { message: "Location is required" })
    .max(50, { message: "Location must be 50 characters or less" }),
});

export const eventFormDialogSchema = eventFormDialogBaseSchema.refine((data) => data.end_time > data.start_time, {
  message: "End time must be after start time",
  path: ["end_time"],
});

export type EventFormDialogSchema = z.infer<typeof eventFormDialogSchema>;
