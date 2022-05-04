/* list of the available custom !bangs */

const { ipcRenderer } = require('electron')
const fs = require('fs')

var bangsPlugin = require('searchbar/bangsPlugin.js')

var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var places = require('places/places.js')
var contentBlockingToggle = require('navbar/contentBlockingToggle.js')
var taskOverlay = require('taskOverlay/taskOverlay.js')
var taskNameDisplay = require('navbar/taskNameDisplay.js')
var tabBar = require('navbar/tabBar.js')
var bookmarkConverter = require('bookmarkConverter.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var tabEditor = require('navbar/tabEditor.js')
var formatRelativeDate = require('util/relativeDate.js')

function moveToTask(text) {
  /* disabled in focus mode */
  if (focusMode.enabled()) {
    focusMode.warn()
    return
  }

  // remove the tab from the current task

  var currentTab = tabs.get(tabs.getSelected())
  tabs.destroy(currentTab.id)

  // make sure the task has at least one tab in it
  if (tabs.count() === 0) {
    tabs.add()
  }

    var newTask = tasks.getTaskByNameOrNumber(text.toLowerCase())

  if (newTask) {
    newTask.tabs.add(currentTab, { atEnd: true })
  } else {
    // create a new task with the given name
    newTask = tasks.get(tasks.add(undefined, tasks.getIndex(tasks.getSelected().id) + 1))
    newTask.name = text

    newTask.tabs.add(currentTab)
  }

    browserUI.switchToTask(newTask.id)
    browserUI.switchToTab(currentTab.id)
}

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

function initialize () {
  bangsPlugin.registerCustomBang({
    phrase: '!settings',
    snippet: l('viewSettings'),
    isAction: true,
    fn: function (text) {
      webviews.update(tabs.getSelected(), 'min://settings')
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!back',
    snippet: l('goBack'),
    isAction: true,
    fn: function (text) {
      webviews.callAsync(tabs.getSelected(), 'goBack')
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!sort',
    snippet: 'Sort Tabs by time',
    isAction: true,
    fn: function (text) {
      tabs.tabs = tabs.tabs.sort(function (a, b) { 
        return b.lastActivity < a.lastActivity ?  1 // if b should come earlier, push a to end
             : b.lastActivity > a.lastActivity ? -1 // if b should come later, push a to begin
             : 0;                   // a and b are equal
        }).reverse();
      tabBar.updateAll()
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!forward',
    snippet: l('goForward'),
    isAction: true,
    fn: function (text) {
      webviews.callAsync(tabs.getSelected(), 'goForward')
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!screenshot',
    snippet: l('takeScreenshot'),
    isAction: true,
    fn: function (text) {
      setTimeout(function () { // wait so that the view placeholder is hidden
        ipcRenderer.send('saveViewCapture', { id: tabs.getSelected() })
      }, 400)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!clearhistory',
    snippet: l('clearHistory'),
    isAction: true,
    fn: function (text) {
      if (confirm(l('clearHistoryConfirmation'))) {
        places.deleteAllHistory()
        ipc.invoke('clearStorageData')
      }
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!enableblocking',
    snippet: l('enableBlocking'),
    isAction: true,
    fn: function (text) {
      contentBlockingToggle.enableBlocking(tabs.get(tabs.getSelected()).url)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!disableblocking',
    snippet: l('disableBlocking'),
    isAction: true,
    fn: function (text) {
      contentBlockingToggle.disableBlocking(tabs.get(tabs.getSelected()).url)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!movetotask',
    snippet: l('moveToTask'),
    isAction: false,
    showSuggestions: function (text, input, event) {
      searchbarPlugins.reset('bangs')

      var isFirst = true

      var sortLastActivity = tasks.map(t => Object.assign({}, { task: t }, { lastActivity: tasks.getLastActivity(t.id) }))

      sortLastActivity = sortLastActivity.sort(function (a, b) {
        return b.lastActivity - a.lastActivity
      })
      sortLastActivity.forEach(function (t) {

        var task = t.task
        var taskName = tasks.getPrintedName(task.id)
        var lastActivity = t.lastActivity

        if (task.id != tasks.getSelected().id) {
          var taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1))
          searchbarPlugins.addResult('bangs', {
            title: taskName,
            secondaryText: formatRelativeDate(lastActivity),
            fakeFocus: isFirst && text,
            click: function () {
              tabEditor.hide()
              moveToTask('%n'.replace('%n', tasks.getIndex(task.id) + 1))
            }
          })
          isFirst = false

        }
      })
    },

    fn: moveToTask

  })

  bangsPlugin.registerCustomBang({
    phrase: '!task',
    snippet: l('switchToTask'),
    isAction: false,
    showSuggestions: function (text, input, event) {
      searchbarPlugins.reset('bangs')

      var isFirst = true

      var sortLastActivity = tasks.map(t => Object.assign({}, { task: t }, { lastActivity: tasks.getLastActivity(t.id) }))

      sortLastActivity = sortLastActivity.sort(function (a, b) {
        return b.lastActivity - a.lastActivity
      })

      sortLastActivity.forEach(function (t) {
        
        var task = t.task
        var lastActivity = t.lastActivity

        if (task.id != tasks.getSelected().id) {

          var taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1))
          searchbarPlugins.addResult('bangs', {
            title: taskName,
            secondaryText: formatRelativeDate(lastActivity),
            fakeFocus: isFirst && text,
            click: function () {
              tabEditor.hide()
              switchToTask('%n'.replace('%n', tasks.getIndex(task.id) + 1))
            }
          })
          isFirst = false

        }
      })
    },

    fn: switchToTask

  })
  bangsPlugin.registerCustomBang({
    phrase: '!newtask',
    snippet: l('createTask'),
    isAction: false,
    fn: function (text) {
      /* disabled in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      browserUI.addTask()
      
      if (text) {
          tasks.getSelected().name = text
      }

      browserUI.switchToTask(tasks.getSelected().id)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!closetask',
    snippet: l('closeTask'),
    isAction: false,
    fn: function (text) {
      var currentTask = tasks.getSelected()
      var taskToClose

      if (text) {
        taskToClose = tasks.getTaskByNameOrNumber(text)
      } else {
        taskToClose = tasks.getSelected()
      }

      if (taskToClose) {
        browserUI.closeTask(taskToClose.id)
        if (currentTask.id === taskToClose.id) {
          taskOverlay.show()
          setTimeout(function () {
            taskOverlay.hide()
          }, 600)
        }
      }
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!nametask',
    snippet: l('nameTask'),
    isAction: false,
    fn: function (text) {
      tasks.getSelected().name = text
      taskNameDisplay.update()
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!importbookmarks',
    snippet: l('importBookmarks'),
    isAction: true,
    fn: async function () {
      var filePath = await ipc.invoke('showOpenDialog', {
        filters: [
          { name: 'HTML files', extensions: ['htm', 'html'] }
        ]
      })

      if (!filePath) {
        return
      }
      fs.readFile(filePath[0], 'utf-8', function (err, data) {
        if (err || !data) {
          console.warn(err)
          return
        }
        bookmarkConverter.import(data)
      })
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!exportbookmarks',
    snippet: l('exportBookmarks'),
    isAction: true,
    fn: async function () {
      var data = await bookmarkConverter.exportAll()
      // save the result
      var savePath = await ipc.invoke('showSaveDialog', { defaultPath: 'bookmarks.html' })
      require('fs').writeFileSync(savePath, data)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!addbookmark',
    snippet: l('addBookmark'),
    fn: function (text) {
      var url = tabs.get(tabs.getSelected()).url
      if (url) {
        places.updateItem(url, {
          isBookmarked: true,
          tags: (text ? text.split(/\s/g).map(t => t.replace('#', '').trim()) : [])
        }, () => { })
      }
    }
  })
}

module.exports = { initialize }
