// Copyright 2018 Stanford University see Apache2.txt for license

/*
 * ESLint 9 flat config, migrated from .eslintrc.js.
 *
 * Two substantive changes came with the migration:
 *
 *  - eslint-config-airbnb-base was dropped. Its latest release (15.0.0) peers on
 *    eslint "^7.32.0 || ^8.2.0" and has no ESLint 9 support. In practice it was
 *    contributing almost nothing here: the old rules block was ~90 lines of
 *    turning airbnb rules back off, and eslint-config-prettier already disables
 *    the stylistic ones. The only rules it actually supplied that this codebase
 *    relies on were `no-import-assign: off` and `import/namespace: off`, both
 *    carried forward below.
 *
 *  - eslint-plugin-node (unmaintained since 2020) was replaced by its
 *    maintained fork eslint-plugin-n, so every `node/*` rule is now `n/*`.
 *
 * .eslintignore is gone in flat config; the ignores block below replaces it.
 */

import js from "@eslint/js"
import globals from "globals"
import babelParser from "@babel/eslint-parser"
import importPlugin from "eslint-plugin-import"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import jsxA11y from "eslint-plugin-jsx-a11y"
import security from "eslint-plugin-security"
import n from "eslint-plugin-n"
import jest from "eslint-plugin-jest"
import testingLibrary from "eslint-plugin-testing-library"
import prettier from "eslint-config-prettier"

export default [
  {
    // Replaces .eslintignore
    ignores: [
      "build_support/**",
      "builds/**",
      "coverage/**",
      "docs/**",
      "static/**",
      "dist/**",
      "node_modules/**",
      "tmp/**",
    ],
  },

  {
    /*
     * No `files` key, so this applies everywhere — including eslint.config.mjs
     * itself. eslint-plugin-react warns if it cannot find its version setting
     * for a file it lints, and settings scoped to the jsx glob would miss .mjs.
     */
    settings: {
      react: { version: "detect" },
    },
  },

  js.configs.recommended,
  n.configs["flat/recommended-module"],
  react.configs.flat.recommended,
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.warnings,
  jsxA11y.flatConfigs.recommended,
  security.configs.recommended,
  prettier,

  {
    files: ["**/*.js", "**/*.jsx"],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: babelParser,
      ecmaVersion: 2021,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
    settings: {
      /*
       * keycloak-js@26 ships only an "exports" map with no top-level "main".
       * The legacy resolvers used by eslint-plugin-n and eslint-plugin-import
       * cannot read "exports", so they report the package as missing even
       * though webpack and jest both resolve it. Allowlist it rather than
       * changing working imports.
       */
      n: {
        resolvePaths: ["src", "__tests__/testUtilities"],
        tryExtensions: [".js", ".jsx", ".json", ".node"],
        allowModules: ["keycloak-js"],
      },
      "import/resolver": {
        node: {
          paths: ["src", "__tests__/testUtilities"],
          extensions: [".js", ".jsx"],
        },
      },
      // Same "exports"-map limitation as above, for import/no-unresolved.
      "import/core-modules": ["keycloak-js"],
      react: {
        version: "detect",
      },
    },
    rules: {
      eqeqeq: ["error", "smart"],
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],

      /*
       * Carried over from eslint-config-airbnb-base, which set both to off.
       * import/namespace is needed in src as well: useMetric.js indexes an
       * imported namespace dynamically (sinopiaMetrics[key]), which the rule
       * cannot validate.
       */
      "import/namespace": "off",

      "jsx-a11y/anchor-is-valid": "warn", // see #172
      "jsx-a11y/label-has-for": "off", // see #173
      // The DropZone select form needs an onChange prop to set the state with
      // the new group
      "jsx-a11y/no-onchange": "warn",
      "jsx-a11y/no-noninteractive-tabindex": ["off", { roles: ["tooltip"] }],

      "n/no-extraneous-import": "off", // turning off because objects to our imports
      "n/no-unsupported-features/es-syntax": "off",
      "n/no-missing-import": "off", // babel module-resolver maps bare src/ paths
      /*
       * This is a browser application; eslint-plugin-n judges globals against
       * the Node version in engines, so browser APIs like navigator (used in
       * ClipboardButton) are reported as unsupported Node builtins.
       */
      "n/no-unsupported-features/node-builtins": "off",

      // we want to see errors in the console; warn is allowed too, for
      // recoverable conditions that fall back rather than fail (e.g. a template
      // search that misses and uses a fallback URI)
      "no-console": ["warn", { allow: ["error", "info", "warn"] }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_.*" }],
      "no-useless-constructor": "warn",
      "no-var": "error",
      "prefer-const": "error",

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unknown-property": [
        "error",
        { ignore: ["placement", "trigger"] },
      ],
      "react/prop-types": "error",

      "security/detect-object-injection": "off",
    },
  },

  {
    // Allow tests to include block statements (idiomatic Jest style)
    files: ["__tests__/**"],
    /*
     * Both plugins are registered explicitly rather than by spreading their
     * flat configs: spreading would overwrite the `plugins` key rather than
     * merge it, so whichever came last would be the only plugin registered.
     */
    plugins: {
      jest,
      "testing-library": testingLibrary,
    },
    rules: {
      /*
       * testing-library/react is extended because .eslintrc.js extended it
       * here. jest's recommended set is deliberately NOT spread: the old config
       * registered the jest plugin (so inline jest/* disables resolve) but
       * never extended plugin:jest/recommended. Enabling it surfaces ~84 new
       * findings, mostly jest/expect-expect on tests that assert via
       * screen.getByText throwing — a real cleanup, but a separate decision
       * from this upgrade.
       */
      ...testingLibrary.configs["flat/react"].rules,
      "arrow-body-style": "off",
      "max-lines": "off",
      "max-len": "off",
      /*
       * Tests mock modules by reassigning namespace members
       * (sinopiaApi.postMarc = jest.fn()), which this rule forbids.
       * airbnb-base had it off globally; scoping it to tests keeps src strict.
       */
      "no-import-assign": "off",
      "n/no-unpublished-import": "off",
    },
  },

  {
    // Bootstrap styles require that navbars use <a> instead of <button>.
    files: ["src/components/Header.jsx", "src/components/home/Header.jsx"],
    rules: {
      "jsx-a11y/anchor-is-valid": "off",
    },
  },

  {
    files: ["react-testing-library.setup.js"],
    rules: {
      "n/no-unpublished-import": "off",
    },
  },

  {
    /*
     * Build, server, and config files that legitimately pull in
     * devDependencies. eslint.config.mjs is itself the clearest case: it
     * imports every eslint plugin.
     */
    files: [
      "eslint.config.mjs",
      "webpack.config.js",
      "app.js",
      "server.js",
      "src/Health.js",
    ],
    rules: {
      "n/no-unpublished-require": "off",
      "n/no-unpublished-import": "off",
    },
  },
]
