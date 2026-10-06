import { z } from "zod";

import { plainTextSingleLineSchema, secureUrlSchema, userIdSchema } from "@/lib";

import { ROOMS, ROUNDS, TRACKS } from "../../judging/constants";

const judgingAssignmentsCsvSchema = z.object({
  judge_id: userIdSchema,
  judge_email: z.email("Invalid email address"),
  judge_first_name: plainTextSingleLineSchema
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  judge_last_name: plainTextSingleLineSchema
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  track: z.enum(TRACKS, { message: "Invalid track" }),
  project_id: plainTextSingleLineSchema
    .min(1, "Project ID is required")
    .max(100, "Project ID must be 100 characters or less"),
  project_name: plainTextSingleLineSchema
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less"),
  devpost_url: secureUrlSchema,
  order: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.coerce.number().pipe(z.number().int("Order must be a whole number"))
  ),
  judging_round: z.enum(ROUNDS, { message: "Invalid judging round" }),
  room_id: z.union([z.literal(""), z.enum(ROOMS, { message: "Invalid room" })]),
});

export const judgingAssignmentsCsvArraySchema = z.array(judgingAssignmentsCsvSchema);

export type JudgingAssignmentsCsvArraySchema = z.infer<typeof judgingAssignmentsCsvArraySchema>;
