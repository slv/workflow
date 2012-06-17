var spawn = require('child_process').spawn,
    regExp = /(.+): line (\d+), col (\d+), (.+)\.$/

function jshint(sourceFiles, callback) {
  var stdout = ''
  var stderr = ''
  var cmd = spawn(__dirname + '/../../../node_modules/.bin/jshint', sourceFiles)
  cmd.stdout.on('data', function (data) {
    stdout += data
  })
  cmd.stdin.on('error', function (err) {
  })
  cmd.stderr.on('data', function (data) {
    stderr += data
  })
  cmd.on('exit', function (code) {
    var err
    if (code !== 0) {
      err = new Error(stdout)
      err.name = 'jshint'
      err.errors = stdout.split('\n').map(errorsMap)
      err.errors.splice(-3)
    }
    callback(err)
  })
}

function errorsMap(errorLine) {
  var match = errorLine.match(regExp)
  if (match) {
    return {
      filename: match[1],
      line: Number(match[2]),
      col: Number(match[3]),
      error: match[4]
    }
  }
}

module.exports = jshint