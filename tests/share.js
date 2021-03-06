var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var spawn = require('./helpers/spawn.js')

var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')

var fixturesStaticLink

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

cleanDat() // make sure we start fresh

test('prints link (live)', function (t) {
  // cmd: dat tests/fixtures
  var st = spawn(t, dat + ' ' + fixtures)
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    st.kill()
    cleanDat()
    return true
  }, 'dat link printed')
  st.end()
})

test('prints link (static)', function (t) {
  // cmd: dat tests/fixtures --snapshot
  var st = spawn(t, dat + ' ' + fixtures + ' --snapshot')
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    fixturesStaticLink = matches
    st.kill()
    cleanDat()
    return true
  }, 'dat link printed')
  st.end()
})

test('static link consistent', function (t) {
  // cmd: dat tests/fixtures --snapshot
  var st = spawn(t, dat + ' ' + fixtures + ' --snapshot')
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    t.ok((matches = fixturesStaticLink), 'link matches')
    st.kill()
    cleanDat()
    return true
  }, 'dat link printed')
  st.end()
})

test('share resume uses same key', function (t) {
  // cmd: dat tests/fixtures (twice)
  var key = null
  var st = spawn(t, dat + ' ' + fixtures)
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    key = matches
    st.kill()
    spawnAgain()
    return true
  })

  function spawnAgain () {
    var st = spawn(t, dat + ' ' + fixtures)
    st.stdout.match(function (output) {
      var matches = matchDatLink(output)
      if (!matches) return false
      t.equals(key, matches, 'keys match')
      st.kill()
      cleanDat()
      return true
    }, 'process started again')
    st.end()
  }
})

test('share prints shared directory', function (t) {
  // cmd: dat tests/fixtures
  var st = spawn(t, dat + ' ' + fixtures)
  st.stdout.match(function (output) {
    var contains = output.indexOf('Initializing Dat') > -1
    if (!contains) return false
    t.ok(output.indexOf(path.resolve(fixtures)) > -1, 'prints directory name')
    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

test('prints file information (live)', function (t) {
  // cmd: dat tests/fixtures
  var st = spawn(t, dat + ' ' + fixtures)
  var matchedFiles = 0
  st.stdout.match(function (output) {
    var finished = output.match('Sharing')
    if (!finished) return false

    var fileList = output.split('\n').filter(function (line) {
      return line.indexOf('[DONE]') > -1
    })
    fileList.forEach(function (file) {
      file = file.split('[DONE]')[1]
      if (file.match(/all_hour|empty/)) matchedFiles += 1
    })
    t.ok((matchedFiles === 2), 'Printed ' + matchedFiles + ' file names')

    var fileStats = output.split('\n').filter(function (line) {
      return line.indexOf('Items') > -1
    })[0]
    t.ok(fileStats.match(/Items: 3/), 'File count correct')
    t.ok(fileStats.match(/Size: 1\.44 kB/), 'File size correct')

    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

test('prints file information (static)', function (t) {
  // cmd: dat tests/fixtures --snapshot
  var st = spawn(t, dat + ' ' + fixtures + ' --snapshot')
  var matchedFiles = 0
  st.stdout.match(function (output) {
    var finished = output.match('Sharing Snapshot')
    if (!finished) return false

    var fileList = output.split('\n').filter(function (line) {
      return line.indexOf('[DONE]') > -1
    })
    fileList.forEach(function (file) {
      file = file.split('[DONE]')[1]
      if (file.match(/all_hour|empty/)) matchedFiles += 1
    })
    t.ok((matchedFiles === 2), 'Printed ' + matchedFiles + ' file names')

    var fileStats = output.split('\n').filter(function (line) {
      return line.indexOf('Items') > -1
    })[0]
    t.ok(fileStats.match(/Items: 2/), 'File count correct') // TODO: make this consitent w/ live
    t.ok(fileStats.match(/Size: 1\.44 kB/), 'File size correct')

    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

test('share with . arg defaults to cwd', function (t) {
  // cmd: dat .
  var st = spawn(t, dat + ' .', {cwd: fixtures})
  st.stdout.match(function (output) {
    var contains = output.indexOf('Initializing Dat') > -1
    if (!contains) return false
    t.ok(output.indexOf(path.resolve(fixtures)) > -1, 'prints directory name')
    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

function cleanDat () {
  rimraf.sync(path.join(fixtures, '.dat'))
}

function matchDatLink (output) {
  // TODO: dat.land links
  var match = output.match(/Link [A-Za-z0-9]{64}/)
  if (!match) return false
  return match[0].split('Link ')[1].trim()
}
