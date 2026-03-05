import { z } from 'zod';

export const createSlotSchema = z.object({
    startTime: z.string().datetime('Invalid start time format. Use ISO 8601.'),
    endTime: z.string().datetime('Invalid end time format. Use ISO 8601.'),
}).refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    { message: 'endTime must be after startTime', path: ['endTime'] }
);

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
