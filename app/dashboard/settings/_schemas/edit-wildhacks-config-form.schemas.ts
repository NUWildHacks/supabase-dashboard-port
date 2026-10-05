import { z } from "zod";

import { ONE_DAY } from "@/constants";

export const editWildhacksConfigFormSchema = z
  .object({
    max_team_size: z
      .string()
      .min(1, "Max team size is required")
      .refine((val) => Number(val) >= 1 && Number(val) <= 10, "Max team size must be between 1 and 10")
      .refine((val) => Number.isInteger(Number(val)), "Max team size must be a whole number"),
    max_participants: z
      .string()
      .min(1, "Max participants is required")
      .refine((val) => Number(val) >= 1, "Max participants must be at least 1")
      .refine((val) => Number.isInteger(Number(val)), "Max participants must be a whole number")
      .refine((val) => Number(val) <= 2147483647, "Max participants is too large"),
    registration_deadline: z
      .number()
      .int()
      .min(1, { message: "Registration deadline must be milliseconds since epoch" }),
    start_time: z.number().int().min(1, { message: "Start time must be milliseconds since epoch" }),
    submission_deadline: z.number().int().min(1, { message: "Submission deadline must be milliseconds since epoch" }),
    end_time: z.number().int().min(1, { message: "End time must be milliseconds since epoch" }),
    crowd_favorite_password: z
      .string()
      .min(1, "Crowd favorite password is required")
      .min(4, "Password must be at least 4 characters")
      .max(50, "Password must be at most 50 characters"),
    crowd_favorite_opt_in_started: z.boolean(),
    crowd_favorite_opt_in_open: z.boolean(),
    crowd_favorite_voting_started: z.boolean(),
    crowd_favorite_voting_open: z.boolean(),
  })
  .refine((data) => data.registration_deadline < data.start_time, {
    message: "Registration deadline must be before event start time",
    path: ["registration_deadline"],
  })
  .refine((data) => data.start_time < data.submission_deadline, {
    message: "Submission deadline must be after event start time",
    path: ["submission_deadline"],
  })
  .refine((data) => data.submission_deadline < data.end_time, {
    message: "Submission deadline must be before end time",
    path: ["submission_deadline"],
  })
  .refine((data) => data.start_time < data.end_time, {
    message: "Start time must be before end time",
    path: ["end_time"],
  })
  .refine((data) => data.end_time - data.start_time >= ONE_DAY, {
    message: "Event duration must be at least one day",
    path: ["end_time"],
  })
  .refine((data) => data.crowd_favorite_opt_in_started || !data.crowd_favorite_opt_in_open, {
    message: "Crowd favorite opt-in cannot be open before it has started",
    path: ["crowd_favorite_opt_in_open"],
  })
  .refine((data) => data.crowd_favorite_voting_started || !data.crowd_favorite_voting_open, {
    message: "Crowd favorite voting cannot be open before it has started",
    path: ["crowd_favorite_voting_open"],
  })
  .refine((data) => !data.crowd_favorite_voting_started || data.crowd_favorite_opt_in_started, {
    message: "Crowd favorite voting can only start after opt-in has started",
    path: ["crowd_favorite_voting_started"],
  });

export type EditWildhacksConfigFormSchema = z.infer<typeof editWildhacksConfigFormSchema>;
