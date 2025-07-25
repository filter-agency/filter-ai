const path = require('path');
const defaults = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaults,
  entry: {
    index: path.resolve(process.cwd(), 'src', 'index.ts'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(process.cwd(), 'build'),
  },
  module: {
    ...defaults.module,
    rules: [
      ...defaults.module.rules,
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
              transpileOnly: true,
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', ...(defaults.resolve ? defaults.resolve.extensions || ['.js', '.jsx'] : [])],
    alias: {
      ['@/*']: path.resolve(__dirname, 'src/*'),
    },
  },
};
