var colors = require('colors');
colors.setTheme(require('colors/themes/generic-logging'));

var Promise = require('bluebird');
var crypto = require('crypto');
var path = require('path');
var cmd = require('child_process');
var fs = require('fs');
var argv = require('yargs')
    .usage('Usage: $0 --config-file [string] --hash-alg [string] --hash-file [string]')
    .option('config-file', {
        alias: 'cf',
        describe: '- a config file path: file-check.json.',
        type: 'string',
        demand: true
    })
    .option('hash-alg', {
        alias: 'ha',
        describe: '- a cryptographic hash function.',
        type: 'string',
        default: 'md5',
        choices: crypto.getHashes()
    })
    .option('hash-file', {
        alias: 'hf',
        describe: '- a file path with hashes.',
        type: 'string',
        default: 'file-check.hash'
    })
    .check(function (argv) {
        crypto.createHash(argv['hash-alg']);
        return fs.existsSync(argv['config-file']);
    })
    .argv;

start().finally(() => console.log('app: done.'));

function start() {
    return Promise.coroutine(function* () {
        var config = yield loadJson(argv['config-file']);
        var hashes = yield loadJson(argv['hash-file']);

        yield Promise.map(Object.keys(config.files),
            Promise.coroutine(function* (file) {
                try {
                    console.log(`file: ${file} found.`.info);

                    var oldHash = hashes[file];
                    var newHash = yield computeHash(file, argv['hash-alg']);

                    console.log(`file: ${file} has old '${oldHash}' and new '${newHash}' hashes.`);

                    if (oldHash !== newHash) {
                        console.log(`file: ${file} changed.`.info);

                        var meta = config.files[file];
                        var command = (meta.command || 'echo unknown command for: ${file}:${hash}')
                            .replace('${file}', file).replace('${hash}', newHash);
                        yield execCommand(command, path.dirname(file));
                        hashes[file] = newHash;

                        console.log(`file: ${file} handled.`.info);
                    }

                    return newHash;
                } catch (e) {
                    console.error(`file: ${file} ${e.toString()}`.error);
                }
            }));

        yield saveJson(argv['hash-file'], hashes);
        console.log('app: hashes is saved!');
    }).call(this);
}

function loadJson(filePath) {
    return new Promise(resolve => {
        fs.readFile(filePath, 'utf8',
            (error, content) => resolve(error ? {} : JSON.parse(content)));
    });
}

function saveJson(filePath, data) {
    return new Promise((resolve, reject) => {
        var json = JSON.stringify(data);
        fs.writeFile(filePath, json, 'utf8',
            error => error ? reject(error) : resolve(json));
    });
}

function computeHash(filePath, hashName) {
    return new Promise(resolve => {
        fs.exists(filePath, exists => {
            if (!exists) {
                console.log(`file: ${filePath} does not exist.`.warn);
                return resolve(null);
            }
            var hashSum = crypto.createHash(hashName);
            var s = fs.ReadStream(filePath);
            s.on('data', data => hashSum.update(data));
            s.on('end', () => resolve(hashSum.digest('hex')));
        });
    });
}

function execCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        var child = cmd.exec(command, { cwd: cwd }, error => error && reject(error));
        child.stdout.on('data', data => {
            console.log(`pid(${child.pid}): ${data}`.verbose);
        });
        child.stderr.on('data', data => {
            console.error(`pid(${child.pid}): ${data}`.verbose);
        });
        child.on('close', code => resolve(code));
    });
}