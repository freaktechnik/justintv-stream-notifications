const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const manifest = require("./webextension/manifest.json");
const webpack = require("webpack");
const path = require("path");

const defaultLanguage = manifest.default_locale;

module.exports = {
    devtool: 'source-map',
    entry: {
        background: "./src/background/index.js",
        "popup/list": "./src/list/index.jsx",
        manager: "./src/manager/index.js",
        options: "./src/options/index.js",
        "popup/errorState": "./src/errorState/index.js"
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
                    babelrc: false,
                    plugins: [
                        "transform-class-properties"
                    ]
                }
            },
            {
                test: /\.(svg|png)$/,
                loader: 'file-loader',
                options: {
                    name: "[name].[ext]",
                    useRelativePath: false,
                    publicPath: '/',
                    outputPath: 'assets/images/'
                }
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
            },
            {
                test: /\.jsx$/,
                loader: 'babel-loader',
                options: {
                    babelrc: false,
                    presets: [
                        'react'
                    ]
                }
            }
        ]
    },
    plugins: [
		new ExtractTextPlugin({
            filename: "[name]/style.css"
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: "common",
            chunks: [
                'options',
                'manager',
                'popup/list',
                'background'
            ],
            minChunks: 3
        }),
		new HtmlWebpackPlugin({
		    template: 'src/manager/index.html',
		    filename: 'manager/index.html',
		    chunks: [
                'common',
                'manager'
            ],
            chunksSortMode: 'dependency',
		    defaultLanguage
	    }),
	    new HtmlWebpackPlugin({
	        template: 'src/list/index.html',
	        filename: 'popup/list/index.html',
	        chunks: [
                'common',
                'popup/list'
            ],
            chunksSortMode: 'dependency',
	        defaultLanguage
        }),
        new HtmlWebpackPlugin({
            template: 'src/options/index.html',
            filename: 'options/index.html',
            chunks: [
                'common',
                'options'
            ],
            chunksSortMode: 'dependency',
            defaultLanguage
        }),
        new HtmlWebpackPlugin({
            template: 'src/errorState/index.html',
            filename: "popup/errorState/index.html",
            chunks: [
                'popup/errorState'
            ],
            chunksSortMode: 'dependency',
            defaultLanguage
        })
    ],
    externals: {
        underscore: '_',
        'event-target-shim': 'eventTargetShim',
        'react': 'React',
        'react-dom': 'ReactDOM',
        'react-redux': 'ReactRedux',
        'redux': 'Redux'
    }
};
