# Untrace installer script
$AppName    = "Untrace"
$SourceDir  = Join-Path $PSScriptRoot "release\win-unpacked"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
$ExePath    = Join-Path $InstallDir "$AppName.exe"

if (-not (Test-Path $SourceDir)) {
    Write-Error "Build not found. Run: npm run electron:build"
    exit 1
}

Write-Host "Installing $AppName..."

if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir
}
Copy-Item -Recurse $SourceDir $InstallDir

$Shell = New-Object -ComObject WScript.Shell

$DesktopLnk = $Shell.CreateShortcut("$env:USERPROFILE\Desktop\$AppName.lnk")
$DesktopLnk.TargetPath    = $ExePath
$DesktopLnk.WorkingDirectory = $InstallDir
$DesktopLnk.Description   = "Remove EXIF & AI metadata from images"
$DesktopLnk.Save()

$StartMenuDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$StartLnk = $Shell.CreateShortcut("$StartMenuDir\$AppName.lnk")
$StartLnk.TargetPath       = $ExePath
$StartLnk.WorkingDirectory = $InstallDir
$StartLnk.Description      = "Remove EXIF & AI metadata from images"
$StartLnk.Save()

Write-Host ""
Write-Host "Done! Untrace is installed."
Write-Host "  Desktop shortcut: $env:USERPROFILE\Desktop\$AppName.lnk"
Write-Host "  Installed to    : $InstallDir"
Write-Host ""
Write-Host "To uninstall, run: .\uninstall.ps1"
