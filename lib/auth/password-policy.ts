import { z } from "zod";

export const passwordSchema = z.string().min(12).max(128)
  .regex(/[a-z]/, "A senha deve conter letra minúscula.")
  .regex(/[A-Z]/, "A senha deve conter letra maiúscula.")
  .regex(/[0-9]/, "A senha deve conter número.")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter caractere especial.");
