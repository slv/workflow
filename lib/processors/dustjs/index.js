var fs = require('fs'),
    format = require('util').format,
    path = require('path'),
    spawn = require('child_process').spawn,
    dust = require('dustjs-linkedin'),
    stalker = require('stalker'),
    watch = require('../../watch')

var fsWatchers = {}

function prepareTargets(config, shouldWatch, jobs) {
  Object.keys(fsWatchers).forEach(function (filename) {
    fsWatchers[filename].close()
  })
  fsWatchers = {}

  config.targets.forEach(function (target) {
    target.count = 0
    target.processFn = processTarget.bind(null, target)
    target.outputMin = target.output.match(/ *--min */)
    target.output = target.output.replace(/ --\w+ */, '')
    target.srcDir = path.dirname(target.src)

    shouldWatch && stalker.watch(target.srcDir, function (err, filename) {
      fsWatchers[filename] = watch(filename, function () {
        jobs.add(target.processFn)
      })
    }, function(err, filename) {
      fsWatchers[filename].close()
      delete fsWatchers[filename]
    })

    jobs.add(target.processFn)
  })
}

function processTarget(target, callback) {
  console.log('\n %s  [%d] [dustjs] %s', '☉'.cyan, ++target.count, target.output.replace(/ --\w+ */, ''))
  console.log('    =========================================================='.grey)
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

module.exports = prepareTargets