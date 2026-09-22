import { z } from "zod";

export const joinCodeSchema = z.string().trim().min(1).max(64);
