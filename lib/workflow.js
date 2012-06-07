#!/usr/bin/env node
var fs = require('fs'),
    exec = require('child_process').exec,
    crypto = require('crypto'),
    path = require('path'),
    async = require('async'),
    colors = require('colors'),
    uglify = require('./uglify'),
    jshint = require('./jshint')

var manifest
var watch = false
var state = 'IDLE'
var fsWatchers = []
var fileHashTable = {}
var targets

var args = process.argv.slice(2)
args.forEach(function (arg, index) {
  switch (arg) {
    case '--watch':
      watch = true
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

fs.watch(manifest, init)

function init() {
  console.log('\n %s  Reloading %s', '☍'.cyan, manifest)
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
    if (watch) {
      target.src.forEach(function (filename) {
        filename = filename.replace(/ --\w+ */, '')
        fsWatchers.push(fs.watch(filename, onFileChange.bind(null, target, filename)))
      })
    }
    processTarget(target)
  })
}

function onFileChange(target, filename) {
  fileHash(filename, function (err, hash) {
    if (fileHashTable[filename] !== hash) {
      fileHashTable[filename] = hash
      processTarget(target, filename)
    }
  })
}

function fileHash(filename, callback) {
  var hash = crypto.createHash('sha1')
  var stream = fs.createReadStream(filename)
  stream.on('data', hash.update.bind(hash))
  stream.on('error', function (err) {
    callback(err)
  })
  stream.once('end', function () {
    callback(null, hash.digest('hex'))
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
  target.count++
  console.log('\n %s  [%d] %s', '☉'.cyan, target.count, target.output.replace(/ --\w+ */, ''))
  console.log('    =========================================================='.grey)
  async.forEach(target.src, function (filename, callback) {
    if (filename.match(/ *--check */)) {
      jshint(filename.replace(/ --\w+ */, ''), callback)
    } else {
      callback()
    }
  }, function (errors) {
    if (errors) {
      reporter(errors)
    } else {
      console.log(' %s  %s', '★'.yellow, 'Concatenating...'.grey)
      var code = ''
      target.src.forEach(function (filename) {
        code += fs.readFileSync(filename.replace(/ --\w+ */, ''), 'utf8')
      })
      if (target.output.match(/ *--min */)) {
        console.log(' %s  %s', '★'.yellow, 'Minifying...'.grey)
        uglify(code, function (compressed) {
          fs.writeFileSync(target.output.replace(/ --\w+ */, ''), compressed)
          console.log(' %s  %s', '✔'.green, 'Saved'.grey)
          state = 'ready'
        })
      } else {
        fs.writeFileSync(target.output.replace(/ --\w+ */, ''), code)
        console.log(' %s  %s', '✔'.green, 'Saved'.grey)
      }
    }
    state = 'IDLE'
  });
}

function reporter(errors) {
  errors.forEach(function (error) {
    console.log(
      ' %s  %s: line %s, col: %s, %s'.cyan,
      '✘'.red, error.filename.yellow, error.line.toString().yellow, error.col.toString().yellow, error.error.red
    )
  })
}

init()