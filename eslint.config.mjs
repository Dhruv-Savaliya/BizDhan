import coreWebVitals from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitals,
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    name: "bizdhan/react-compiler-rules-off",
    rules: {
      // React Compiler / ESLint 7 rules are valuable but require broad refactors across this codebase.
      // Production builds do not depend on these; re-enable incrementally if you adopt the compiler.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
];

export default eslintConfig;
