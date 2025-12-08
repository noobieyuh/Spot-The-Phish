// From the JellyPhishers
const { app, BrowserWindow } = require('electron')

const path = require('node:path')

const createWindow = () => {
    const win = new BrowserWindow({
        autoHideMenuBar: true,
        width: 1600,
        height: 1200,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'),
        },
    })

    win.loadFile('src/index.html')
}

app.whenReady().then(() => {
    createWindow()
})
