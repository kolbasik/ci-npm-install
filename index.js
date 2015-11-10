var crypto = require('crypto');
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

var fc = require('./lib/file-check');
fc.start(argv['config-file'], argv['hash-file'], argv['hash-alg'])
    .finally(() => console.log('app: done.'));
