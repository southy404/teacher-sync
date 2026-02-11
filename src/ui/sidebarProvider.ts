import * as vscode from "vscode";

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

interface TeacherSyncState {
  sessionCode: string | null;
  role: "teacher" | "student" | null;
  isConnected: boolean;
  pendingVersion?: string | null;
  studentCount?: number;
}

/* -------------------------------------------------------------------------- */
/*                        Teacher Sync Sidebar Provider                       */
/* -------------------------------------------------------------------------- */

export class TeacherSyncSidebarProvider
  implements vscode.TreeDataProvider<SidebarItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SidebarItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SidebarItem): Thenable<SidebarItem[]> {
    const state = this.getState();

    if (!element) {
      return Promise.resolve([
        SidebarItem.section("session"),
        SidebarItem.section("teacher"),
        SidebarItem.section("student"),
      ]);
    }

    switch (element.id) {
      case "session":
        return Promise.resolve(this.buildSessionSection(state));

      case "teacher":
        return Promise.resolve(this.buildTeacherSection(state));

      case "student":
        return Promise.resolve(this.buildStudentSection(state));

      default:
        return Promise.resolve([]);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            Section Builders                               */
  /* -------------------------------------------------------------------------- */

  private buildSessionSection(state: TeacherSyncState): SidebarItem[] {
    const items: SidebarItem[] = [];

    items.push(
      SidebarItem.info(
        `Connection: ${state.isConnected ? "Connected" : "Disconnected"}`,
        state.isConnected ? "debug-start" : "debug-stop"
      )
    );

    items.push(SidebarItem.info(`Role: ${state.role ?? "None"}`, "person"));

    if (!state.sessionCode) {
      return items;
    }

    items.push(SidebarItem.info(`Code: ${state.sessionCode}`, "key"));

    // Teacher sees student count
    if (state.role === "teacher") {
      items.push(
        SidebarItem.info(
          `Students Connected: ${state.studentCount ?? 0}`,
          "organization"
        )
      );
    }

    // Student sees pending version badge
    if (state.pendingVersion) {
      items.push(
        SidebarItem.command(
          `New Version Available (v${state.pendingVersion})`,
          "teacher-sync.resetToTeacher",
          "warning"
        )
      );
    }

    items.push(
      SidebarItem.command(
        "Leave Session",
        "teacher-sync.leaveSession",
        "sign-out"
      )
    );

    return items;
  }

  private buildTeacherSection(_: TeacherSyncState): SidebarItem[] {
    return [
      SidebarItem.command("Start Session", "teacher-sync.startSession", "play"),
      SidebarItem.command(
        "Create Snapshot",
        "teacher-sync.createSnapshot",
        "cloud-upload"
      ),
    ];
  }

  private buildStudentSection(_: TeacherSyncState): SidebarItem[] {
    return [
      SidebarItem.command("Join Session", "teacher-sync.joinSession", "plug"),
      SidebarItem.command(
        "Reset to Teacher Version",
        "teacher-sync.resetToTeacher",
        "refresh"
      ),
    ];
  }

  /* -------------------------------------------------------------------------- */
  /*                              State Getter                                 */
  /* -------------------------------------------------------------------------- */

  private getState(): TeacherSyncState {
    return (
      (global as any).teacherSyncState ?? {
        sessionCode: null,
        role: null,
        isConnected: false,
        pendingVersion: null,
        studentCount: 0,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              Sidebar Item                                  */
/* -------------------------------------------------------------------------- */

class SidebarItem extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    label: string,
    collapsible: vscode.TreeItemCollapsibleState,
    icon?: string,
    commandId?: string
  ) {
    super(label, collapsible);

    if (commandId) {
      this.command = {
        command: commandId,
        title: label,
      };
    }

    this.iconPath = new vscode.ThemeIcon(icon ?? "circle-large-outline");
  }

  /* --------------------------- Factories ----------------------------------- */

  static section(id: "session" | "teacher" | "student") {
    return new SidebarItem(
      id,
      id.charAt(0).toUpperCase() + id.slice(1),
      vscode.TreeItemCollapsibleState.Collapsed
    );
  }

  static info(label: string, icon?: string) {
    return new SidebarItem(
      crypto.randomUUID(),
      label,
      vscode.TreeItemCollapsibleState.None,
      icon
    );
  }

  static command(label: string, command: string, icon?: string) {
    return new SidebarItem(
      crypto.randomUUID(),
      label,
      vscode.TreeItemCollapsibleState.None,
      icon,
      command
    );
  }
}
