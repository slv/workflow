var fs = require('fs'),
    format = require('util').format,
    path = require('path'),
    spawn = require('child_process').spawn,
    dust = require('dustjs-linkedin')

function watchers(target) {

  target.watchers = [path.dirname(target.src)]

  var onFileChange = {
    fn: processTarget,
    target: target
  }
  return onFileChange

}

function prepareTarget(target) {

  target.count = 0
  target.outputMin = target.output.match(/ *--min */)
  target.output = target.output.replace(/ --\w+ */, '')
  target.srcDir = path.dirname(target.src)
  target.watchers = [path.dirname(target.src)]
}

function processTarget(target, callback) {

  console.log(' %s  %s', '✎'.yellow, 'Compiling...'.grey)

  compile(target.src, target.name, target.outputMin, function (err, html, stderr) {
    if (err) {
      console.log(' %s  %s', '✘'.red, err.message.red)
      console.log()
      callback(1, format('%s\n%s', target.output, err.message))
    } else {
      fs.writeFileSync(target.output, html)
      console.log(' %s  %s', '✔'.green, 'Done'.grey)
      callback(0, target.output)
    }
  })
}

function compile(src, name, shouldMinify, callback) {
  var stdout = ''
  var stderr = ''
  var cmd = spawn('./node_modules/.bin/dustc', ['--name='+name, src])
  cmd.stdout.on('data', function (data) {
    stdout += data
  })
  cmd.stderr.on('data', function (data) {
    stderr += data
  })
  cmd.on('exit', function (code) {
    if (code !== 0) {
      var err = new Error(stdout)
      err.name = 'dustjs'
      callback(err, stdout)
    } else {
      callback(null, stdout)
    }
  })
}

module.exports.watchers = watchers
module.exports.prepareTarget = prepareTarget
module.exports.processTarget = processTarget
