// eslint.config.cjs
// Minimal flat config: keep language options and rules, move ignores here.
module.exports = [
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
    },
  },
];
