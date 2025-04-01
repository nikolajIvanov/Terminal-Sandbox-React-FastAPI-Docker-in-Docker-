import { useState, useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import '../styles/Terminal.css';

interface TerminalProps {
  webSocketUrl: string;
  autoConnect?: boolean;
}

const Terminal = ({ webSocketUrl, autoConnect = true }: TerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<XTerm | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fitAddonRef = useRef<FitAddon>(new FitAddon());

  // Terminal initialisieren
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
      },
    });

    term.loadAddon(fitAddonRef.current);
    term.open(terminalRef.current);
    fitAddonRef.current.fit();
    setTerminal(term);

    term.writeln('Terminal Sandbox - Bereit');
    term.writeln('Drücke "Verbinden" oder gib einen Befehl ein, um zu starten...');

    // Terminal-Größe bei Resize anpassen
    const resizeObserver = new ResizeObserver(() => {
      fitAddonRef.current.fit();
    });
    
    resizeObserver.observe(terminalRef.current);

    return () => {
      term.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  // WebSocket-Verbindung herstellen wenn autoConnect true ist
  useEffect(() => {
    if (autoConnect && terminal) {
      connectWebSocket();
    }
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [terminal, autoConnect]);

  // WebSocket-Verbindung herstellen
  const connectWebSocket = () => {
    if (socket?.readyState === WebSocket.OPEN) return;
    
    try {
      const ws = new WebSocket(webSocketUrl);
      setSocket(ws);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        terminal?.writeln('\r\n\x1b[32mVerbunden mit dem WebSocket-Server!\x1b[0m');
        
        // Input-Handler hinzufügen, sobald Verbindung hergestellt ist
        if (terminal) {
          terminal.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(data);
            }
          });
        }
      };
      
      ws.onmessage = (event) => {
        terminal?.write(event.data);
      };
      
      ws.onclose = (event) => {
        setIsConnected(false);
        terminal?.writeln(`\r\n\x1b[31mVerbindung geschlossen: ${event.reason || 'Kein Grund angegeben'}\x1b[0m`);
      };
      
      ws.onerror = () => {
        setError('WebSocket-Verbindungsfehler');
        terminal?.writeln('\r\n\x1b[31mFehler bei der WebSocket-Verbindung\x1b[0m');
      };
    } catch (err) {
      setError(`Verbindungsfehler: ${err instanceof Error ? err.message : String(err)}`);
      terminal?.writeln(`\r\n\x1b[31mFehler: ${err instanceof Error ? err.message : String(err)}\x1b[0m`);
    }
  };

  // WebSocket-Verbindung trennen
  const disconnectWebSocket = () => {
    if (socket) {
      socket.close();
      setSocket(null);
      terminal?.writeln('\r\n\x1b[33mVerbindung getrennt\x1b[0m');
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <h3>Terminal Sandbox</h3>
        <div className="terminal-status">
          Status: <span className={isConnected ? 'connected' : 'disconnected'}>
            {isConnected ? 'Verbunden' : 'Getrennt'}
          </span>
          {error && <span className="error"> - {error}</span>}
        </div>
        <div className="terminal-controls">
          <button 
            onClick={connectWebSocket} 
            disabled={isConnected}
            className="connect-btn"
          >
            Verbinden
          </button>
          <button 
            onClick={disconnectWebSocket} 
            disabled={!isConnected}
            className="disconnect-btn"
          >
            Trennen
          </button>
        </div>
      </div>
      <div className="terminal" ref={terminalRef} />
    </div>
  );
};

export default Terminal; 