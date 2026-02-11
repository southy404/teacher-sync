import * as vscode from "vscode";
import { SnapshotEngine } from "./snapshot/snapshotEngine";
import { SnapshotStorage } from "./snapshot/snapshotStorage";
import { ResetController } from "./snapshot/resetController";
import { TeacherSyncSidebarProvider } from "./ui/sidebarProvider";
import { SocketClient } from "./network/socketClient";

/* -------------------------------------------------------------------------- */
/*                                Globals                                     */
/* -------------------------------------------------------------------------- */

let outputChannel: vscode.OutputChannel;
let sidebarProvider: TeacherSyncSidebarProvider;
let socketClient: SocketClient;

let pendingSnapshotVersion: string | null = null;
let studentCount: number = 0;

let currentSessionCode: string | null = null;
let currentRole: "teacher" | "student" | null = null;
let isConnected: boolean = false;

/* -------------------------------------------------------------------------- */
/*                                Activate                                    */
/* -------------------------------------------------------------------------- */

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Teacher Sync");
  sidebarProvider = new TeacherSyncSidebarProvider();
  socketClient = new SocketClient();

  vscode.window.registerTreeDataProvider("teacherSyncSidebar", sidebarProvider);

  context.subscriptions.push(outputChannel);

  exposeGlobalState();
  await initializeWebSocket();
  registerCommands(context);
}

export function deactivate() {
  try {
    socketClient.leaveSession();
  } catch {}
}

/* -------------------------------------------------------------------------- */
/*                           Global State Exposure                            */
/* -------------------------------------------------------------------------- */

function exposeGlobalState() {
  (global as any).teacherSyncState = {
    get sessionCode() {
      return currentSessionCode;
    },
    get role() {
      return currentRole;
    },
    get isConnected() {
      return isConnected;
    },
    get pendingVersion() {
      return pendingSnapshotVersion;
    },
    get studentCount() {
      return studentCount;
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                        WebSocket Initialization                            */
/* -------------------------------------------------------------------------- */

async function initializeWebSocket() {
  socketClient.onConnectionChange((connected) => {
    isConnected = connected;

    if (connected) {
      logLine("WebSocket connected.");

      // AUTO REJOIN
      if (currentSessionCode && currentRole) {
        logLine("Attempting automatic session rejoin...");

        if (currentRole === "teacher") {
          socketClient.startSession(currentSessionCode);
        }

        if (currentRole === "student") {
          socketClient.joinSession(currentSessionCode);
        }
      }
    } else {
      logLine("WebSocket disconnected.");
    }

    sidebarProvider.refresh();
  });

  socketClient.onSnapshot(async (snapshot) => {
    await processIncomingSnapshot(snapshot);
  });

  socketClient.onMessage((rawMsg) => {
    try {
      const parsed = JSON.parse(rawMsg);

      if (parsed.type === "STUDENT_COUNT") {
        studentCount = parsed.count;
        sidebarProvider.refresh();
        return;
      }

      vscode.window.showInformationMessage(parsed.message ?? rawMsg);
    } catch {
      vscode.window.showInformationMessage(rawMsg);
    }
  });

  try {
    await socketClient.connect();
  } catch {
    isConnected = false;
    logLine("Initial WebSocket connection failed.");
  }
}

/* -------------------------------------------------------------------------- */
/*                             Command Register                               */
/* -------------------------------------------------------------------------- */

function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "teacher-sync.createSnapshot",
      handleCreateSnapshot
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "teacher-sync.resetToTeacher",
      handleManualReset
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "teacher-sync.startSession",
      handleStartSession
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "teacher-sync.joinSession",
      handleJoinSession
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "teacher-sync.leaveSession",
      handleLeaveSession
    )
  );
}

/* -------------------------------------------------------------------------- */
/*                            Snapshot Commands                               */
/* -------------------------------------------------------------------------- */

