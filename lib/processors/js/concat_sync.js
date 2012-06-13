var fs = require('fs')

function concatSync(target) {
  var output = ''
  target.src.forEach(function (filename) {
    var isCommentOpened = false
    var fileContent = fs.readFileSync(filename, 'utf8')
    var lines = fileContent.split('\n').map(function (line, index) {
      if (isCommentOpened) {
        isCommentOpened = !line.replace(/('|").*('|")/).replace(/\/\*.*\*\//g, '').match(/\*\//)
        line = '  ' + fill(index, 5) + '     ' + line
      } else {
        isCommentOpened = line.replace(/('|").*('|")/).replace(/\/\*.*\*\//g, '').match(/\/\*/)
        line = '/*' + fill(index, 5) + ' */  ' + line
      }
      return line
    })
    lines.unshift('')
    lines.unshift(' */')
    lines.unshift(' * ' + filename)
    lines.unshift('/**')
    lines.push('')
    lines.push('')
    output += lines.join('\n')
  })
  fs.writeFileSync(target.output, output)
  return output
}

var fillStr = '           '
function fill(number, width) {
  number = number.toString()
  return fillStr.slice(0, width - number.length) + number
}

module.exports = concatSync