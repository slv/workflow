#!/usr/bin/env node
var fs = require('fs'),
    exec = require('child_process').exec,
    path = require('path'),
    colors = require('colors'),
    growl = require('growl'),
    watch = require('./watch'),
    JobManager = require('./jobs_manager'),
    processors = require('./processors')

// load user defined processors
try {
  var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
  var userProcessors = require(home + '/.workflow/lib/processors')
  var userProcessorsTypes = Object.keys(userProcessors)
  console.log(
    '\n ☺  Loaded %d users plug-ins from: %s (%s)'.green,
    userProcessorsTypes.length,
    home + '/.workflow/lib/processors',
    userProcessorsTypes.join(', ')
  )
  Object.keys(userProcessors).forEach(function (processorType) {
    processors[processorType] = userProcessors[processorType]
  })
} catch (e) {}

var manifest
var shouldWatch = false
var jobs = []
var args = process.argv.slice(2)
var jobs = new JobManager()

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
  jobs.stop()

  console.log('\n ♺  Reloading %s'.cyan, manifest)

  // load new config
  try {
    var config = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  } catch (e) {
    console.log('\n ☠  Malformed Config JSON at: %s'.red, manifest)
    return
  }

  // prepare targets
  Object.keys(config).forEach(function (targetType) {
    if (processors[targetType] === undefined) {
      console.log(' ☉  %s processor not found, skipping ...'.yellow, targetType)
    } else {
      console.log(' ☉  %s processor found, loading ...'.grey, targetType)
      processors[targetType](config[targetType], shouldWatch, jobs)
    }
  })

  // GO!
  jobs.start()
}

jobs.onJobComplete = function (exitCode, message) {
  growl(message, {
    title: !exitCode ? 'Successful compiled' : 'Compilation error',
    name: 'workflow',
    image: 'DashCode'
  })
}

init()