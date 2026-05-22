// webview-stub.js — заглушка Web Serial API для WebView
(function() {
    if (navigator.serial) {
        console.log('[Stub] Real Web Serial API detected, skipping');
        return;
    }
    
    console.log('[Stub] Creating virtual serial port');
    
    // Сразу создаём порт, чтобы getPorts() всегда его возвращал
    var _port = {
        readable: new ReadableStream({
            start: function(controller) {
                window._stubController = controller;
                console.log('[Stub] ReadableStream started');
            }
        }),
        writable: new WritableStream({
            write: function(chunk) {
                var text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
                console.log('[Stub] Write:', text);
                if (window._uartWriteCallback) {
                    window._uartWriteCallback(text);
                }
            }
        }),
        open: function(options) {
            console.log('[Stub] Port opened with', options);
            return Promise.resolve();
        },
        close: function() {
            console.log('[Stub] Port closed');
            return Promise.resolve();
        },
        getInfo: function() {
            return {
                usbVendorId: 0x0403,
                usbProductId: 0x6001
            };
        }
    };
    
    navigator.serial = {
        requestPort: function(filters) {
            console.log('[Stub] requestPort called', filters);
            return Promise.resolve(_port);
        },
        
        getPorts: function() {
            console.log('[Stub] getPorts called, returning 1 port');
            return Promise.resolve([_port]);
        },
        
        addEventListener: function(event, callback) {
            console.log('[Stub] addEventListener:', event);
        },
        
        removeEventListener: function(event, callback) {
            console.log('[Stub] removeEventListener:', event);
        }
    };
    
    console.log('[Stub] Virtual serial port ready (pre-created)');
})();