var fs = require('fs')

function concatSync(target) {
  var output = ''
  target.src.forEach(function (filename) {
    output += fs.readFileSync(filename, 'utf8')
  })
  fs.writeFileSync(target.output, output)
  return output
}

module.exports = concatSync