const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './websrc/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'web')
  },
  module:{
    rules:[
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader',
          options: {
            attrs: [':data-src']
          }
        }
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      }
    ]
  }
};
