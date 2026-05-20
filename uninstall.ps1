# Untrace uninstaller script
$AppName    = "Untrace"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"

if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir
    Write-Host "Removed: $InstallDir"
} else {
    Write-Host "Not installed at: $InstallDir"
}

$DesktopLnk   = "$env:USERPROFILE\Desktop\$AppName.lnk"
$StartMenuLnk  = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\$AppName.lnk"

if (Test-Path $DesktopLnk)  { Remove-Item $DesktopLnk;  Write-Host "Removed desktop shortcut" }
if (Test-Path $StartMenuLnk) { Remove-Item $StartMenuLnk; Write-Host "Removed Start Menu entry" }

Write-Host "Untrace uninstalled."
