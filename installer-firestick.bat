@echo off
rem Installe (ou met a jour) MenuTV.apk sur le Fire Stick par le Wi-Fi.
rem Usage : installer-firestick.bat 192.168.1.50
rem Avant, sur le Fire Stick : Parametres > Ma Fire TV > Options pour les developpeurs > Debogage ADB : Active
rem (la 1re fois, le Fire Stick demande d'autoriser ce PC : choisis "Toujours autoriser" puis OK)
setlocal
set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
if "%~1"=="" (echo Usage : %~nx0 IP-DU-FIRE-STICK   ^(Parametres ^> Ma Fire TV ^> A propos ^> Reseau^) & exit /b 1)
if not exist "%~dp0MenuTV.apk" call "%~dp0construire-appli.bat"
"%ADB%" connect %~1:5555
"%ADB%" -s %~1:5555 wait-for-device
"%ADB%" -s %~1:5555 install -r "%~dp0MenuTV.apk"
if errorlevel 1 (echo. & echo Echec : verifie l'IP, le Debogage ADB, et accepte la demande sur la tele. & exit /b 1)
"%ADB%" -s %~1:5555 shell monkey -p fr.menutv -c android.intent.category.LEANBACK_LAUNCHER 1 >nul 2>&1
echo.
echo OK : Menu TV est installe et lance sur le Fire Stick (rangee "Vos applis").
