module.exports = function(grunt) {
    require("load-grunt-tasks")(grunt);
    var istanbulJpm = require("istanbul-jpm");

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        firefoxBinary: process.env.JPM_FIREFOX_BINARY || 'firefox-trunk',
        banner:
            '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? " * " + pkg.homepage + "\\n" : "" %>' +
            ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name || pkg.author %>;\n' +
            ' * This Source Code Form is subject to the terms of the Mozilla Public License,\n' +
            ' * v. 2.0. If a copy of the MPL was not distributed with this file, You can\n' +
            ' * obtain one at https://mozilla.org/MPL/2.0/.\n */\n',
        shell: {
            jpmTest: {
                command: 'jpm test --tbpl -b <%= firefoxBinary %>',
                failOnError: false
            }
        },
        jshint: {
            options: {
                jshintrc: true
            },
            test: {
                files: {
                    src: ['**/*.js', '!node_modules/**/*', '!doc/**/*', '!build/**/*', '!coverage/**/*']
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
                    project: 'jtvn',
                    endpoint: 'http://beta.babelzilla.org/api/2/',
                    resources: ['enproperties'],
                    filename: '_lang_.properties',
                    templateFn: function(strings) {
                        return strings.sort(function(a, b) {
                            return a.key.localeCompare(b.key);
                        }).reduce(function(p, string) {
                            return p + string.key + "=" + string.translation + "\n";
                        }, "");
                    }
                }
            }
        },
        clean: {
            docs: {
                files: {
                    src: ['doc']
                }
            },
            build: {
                files: {
                    src: ['*.xpi', 'build']
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
            }
        },
        jsdoc: {
            dist: {
                src: ['transpiled/lib/**/*.js', 'README.md', 'package.json'],
                options: {
                    destination: 'doc'
                }
            }
        },
        copy: {
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
                        cwd: 'lib',
                        src: ['**/*.js*', '!**/*~', '!.jshintrc'],
                        dest: 'build/lib'
                    },
                    {
                        expand: true,
                        cwd: 'node_modules',
                        src: ['jetpack-homepanel/**/*'],
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
            }
        },
        "package": {
            dev: {
                pretty: 2,
                srcDir: ".",
                destDir: "build/",
                add: {
                    "version": "<%= pkg.version %>.9999-pre2"
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
                presets: ['babel-preset-es2015']
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
            }
        },
        instrument: {
            files: 'lib/**/*.js',
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
            }
        },
        coveralls: {
            options: {
                src: 'coverage/reports/lcov.info',
                force: true
            }
        }
    });

    grunt.registerTask('readcoverageglobal', 'Reads the coverage global JPM wrote', function() {
        global.__coverage__ = require("istanbul-jpm/global-node").global.__coverage__;
        grunt.log.ok("Read __coverage__ global stored in /tmp/istanbul-jpm-coverage.json");
    });

    grunt.registerTask('quicktest', ['jshint', 'shell:jpmTest']);
    grunt.registerTask('coverage', ['env:coverage', 'clean:coverage', 'instrument', 'shell:jpmTest', 'readcoverageglobal', 'storeCoverage', 'makeReport']);
    grunt.registerTask('test', ['jshint', 'coverage']);
    grunt.registerTask('build', ['copy:build', 'comments', 'header', 'transifex', 'package:build', 'jpm:xpi']);
    grunt.registerTask('dev', [ 'githash', 'copy', 'copy:dev', 'package:dev', 'jpm:xpi']);
    // Need to transpile until jsdoc 3.3.0
    grunt.registerTask('doc', ['babel', 'jsdoc', 'clean:transpile']);

    grunt.registerTask('default', ['test']);
};
