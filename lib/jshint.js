var spawn = require('child_process').spawn,
    regExp = /(.+): line (\d+), col (\d+), (.+)\.$/

module.exports = function (target, callback) {
  var stdout = ''
  var stderr = ''
  var cmd = spawn('./node_modules/.bin/jshint', [target])
  cmd.stdout.on('data', function (data) {
    stdout += data
  })
  cmd.stderr.on('data', function (data) {
    stderr += data
  })
  cmd.on('exit', function (code) {
    var errors
    if (code !== 0) {
      var lines = stdout.split('\n')
      errors = lines.map(function (error) {
        var match = error.match(regExp)
        if (match) {
          return {
            filename: match[1],
            line: match[2],
            col: match[3],
            error: match[4]
          }
        }
      })
      errors.splice(-3)
    }
    callback(errors)
  })
}