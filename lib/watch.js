var fs = require('fs'),
    crypto = require('crypto'),
    fileHashTable = {}

module.exports = function (path, callback) {
  return fs.watch(path, function () {
    fileHash(path, function (err, hash) {
      if (fileHashTable[path] !== hash) {
        fileHashTable[path] = hash
        callback()
      }
    })
  })
}

function fileHash(filename, callback) {
  var hash = crypto.createHash('sha1')
  var stream = fs.createReadStream(filename)
  stream.on('data', hash.update.bind(hash))
  stream.on('error', function (err) {
    callback(err)
  })
  stream.once('end', function () {
    callback(null, hash.digest('hex'))
  })
}