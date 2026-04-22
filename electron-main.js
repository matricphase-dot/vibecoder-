const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;
let ollamaProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.ico'), // optional
        title: 'VibeCoder'
    });
    // In production, load built frontend files
    // For development, we can load from Vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
    }
    mainWindow.on('closed', () => { mainWindow = null; });
}

function startBackend() {
    const backendPath = path.join(__dirname, 'backend');
    backendProcess = spawn('python', ['-m', 'uvicorn', 'src.main:app', '--host', '127.0.0.1', '--port', '8000'], {
        cwd: backendPath,
        env: { ...process.env, PYTHONPATH: backendPath },
        stdio: 'pipe'
    });
    backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`Backend error: ${data}`));
}

function startOllama() {
    ollamaProcess = spawn('ollama', ['serve'], { stdio: 'pipe' });
    ollamaProcess.stdout.on('data', (data) => console.log(`Ollama: ${data}`));
}

app.whenReady().then(() => {
    startOllama();
    // Wait a bit for Ollama to start
    setTimeout(() => {
        startBackend();
        createWindow();
    }, 3000);
});

app.on('window-all-closed', () => {
    if (backendProcess) backendProcess.kill();
    if (ollamaProcess) ollamaProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});
