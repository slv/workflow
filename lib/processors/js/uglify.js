var spawn = require('child_process').spawn

module.exports = function (javascript, callback) {
  var stdout = ''
  var stderr = ''
  var cmd = spawn(__dirname + '/../../../node_modules/.bin/uglifyjs')

  cmd.stdin.end(javascript)

  cmd.stdin.on('error', function (err) {
  })
  cmd.stdout.on('data', function (data) {
    stdout += data
  })
  cmd.stderr.on('data', function (data) {
    stderr += data
  })
  cmd.on('exit', function (code) {
    if (code !== 0) {
      var err = new Error()
      err.name = 'uglify'
      callback(err, stdout, stderr)
    } else {
      callback(null, stdout, stderr)
    }
  })
}