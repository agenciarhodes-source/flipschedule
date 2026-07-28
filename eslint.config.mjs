import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: currentDirectory });

export default [
  { ignores: [".next/**", "node_modules/**", "frontend/**", "backend/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
