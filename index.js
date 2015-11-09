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

start();

function start() {
    loadConfig(argv.config, function(error, config) {
        if (error) throw error;

        var count = 0;
        Object.keys(config.packages).forEach(function(file) {
            var meta = config.packages[file];

            console.log("file: " + file + " has old hash: " + meta.hash);

            fs.exists(file, function (exists) {
                if (!exists) {
                    console.log("file: " + file + " does not exist.");
                    return;
                }

                ++count;
                computeHash(file, argv.hash, function(error, hash) {
                    if (error) throw error;

                    console.log("file: " + file + " has new hash: " + hash);
                    if (meta.hash !== hash) {
                        var command = (meta.command || 'echo unknown command for: ${file}:${hash}')
                            .replace('${hash}', hash).replace('${file}', file);
                        execCommand(command, path.dirname(file), function(error, code) {
                            if (error) throw error;

                            meta.hash = hash;
                            console.log("file: " + file + " updated.");

                            if (--count == 0) {
                                saveConfig(argv.config, config, function (error) {
                                    if (error) throw error;

                                    console.log('app: changes is saved!');
                                });
                            }
                        });
                    }
                });
            });
        });
    });
}

function loadConfig (configPath, callback) {
    fs.readFile(configPath, 'utf8', function(error, content) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, JSON.parse(content))
        }
    });
}

function saveConfig (configPath, config, callback) {
    fs.writeFile(configPath, JSON.stringify(config), 'utf8', callback);
}

function computeHash (fileName, hashName, callback) {
    var hashSum = crypto.createHash(hashName);

    var s = fs.ReadStream(fileName);
    s.on('data', function(data) {
        hashSum.update(data);
    });
    s.on('end', function() {
        var hex = hashSum.digest('hex');
        callback(null, hex);
    });
}

function execCommand (command, cwd, callback) {
    var child = cmd.exec(command, {
        cwd: cwd
    }, function(error) {
        if (error) {
            callback(error, null)
        }
    });
    child.stdout.on('data', function (data) {
        console.log(child.pid + ':' + data);
    });
    child.stderr.on('data', function (data) {
        console.error(child.pid + ':' + data);
    });
    child.on('close', function (code) {
        callback(null, code);
    });
}