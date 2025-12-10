// From the JellyPhishers
const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

const createWindow = () => {
    const win = new BrowserWindow({
        autoHideMenuBar: true,
        width: 800,
        height: 800,
        icon: './assets/images/mail256.png',
        webPreferences: {
            preload: path.join(__dirname, './src/preload.js'),
        },
    })

    win.loadFile('./src/index.html')
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

