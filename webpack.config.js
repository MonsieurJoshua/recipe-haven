const path = require('path');

module.exports = {
  entry: './recipe-haven/index.js', // Updated entry point
  output: {
    filename: 'bundle.js', // Output bundle file name
    path: path.resolve(__dirname, 'dist'), // Output directory
  },
  mode: 'development', // Set the mode to development
  module: {
    rules: [
      {
        test: /\.js$/, // Apply this rule to .js files
        exclude: /node_modules/, // Exclude the node_modules directory
        use: {
          loader: 'babel-loader', // Use Babel loader
          options: {
            presets: [
              ['@babel/preset-env', { modules: false }]
            ]
          }
        },
      },
    ],
  },
};
