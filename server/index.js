const { WebSocketServer } = require("ws");

/* -------------------------------------------------------------------------- */
/*                              Config                                         */
/* -------------------------------------------------------------------------- */

const PORT = process.env.PORT || 8080;

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

/* -------------------------------------------------------------------------- */
/*                              Session Store                                 */
/* -------------------------------------------------------------------------- */

const sessions = new Map();

/*
Session structure:

{
  teacher: WebSocket,
  students: Set<WebSocket>,
  snapshot: object | null
}
*/

/* -------------------------------------------------------------------------- */
/*                              Helpers                                        */
/* -------------------------------------------------------------------------- */

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastStudentCount(code) {
  const session = sessions.get(code);
  if (!session) return;

  send(session.teacher, {
    type: "STUDENT_COUNT",
    count: session.students.size,
  });
}

function cleanupSocket(ws) {
  const code = ws.sessionCode;
  if (!code) return;

  const session = sessions.get(code);
  if (!session) return;

  if (ws.role === "teacher") {
    console.log(`Teacher disconnected. Closing session ${code}`);

    session.students.forEach((student) => {
      send(student, {
        type: "SESSION_CLOSED",
        message: "Teacher ended the session.",
      });
    });

    sessions.delete(code);
  }

  if (ws.role === "student") {
    session.students.delete(ws);
    broadcastStudentCount(code);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Connection                                     */
/* -------------------------------------------------------------------------- */

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.sessionCode = null;
  ws.role = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        /* ---------------------- START SESSION ---------------------- */

        case "START_SESSION": {
          const code = data.code;

          if (sessions.has(code)) {
            send(ws, {
              type: "ERROR",
              message: "Session code already exists",
            });
            return;
          }

          sessions.set(code, {
            teacher: ws,
            students: new Set(),
            snapshot: null,
          });

          ws.sessionCode = code;
          ws.role = "teacher";

          send(ws, {
            type: "SESSION_STARTED",
            message: "Session started successfully",
          });

          console.log(`Session started: ${code}`);
          break;
        }

        /* ---------------------- JOIN SESSION ----------------------- */

        case "JOIN_SESSION": {
          const code = data.code;
          const session = sessions.get(code);

          if (!session) {
            send(ws, {
              type: "ERROR",
              message: "Invalid session code",
            });
            return;
          }

          session.students.add(ws);

          ws.sessionCode = code;
          ws.role = "student";

          send(ws, {
            type: "JOINED",
            message: "Successfully joined session",
          });

          console.log(`Student joined session: ${code}`);

          // Send existing snapshot if available
          if (session.snapshot) {
            send(ws, {
              type: "SNAPSHOT",
              snapshot: session.snapshot,
            });

            console.log("Existing snapshot sent to new student");
          }

          broadcastStudentCount(code);
          break;
        }

        /* -------------------- TEACHER SNAPSHOT --------------------- */

        case "TEACHER_SNAPSHOT": {
          const code = ws.sessionCode;
          const session = sessions.get(code);

          if (!code || !session) return;
          if (ws.role !== "teacher") return;

          session.snapshot = data.snapshot;

          session.students.forEach((student) => {
            send(student, {
              type: "SNAPSHOT",
              snapshot: data.snapshot,
            });
          });

          broadcastStudentCount(code);

          console.log(`Snapshot broadcasted in session ${code}`);
          break;
        }

        /* ---------------------- LEAVE SESSION ---------------------- */

        case "LEAVE_SESSION": {
          cleanupSocket(ws);

          ws.sessionCode = null;
          ws.role = null;

          send(ws, {
            type: "LEFT",
            message: "Left session",
          });

          break;
        }

        default:
          console.warn("Unknown message type:", data.type);
      }
    } catch (err) {
      console.error("Invalid message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    cleanupSocket(ws);
  });
});
