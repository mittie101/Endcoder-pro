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
        Menu: { buildFromTemplate: jest.fn(() => ({})), setApplicationMenu: jest.fn() },
        // crypto module is used by window.js for nonce generation — not needed in mock
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
    test('additionalArguments contains a style-nonce', () => {
        expect(webPrefs.additionalArguments).toEqual(
            expect.arrayContaining([expect.stringMatching(/^--style-nonce=[A-Za-z0-9+/]+$/)])
        );
    });
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

    test("CSP does not allow 'unsafe-eval' (Monaco is locally bundled)", () => {
        expect(getCsp()).not.toContain('unsafe-eval');
    });

    test("CSP does not allow 'unsafe-inline' in style-src (Monaco uses nonce instead)", () => {
        expect(getCsp()).not.toContain('unsafe-inline');
    });

    test("CSP style-src uses a per-session nonce for Monaco's dynamic <style> tags", () => {
        expect(getCsp()).toMatch(/style-src 'self' 'nonce-[A-Za-z0-9+/]+'/)
    });

    test('CSP has no external CDN sources (all assets are self-hosted)', () => {
        expect(getCsp()).not.toContain('cdn.jsdelivr.net');
    });

    test('CSP blocks inline scripts from unknown sources via default-src', () => {
        expect(getCsp()).toMatch(/default-src 'self'/);
    });
});
