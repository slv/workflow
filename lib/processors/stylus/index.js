var fs = require('fs'),
    format = require('util').format,
    path = require('path'),
    stylus = require('stylus'),
    nib = require('nib')

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
  var compiler = stylus(fs.readFileSync(src, 'utf8'), {
    linenos: true,
    compress: shouldMinify,
    paths: [srcDir]
  })
  compiler.use(nib())
  compiler.render(function (err, css) {
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

module.exports.watchers = watchers
module.exports.prepareTarget = prepareTarget
module.exports.processTarget = processTarget
