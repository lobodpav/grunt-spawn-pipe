'use strict';

var spawn = require('child_process').spawn;

var firstChild = null;

/**
 * Checks commands to be passed to spawn();
 * @param {Array} commands Commands to validate. Format: [{cmd: 'ls', args: ['-la', '/']}, {cmd: 'grep', args: ['tmp', ...]}, ...]
 * @returns {String} Null in case of validation success, {String} description in case of failure
 */
function validateCommands(commands) {
    if (!Array.isArray(commands))
        return 'Argument must be of `array` type';
    if (commands.length <= 0)
        return 'Array must not be empty';

    // check every command in the array
    for (var i = 0; i < commands.length; i++) {
        var item = commands[i];
        if (typeof item !== 'object')
            return 'Every item in the array must be of `object` type';

        // command check
        if (!('cmd' in item))
            return 'Every command in the array must contain `cmd` property';
        if (typeof item.cmd !== 'string')
            return 'Every `cmd` property must be of `string` type';

        // arguments' check
        if ('args' in item) {
            var args = item.args;

            if (!Array.isArray(args))
                return 'Command arguments `args` must be of `array` type';

            for (var j = 0; j < args.length; j++) {
                if (typeof args[j] !== 'string')
                    return 'Every arguments within `args` array must be of `string` type';
            }
        }
    }

    return null;
}

/**
 * Create new options object. Default options: {cwd: process.cwd, env: process.env}
 * @param {Object} options Options to override defaults
 * @returns {Object} Options to use
 */
function getOptions(options) {
    // use current process cwd and environment as defaults
    var opts = {opts: {cwd: process.cwd, env: process.env}};

    if (typeof options === 'object') {
        // override default CWD if one was provided
        if ('cwd' in options && typeof options.cwd === 'string')
            opts.cwd = options.cwd;

        // override default ENV if one was provided
        if ('env' in options && typeof options.env === 'object')
            opts.env = options.env;
    }

    return opts;
}

/**
 * Pipes ChildProcess' output into target output. Handles errors on the child.
 * @param {String} command Command being piped. For logging purposes.
 * @param {Object} child ChildProcess returned by Node's spawn()
 * @param {Object} stdoutTarget Readable stream where to redirect stdin of the child, for example process.stdout
 * @param {Object} stderrTarget Readable stream where to redirect stderr of the child, for example process.stderr
 */
function pipe(command, child, stdoutTarget, stderrTarget) {
    child.stdin.on('error', function(err) {
        stderrTarget.write('stdin error for `' + command + '` command. ' + err + '\n');
    });

    child.stdout.pipe(stdoutTarget);
    child.stderr.on('data', function(data) {
        // skip output of execvp() call - we have already handled that in `error` event on the child
        if (!/^execvp\(\)/.test(data))
            stderrTarget.write(data);
    });

    child.on('error', function (err) {
        process.stderr.write('Failed to execute `' + command + '` command. ' + err + '\n');
        // kill the first child to ensure long running process will be terminated;
        // for example running `yes | blah` would cause `blah` spawn to fail but `yes` would keep on running forever if we would not kill it
        firstChild.kill();
    });
}

/**
 * Spawns all commands provided and pipe them to create chain. Thanks to spawn() you can pipe never ending processes, for example: `yes | tr '\n' ', '`.
 * All STDERRs are mapped to `process.stderr`. Last command's output is mapped to `process.stdout`.
 * @param {Array} commands Commands to execute. Format: [{cmd: 'ls', args: ['-la', '/']}, {cmd: 'grep', args: ['tmp']}, ...]
 * @param {Object} [options] Options to override default {cwd: process.cwd, env: process.env}
 * @param {Function} callback Single-argument callback triggered once execution of the last command is completed. Received argument contains last command's exit code.
 */
function spawnAndPipe(commands, options, callback) {
    // manage optional options
    if (typeof callback === 'undefined') {
        callback = options;
        options = undefined;
    }

    if (typeof callback !== 'function')
        throw new TypeError('Callback must be of `function` type');

    var check = validateCommands(commands);
    if (check !== null)
        throw new TypeError(check);

    var len = commands.length;
    var opts = getOptions(options);

    var previousCommand, currentCommand;
    var previousChild, currentChild;

    // prepare first command in the row
    previousCommand = currentCommand = commands[0];
    firstChild = previousChild = currentChild = spawn(currentCommand.cmd, currentCommand.args, opts);

    // spawn commands after the first one and pipe output of previous child into input of current one
    for (var i = 1; i < len; i++) {
        currentCommand = commands[i];
        currentChild = spawn(currentCommand.cmd, currentCommand.args, opts);

        pipe(previousCommand.cmd, previousChild, currentChild.stdin, process.stderr);

        previousCommand = currentCommand;
        previousChild = currentChild;
    }

    // last command in the piped chain will write its output into stdout of the current process
    pipe(currentCommand.cmd, currentChild, process.stdout, process.stderr);

    // watch for completion
    currentChild.on('close', function (exitCode) {
        // kill the first child to ensure long running process will be terminated;
        // for example running `yes | grep n | grep -A` would cause `grep -A` spawn to fail because `-A` argument
        // requires additional numerical argument but `yes` would keep on running forever if we would not kill it
        firstChild.kill();
        return callback(exitCode);
    });
}

module.exports = spawnAndPipe;
