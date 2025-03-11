# PharmaSim Installation Guide

## Prerequisites
Before installing PharmaSim, ensure your system meets these requirements:
- Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- 4 GB RAM
- 200 MB free disk space
- Internet connection for initial setup (optional)

## Windows Installation
1. Download the Windows installer (.exe)
2. Double-click the downloaded file
3. Follow the on-screen installation wizard
4. Choose installation directory
5. Click "Install"
6. Launch PharmaSim from the Start Menu or Desktop shortcut

## macOS Installation
1. Download the macOS disk image (.dmg)
2. Open the .dmg file
3. Drag the PharmaSim application to the Applications folder
4. Open Applications and launch PharmaSim
5. If prompted, allow security exceptions

## Linux Installation
### Ubuntu/Debian
1. Download the .deb package
2. Open terminal
3. Navigate to download directory
4. Run: `sudo dpkg -i pharmasim_1.0.0_amd64.deb`
5. Run: `sudo apt-get install -f` (resolves dependencies)
6. Launch from applications menu or run `pharmasim` in terminal

### Other Distributions
1. Download the AppImage
2. Make executable: `chmod +x PharmaSim-1.0.0.AppImage`
3. Run the AppImage directly

## First-Time Setup
- First launch may require accepting security permissions
- Optional: Create user profile
- Configure initial game settings

## Updating
- Future versions will include auto-update functionality
- Manual updates available through official website

## Troubleshooting
### Installation Issues
- Ensure sufficient disk space
- Check system compatibility
- Disable antivirus temporarily during installation

### Runtime Issues
- Update graphics drivers
- Verify system meets minimum requirements
- Check game logs in:
  - Windows: `%APPDATA%\PharmaSim\logs`
  - macOS: `~/Library/Application Support/PharmaSim/logs`
  - Linux: `~/.config/pharmasim/logs`

## Uninstallation
### Windows
- Use Control Panel's "Uninstall a Program"
- Or run the uninstaller from the Start Menu

### macOS
- Drag PharmaSim from Applications to Trash
- Optional: Remove config files from `~/Library/Application Support/PharmaSim`

### Linux
- Ubuntu/Debian: `sudo apt-get remove pharmasim`
- Other: Delete the AppImage and config directory

## Support
For additional help, visit our support website or GitHub issues page.
