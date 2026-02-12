import WebSocket from "ws";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

type SnapshotHandler = (snapshot: any) => void;
type MessageHandler = (message: string) => void;
type ConnectionHandler = (connected: boolean) => void;

/* -------------------------------------------------------------------------- */
/*                               SocketClient                                 */
/* -------------------------------------------------------------------------- */

export class SocketClient {
  private socket: WebSocket | null = null;
  private readonly url =
    process.env.TEACHER_SYNC_SERVER ??
    "wss://teacher-sync-server-production.up.railway.app";

  private snapshotHandler: SnapshotHandler | null = null;
  private messageHandler: MessageHandler | null = null;
  private connectionHandler: ConnectionHandler | null = null;

  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private manuallyClosed = false;

  /* -------------------------------------------------------------------------- */
  /*                                  CONNECT                                   */
  /* -------------------------------------------------------------------------- */

  async connect(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url);
      this.manuallyClosed = false;

      this.socket.on("open", () => {
        this.reconnectAttempts = 0;
        this.connectionHandler?.(true);
        resolve();
      });

      this.socket.on("message", (data) => {
        this.handleMessage(data.toString());
      });

      this.socket.on("close", () => {
        this.connectionHandler?.(false);

        if (!this.manuallyClosed) {
          this.scheduleReconnect();
        }
      });

      this.socket.on("error", (err) => {
        this.connectionHandler?.(false);
        reject(err);
      });
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                              RECONNECT LOGIC                               */
  /* -------------------------------------------------------------------------- */

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("Max reconnect attempts reached.");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // exponential backoff (max 30s)

    this.reconnectAttempts++;

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        this.scheduleReconnect();
      });
    }, delay);
  }

  /* -------------------------------------------------------------------------- */
  /*                              MESSAGE HANDLING                              */
  /* -------------------------------------------------------------------------- */

  private handleMessage(raw: string) {
    try {
      const parsed = JSON.parse(raw);

      switch (parsed.type) {
        case "SNAPSHOT":
          this.snapshotHandler?.(parsed.snapshot);
          break;

        case "JOINED":
        case "ERROR":
        case "LEFT":
        case "SESSION_STARTED":
        case "SESSION_CLOSED":
          this.messageHandler?.(parsed.message);
          break;

        default:
          console.warn("Unknown message type:", parsed.type);
      }
    } catch {
      console.error("Invalid WebSocket message:", raw);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                               PUBLIC API                                   */
  /* -------------------------------------------------------------------------- */

  startSession(code: string) {
    this.send({ type: "START_SESSION", code });
  }

  joinSession(code: string) {
    this.send({ type: "JOIN_SESSION", code });
  }

  leaveSession() {
    this.send({ type: "LEAVE_SESSION" });
  }

  sendSnapshot(snapshot: any) {
    this.send({ type: "TEACHER_SNAPSHOT", snapshot });
  }

  onSnapshot(handler: SnapshotHandler) {
    this.snapshotHandler = handler;
  }

  onMessage(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  onConnectionChange(handler: ConnectionHandler) {
    this.connectionHandler = handler;
  }

  /* -------------------------------------------------------------------------- */
  /*                                   CLOSE                                    */
  /* -------------------------------------------------------------------------- */

  disconnect() {
    this.manuallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                   SEND                                     */
  /* -------------------------------------------------------------------------- */

  private send(payload: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected.");
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }
}
