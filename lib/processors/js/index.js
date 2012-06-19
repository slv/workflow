var fs = require('fs'),
    path = require('path'),
    format = require('util').format,
    async = require('async'),
    jshint = require('jshint'),
    jsp = require("uglify-js").parser,
    pro = require("uglify-js").uglify,
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

    target.jshintSrc.forEach(function (file) {
      var err,
          code
      try {

        code = fs.readFileSync(file, 'utf8')
      } catch (e) {

        err = new Error()
        err.name = 'not-found'
        err.filename = file

        callback(err)
      }

      var jshintrcConfig = {}

      try
      {
        var jshintrc = path.join(process.cwd(), './.jshintrc')
        jshintrcConfig = JSON.parse(fs.readFileSync(jshintrc, 'utf8'))
      }
      catch (e) {}

      if (!jshint.JSHINT(code, jshintrcConfig)) {
        err = new Error()
        err.name = 'jshint'
        err.filename = file
        err.errors = jshint.JSHINT.errors
        callback(err)
      }
      else {
        callback()
      }
    })
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

    var ast = jsp.parse(output);
    ast = pro.ast_mangle(ast);
    ast = pro.ast_squeeze(ast);

    output = pro.gen_code(ast);
    callback()
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
              err.filename.yellow,
              error.line.toString().yellow,
              error.character.toString().yellow,
              error.reason.red
            )
          })
          callback(1, format('JSHint error on %s: %s', target.output, err.message))
        break
        case 'uglify':
          console.log('\n ☠  Error while minifying: %s'.red, err.message)
          callback(1, format('UglifyJS error on %s: %s', target.output, err.message))
        break
        case 'not-found':
          console.log('\n ☠  Src File Not Found: %s'.red, err.filename)
          callback(1, format('Src File Not Found: %s', err.filename))
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
