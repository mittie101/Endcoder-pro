// security.test.js — Regression tests that verify Electron security flags and CSP are set correctly.
// These tests guard against accidental removal of sandbox, contextIsolation, webSecurity, or CSP.

jest.mock('electron', () => {
    const mockOnHeadersReceived = jest.fn();
    const mockWindow = {
        loadFile: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        show: jest.fn(),
        webContents: {
            session: { webRequest: { onHeadersReceived: mockOnHeadersReceived } },
            send: jest.fn()
        }
    };
    const BrowserWindow = jest.fn(() => mockWindow);
    BrowserWindow.getAllWindows = jest.fn(() => []);
    return {
        app: { whenReady: jest.fn(() => new Promise(() => {})), on: jest.fn(), quit: jest.fn() },
        BrowserWindow,
        ipcMain: { handle: jest.fn() },
        dialog: { showMessageBox: jest.fn() },
        shell: { openExternal: jest.fn() },
        Menu: { buildFromTemplate: jest.fn(() => ({})), setApplicationMenu: jest.fn() }
    };
});

const { createWindow } = require('../main/window');
createWindow();

const { BrowserWindow } = require('electron');
const createdWindow = BrowserWindow.mock.results[0].value;
const webPrefs = BrowserWindow.mock.calls[0][0].webPreferences;

describe('BrowserWindow security flags', () => {
    test('nodeIntegration is false',  () => expect(webPrefs.nodeIntegration).toBe(false));
    test('contextIsolation is true',  () => expect(webPrefs.contextIsolation).toBe(true));
    test('sandbox is true',           () => expect(webPrefs.sandbox).toBe(true));
    test('webSecurity is true',       () => expect(webPrefs.webSecurity).toBe(true));
});

describe('Content Security Policy', () => {
    const { onHeadersReceived } = createdWindow.webContents.session.webRequest;

    test('CSP is registered via session.webRequest.onHeadersReceived', () => {
        expect(onHeadersReceived).toHaveBeenCalled();
    });

    function getCsp() {
        const [callback] = onHeadersReceived.mock.calls[0];
        const fn = jest.fn();
        callback({ responseHeaders: {} }, fn);
        return fn.mock.calls[0][0].responseHeaders['Content-Security-Policy'][0];
    }

    test("CSP restricts default-src to 'self'", () => {
        expect(getCsp()).toContain("default-src 'self'");
    });

    test('CSP allows cdn.jsdelivr.net for Monaco Editor scripts', () => {
        expect(getCsp()).toContain('cdn.jsdelivr.net');
    });

    test('CSP blocks inline scripts from unknown sources via default-src', () => {
        // Presence of default-src 'self' means unlisted sources are blocked
        expect(getCsp()).toMatch(/default-src 'self'/);
    });
});
