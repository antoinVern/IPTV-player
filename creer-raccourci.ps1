# Crée le raccourci « Menu TV » sur le Bureau (avec l'icône img/menu-tv.ico).
# Lancer une fois : clic droit > Exécuter avec PowerShell
#   (ou : powershell -ExecutionPolicy Bypass -File creer-raccourci.ps1)
$ErrorActionPreference = 'Stop'
$dossier = $PSScriptRoot

# --- icône : img/menu-tv.ico (générée depuis outils/logo/ : node outils/logo/generer-logo.js) ---
$ico = Join-Path $dossier 'img\menu-tv.ico'
if (-not (Test-Path $ico)) { throw "Icône introuvable : $ico" }

# --- raccourci sur le Bureau ---
$bureau = [Environment]::GetFolderPath('Desktop')
$lnk = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $bureau 'Menu TV.lnk'))
$lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$lnk.Arguments = '"' + (Join-Path $dossier 'Menu TV.vbs') + '"'
$lnk.WorkingDirectory = $dossier
$lnk.IconLocation = $ico
$lnk.Description = 'Menu TV'
$lnk.Save()
Write-Host "Raccourci créé : $bureau\Menu TV.lnk"
Write-Host "Astuce : clic droit dessus > « Épingler à la barre des tâches » ou « Épingler à l'écran de démarrage »."
