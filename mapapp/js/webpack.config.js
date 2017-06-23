var webpack = require('webpack');
var path = require('path');

var BUILD_DIR = path.resolve(__dirname, 'dist');
// path: path.join(__dirname, '/public'),
var APP_DIR = path.resolve(__dirname, '.');

var plugins = [
  new webpack.ProvidePlugin({
    'Intl': 'imports-loader?this=>global!exports-loader?global.Intl!intl'
    // changed from imports and exports to import-loader and exports-loader
  })
];
var filename = 'bundle.js';
var PROD = JSON.parse(process.env.BUILD_PROD || false);
if(PROD) {
  plugins.push(new webpack.DefinePlugin({ 'process.env': { 'NODE_ENV': JSON.stringify('production') } }));
  plugins.push(new webpack.optimize.UglifyJsPlugin({ compress:{ warnings: true } }));
  filename = 'bundle.min.js';
}


module.exports = {
  entry: {
    Maptool: APP_DIR + '/app.jsx',
    // Viewer: APP_DIR + '/src/viewer.jsx',
    // Composer: APP_DIR + '/src/composer.jsx'
  },
  output: {
    path: BUILD_DIR,
    filename: filename,
    library: '[name]',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    publicPath: "/dist/"
  },
  // devtool: "eval-source-map",
  node: {fs: "empty"},
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.jsx', '.json']
    //here empty sting not allowed anymore
  },
  stats: {
        errorDetails: true,
        colors: true,
        modules: true,
        reasons: true
        // chunks: true
  },
  resolveLoader: {
    modules: [path.join(__dirname, 'node_modules')]
    //here: resolve has changed. now used modules
  },
    module: {
        loaders: [
      {
        test: /\.(js|jsx)$/,
        loader: 'babel-loader',
        // include: [path.join(__dirname, 'node_modules/openlayers/dist/ol.js')],
        exclude: /node_modules/
      }, {
        test: /\.css$/,
        loader: "style-loader!css-loader"
      }, {
        test: /\.json$/,
        loader: "json-loader"
      }, {
        test: /\.(png|gif|jpg|jpeg|svg|otf|ttf|eot|woff)$/,
        loader: 'file-loader'
      }
    ],
    noParse: [/dist\/ol.js/, /dist\/jspdf.debug.js/]
  },
  externals: {
    'cheerio': 'window',
    'react/addons': true,
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true
  }
};
