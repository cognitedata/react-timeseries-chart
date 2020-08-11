import typescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import pkg from './package.json';

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];
const typescriptOpts = (compilerOptions = {}) => ({
  tsconfigOverride: {
    exclude: [
      "dist",
      "**/*.spec.*",
      "**/*.stories.*",
      "**/mocks"
    ],
    compilerOptions
  }
});

export default [
  {
    cache: false,
    external,
    input: 'src/index.ts',
    context: 'window',
    output:[
      {
        file: pkg.main,
        format: 'cjs',
      },
    ],
    plugins: [
      replace({__REPLACE_package_version__: pkg.version }),
      typescript({
        ...typescriptOpts({
          declaration: true
        }),
      }),
    ],
  },
];
