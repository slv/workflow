var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp')

function checkOutputDir(path) {

  try {

    if (!fs.statSync(path).isDirectory())
      throw new Error()

    return false

  } catch (err) {

    try {

      mkdirp.mkdirP.sync(path)
      return true

    } catch (err) {

      switch (err.code) {

        case 'EEXIST':
          err.message = "Target specified for output isn't a directory"
          break

        case 'EACCES':
          err.message = "Permission Denied"
          break

        default:
          err.message = err.code
          break
      }
      throw err
    }
  }
}

module.exports = checkOutputDir