import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const jsxUsesVariables = {
  meta: {
    type: 'problem',
    schema: [],
  },
  create(context) {
    function rootIdentifier(node) {
      if (!node) return null;
      if (node.type === 'JSXIdentifier') return node;
      if (node.type === 'JSXMemberExpression') return rootIdentifier(node.object);
      if (node.type === 'JSXNamespacedName') return rootIdentifier(node.namespace);
      return null;
    }

    return {
      JSXOpeningElement(node) {
        const identifier = rootIdentifier(node.name);
        if (identifier && /^[A-Z]/.test(identifier.name)) {
          context.sourceCode.markVariableAsUsed(identifier.name, node);
        }
      },
    };
  },
};

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'public/sitemap.xml'],
  },
  js.configs.recommended,
  {
    ...reactHooks.configs.flat.recommended,
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.vitest },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      ...reactHooks.configs.flat.recommended.plugins,
      'react-refresh': reactRefresh,
      local: {
        rules: {
          'jsx-uses-vars': jsxUsesVariables,
        },
      },
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'local/jsx-uses-vars': 'error',
      // React Hook Form and route-driven state synchronization intentionally use
      // patterns that the experimental React Compiler lint rules flag.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
  },
];
