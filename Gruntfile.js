module.exports = function(grunt) {
    require("load-grunt-tasks")(grunt);
    var istanbulJpm = require("istanbul-jpm");

    // Load package.json
    var pkg = grunt.file.readJSON("package.json");
    var dependencies = Object.keys(pkg.dependencies).map(function(d) {
        return d + "/**/*";
    });
    dependencies.push("is-buffer/**/*");
    dependencies.push("charenc/**/*");
    dependencies.push("crypt/**/*");

    grunt.initConfig({
        preVersion: "01",
        pkg: pkg,
        banner:
            "/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today(\"yyyy-mm-dd\") %>\n" +
            "<%= pkg.homepage ? \" * \" + pkg.homepage + \"\\n\" : \"\" %>" +
            " * Copyright (c) <%= grunt.template.today(\"yyyy\") %> <%= pkg.author.name || pkg.author %>;\n" +
            " * This Source Code Form is subject to the terms of the Mozilla Public License,\n" +
            " * v. 2.0. If a copy of the MPL was not distributed with this file, You can\n" +
            " * obtain one at https://mozilla.org/MPL/2.0/.\n */\n",
        defaultLang: "en-US",
        locales: function() {
            var locales = {};
            grunt.file.expand({ cwd: "locale" }, "*.json").forEach(function(file) {
                var lang = file.split(".")[0];
                locales[lang] = grunt.file.readJSON("locale/" + file);
                if(!("title" in locales[lang]))
                    delete locales[lang];
            });
            grunt.config.set('package.translate.add.locales', locales);
            return locales;
        },
        transifex: {
            mainProperties: {
                options: {
                    targetDir: 'build/locale',
                    project: 'live-stream-notifier',
                    resources: ['mainproperties'],
                    filename: '_lang_.properties',
                    templateFn: function(strings) {
                        return strings.sort(function(a, b) {
                            return a.key.localeCompare(b.key);
                        }).reduce(function(p, string) {
                            return p + string.key + "=" + string.translation + "\n";
                        }, "");
                    }
                }
            },
            packageJson: {
                options: {
                    targetDir: 'locale',
                    project: 'live-stream-notifier',
                    resources: ['packagejson'],
                    filename: '_lang_.json',
                    skipLanguages: [ 'en_US' ],
                    templateFn: function(strings) {
                        return JSON.stringify(strings.sort(function(a, b) {
                            return a.key.localeCompare(b.key);
                        }).reduce(function(p, string) {
                            p[string.key] = string.translation;
                            return p;
                        }, {}));
                    }
                }
            }
        },
        clean: {
            docs: {
                files: {
                    src: ['doc/**', '!*.jpg']
                }
            },
            build: {
                files: {
                    src: ['*.xpi', 'build', 'locale/*.json', '!locale/<%= defaultLang %>.json']
                }
            },
            scratch: {
                files: {
                    src: ['**/*~']
                }
            },
            coverage: {
                files: {
                    src: ['coverage', 'build/instrument', 'build/node_modules/istanbul-jpm']
                }
            },
            jpmGarbage: {
                files: {
                    src: ['bootstrap.js', 'install.rdf']
                }
            },
            translate: {
                files: {
                    src: [ '**/locale/*_*.*' ]
                }
            },
            dev: {
                files: {
                    src: ['build/test', 'build/**/.eslintrc.json', 'build/**/*.js.map']
                }
            }
        },
        copy: {
            translate: {
                expand: true,
                src: [ 'build/locale/*_*.properties', 'locale/*_*.json' ],
                dest: '',
                rename: function(dest, src) {
                    return dest + src.replace("_", "-");
                }
            },
            build: {
                files: [
                    {
                        expand: true,
                        cwd: 'node_modules',
                        src: dependencies,
                        dest: 'build/node_modules'
                    },
                    {
                        expand: true,
                        cwd: '.',
                        src: ['LICENSE'],
                        dest: 'build/'
                    },
                    {
                        expand: true,
                        cwd: 'webextension/assets/images',
                        src: ['icon48.png', 'icon64.png'],
                        dest: 'build/'
                    },
                    {
                        expand: true,
                        cwd: 'webextension',
                        src: ['**/*', '!**/*~'],
                        dest: 'build/webextension'
                    },
                    {
                        expand: true,
                        cwd: 'webextension/_locales',
                        src: ['**/*'],
                        dest: 'build/_locales'
                    }
                ]
            },
            dev: {
                files: [
                    {
                        expand: true,
                        cwd: 'test',
                        src: ['**/*', '!**/*~', '!.eslintrc.json'],
                        dest: 'build/test'
                    },
                    {
                        expand: true,
                        cwd: 'locale',
                        src: ['*.properties'],
                        dest: 'build/locale'
                    },
                    {
                        expand: true,
                        src: ['**/.eslintrc.json', '!node_modules/**/*'],
                        dest: 'build'
                    }
                ]
            },
            coverage: {
                files: [
                    {
                        expand: true,
                        cwd: 'node_modules',
                        src: ['istanbul-jpm/**/*'],
                        dest: 'build/node_modules'
                    }
                ]
            }
        },
        "package": {
            translate: {
                pretty: 2,
                srcDir: "build/",
                destDir: "build/",
                add: {
                    "title": "<%= locales()[defaultLang].title %>",
                    "description": "<%= locales()[defaultLang].description %>"
                }
            },
            dev: {
                pretty: 2,
                srcDir: ".",
                destDir: "build/",
                add: {
                    "version": "<%= pkg.version %>-rc<%= preVersion %>"
                }
            },
            build: {
                pretty: 2,
                srcDir: '.',
                destDir: 'build/',
                remove: [
                    "devDependencies",
                    "scripts"
                ],
                add: {
                    "engines": {
                        "firefox": "<%= pkg.engines.firefox %>"
                    }
                }
            }
        },
        header: {
            build: {
                options: {
                    text: '<%= banner %>'
                },
                files: [
                    {
                        expand: true,
                        cwd: 'build/lib',
                        src: ['**/*.js'],
                        dest: 'build/lib'
                    }
                ]
            }
        },
        babel: {
            options: {
                plugins: [
                    [
                        "transform-es2015-modules-commonjs-simple",
                        {
                            loose: false,
                            noMangle: true
                        }
                    ],
                    "transform-class-properties"
                ]
            },
            build: {
                options: {
                    shouldPrintComment: function(comment) {
                        return comment.indexOf("@") == -1;
                    }
                },
                files: [
                    {
                        expand: true,
                        cwd: 'lib',
                        src: ['**/*.js', "!**/*~", "!**/.eslintrc.json"],
                        dest: 'build/lib'
                    },
                ]
            },
            dev: {
                options: {
                    sourceMaps: true,
                    // workaround remap-istanbul not handling relative paths properly
                    //TODO currently maps lib/ to build/lib/
                    sourceRoot: 'build/instrument/build',
                    presets: [
                        'es2017'
                    ]
                },
                files: [
                    {
                        expand: true,
                        cwd: 'lib/',
                        src: ['**/*.js', "!**/*~", "!**/.eslintrc.json"],
                        dest: 'build/lib'
                    },
                ]
            }
        },
        instrument: {
            files: 'build/lib/**/*.js',
            options: {
                lazy: true,
                basePath: 'build/instrument/',
                instrumenter: istanbulJpm.Instrumenter
            }
        },
        storeCoverage: {
            options: {
                dir: 'coverage/reports'
            }
        },
        makeReport: {
            src: 'coverage/reports/**/*.json',
            options: {
                type: 'lcov',
                dir: 'coverage/reports',
                print: 'detail'
            }
        },
        env: {
            coverage: {
                JPM_MEASURING_COVERAGE: true
            }
        },
        coveralls: {
            options: {
                src: 'coverage/reports/lcov.info',
                force: true
            }
        },
        remapIstanbul: {
            build: {
                files: [
                    {
                        src: 'coverage/reports/coverage.json',
                        dest: 'coverage/reports/coverage.json',
                        type: 'json',
                        basePath: 'build/instrument/build/lib'
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks('remap-istanbul');

    grunt.registerTask('readcoverageglobal', 'Reads the coverage global JPM wrote', function() {
        global.__coverage__ = require("istanbul-jpm/global-node").global.__coverage__;
        grunt.log.ok("Read '__coverage__' global stored in /tmp/istanbul-jpm-coverage.json");
    });

    grunt.registerTask('prepare-test', [ 'copy:build', 'babel:dev', 'copy:dev', 'package:dev' ]);
    grunt.registerTask('rename-translate', [ 'copy:translate', 'clean:translate' ]);
    grunt.registerTask('coverage', ['env:coverage', 'clean:coverage', 'instrument', 'copy:coverage' ]);
    grunt.registerTask('after-coverage', ['readcoverageglobal', 'storeCoverage', 'remapIstanbul', 'clean:dev', 'makeReport']);
    grunt.registerTask('test', ['prepare-test', 'coverage']);
    grunt.registerTask('build', ['clean', 'copy:build', 'babel:build', 'header', 'transifex', 'rename-translate', 'package:build', 'package:translate']);
    grunt.registerTask('dev', ['copy:build', 'babel:dev', 'copy:dev', 'package:dev', 'transifex:packageJson', 'rename-translate', 'package:translate' ]);

    grunt.registerTask('default', ['test']);
};
