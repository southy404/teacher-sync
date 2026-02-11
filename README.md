# Teacher Sync

Teacher Sync is a Visual Studio Code extension that enables real-time project synchronization between instructors and students.

Teachers can create structured project snapshots and distribute them instantly to connected participants. Students can experiment locally and reset their workspace to the official teacher version at any time.

The extension is designed for live coding sessions, bootcamps, workshops, and classroom environments.

---

## Overview

Teacher Sync provides:

- Session-based collaboration
- Snapshot creation and distribution
- Version-aware updates
- Student-side confirmation before applying changes
- Local experimentation with reset support
- Real-time synchronization via WebSocket
- Sidebar-based control interface

The system architecture separates teacher and student roles while maintaining full local control of the project workspace.

---

## Features

### Session Management

Teachers can start a session and share a session code.  
Students join using the provided code.

Each session maintains:

- One teacher
- Multiple students
- A shared project snapshot
- Live student count tracking

Sessions automatically close if the teacher disconnects.

---

### Snapshot System

Teachers can create a project snapshot representing the current workspace state.

Snapshots include:

- File content
- File hashes
- Timestamp-based version identifier

Snapshots are:

- Stored locally in `.vsc-teacher/baseSnapshot.json`
- Broadcast to all connected students
- Automatically version-checked before application

---

### Version Control Logic

Incoming snapshots are applied only if:

- The version is newer than the local version
- The student confirms the update

Students are never forced to overwrite their workspace without confirmation.

---

### Reset to Teacher Version

Students can reset their workspace to the latest teacher snapshot at any time.

This allows:

- Safe experimentation
- Recovery from breaking changes
- Controlled learning environments

---

### Sidebar Interface

Teacher Sync integrates directly into the VS Code Activity Bar.

The sidebar provides:

- Connection status
- Current session code
- Role indicator (Teacher / Student)
- Student count (for teachers)
- New version notification badge (for students)
- Direct access to all session and snapshot controls

---

## Requirements

- Visual Studio Code version 1.109.0 or later
- Node.js 18+ (for running the WebSocket server)
- A running Teacher Sync WebSocket server (local or cloud)

---

## Server Setup

Teacher Sync requires a WebSocket server for session coordination.

Example server deployment options:

- Local Node.js server (development)
- Railway (recommended for production)
- Render
- VPS with Nginx reverse proxy

The server must support secure WebSocket connections (`wss://`) in production environments.

---

## Extension Commands

The extension provides the following commands:

- `Teacher Sync: Start Session`
- `Teacher Sync: Join Session`
- `Teacher Sync: Leave Session`
- `Teacher Sync: Create Snapshot`
- `Teacher Sync: Reset to Teacher Version`

Commands are accessible via:

- Sidebar controls
- Command Palette (`Ctrl + Shift + P`)

---

## Data Storage

Snapshots are stored locally in:

.vsc-teacher/baseSnapshot.json

No user data is transmitted or stored externally beyond snapshot synchronization during active sessions.

---

## Security Considerations

Current session access is controlled via session codes.

For production environments, consider:

- Token-based authentication
- Session expiration policies
- Rate limiting
- Access restrictions

---

## Known Limitations

- No persistent snapshot history (only latest snapshot stored)
- No built-in authentication system
- No diff-preview interface (full snapshot application only)

Future improvements may include granular file diffs and role-based permissions.

---

## Release Notes

### 0.0.1

Initial release:

- Session management
- Snapshot creation and synchronization
- Reset functionality
- Sidebar interface
- Version-aware update handling
- WebSocket auto-reconnect support

---

## Architecture Summary

Teacher Sync consists of:

- VS Code Extension (client)
- WebSocket Coordination Server
- Snapshot Engine (file scanner + hash generator)
- Snapshot Storage Layer
- Session Manager
- Sidebar UI Layer

The extension prioritizes stability, local control, and safe synchronization.

---

## Contributing

Contributions are welcome. Please open an issue before submitting large feature changes.

---

## License

MIT License
