// old config
const path = require("path");

module.exports = {
  target: "web",
  mode: "development",
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "build.js",
    path: path.resolve(__dirname, "dist"),
  },
  // devtool: 'eval',
  plugins: [],
  optimization: {
    usedExports: false,
  },
};
// module.exports = {
//   target: "web",
//   mode: "development",
//   entry: "./src/index.ts",
//   module: {
//     rules: [
//       {
//         test: /\.tsx?$/,
//         use: "ts-loader",
//         exclude: /node_modules/,
//       },
//     ],
//   },
//   resolve: {
//     extensions: [".tsx", ".ts", ".js"],
//   },
//   output: {
//     filename: "build.js",
//     path: path.resolve(__dirname, "dist"),
//   },
//   // devtool: 'eval',
//   devtool: "inline-source-map",
//   devServer: {
//     static: {
//       directory: __dirname,
//     },
//     watchFiles: ["src/**/*"],
//     liveReload: true,
//   },
//   plugins: [],
//   optimization: {
//     usedExports: false,
//   },
//   // mode: "production",
// };
