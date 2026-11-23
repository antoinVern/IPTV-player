@echo off
rem Fabrique l'appli Fire TV (MenuTV.apk) a partir de la page actuelle (index.html, css, js...).
rem A relancer apres chaque modification si tu veux la mettre a jour sur le Fire Stick.
cd /d "%~dp0android"
call "%~dp0android\gradlew.bat" assembleRelease --console=plain -q
if errorlevel 1 (echo. & echo ECHEC de la fabrication. & pause & exit /b 1)
copy /y "app\build\outputs\apk\release\app-release.apk" "..\MenuTV.apk" >nul
echo.
echo OK : MenuTV.apk est pret dans %~dp0
echo  - avec l'appli Downloader du Fire Stick : http://IP-DU-PC:8787/MenuTV.apk  (node proxy.js lance)
echo  - ou par le Wi-Fi : installer-firestick.bat IP-DU-FIRE-STICK
