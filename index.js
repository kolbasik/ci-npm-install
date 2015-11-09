var Promise = require("bluebird");
var crypto = require('crypto');
var path = require("path");
var cmd = require('child_process');
var fs = require('fs');
var argv = require('yargs')
    .usage('Usage: $0 --config [string] --hash [string]')
    .option('config', {
        alias: 'c',
        describe: '- a file path.',
        type: 'string',
        demand: true
    })
    .option('hash', {
        alias: 'h',
        describe: '- a cryptographic hash function.',
        type: 'string',
        default: 'md5',
        choices: crypto.getHashes()
    })
    .check(function (argv) {
        crypto.createHash(argv.hash);
        return fs.existsSync(argv.config);
    })
    .argv;

start()
    .then(function() {
        console.log('app: done.');
    }, function (error) {
        console.error("app: " + error.toString() + error.stack);
    });

function start() {
    return loadJson(argv.config)
        .then(function (config) {
            var tasks = Object.keys(config.packages).map(function(file) {
                console.log('file: ' + file + ' found.');

                return computeHash(file, argv.hash)
                    .then(function (newHash) {
                        var meta = config.packages[file];
                        var oldHash = meta.hash;

                        console.log("file: " + file + " has old '" + oldHash + "' and new '" + newHash + "' hashes.");
                        if (oldHash === newHash) {
                            return Promise.resolve(newHash);
                        } else {
                            var command = (meta.command || 'echo unknown command for: ${file}:${hash}')
                                .replace('${hash}', newHash).replace('${file}', file);
                            return execCommand(command, path.dirname(file))
                                .then(function () {
                                    meta.hash = newHash;
                                    console.log("file: " + file + " updated.");
                                    return newHash;
                                });
                        }
                    });
            });

            return Promise.all(tasks)
                .then(function() {
                    return saveJson(argv.config, config);
                })
                .then(function(){
                    console.log('app: changes is saved!');
                });
        });
}

function loadJson (filePath) {
    return new Promise(function(resolve, reject){
        fs.readFile(filePath, 'utf8', function(error, content) {
            if (error) {
                reject(error);
            } else {
                resolve(JSON.parse(content));
            }
        });
    });
}

function saveJson (filePath, data) {
    return new Promise(function(resolve, reject) {
		var json = JSON.stringify(data);
        fs.writeFile(filePath, json, 'utf8', function(error) {
            if (error) {
                reject(error);
            } else {
                resolve(json);
            }
        });
    });
}

function computeHash (filePath, hashName) {
    return new Promise(function(resolve, reject) {

        var hashSum = crypto.createHash(hashName);

        fs.exists(filePath, function (exists) {
            if (!exists) {
                console.log("file: " + filePath + " does not exist.");
                return resolve('');
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

function execCommand (command, cwd) {
    return new Promise(function(resolve, reject) {
        var child = cmd.exec(command, {
            cwd: cwd
        }, function (error) {
            if (error) {
                reject(error);
            }
        });
        child.stdout.on('data', function (data) {
            console.log(child.pid + ':' + data);
        });
        child.stderr.on('data', function (data) {
            console.error(child.pid + ':' + data);
        });
        child.on('close', function (code) {
            resolve(code);
        });
    });
}