const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const manifest = require("./webextension/manifest.json");

const langs = [
        "en",
        "de",
        "es_MX",
        "hr",
        "uk_UA"
    ],
    defaultLanguage = manifest.default_locale;

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
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel',
                query: {
                    plugins: [
                        "transform-async-to-generator",
                        "transform-class-properties",
                        "transform-es2015-modules-commonjs-simple"
                    ]
                }
            },
            {
                test: /\.(svg|png)$/,
                loader: 'file?name=assets/images/[name].[ext]'
            },
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract('style', 'css')
            }
        ]
    },
    plugins: [
		new ExtractTextPlugin("[name]/style.css"),
		new HtmlWebpackPlugin({
		    template: 'src/manager/index.html',
		    filename: 'manager/index.html',
		    chunks: [ 'manager' ],
		    inject: 'head',
		    favicon: 'webextension/assets/images/icon32.png',
		    defaultLanguage,
		    langs
	    }),
	    new HtmlWebpackPlugin({
	        template: 'src/list/index.html',
	        filename: 'list/index.html',
	        chunks: [ 'list' ],
	        inject: 'head',
	        defaultLanguage,
	        langs
        })
    ]
};
