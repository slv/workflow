var spawn = require('child_process').spawn

module.exports = function (javascript, callback) {
  var stdout = ''
  var stderr = ''
  var cmd = spawn('./node_modules/.bin/uglifyjs')
  cmd.stdin.end(javascript)
  cmd.stdout.on('data', function (data) {
    stdout += data
  })
  cmd.stderr.on('data', function (data) {
    stderr += data
  })
  cmd.on('exit', function (code) {
    if (code !== 0) {
      callback(new Error(), stdout, stderr)
    }
    callback(null, stdout, stderr)
  })
}