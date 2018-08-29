const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackIncludeAssetsPlugin = require("html-webpack-include-assets-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const manifest = require("./webextension/manifest.json");
const webpack = require("webpack");
const path = require("path");
const WebpackDeepScopeAnalysisPlugin = require("webpack-deep-scope-plugin").default;

const defaultLanguage = manifest.default_locale;

module.exports = {
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
                exclude: path.resolve(__dirname, './node_modules'),
                loader: 'babel-loader',
                options: {
                    babelrc: false,
                    plugins: [
                        "@babel/plugin-proposal-class-properties"
                    ]
                }
            },
            {
                test: /\.(svg|png)$/,
                loader: 'file-loader',
                options: {
                    name: "[name].[ext]",
                    useRelativePath: false,
                    publicPath: '/assets/images/',
                    outputPath: 'assets/images/'
                }
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            },
            {
                test: /_locales\/[a-zA-Z_]{2,5}\/messages\.json$/,
                issuer: {
                    exclude: /insert-string\.js$/,
                },
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[path][name].[ext]'
                        }
                    },
                    'transifex-loader'
                ],
                type: "javascript/auto"
            },
            {
                test: /\.jsx$/,
                loader: 'babel-loader',
                include: path.resolve(__dirname, './src/list'),
                options: {
                    babelrc: false,
                    presets: [
                        '@babel/preset-react'
                    ],
                    plugins: [
                        [
                            "transform-react-remove-prop-types",
                            {
                                mode: 'remove',
                                removeImport: true,
                                classNameMatchers: [
                                    "NavigateableItem",
                                    "NavigateableList"
                                ]
                            }
                        ],
                        "@babel/plugin-transform-react-constant-elements",
                        "@babel/plugin-transform-react-inline-elements"
                    ]
                }
            }
        ]
    },
    optimization: {
        minimize: false,
        splitChunks: {
            chunks: 'all',
            name: 'common'
        },
        runtimeChunk: 'single'
    },
    resolve: {
        extensions: [],
        mainFiles: []
    },
    devtool: false,
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name]/style.css"
        }),
        new HtmlWebpackPlugin({
            template: 'src/manager/index.html',
            filename: 'manager/index.html',
            chunks: [
                'runtime',
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
                'runtime',
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
                'runtime',
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
                'runtime',
                'popup/errorState'
            ],
            chunksSortMode: 'dependency',
            defaultLanguage
        }),
        new HtmlWebpackIncludeAssetsPlugin({
            files: [
                'popup/list/index.html'
            ],
            assets: [
                'lodash.min.js',
                'react.production.min.js',
                'react-dom.production.min.js',
                'redux.min.js',
                'react-redux.min.js',
                'prop-types.min.js',
                'react-key-handler.js',
                'reselect.js'
            ],
            append: false,
            publicPath: '/vendor/'
        }),
        new webpack.EnvironmentPlugin([ 'NODE_ENV' ]),
        new WebpackDeepScopeAnalysisPlugin()
    ],
    externals: {
        lodash: '_',
        react: 'React',
        'react-dom': 'ReactDOM',
        'react-redux': 'ReactRedux',
        redux: 'Redux',
        'prop-types': 'PropTypes',
        'react-key-handler': 'ReactKeyHandler',
        'reselect': 'Reselect'
    },
    performance: {
        maxEntrypointSize: 800000,
        maxAssetSize: 800000
    }
};
