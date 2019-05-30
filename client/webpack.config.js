const path = require("path");
const webpack = require("webpack");

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
      port: 8000,
      historyApiFallback: true
    },
    plugins: [
      new webpack.DefinePlugin({
        "SERVER_URI": JSON.stringify(process.env["SERVER_URI"] || "http://localhost:5000/")
      })
    ]
};
