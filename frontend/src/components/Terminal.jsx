import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const XTerminal = () => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);

    useEffect(() => {
        term.current = new Terminal({ cursorBlink: true, fontSize: 14 });
        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.open(terminalRef.current);
        fitAddon.current.fit();

        const ws = new WebSocket('ws://localhost:8000/terminal');
        ws.onopen = () => term.current.writeln('Connected to terminal.\r\n');
        ws.onmessage = (e) => term.current.write(e.data);
        ws.onerror = () => term.current.writeln('\r\n\x1b[31mCannot connect to terminal server.\x1b[0m');

        term.current.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });

        const handleResize = () => fitAddon.current.fit();
        window.addEventListener('resize', handleResize);
        return () => {
            ws.close();
            window.removeEventListener('resize', handleResize);
            term.current.dispose();
        };
    }, []);

    return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />;
};

export default XTerminal;
