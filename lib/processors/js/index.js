var fs = require('fs'),
    path = require('path'),
    format = require('util').format,
    spawn = require('child_process').spawn,
    async = require('async'),
    watch = require('../../watch'),
    jshint = require('./jshint'),
    uglify = require('./uglify'),
    concatSync = require('./concat_sync'),
    checkOutputDir = require('../../check_output_dir')

var fsWatchers = []

function prepareTargets(config, shouldWatch, jobs) {
  fsWatchers.forEach(function (fsWatcher) {
    fsWatcher.close()
  })
  fsWatchers = []

  config.targets.forEach(function (target) {
    target.count = 0
    target.processFn = processTarget.bind(null, target)
    target.outputMin = target.output.match(/ *--min */)
    target.output = target.output.replace(/ --\w+ */, '')
    target.jshintSrc = target.src.filter(function (src) { return src.match(/ *--check */) && src })
    target.jshintSrc = target.jshintSrc.map(function (src) { return src.replace(/ --\w+ */, '') })
    target.src = target.src.map(function (src) { return src.replace(/ --\w+ */, '') })

    shouldWatch && target.src.forEach(function (filename) {
      try {
        fs.statSync(filename)
        fsWatchers.push(watch(filename, function () {
          jobs.add(target.processFn)
        }))
      } catch (e) {
        console.log('\n ☹  Dependecy of target "%s" not found: %s\n'.red, target.output, filename)
        process.exit()
      }
    })

    jobs.add(target.processFn)
  })
}

function processTarget(target, callback) {
  console.log('\n %s  [%d] [js] %s', '☉'.cyan, ++target.count, target.output.replace(/ --\w+ */, ''))
  console.log('    =========================================================='.grey)

  var chain = []

  try {
    if (checkOutputDir(path.dirname(target.output))) {
      console.log(' %s  %s: %s', '☉'.green, 'Created output directory: '.grey, path.dirname(target.output))
    }
  } catch (e) {
    console.log('\n ☠  Error creating output destination "%s": %s'.red, path.dirname(target.output), e.message)
    return
  }

  target.jshintSrc.length && chain.push(function (callback) {
    console.log(' %s  %s', '✌'.yellow, 'Checking...'.grey)
    jshint(target.jshintSrc, callback)
  })

  var output
  chain.push(function (callback) {
    console.log(' %s  %s', '☍'.yellow, 'Concatenating...'.grey)
    try {
      output = concatSync(target)
    } catch (e) {
      // TODO
    }
    callback()
  })

  target.outputMin && chain.push(function (callback) {
    console.log(' %s  %s', '✂'.yellow, 'Minifying...'.grey)
    uglify(output, callback)
  })

  chain.push(function (callback) {
    callback(null, output)
  })

  async.series(chain, function (err, results) {
    if (err) {
      switch (err.name) {
        case 'jshint':
          err.errors.forEach(function (error) {
            console.log(
              ' %s  %s: line %s, col: %s, %s'.cyan,
              '✘'.red,
              error.filename.yellow,
              error.line.toString().yellow,
              error.col.toString().yellow,
              error.error.red
            )
          })
          console.log()
          callback(1, format('JSHint error on %s: %s', target.output, err.message))
        break
        case 'uglify':
          console.log('\n ☠  Error while minifying: %s'.red, err.message)
          console.log(err)
          callback(1, format('UglifyJS error on %s: %s', target.output, err.message))
        break
      }
    } else {
      fs.writeFileSync(target.output, results.pop())
      console.log(' %s  %s', '✔'.green, 'Done'.grey)
      callback(0, target.output)
    }
  })
}

module.exports = prepareTargets