async function handleCreateSnapshot() {
  try {
    const workspacePath = getWorkspacePathOrThrow();

    logSection("Creating Snapshot");

    const engine = new SnapshotEngine(workspacePath);
    const snapshot = engine.createSnapshot();

    const storage = new SnapshotStorage(workspacePath);
    storage.saveSnapshot(snapshot);

    if (currentRole === "teacher") {
      socketClient.sendSnapshot(snapshot);
      logLine("Snapshot broadcasted to students.");
    }

    sidebarProvider.refresh();
    outputChannel.show(true);

    vscode.window.showInformationMessage("Snapshot created.");
  } catch (error: any) {
    handleError("Snapshot creation failed", error);
  }
}

async function handleManualReset() {
  try {
    const workspacePath = getWorkspacePathOrThrow();
    const resetController = new ResetController(workspacePath);

    resetController.resetWorkspace();

    pendingSnapshotVersion = null;
    sidebarProvider.refresh();

    logLine("Workspace manually reset.");
    outputChannel.show(true);
  } catch (error: any) {
    handleError("Workspace reset failed", error);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Session Commands                              */
/* -------------------------------------------------------------------------- */

async function handleStartSession() {
  if (!isConnected) {
    vscode.window.showErrorMessage("WebSocket not connected.");
    return;
  }

  const code = generateSessionCode();
  socketClient.startSession(code);

  currentSessionCode = code;
  currentRole = "teacher";
  studentCount = 0;

  logSection("Session Started");
  logLine(`Code: ${code}`);

  sidebarProvider.refresh();
  outputChannel.show(true);
}

async function handleJoinSession() {
  if (!isConnected) {
    vscode.window.showErrorMessage("WebSocket not connected.");
    return;
  }

  const code = await vscode.window.showInputBox({
    prompt: "Enter Session Code",
  });

  if (!code) return;

  socketClient.joinSession(code);

  currentSessionCode = code;
  currentRole = "student";

  logSection("Joined Session");
  logLine(`Code: ${code}`);

  sidebarProvider.refresh();
  outputChannel.show(true);
}

async function handleLeaveSession() {
  socketClient.leaveSession();

  currentSessionCode = null;
  currentRole = null;
  pendingSnapshotVersion = null;
  studentCount = 0;

  logSection("Session Left");
  logLine("You have left the session.");

  sidebarProvider.refresh();
  outputChannel.show(true);
}

/* -------------------------------------------------------------------------- */
/*                     Incoming Snapshot Processing                           */
/* -------------------------------------------------------------------------- */

async function processIncomingSnapshot(incomingSnapshot: any) {
  try {
    const workspacePath = getWorkspacePathOrThrow();
    const storage = new SnapshotStorage(workspacePath);

    const localSnapshot = storage.loadSnapshot();

    // Version Check
    if (localSnapshot && localSnapshot.id >= incomingSnapshot.id) {
      logLine("Incoming snapshot ignored (not newer).");
      return;
    }

    // Set badge immediately
    pendingSnapshotVersion = incomingSnapshot.id;
    sidebarProvider.refresh();

    const choice = await vscode.window.showInformationMessage(
      `New teacher version (v${incomingSnapshot.id}) available.`,
      "Apply",
      "Later"
    );

    if (choice !== "Apply") {
      logLine("Student postponed snapshot update.");
      return;
    }

    storage.saveSnapshot(incomingSnapshot);

    const resetController = new ResetController(workspacePath);
    resetController.resetWorkspace();

    pendingSnapshotVersion = null;

    logSection("Snapshot Applied");
    logLine(`Applied version: ${incomingSnapshot.id}`);

    sidebarProvider.refresh();
    outputChannel.show(true);
  } catch (error) {
    handleError("Failed to process incoming snapshot", error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Utilities                                  */
/* -------------------------------------------------------------------------- */

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getWorkspacePathOrThrow(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error("No workspace open.");
  }

  return workspaceFolders[0].uri.fsPath;
}

function logSection(title: string) {
  outputChannel.appendLine("────────────────────────────");
  outputChannel.appendLine(title);
  outputChannel.appendLine("");
}

function logLine(message: string) {
  outputChannel.appendLine(message);
}

function handleError(context: string, error: any) {
  outputChannel.appendLine("❌ " + context);
  outputChannel.appendLine(error?.message || String(error));
  outputChannel.show(true);

  vscode.window.showErrorMessage(`Teacher Sync: ${context}`);
}
