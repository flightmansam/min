
function createPopoutTab (url, parentTask) {
    const popoutWindow = {
        window: new BrowserWindow()
    }
    if (parentTask) {
        popoutWindow.parentTask = parentTask
    }

    popoutWindow.window.loadURL(url)

    popoutWindow.window.on('close', function () {

        var opts = {url: popoutWindow.window.webContents.getURL()}

        if (popoutWindow.parentTask) {
            opts.parentTask = popoutWindow.parentTask
        }

        sendIPCToWindow(mainWindow, 'addTab', opts)

        popoutWindows.delete(popoutWindow)
        // popoutWindow = null
    })
    
    setTimeout(function (){
        popoutWindow.window.focus()
    }, 500)
    
    popoutWindows.add(popoutWindow)
    
    return popoutWindow
}

ipc.on('convert-tab-to-popout', function (e, args) {
    if (args.parentTask){
        createPopoutTab(args.url, args.parentTask)
    }
    else {
        createPopoutTab(args.url)
    }

})