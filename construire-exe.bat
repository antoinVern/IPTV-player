@echo off
rem Fabrique l'installateur de l'appli PC : "Installer Menu TV.exe" (gratuit, avec Electron).
rem A ne refaire que si on change electron\main.js : pour le reste, utilise
rem le bouton "Mettre a jour" dans l'appli (Reglages).
cd /d "%~dp0electron"
if not exist node_modules (echo Installation des outils... & call npm install --no-audit --no-fund)
call npm run dist
if errorlevel 1 (echo. & echo ECHEC de la fabrication. & pause & exit /b 1)
copy /y "dist\Installer Menu TV.exe" "%~dp0Installer Menu TV.exe" >nul
echo.
echo OK : "Installer Menu TV.exe" est pret dans %~dp0