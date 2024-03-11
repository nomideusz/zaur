import { z } from "zod";
 
export const formSchema = z.object({
  username: z.string().min(0).max(10),
});
 
export type FormSchema = typeof formSchema;