import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2023, sourceType: "module" },
      globals: {
        ...globals.node,
        ...globals.es2023,
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      // TS text ESLint text no-undef text NodeJS text ambient namespace ESLint text
      "no-undef": "off",
      // text TS text no-unused-varstext JS text/text
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          // text/text text text"text"text
          args: "none",
        },
      ],
      "no-console": "off",
    },
  },
  { ignores: ["dist/", "coverage/", "node_modules/"] },
];
