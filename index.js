require('colors');

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

start()
    .finally(function () {
        console.log('app: done.');
    });

function start() {
    return Promise.join(
        loadJson(argv['config-file']),
        loadJson(argv['hash-file']),
        function (config, hashes) {
            return Promise.map(Object.keys(config.files), function (file) {
                console.log('file: ' + file + ' found.');

                return computeHash(file, argv['hash-alg'])
                    .then(function (newHash) {
                        try {
                            var oldHash = hashes[file];
                            if (oldHash === newHash) {
                                return Promise.resolve(newHash);
                            } else {
                                var meta = config.files[file];
                                var command = (meta.command || 'echo unknown command for: ${file}:${hash}')
                                    .replace('${file}', file).replace('${hash}', newHash);
                                return execCommand(command, path.dirname(file))
                                    .then(function () {
                                        hashes[file] = newHash;
                                        console.log(("file: " + file + " updated.").green);
                                        return newHash;
                                    });
                            }
                        } finally {
                            console.log("file: " + file + " has old '" + oldHash + "' and new '" + newHash + "' hashes.");
                        }
                    })
                    .catch(function (error) {
                        console.error(error.toString().red);
                    });
            })
            .finally(function () {
                return saveJson(argv['hash-file'], hashes).then(function () {
                    console.log('app: hashes is saved!');
                });
            });
        });
}

function loadJson(filePath) {
    return new Promise(function (resolve) {
        fs.readFile(filePath, 'utf8', function (error, content) {
            var json = error ? {} : JSON.parse(content);
            resolve(json);
        });
    });
}

function saveJson(filePath, data) {
    return new Promise(function (resolve, reject) {
        var json = JSON.stringify(data);
        fs.writeFile(filePath, json, 'utf8', function (error) {
            if (error) {
                reject(error);
            } else {
                resolve(json);
            }
        });
    });
}

function computeHash(filePath, hashName) {
    return new Promise(function (resolve) {
        fs.exists(filePath, function (exists) {
            var hashSum = crypto.createHash(hashName);
            if (!exists) {
                console.log("file: " + filePath + " does not exist.");
                return resolve(null);
            }

            var s = fs.ReadStream(filePath);
            s.on('data', function (data) {
                hashSum.update(data);
            });
            s.on('end', function () {
                var hex = hashSum.digest('hex');
                resolve(hex);
            });
        });
    });
}

function execCommand(command, cwd) {
    return new Promise(function (resolve, reject) {
        var child = cmd.exec(command, {
            cwd: cwd
        }, function (error) {
            if (error) {
                reject(error);
            }
        });
        child.stdout.on('data', function (data) {
            console.log(('pid(' + child.pid + '): ' + data).magenta);
        });
        child.stderr.on('data', function (data) {
            console.error(('pid(' + child.pid + '): ' + data).magenta);
        });
        child.on('close', function (code) {
            resolve(code);
        });
    });
}