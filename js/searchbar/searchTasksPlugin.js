var browserUI = require('browserUI.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var formatRelativeDate = require('util/relativeDate.js')
var focusMode = require('focusMode.js')
var taskOverlay = require('taskOverlay/taskOverlay.js')

function switchToTask(text) {
  /* disabled in focus mode */
  if (focusMode.enabled()) {
    focusMode.warn()
    return
  }

  text = text.toLowerCase()

  // no task was specified, show all of the tasks
  if (!text) {
    taskOverlay.show()
    return
  }

  var task = tasks.getTaskByNameOrNumber(text)

  if (task) {
    browserUI.switchToTask(task.id)
  }
}

// return an array of dicts, sorted by last task activity
// if a search string is present (and not a number) filter the results with a basic fuzzy search
function searchAndSortTasks(text) {
  var sortLastActivity = tasks.map(t => Object.assign({}, { task: t }, { lastActivity: tasks.getLastActivity(t.id) }))

  sortLastActivity = sortLastActivity.sort(function (a, b) {
    return b.lastActivity - a.lastActivity
  })

  var isSingleNumber = /^\d+$/.test(text)

  if (text !== '' ? !isSingleNumber : !isSingleNumber) { //lXOR 
    // fuzzy search
    var matches = []
    var searchText = text.toLowerCase()

    sortLastActivity.forEach(function (t) {

      var task = t.task
      var taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1)).toLowerCase()
      var exactMatch = taskName.indexOf(searchText) !== -1
      var fuzzyTitleScore = taskName.score(searchText, 0.5)

      if (exactMatch || fuzzyTitleScore > 0.4) {
        matches.push({
          task: t,
          score: fuzzyTitleScore + exactMatch
        })
      }
    })

    matches = matches.sort(function (a, b) {
      return b.score - a.score
    })

    sortLastActivity = matches.map(t => t.task)

    selected = sortLastActivity[0]

  }

  return sortLastActivity
}

var searchTasks = function (text, input, event) {
  searchbarPlugins.reset('searchTasks')

  var searchText = text.toLowerCase()
  var sortLastActivity = searchAndSortTasks(searchText)

  if (sortLastActivity.length === 0) {
    // should never be possible but hey...
    return
  }

  sortLastActivity.forEach(function (t) {

    var task = t.task
    var lastActivity = t.lastActivity

    if (task.id != tasks.getSelected().id) {
      var taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1))

      var data = {
        icon: 'carbon:autoscaling',
        title: taskName,
        secondaryText: formatRelativeDate(lastActivity),
        fakeFocus: false,
        click: function () {
          switchToTask('%n'.replace('%n', tasks.getIndex(task.id) + 1))
        }
      }

    }

    searchbarPlugins.addResult('searchTasks', data)
  })
}

function initialize () {
  searchbarPlugins.register('searchTasks', {
    index: 1,
    trigger: function (text) {
      return text.length > 2
    },
    showResults: searchTasks
  })
}

module.exports = { initialize }
