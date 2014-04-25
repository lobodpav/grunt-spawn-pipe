# grunt-spawn-pipe

> Execute your long-running app and pipe its output somewhere else.

# Intro

You have a long running app and you want its output to be processed by another utility.
For example, if your Node.js app uses Bunyan for logging, you surely want the output to be pretty-printed. I.e. to pipe the output of your app to Bunyan.

Existing Grunt plugins use two approaches:

1. Using `child_process.exec()` allows to easily pipe commands but will terminate your app once its buffer gets full. Not a solution for long running apps.
2. Using `child_process.spawn()` fixes the buffer issue but does not allow easy piping.

This plugin is here to allow you to spawn processes and pipe them together.

# Getting Started

This plugin requires Grunt `~0.4.0` and was tested on OS X operating system.

Install the plugin:

```
npm install grunt-spawn-pipe --save-dev
```

Once the plugin is installed, enable it inside your Gruntfile:

```js
grunt.loadNpmTasks('grunt-spawn-pipe');
```

# spawnPipe task

Run this task with the `grunt spawnPipe` command.

### Options

The options you set are passed over to every call to Node's `spawn()` function.
Read [Node doc](http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) for more details on which options you can set.

### Usage example

```js
module.exports = function(grunt) {
    grunt.initConfig({
        spawnPipe: {
            ls: {
                options: {
                    cwd: '/'
                },
                commands: [
                    {cmd: 'ls',   args: ['-la']},
                    {cmd: 'grep', args: ['etc']}
                ]
            },
            startDev: {
                commands: [
                    {cmd: 'node',   args: ['src/index.js']},
                    {cmd: 'bunyan', args: ['-o', 'short', '--color']}
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-spawn-pipe');
}
```

`options` and `args` properties are optional. The rest is mandatory.

# Technical details

### Output piping

* The plugin pipes `stdout` of the first command to `stdin` of the second command and so on.
* All `stderr`s are piped to `stderr` of the process executing the spawn commands.
* `stdout` of the last command is piped to `stdout` of the process executing the spawn commands.

### Error handling

If an error occurs in any of the command for example because of a typo in command name, the first command is killed to ensure the whole piped chain gets terminated.

### Environment

`process.cwd` and `process.env` are used as defaults for all `spawn()` calls. You can override these values in task `options`.
