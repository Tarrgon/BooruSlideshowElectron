const { app, BrowserWindow } = require('electron')
const electronLocalshortcut = require('electron-localshortcut')

const DownloadManager = require("electron-download-manager")
 
DownloadManager.register()

function createWindow () {

  let win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: "img/bs_icon_19.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  })
  win.removeMenu()
  var open = false
  electronLocalshortcut.register('CommandOrControl+Shift+I', () => {
    if(!open){
      win.webContents.openDevTools();
      open = true
    }else{
      win.webContents.closeDevTools();
      open = false
    }
  })
  electronLocalshortcut.register('F11', () => {
    if(win.isFullScreen()){
      win.setFullScreen(false)
    }else{
      win.setFullScreen(true)
    }
  })
  electronLocalshortcut.register('CommandOrControl+R', () => {
    win.reload()
  })
  win.loadFile('slideshow.html')
}

app.whenReady().then(createWindow)


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})