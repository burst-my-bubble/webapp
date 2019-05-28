const path = require("path");

module.exports = {
  entry: "./js/app.jsx",
  output: {
    path: path.resolve(__dirname, "static/js"),
    filename: "app.bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.jsx$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  devServer: {
    publicPath: "/js",
    contentBase: "static",
    port: 8000
  }
}
