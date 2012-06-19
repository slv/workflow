#!/usr/bin/env node
var fs = require('fs'),
    exec = require('child_process').exec,
    path = require('path'),
    colors = require('colors'),
    stalker = require('stalker'),
    growl = require('growl'),
    watch = require('./watch'),
    JobManager = require('./jobs_manager'),
    sharedPreJob = require('./shared_pre_job'),
    processors = require('./processors')

// load user defined processors
try {
  var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
    userProcessors = require(home + '/.workflow/lib/processors'),
    userProcessorsTypes = Object.keys(userProcessors)

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

var manifest,
  shouldWatch = false,
  fsWatchers = {},
  args = process.argv.slice(2),
  jobs = new JobManager(),
  config

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

try
{
  fs.statSync(manifest)
}
catch (e)
{
  console.log('\n ☹  Config file not found at: %s\n'.red, manifest)
  process.exit()
}

shouldWatch && watch(manifest, init)

function init() {
  jobs.stop()

  jobs.resetPreJobs()
  jobs.setPreJobs(sharedPreJob)

  console.log('\n ♺  Reloading %s'.cyan, manifest)

  // load new config
  try
  {
    config = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  }
  catch (e)
  {
    console.log('\n ☠  Malformed Config JSON at: %s'.red, manifest)
    return
  }

  // reset watchers
  Object.keys(fsWatchers).forEach(function (filename) {
    fsWatchers[filename].close()
  })
  fsWatchers = {}

  // loop through targets
  Object.keys(config).forEach(function (targetType) {
    if (processors[targetType] === undefined) {

      console.log(' ☉  %s processor not found, skipping ...'.yellow, targetType)
    } else {

      console.log(' ☉  %s processor found, loading ...'.grey, targetType)

      config[targetType].targets.forEach(function (target) {

        // prepare targets
        processors[targetType].prepareTarget(target)

        // set watchers
        if (shouldWatch) {

          target.watchers.forEach(function (src)
            {
              try
              {
                var fStat = fs.statSync(src)

                if (fStat.isFile()) {
                  fsWatchers[src] = watch(src, function (event) {
                    jobs.add(processors[targetType].watchers(target), event)
                  })
                }
                else if (fStat.isDirectory()) {

                  stalker.watch(src, function (err, filename) {

                    fsWatchers[filename] = watch(filename, function (event) {
                      jobs.add(processors[targetType].watchers(target), event)
                    })
                  }, function(err, filename) {

                      fsWatchers[filename] && fsWatchers[filename].close()
                      delete fsWatchers[filename]
                      jobs.add(processors[targetType].watchers(target), 'DELETE file ' + filename)
                  })
                }
              }
              catch (e)
              {
                console.log('\n ☹  Dependecy of target "%s" not found: %s\n'.red, target.output, src)
                process.exit()
              }
            })
          }

        // process targets
        jobs.add({fn: processors[targetType].processTarget, target:target}, 'Initialize')
      });
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