var fs = require('fs'),
    format = require('util').format,
    path = require('path'),
    spawn = require('child_process').spawn,
    less = require('less'),
    stalker = require('stalker'),
    watch = require('../../watch'),
    checkOutputDir = require('../../check_output_dir')

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
  console.log('\n %s  [%d] [less] %s', '☉'.cyan, ++target.count, target.output.replace(/ --\w+ */, ''))
  console.log('    =========================================================='.grey)

  try {
    if (checkOutputDir(path.dirname(target.output))) {
      console.log(' %s  %s: %s', '☉'.green, 'Created output directory: '.grey, path.dirname(target.output))
    }
  } catch (e) {
    console.log('\n ☠  Error creating output destination "%s": %s'.red, path.dirname(target.output), e.message)
    return
  }

  console.log(' %s  %s', '✎'.yellow, 'Compiling...'.grey)

  compile(target.src, target.srcDir, target.outputMin, function (err, css) {
    if (err) {
      console.log(
        ' %s  %s: line %s, col %s, %s'.cyan,
        '✘'.red,
        err.filename.yellow,
        err.line.toString().yellow,
        err.column.toString().yellow,
        err.message.red
      )
      console.log()
      callback(1, format('%s: %s\n%s', target.output, err.message, err.extract.join('\n')))
    } else {
      fs.writeFileSync(target.output, css)
      console.log(' %s  %s', '✔'.green, 'Done'.grey)
      callback(0, target.output)
    }
  })
}

function compile(src, srcDir, shouldMinify, callback) {
  new less.Parser({
      paths: [srcDir],
      filename: src
  }).parse(fs.readFileSync(src, 'utf8'), function (err, tree) {
    if (err) {
      err.name = 'less'
      callback(err)
    } else {
      try {
        callback(null, tree.toCSS({ compress: shouldMinify }))
      } catch (e) {
        callback(e)
      }
    }
  })
}

module.exports = prepareTargets