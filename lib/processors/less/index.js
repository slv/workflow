var fs = require('fs'),
    format = require('util').format,
    path = require('path'),
    less = require('less')

function watchers(target) {

  target.watchers = [target.src.replace(/ --\w+ */, '')]

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
  target.src = target.src.replace(/ --\w+ */, '')
  target.watchers = [target.src.replace(/ --\w+ */, '')]
}

function processTarget(target, callback) {

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

module.exports.watchers = watchers
module.exports.prepareTarget = prepareTarget
module.exports.processTarget = processTarget