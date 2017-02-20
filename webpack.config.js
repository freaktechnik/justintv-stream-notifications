const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const manifest = require("./webextension/manifest.json");

const defaultLanguage = manifest.default_locale;

module.exports = {
    entry: {
        background: "./src/background/index.js",
        list: "./src/list/index.js",
        manager: "./src/manager/index.js"
    },
    output: {
        path: "webextension",
        filename: "[name]/index.js"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    plugins: [
                        "transform-class-properties",
                        "transform-es2015-modules-commonjs-simple"
                    ]
                }
            },
            {
                test: /\.(svg|png)$/,
                loader: 'file-loader?name=assets/images/[name].[ext]'
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: 'css-loader'
                })
            }
        ]
    },
    plugins: [
		new ExtractTextPlugin({
            filename: "[name]/style.css"
        }),
		new HtmlWebpackPlugin({
		    template: 'src/manager/index.html',
		    filename: 'manager/index.html',
		    chunks: [ 'manager' ],
		    favicon: 'webextension/assets/images/icon32.png',
		    defaultLanguage
	    }),
	    new HtmlWebpackPlugin({
	        template: 'src/list/index.html',
	        filename: 'list/index.html',
	        chunks: [ 'list' ],
	        defaultLanguage
        })
    ],
    devtool: "inline-source-map"
};
