var fs = require('fs'),
    format = require('util').format,
    path = require('path'),
    spawn = require('child_process').spawn,
    stylus = require('stylus'),
    nib = require('nib'),
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
  console.log('\n %s  [%d] [stylus] %s', '☉'.cyan, ++target.count, target.output.replace(/ --\w+ */, ''))
  console.log('    =========================================================='.grey)
  console.log(' %s  %s', '✎'.yellow, 'Compiling...'.grey)

  compile(target.src, target.srcDir, target.outputMin, function (err, css) {
    if (err) {
      console.log(
        ' %s  %s: line %s, %s'.cyan,
        '✘'.red,
        err.filename.yellow,
        err.line.toString().yellow,
        err.error.red
      )
      console.log()
      callback(1, format('%s: %s', target.output, err.message))
    } else {
      fs.writeFileSync(target.output, css)
      console.log(' %s  %s', '✔'.green, 'Done'.grey)
      callback(0, target.output)
    }
  })
}

function compile(src, srcDir, shouldMinify, callback) {
  stylus(fs.readFileSync(src, 'utf8'))
    .set('compress', shouldMinify)
    .include(srcDir)
    .use(nib())
    .render(function (err, css) {
      if (err) {
        var errorLines = err.message.split('\n')
        err.name = 'stylus'
        err.filename = src
        err.line = errorLines.reduce(function (prev, current) {
          return prev || current.match(/^ > +([0-9]+)\| /)
        }, false)[1]
        err.error = err.message.match(/\d+\|.+\n\n(.+)/)[1]
      }
      callback(err, css)
  })
}

module.exports = prepareTargets