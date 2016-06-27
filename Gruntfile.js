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
        preVersion: 7,
        pkg: pkg,
        firefoxBinary: process.env.JPM_FIREFOX_BINARY || '/usr/bin/firefox-trunk',
        banner:
            '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? " * " + pkg.homepage + "\\n" : "" %>' +
            ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name || pkg.author %>;\n' +
            ' * This Source Code Form is subject to the terms of the Mozilla Public License,\n' +
            ' * v. 2.0. If a copy of the MPL was not distributed with this file, You can\n' +
            ' * obtain one at https://mozilla.org/MPL/2.0/.\n */\n',
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
        shell: {
            jpmTest: {
                command: 'jpm test -b <%= firefoxBinary %>'
            }
        },
        jshint: {
            options: {
                jshintrc: true
            },
            test: {
                files: {
                    src: ['transpiled/**/*.js', 'Gruntfile.js', 'data/**/*.js']
                }
            }
        },
        jpm: {
            options: {
                src: 'build/',
                xpi: '.',
                "firefox-bin": "<%= firefoxBinary %>"
            }
        },
        transifex: {
            mainProperties: {
                options: {
                    targetDir: 'build/locale',
                    project: 'live-stream-notifier',
                    resources: ['mainproperties'],
                    filename: '_lang_.properties',
                    skipLanguages: [ 'en_US' ],
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
            transpile: {
                files: {
                    src: ['transpiled']
                }
            },
            coverage: {
                files: {
                    src: ['coverage']
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
            }
        },
        jsdoc: {
            dist: {
                src: ['lib/**/*.js', 'README.md', 'package.json'],
                options: {
                    destination: 'doc'
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
                        cwd: 'data',
                        src: ['**/*', '!**/*~'],
                        dest: 'build/data'
                    },
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
                        cwd: 'data',
                        src: ['icon.png', 'icon64.png'],
                        dest: 'build/'
                    }
                ]
            },
            dev: {
                files: [
                    {
                        expand: true,
                        cwd: 'test',
                        src: ['**/*', '!**/*~', '!.jshintrc'],
                        dest: 'build/test'
                    },
                    {
                        expand: true,
                        cwd: 'locale',
                        src: ['*.properties'],
                        dest: 'build/locale'
                    }
                ]
            },
            transpile: {
                files: [
                    {
                        expand: true,
                        src: ['**/.jshintrc'],
                        dest: 'transpiled'
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
                    "version": "<%= pkg.version %>-pre<%= preVersion %>"
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
        githash: {
            main: {
                options: {}
            }
        },
        comments: {
            build: {
                options: {
                    singleline: false,
                    multiline: true
                },
                src: [ 'build/lib/**/*.js' ]
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
                        src: ['**/*.js*'],
                        dest: 'build/lib'
                    }
                ]
            }
        },
        babel: {
            options: {
                plugins: [
                    [
                        "transform-async-to-module-method",
                        {
                            // this will mostly work.
                            module: "../utils",
                            method: "async"
                        }
                    ],
                    [
                        "transform-es2015-modules-commonjs-simple",
                        {
                            loose: false,
                            noMangle: true
                        }
                    ]
                ]
            },
            transpile: {
                files: [
                    {
                        expand: true,
                        cwd: 'lib',
                        src: ['**/*.js', "!**/*~"],
                        dest: 'transpiled/lib'
                    },
                    {
                        expand: true,
                        cwd: 'test',
                        src: ['**/*.js'],
                        dest: 'transpiled/test'
                    }
                ]
            },
            defuture: {
                files: [
                    {
                        expand: true,
                        cwd: 'lib',
                        src: ['**/*.js', "!**/*~", "!**/.jshintrc"],
                        dest: 'build/lib'
                    },
                ]
            }
        },
        instrument: {
            files: 'transpiled/lib/**/*.js',
            options: {
                lazy: true,
                basePath: 'coverage/instrument/',
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
            },
            run: {
                FIREFOX_BIN: '<%= firefoxBinary %>'
            }
        },
        coveralls: {
            options: {
                src: 'coverage/reports/lcov.info',
                force: true
            }
        },
        bower: {
            build: {
                dest: 'build/data'
            }
        }
    });

    grunt.registerTask('readcoverageglobal', 'Reads the coverage global JPM wrote', function() {
        global.__coverage__ = require("istanbul-jpm/global-node").global.__coverage__;
        grunt.log.ok("Read '__coverage__' global stored in /tmp/istanbul-jpm-coverage.json");
    });

    grunt.registerTask('rename-translate', [ 'copy:translate', 'clean:translate' ]);
    // babel-jshint
    grunt.registerTask('lint', ['babel:transpile', 'copy:transpile', 'jshint', 'clean:transpile']);
    grunt.registerTask('quicktest', ['lint', 'shell:jpmTest']);
    grunt.registerTask('coverage', ['env:coverage', 'clean:coverage', 'babel:transpile', 'instrument', 'clean:transpile', 'shell:jpmTest', 'readcoverageglobal', 'storeCoverage', 'makeReport']);
    grunt.registerTask('test', ['lint', 'coverage']);
    grunt.registerTask('prepare-common', ['babel:defuture', 'copy:build', 'bower']);
    grunt.registerTask('build', ['prepare-common', 'comments', 'header', 'transifex', 'rename-translate', 'package:build', 'package:translate', 'jpm:xpi']);
    grunt.registerTask('prepare-dev', ['githash', 'prepare-common', 'copy:dev', 'package:dev', 'transifex:packageJson', 'rename-translate', 'package:translate' ]);
    grunt.registerTask('dev', ['prepare-dev', 'jpm:xpi']);
    grunt.registerTask('run-dev', ['prepare-dev', 'env:run', 'jpm:run']);
    grunt.registerTask('doc', ['jsdoc']);

    grunt.registerTask('default', ['test']);
};
