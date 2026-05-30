import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const banner = `/*! SenangWebs Zero v${pkg.version} | MIT License | https://github.com/a-hakim/senangwebs-zero */`;

export default [
  // ESM
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/swz.esm.mjs',
      format: 'esm',
      banner,
      sourcemap: true,
    },
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      resolve(),
      commonjs(),
    ],
  },
  // CJS
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/swz.cjs.js',
      format: 'cjs',
      banner,
      sourcemap: true,
    },
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      resolve(),
      commonjs(),
    ],
  },
  // UMD (CDN / global)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/swz.umd.js',
      format: 'umd',
      name: 'swz',
      banner,
      sourcemap: true,
      globals: {
        '@floating-ui/dom': 'FloatingUIDOM',
      },
    },
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      resolve(),
      commonjs(),
      terser(),
    ],
  },
];
