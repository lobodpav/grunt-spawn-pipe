'use strict';

var spawn = require('./lib/spawn');

module.exports = function(grunt) {
    grunt.registerMultiTask('spawnPipe', 'Run and pipe commands using spawn()', function() {
        // merge target specific options with provided defaults
        var options = this.options({
            cwd: process.cwd,
            env: process.env
        });

        // force task into async mode and grab a handle to the `done` function
        var done = this.async();

        var commands = this.data.commands;
        if (!Array.isArray(commands))
            throw new Error('Missing or invalid list of commands in your Gruntfile configuration');

        spawn(commands, options, function(exitCode) {
            return done(exitCode === 0);
        });
    });
};
