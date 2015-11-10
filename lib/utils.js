module.exports = {
    name: 'test',
    loadJson: loadJson,
    saveJson: saveJson,
    fileHash: fileHash,
    execCommand: execCommand
};

var Promise = require('bluebird');
var crypto = require('crypto');
var cmd = require('child_process');
var fs = require('fs');

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

function fileHash(filePath, hashName) {
    return new Promise(resolve => {
        fs.exists(filePath, exists => {
            if (!exists) {
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