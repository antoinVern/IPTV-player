# Crée l'icône img/menu-tv.ico et le raccourci « Menu TV » sur le Bureau.
# Lancer une fois : clic droit > Exécuter avec PowerShell
#   (ou : powershell -ExecutionPolicy Bypass -File creer-raccourci.ps1)
$ErrorActionPreference = 'Stop'
$dossier = $PSScriptRoot
Add-Type -AssemblyName System.Drawing

# --- icône : un écran néon sur fond coucher de soleil (256 px, PNG dans un .ico) ---
New-Item -ItemType Directory -Force (Join-Path $dossier 'img') | Out-Null
$ico = Join-Path $dossier 'img\menu-tv.ico'
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::Transparent)
function Arrondi($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, $r, $r, 180, 90); $p.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $p.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90); $p.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $p.CloseFigure(); return $p
}
$fond = Arrondi 8 8 240 240 70
$deg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 0, 256), ([System.Drawing.Color]::FromArgb(255, 42, 11, 82)), ([System.Drawing.Color]::FromArgb(255, 255, 79, 123))
$g.FillPath($deg, $fond)
$soleil = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 177, 90))
$g.FillEllipse($soleil, 78, 120, 100, 100)
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 58, 13, 79))), 8, 186, 240, 62)
$ecran = Arrondi 48 52 160 112 26
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(215, 20, 6, 31))), $ecran)
$g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 62, 240, 255)), 9), $ecran)
$g.FillPolygon((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 95, 176))), [System.Drawing.Point[]]@((New-Object System.Drawing.Point 112, 82), (New-Object System.Drawing.Point 112, 134), (New-Object System.Drawing.Point 152, 108)))
$g.DrawLine((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 62, 240, 255)), 9), 100, 196, 156, 196)
$g.Dispose()
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$png = $ms.ToArray()
$fs = [System.IO.File]::Create($ico); $w = New-Object System.IO.BinaryWriter $fs
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]1)                # en-tête ICO
$w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0)  # 256x256, palette, réservé
$w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$png.Length); $w.Write([UInt32]22)
$w.Write($png); $w.Close()

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
