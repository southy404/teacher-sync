import { Session } from "./sessionTypes";

export class SessionManager {
  private static instance: SessionManager;
  private session: Session | null = null;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public startSession(): string {
    const code = this.generateCode();

    this.session = {
      code,
      teacherSnapshot: null,
      students: [],
    };

    return code;
  }

  public joinSession(code: string): boolean {
    if (!this.session) return false;
    if (this.session.code !== code) return false;

    this.session.students.push("student");
    return true;
  }

  public setTeacherSnapshot(snapshot: any) {
    if (!this.session) return;
    this.session.teacherSnapshot = snapshot;
  }

  public getTeacherSnapshot() {
    return this.session?.teacherSnapshot || null;
  }

  public hasActiveSession(): boolean {
    return !!this.session;
  }

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
