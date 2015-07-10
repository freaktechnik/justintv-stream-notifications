module.exports = function(grunt) {
    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        firefoxBinary: process.env.FIREFOX_BIN || '/usr/bin/firefox',
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
                    src: ['**/*.js', '!node_modules/**/*']
                }
            }
        },
        jpm: {
            options: {
                src: '.',
                xpi: '.',
                "firefox-bin": '<%= firefoxBinary %>'
            }
        },
        transifex: {
            mainProperties: {
                options: {
                    targetDir: './locale',
                    project: 'jtvn',
                    endpoint: 'http://beta.babelzilla.org/api/2/',
                    resources: ['enproperties'],
                    languages: ['de', 'fr', 'es-MX'],
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
        }
    });

    grunt.registerTask('test', ['jshint', 'shell:jpmTest']);
    grunt.registerTask('build', ['transifex', 'jpm:xpi']);

    grunt.registerTask('default', ['test']);
};
