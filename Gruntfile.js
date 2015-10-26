module.exports = function(grunt) {
    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        firefoxBinary: process.env.JPM_FIREFOX_BINARY || 'firefox-trunk',
        pkg: grunt.file.readJSON("package.json"),
        shell: {
            jpmTest: {
                command: 'jpm test -b <%= firefoxBinary %> --tbpl'
            }
        },
        jshint: {
            options: {
                jshintrc: true
            },
            test: {
                files: {
                    src: ['**/*.js', '!node_modules/**/*', '!doc/**/*']
                }
            }
        },
        jpm: {
            options: {
                src: 'build/',
                xpi: '.',
                "firefox-bin": '<%= firefoxBinary %>'
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
                        src: ['**/*.js*', '!**/*~'],
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
                        src: ['**/*', '!**/*~'],
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
                    "version": "<%= pkg.version %>-alpha+<%= githash.main.short %>"
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
        }
    });

    grunt.registerTask('test', ['jshint', 'shell:jpmTest']);
    grunt.registerTask('build', ['copy:build', 'transifex', 'package:build', 'jpm:xpi']);
    grunt.registerTask('dev', [ 'githash', 'copy', 'copy:dev', 'package:dev', 'jpm:xpi']);

    grunt.registerTask('default', ['test']);
};
