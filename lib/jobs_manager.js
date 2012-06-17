var  async = require('async')

module.exports = function () {
  this.jobs = []
  this.state = 'STOPPED'
  this.preJobs = []
}
module.exports.prototype.resetPreJobs = function (fn) {
  this.preJobs = []
}
module.exports.prototype.setPreJobs = function (fn) {
  this.preJobs.push(fn)
}
module.exports.prototype.add = function (obj, event) {

  var pre = []
  this.preJobs.forEach(function (el) { if (typeof el === 'function') pre.push(el.bind(null, obj.target, event))})

  this.jobs.push(function (callback) {
    pre && async.series(pre, function (err) {
      if (!err) obj.fn(obj.target, callback)
      else {
        console.log(err);
        // TODO
      }
    })
  })
  this._do()
}

module.exports.prototype._do = function ()
{
  if (!this.jobs.length || this.state !== 'IDLE') {
    return
  }
  this.state = 'WORKING'
  this.jobs.shift()(this._onJobComplete.bind(this))
}

module.exports.prototype.start = function (exitCode, message) {
  this.state = 'IDLE'
  this._do()
}

module.exports.prototype.stop = function (exitCode, message) {
  this.state = 'STOPPED'
}

module.exports.prototype._onJobComplete = function (exitCode, message) {
  if (this.state !== 'STOPPED') {
    this.state = 'IDLE'
  }
  if (typeof this.onJobComplete === 'function') {
    this.onJobComplete(exitCode, message)
  }
  this._do()
}
