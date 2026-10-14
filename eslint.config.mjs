import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const nodeBuiltins = [
  'node:*',
  'node:*/**',
  'assert', 'assert/**',
  'buffer', 'buffer/**',
  'child_process', 'child_process/**',
  'cluster', 'cluster/**',
  'crypto', 'crypto/**',
  'dgram', 'dgram/**',
  'dns', 'dns/**',
  'events', 'events/**',
  'fs', 'fs/**',
  'http', 'http/**',
  'https', 'https/**',
  'net', 'net/**',
  'os', 'os/**',
  'path', 'path/**',
  'process', 'process/**',
  'readline', 'readline/**',
  'stream', 'stream/**',
  'timers', 'timers/**',
  'tls', 'tls/**',
  'url', 'url/**',
  'util', 'util/**',
  'v8', 'v8/**',
  'vm', 'vm/**',
  'worker_threads', 'worker_threads/**',
  'zlib', 'zlib/**'
];

export default tseslint.config(
  {
    ignores: [
      'out/**',
      'dist/**',
      'release/**',
      'coverage/**',
      'node_modules/**',
      '**/.*/**'
    ]
  },
  // Base configuration for all TypeScript / JavaScript files
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines': ['error', 400]
    }
  },
  // React Hooks configuration for renderer
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  },
  // Synthetic data restriction: non-test files cannot import from __test__ or __samples__
  {
    files: ['src/**'],
    ignores: ['**/*.test.*', '**/*.spec.*', '**/test/**', '**/__test__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/__test__/**', '**/__samples__/**'],
              message: 'Synthetic test data may not be imported outside test files.'
            }
          ]
        }
      ]
    }
  },
  // Boundaries: src/core (pure domain logic)
  // May only import from core
  {
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'electron/**'],
              message: 'src/core may not import electron.'
            },
            {
              group: nodeBuiltins,
              message: 'src/core is pure and may not import Node built-ins.'
            },
            {
              group: ['react', 'react/**', 'react-dom', 'react-dom/**', 'lucide-react'],
              message: 'src/core may not import React or DOM libraries.'
            },
            {
              group: ['@shared', '@shared/**', '**/shared/**', '../*shared*/**', '../shared'],
              message: 'src/core may not import from shared.'
            },
            {
              group: ['@renderer', '@renderer/**', '**/renderer/**', '../*renderer*/**', '../renderer'],
              message: 'src/core may not import from renderer.'
            },
            {
              group: ['**/main/**', '../*main*/**', '../main'],
              message: 'src/core may not import from main.'
            },
            {
              group: ['**/preload/**', '../*preload*/**', '../preload'],
              message: 'src/core may not import from preload.'
            },
            {
              group: ['**/tools/**', '../*tools*/**', '../tools'],
              message: 'src/core may not import from tools.'
            }
          ]
        }
      ]
    }
  },
  // Boundaries: src/shared (pure contracts)
  // May import core, but not main, preload, renderer, electron, or node
  {
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'electron/**'],
              message: 'src/shared may not import electron.'
            },
            {
              group: nodeBuiltins,
              message: 'src/shared may not import Node built-ins.'
            },
            {
              group: ['react', 'react/**', 'react-dom', 'react-dom/**'],
              message: 'src/shared may not import React.'
            },
            {
              group: ['@renderer', '@renderer/**', '**/renderer/**', '../*renderer*/**'],
              message: 'src/shared may not import from renderer.'
            },
            {
              group: ['**/main/**', '../*main*/**'],
              message: 'src/shared may not import from main.'
            },
            {
              group: ['**/preload/**', '../*preload*/**'],
              message: 'src/shared may not import from preload.'
            },
            {
              group: ['**/tools/**', '../*tools*/**'],
              message: 'src/shared may not import from tools.'
            }
          ]
        }
      ]
    }
  },
  // Boundaries: src/main
  // May import core, shared, electron, node; may not import renderer or preload
  {
    files: ['src/main/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/**', 'react-dom', 'react-dom/**'],
              message: 'src/main may not import React.'
            },
            {
              group: ['@renderer', '@renderer/**', '**/renderer/**', '../*renderer*/**'],
              message: 'src/main may not import from renderer.'
            },
            {
              group: ['**/preload/**', '../*preload*/**'],
              message: 'src/main may not import from preload.'
            },
            {
              group: ['**/tools/**', '../*tools*/**'],
              message: 'src/main may not import from tools.'
            }
          ]
        }
      ]
    }
  },
  // Boundaries: src/preload
  // May import shared, electron; no core, main, renderer, or node builtins (sandboxed)
  {
    files: ['src/preload/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: nodeBuiltins,
              message: 'src/preload is sandboxed and may not import Node built-ins.'
            },
            {
              group: ['@core', '@core/**', '**/core/**', '../*core*/**'],
              message: 'src/preload may not import from core.'
            },
            {
              group: ['@renderer', '@renderer/**', '**/renderer/**', '../*renderer*/**'],
              message: 'src/preload may not import from renderer.'
            },
            {
              group: ['**/main/**', '../*main*/**'],
              message: 'src/preload may not import from main.'
            },
            {
              group: ['react', 'react/**', 'react-dom', 'react-dom/**'],
              message: 'src/preload may not import React.'
            },
            {
              group: ['**/tools/**', '../*tools*/**'],
              message: 'src/preload may not import from tools.'
            }
          ]
        }
      ]
    }
  },
  // Boundaries: src/renderer
  // May import core, shared, react, DOM; may not import electron, main, preload, node
  {
    files: ['src/renderer/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'electron/**'],
              message: 'src/renderer may not import electron.'
            },
            {
              group: nodeBuiltins,
              message: 'src/renderer may not import Node built-ins.'
            },
            {
              group: ['**/main/**', '../*main*/**'],
              message: 'src/renderer may not import from main.'
            },
            {
              group: ['**/preload/**', '../*preload*/**'],
              message: 'src/renderer may not import from preload.'
            },
            {
              group: ['**/tools/**', '../*tools*/**'],
              message: 'src/renderer may not import from tools.'
            }
          ]
        }
      ]
    }
  },
  // Boundaries: tools
  // May import core, shared, node built-ins; may not import electron, react, renderer, preload, main
  {
    files: ['tools/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'electron/**'],
              message: 'tools may not import electron.'
            },
            {
              group: ['react', 'react/**', 'react-dom', 'react-dom/**'],
              message: 'tools may not import React.'
            },
            {
              group: ['@renderer', '@renderer/**', '**/renderer/**'],
              message: 'tools may not import from renderer.'
            },
            {
              group: ['**/preload/**'],
              message: 'tools may not import from preload.'
            },
            {
              group: ['**/main/**'],
              message: 'tools may not import from main.'
            }
          ]
        }
      ]
    }
  }
);
