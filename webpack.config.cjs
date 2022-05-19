const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode : 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'orbits_js.js',
    library: {
        name: "orbitsjs",
        type: "umd",
    },
  },
};