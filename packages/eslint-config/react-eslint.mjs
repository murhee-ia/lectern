import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import sharedConfig from "./eslint-preset.mjs";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...sharedConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  pluginReactHooks.configs.flat.recommended,
];