#!/usr/bin/env node
var fs = require('fs'),
    exec = require('child_process').exec,
    path = require('path'),
    async = require('async'),
    colors = require('colors'),
    watch = require('./watch'),
    concat = require('./concat'),
    uglify = require('./uglify'),
    jshint = require('./jshint')

var manifest
var shouldWatch = false
var state = 'IDLE'
var fsWatchers = []
var targets

var args = process.argv.slice(2)
args.forEach(function (arg, index) {
  switch (arg) {
    case '--watch':
      shouldWatch = true
    break
    case '--config':
      if (args[index + 1] && !args[index + 1].match(/^--/)) {
        manifest = args[index + 1]
      }
    break
  }
})

manifest = manifest || './.workflow'
manifest = path.join(process.cwd(), manifest)

try {
  fs.statSync(manifest)
} catch (e) {
  console.log('\n ☹  Config file not found at: %s\n'.red, manifest)
  process.exit()
}

shouldWatch && watch(manifest, init)

function init() {
  console.log('\n ♺  Reloading %s'.cyan, manifest)
  fsWatchers.forEach(function (fsWatcher) {
    fsWatcher.close()
  })
  fsWatchers = []
  try {
    targets = JSON.parse(fs.readFileSync(manifest, 'utf8')).js.targets
  } catch (e) {
    console.log('\n ☠  Malformed Config JSON at: %s'.red, manifest)
    return
  }
  targets.forEach(function (target) {
    target.count = 0
    target.outputMin = target.output.match(/ *--min */)
    target.output = target.output.replace(/ --\w+ */, '')
    target.jshintSrc = target.src.filter(function (src) { return src.match(/ *--check */) && src })
    target.jshintSrc = target.jshintSrc.map(function (src) { return src.replace(/ --\w+ */, '') })
    target.src = target.src.map(function (src) { return src.replace(/ --\w+ */, '') })

    shouldWatch && target.src.forEach(function (filename) {
      fsWatchers.push(watch(filename, processTarget.bind(null, target)))
    })

    processTarget(target)
  })
  
}

function processTarget(target, event) {
  if (state === 'RUNNING') {
    state = 'WILL_RERUN'
    return
  } else if (state === 'WILL_RERUN') {
    return
  }
  state = 'RUNNING'

  console.log('\n %s  [%d] %s', '☉'.cyan, ++target.count, target.output.replace(/ --\w+ */, ''))
  console.log('    =========================================================='.grey)

  var chain = []

  target.jshintSrc.length && chain.push(function (callback) {
    console.log(' %s  %s', '✌'.yellow, 'Checking...'.grey)
    jshint(target.jshintSrc, callback)
  })

  console.log(' %s  %s', '☍'.yellow, 'Concatenating...'.grey)
  var output = concat(target)

  target.outputMin && chain.push(function (callback) {
    console.log(' %s  %s', '✂'.yellow, 'Minifying...'.grey)
    uglify(output, callback)
  })

  chain.push(function (callback) {
    callback(null, output)
  })

  async.series(chain, function (err, results) {
    if (!err) {
      fs.writeFileSync(target.output, results[1])
      console.log(' %s  %s', '✔'.green, 'Saved'.grey)
      state = 'IDLE'
    } else {
      switch (err.name) {
        case 'jshint':
          jshintReporter(err.errors)
        break
        case 'uglify':
          console.log('\n ☠  Error while minifying: %s'.red, err.message)
          console.log(err)
        break
      }
    }
  })
}

function jshintReporter(errors) {
  errors.forEach(function (error) {
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
}

init()