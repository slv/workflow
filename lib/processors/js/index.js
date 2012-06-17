var fs = require('fs'),
    format = require('util').format,
    async = require('async'),
    jshint = require('./jshint'),
    uglify = require('./uglify'),
    concatSync = require('./concat_sync')

function watchers(target) {

  target.watchers = target.src.map(function (src) { return src.replace(/ --\w+ */, '') })

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
  target.jshintSrc = target.src.filter(function (src) { return src.match(/ *--check */) && src })
  target.jshintSrc = target.jshintSrc.map(function (src) { return src.replace(/ --\w+ */, '') })
  target.src = target.src.map(function (src) { return src.replace(/ --\w+ */, '') })
  target.watchers = target.src.map(function (src) { return src.replace(/ --\w+ */, '') })
  target.watchers.push("com")

}

function processTarget(target, callback) {

  var chain = []

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

module.exports.watchers = watchers
module.exports.prepareTarget = prepareTarget
module.exports.processTarget = processTarget
