/* Handles messages that get sent from the menu bar in the main process */

var webviews = require('webviews.js')
var webviewGestures = require('webviewGestures.js')
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var modalMode = require('modalMode.js')
var findinpage = require('findinpage.js')
var PDFViewer = require('pdfViewer.js')
var tabEditor = require('navbar/tabEditor.js')
var readerView = require('readerView.js')
var taskOverlay = require('taskOverlay/taskOverlay.js')
var tabBar = require('navbar/tabBar.js')
var { searchAndSortTasks, moveToTaskCommand } = require('searchbar/customBangs.js')

module.exports = {
  initialize: function () {
    ipc.on('zoomIn', function () {
      webviewGestures.zoomWebviewIn(tabs.getSelected())
    })

    ipc.on('zoomOut', function () {
      webviewGestures.zoomWebviewOut(tabs.getSelected())
    })

    ipc.on('zoomReset', function () {
      webviewGestures.resetWebviewZoom(tabs.getSelected())
    })

    ipc.on('print', function () {
      if (PDFViewer.isPDFViewer(tabs.getSelected())) {
        PDFViewer.printPDF(tabs.getSelected())
      } else if (readerView.isReader(tabs.getSelected())) {
        readerView.printArticle(tabs.getSelected())
      } else if (webviews.placeholderRequests.length === 0) {
        // work around #1281 - calling print() when the view is hidden crashes on Linux in Electron 12
        // TODO figure out why webContents.print() doesn't work in Electron 4
        webviews.callAsync(tabs.getSelected(), 'executeJavaScript', 'window.print()')
      }
    })

    ipc.on('findInPage', function () {
      /* Page search is not available in modal mode. */
      if (modalMode.enabled()) {
        return
      }

      findinpage.start()
    })

    ipc.on('copyTabURL', function () {
      electron.clipboard.writeText(tabs.get(tabs.getSelected()).url)
    })

    ipc.on('inspectPage', function () {
      webviews.callAsync(tabs.getSelected(), 'toggleDevTools')
    })

    ipc.on('openEditor', function () {
      tabEditor.show(tabs.getSelected())
    })

    ipc.on('showBookmarks', function () {
      tabEditor.show(tabs.getSelected(), '!bookmarks ')
    })

    ipc.on('showTaskMover', function () {
      var currentTabId = tabs.getSelected()
      tabEditor.show(tabs.getSelected(), '!movetotaskfollow ')
      setTimeout(function(){
        tabEditor.hide()
      }, 10000)
    })

    ipc.on('showHistory', function () {
      tabEditor.show(tabs.getSelected(), '!history ')
    })

    ipc.on('addTab', function (e, data) {
      /* new tabs can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tabs can't be created in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      var newTab = null

      if (data.parentTask && tasks.get(data.parentTask)) {

        newTab = tasks.get(data.parentTask).tabs.add({
          url: data.url || ''
        }, { atEnd: true })

        browserUI.switchToTask(data.parentTask)
        browserUI.switchToTab(newTab)
        
      } else {
        newTab = tabs.add({
          url: data.url || ''
        })

        browserUI.addTab(newTab, {
          enterEditMode: !data.url // only enter edit mode if the new tab is empty
        })
  
        if (data.taskQuery) {
          // use the first search result
          // if there is no result, need to create a new task
          let task
  
          if (/^\d+$/.test(data.taskQuery)) {
            task = tasks.get(data.taskQuery)
          } else {
            task = searchAndSortTasks(data.taskQuery, excludeSelected=false)[0]?.task
          }
  
        moveToTaskCommand(task.id)
        browserUI.switchToTask(task.id)
        }
      }

      e.sender.send('tab-added')
    })

    ipc.on('openTaskFile', function (e, file) {

      if (!file){
        file = e // in case this came from an emit call rather than a send (this is probs bad TODO: refactor out the openTaskFunction)
      }

      if ('filePath' in file) {
        
        // TODO: guard against any random json being added (i.e. must have the required keys)

        if (fs.existsSync(file.filePath)){
          var taskStringData
          try {
            taskStringData = fs.readFileSync(file.filePath, 'utf-8')
          } catch (e) {
            console.warn('failed to read task file data', e)
          } 
          
          var task = JSON.parse(taskStringData)

          if (!tasks.get(task.id)){
            // restore the task item
            tasks.add(task)
          }
          
          /*
          If the task contained only private tabs, none of the tabs will be contained in the session restore data, but tasks must always have at least 1 tab, so create a new empty tab if the task doesn't have any.
          */
          if (task.tabs.length === 0) {
            tasks.get(task.id).tabs.add()
          }

          tasks.setSelected(task.id)
          browserUI.switchToTask(task.id)
        
        } else {
          console.warn('invalid task restore filepath')
        }
    }
  })

    ipc.on('switchToTask', function (e, data) {
      /* new tabs can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tabs can't be created in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      if (data.taskQuery) {
        // use the first search result
        // if there is no result, need to create a new task
        let task

        if (/^\d+$/.test(data.taskQuery)) {
          task = tasks.get(data.taskQuery)
        } else {
          task = searchAndSortTasks(data.taskQuery, excludeSelected=false)[0]?.task
        }

        if (!task) {
          task = tasks.get(tasks.add(undefined, tasks.getIndex(tasks.getSelected().id) + 1))
          task.name = data.taskQuery
        }

        browserUI.switchToTask(task.id)
      }
    })

    ipc.on('saveCurrentPage', async function () {
      var currentTab = tabs.get(tabs.getSelected())

      // new tabs cannot be saved
      if (!currentTab.url) {
        return
      }

      // if the current tab is a PDF, let the PDF viewer handle saving the document
      if (PDFViewer.isPDFViewer(tabs.getSelected())) {
        PDFViewer.savePDF(tabs.getSelected())
        return
      }

      if (tabs.get(tabs.getSelected()).isFileView) {
        webviews.callAsync(tabs.getSelected(), 'downloadURL', [tabs.get(tabs.getSelected()).url])
      } else {
        var savePath = await ipc.invoke('showSaveDialog', {
          defaultPath: currentTab.title.replace(/[/\\]/g, '_')
        })

        // savePath will be undefined if the save dialog is canceled
        if (savePath) {
          if (!savePath.endsWith('.html')) {
            savePath = savePath + '.html'
          }
          webviews.callAsync(tabs.getSelected(), 'savePage', [savePath, 'HTMLComplete'])
        }
      }
    })

    ipc.on('addPrivateTab', function () {
      /* new tabs can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tabs can't be created in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      browserUI.addTab(tabs.add({
        private: true
      }))
    })

    ipc.on('toggleTaskOverlay', function () {
      taskOverlay.toggle()
    })

    ipc.on('goBack', function () {
      webviews.callAsync(tabs.getSelected(), 'goBack')
    })

    ipc.on('goForward', function () {
      webviews.callAsync(tabs.getSelected(), 'goForward')
    })
  }
}
