// webview-stub.js — заглушка Web Serial API для WebView
// Не мешает работе в обычных браузерах с реальным Web Serial API
(function() {
    // Проверяем, есть ли уже navigator.serial (в обычном Chrome — есть)
    if (navigator.serial) {
        console.log('[Stub] Real Web Serial API detected, skipping stub');
        return;
    }
    
    console.log('[Stub] Creating virtual serial port for WebView');
    
    var _port = null;
    
    navigator.serial = {
        requestPort: function(filters) {
            console.log('[Stub] requestPort called', filters);
            if (!_port) {
                _port = {
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
            }
            return Promise.resolve(_port);
        },
        
        getPorts: function() {
            console.log('[Stub] getPorts called');
            var ports = _port ? [_port] : [];
            return Promise.resolve(ports);
        },
        
        addEventListener: function(event, callback) {
            console.log('[Stub] addEventListener:', event);
            if (event === 'connect') {
                // Сразу вызываем callback с виртуальным событием
                setTimeout(function() {
                    callback({ target: navigator.serial });
                }, 100);
            }
        },
        
        removeEventListener: function(event, callback) {
            console.log('[Stub] removeEventListener:', event);
        }
    };
    
    console.log('[Stub] Virtual serial port ready');
})();