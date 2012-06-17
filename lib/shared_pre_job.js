var path = require('path'),
  checkOutputDir = require('./check_output_dir')

function sharedPreJob (target, event, callback)
{
  target.output = target.output.replace(/ --\w+ */, '')

  console.log('\n %s  [%d] [js] %s %s', '☉'.cyan, ++target.count, target.output, (event ? '\n    [' + event.green + ']' : ''))
  console.log('    =========================================================='.grey)
  try
  {
    if (checkOutputDir(path.dirname(target.output)))
    {
      console.log(' %s  %s: %s', '☉'.green, 'Created output directory: '.grey, path.dirname(target.output))
    }
    callback(0, path.dirname(target.output))
  }
  catch (e)
  {
    throw e
    console.log('\n ☠  Error creating output destination "%s": %s'.red, path.dirname(target.output), e.message)
    return
  }
}

module.exports = sharedPreJob