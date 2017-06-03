const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const manifest = require("./webextension/manifest.json");
const webpack = require("webpack");
const path = require("path");

const defaultLanguage = manifest.default_locale;

module.exports = {
    entry: {
        background: "./src/background/index.js",
        list: "./src/list/index.js",
        manager: "./src/manager/index.js",
        options: "./src/options/index.js"
    },
    output: {
        path: path.resolve(__dirname, "./webextension"),
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
                        "transform-class-properties"
                        //TODO somehow has asyncToGenerator
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
            },
            {
                test: /_locales\/[a-zA-Z_]{2,5}\/messages\.json$/,
                use: [
                    'file-loader?name=[path][name].[ext]',
                    'transifex-loader'
                ]
            }
        ]
    },
    plugins: [
		new ExtractTextPlugin({
            filename: "[name]/style.css"
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: "content", //TODO ensure this excludes common
            chunks: [
                'manager',
                'list',
                'options'
            ]
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: "common",
            chunks: [
                'manager',
                'list',
                'background' //TODO options not included because it doesn't use port.
            ]
        }),
		new HtmlWebpackPlugin({
		    template: 'src/manager/index.html',
		    filename: 'manager/index.html',
		    chunks: [
                'common',
                'content',
                'manager'
            ],
		    defaultLanguage
	    }),
	    new HtmlWebpackPlugin({
	        template: 'src/list/index.html',
	        filename: 'list/index.html',
	        chunks: [
                'common',
                'content',
                'list'
            ],
	        defaultLanguage
        }),
        new HtmlWebpackPlugin({
            template: 'src/options/index.html',
            filename: 'options/index.html',
            chunks: [
                'content',
                'options'
            ],
            defaultLanguage
        })
    ],
    externals: {
        underscore: '_',
        'event-target-shim': 'eventTargetShim'
    }
};
