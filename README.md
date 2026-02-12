No personal user data is persisted externally beyond active session synchronization.

---

## Security Considerations

Session access is currently controlled via session codes.

For production deployments, consider implementing:

- Token-based authentication
- Session expiration policies
- Rate limiting
- Access control restrictions

---

## Known Limitations

- Only the latest snapshot is stored (no version history)
- No built-in authentication layer
- No granular diff preview (full snapshot application only)

Planned improvements may include:

- Incremental file diffs
- Snapshot history
- Role-based permission controls
- Administrative dashboard

---

## Architecture

Teacher Sync consists of:

- VS Code Extension (Client)
- WebSocket Coordination Server
- Snapshot Engine (File Scanner + Hash Generator)
- Snapshot Storage Layer
- Session Manager
- Sidebar UI Layer

The system prioritizes stability, local control, and safe synchronization.

---

## Contributing

Contributions are welcome. Please open an issue before submitting large feature changes.

---

## License

MIT
