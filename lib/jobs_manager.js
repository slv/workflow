module.exports = function () {
  this.jobs = []
  this.state = 'STOPPED'
}

module.exports.prototype.add = function (fn) {
  this.jobs.push(fn)
  this._do()
}

module.exports.prototype._do = function () {
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
