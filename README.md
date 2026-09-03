# File Organizer

File Organizer is an open-source desktop application designed to cleanly and efficiently organize your files. It features a modern UI and a robust backend to automatically sort, arrange, and metadata-tag your files.

## Features
- **Clean and Organize**: Automatically sort files into logical structures.
- **Smart Metadata Extraction**: Handles EXIF and ID3 tags.
- **Local Database**: Built with Spring Boot and H2/SQLite for fast, offline indexing.
- **Modern UI**: React-based frontend bundled with Electron.
- **Dry Run Mode**: See what will happen before moving your files.
- **Sync Options**: Includes mirroring capabilities.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Java (v21+)
- Maven

### Running Locally
To launch the application in development mode, use the provided scripts in the root directory:

**Windows:**
```shell
.\manager.bat dev
```

**macOS/Linux:**
```shell
./manager.sh dev
```

## Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started. By participating, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Security
For information about our security policies or to report a vulnerability, please see our [Security Policy](SECURITY.md).

## License

This project is licensed under the GPL-3.0 License. See the [LICENSE](LICENSE) file for details.
