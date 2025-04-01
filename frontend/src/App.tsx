import { useState } from 'react'
import './App.css'
import Terminal from './components/Terminal'

function App() {
  const [webSocketUrl, setWebSocketUrl] = useState('ws://localhost:8000/ws')

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Terminal Sandbox</h1>
        <p>Eine sichere Docker-Container-Terminal-Umgebung im Browser</p>
      </header>
      
      <main className="app-main">
        <div className="settings-panel">
          <div className="form-group">
            <label htmlFor="ws-url">WebSocket URL:</label>
            <input
              id="ws-url"
              type="text"
              value={webSocketUrl}
              onChange={(e) => setWebSocketUrl(e.target.value)}
              placeholder="ws://localhost:8000/ws"
            />
          </div>
        </div>
        
        <Terminal webSocketUrl={webSocketUrl} autoConnect={false} />
      </main>
      
      <footer className="app-footer">
        <p>Terminal Sandbox | Docker-in-Docker mit React & FastAPI</p>
      </footer>
    </div>
  )
}

export default App
