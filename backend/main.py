import docker
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from starlette.websockets import WebSocketState
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS-Middleware hinzufügen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Produktion spezifischere Ursprünge verwenden
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Docker-Client mit Fehlerbehandlung initialisieren
try:
    client = docker.from_env()
except Exception as e:
    print(f"Docker-Client-Initialisierungsfehler: {e}")
    # Stellen Sie sicher, dass der Docker-Daemon ausgeführt wird

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    container = None

    try:
        # Container starten
        container = client.containers.run(
            "ubuntu:latest",
            command="/bin/bash",
            stdin_open=True,
            tty=True,
            detach=True,
            auto_remove=True
        )
        
        exec_instance = client.api.exec_create(container.id, cmd="/bin/bash", stdin=True, tty=True)
        sock = client.api.exec_start(exec_instance['Id'], detach=False, tty=True, stream=True, socket=True)

        loop = asyncio.get_event_loop()

        async def receive_from_client():
            try:
                while websocket.client_state == WebSocketState.CONNECTED:
                    data = await websocket.receive_text()
                    sock._sock.send(data.encode())
            except Exception as e:
                print(f"Fehler beim Empfangen vom Client: {e}")

        async def send_to_client():
            try:
                while websocket.client_state == WebSocketState.CONNECTED:
                    output = await loop.run_in_executor(None, lambda: sock._sock.recv(1024))
                    if not output:
                        break
                    await websocket.send_text(output.decode(errors="ignore"))
            except Exception as e:
                print(f"Fehler beim Senden zum Client: {e}")

        # Beide Tasks ausführen und bei Fehler die andere beenden
        receive_task = asyncio.create_task(receive_from_client())
        send_task = asyncio.create_task(send_to_client())
        
        # Warten auf die erste Task, die beendet wird
        done, pending = await asyncio.wait(
            [receive_task, send_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Verbleibende Tasks abbrechen
        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        print("Client getrennt")
    except Exception as e:
        print(f"WebSocket-Fehler: {e}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close(code=1011, reason=str(e))
    finally:
        if container:
            try:
                container.kill()
                print(f"Container {container.id} beendet")
            except Exception as e:
                print(f"Fehler beim Beenden des Containers: {e}")

# Einfache Route zum Testen, ob der Server läuft
@app.get("/")
def read_root():
    return {"status": "online", "message": "WebSocket-Server ist aktiv"}