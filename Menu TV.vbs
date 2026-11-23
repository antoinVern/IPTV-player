' Menu TV : lance le proxy en arrière-plan (sans fenêtre noire) puis ouvre l'appli
' dans sa propre fenêtre (Edge en mode application, sans barre d'adresse ni onglets).
' Quand tu fermes la fenêtre, le proxy s'arrête aussi.
' Double-clique sur ce fichier, ou sur le raccourci « Menu TV » du Bureau.

Option Explicit
Dim sh, fso, dossier, url, lance, i, edge, profil, test
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dossier = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://localhost:8787/"
test = (WScript.Arguments.Count > 0)  ' « /test » : vérifie le proxy sans ouvrir de fenêtre

Function ProxyActif()
  On Error Resume Next
  Dim x : Set x = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  x.setTimeouts 1000, 1000, 1000, 1000
  x.open "GET", url & "__proxy", False
  x.send
  ProxyActif = (Err.Number = 0 And x.status = 200)
End Function

Sub ArreteProxy()
  sh.Run "powershell -NoProfile -WindowStyle Hidden -Command ""Get-CimInstance Win32_Process -Filter \""Name='node.exe'\"" | ? CommandLine -match 'proxy.js' | % { Stop-Process -Id $_.ProcessId -Force }""", 0, True
End Sub

' 1. le proxy (s'il ne tourne pas déjà)
lance = False
If Not ProxyActif() Then
  sh.CurrentDirectory = dossier
  sh.Run "cmd /c node proxy.js", 0, False
  lance = True
  For i = 1 To 40
    WScript.Sleep 250
    If ProxyActif() Then Exit For
  Next
  If Not ProxyActif() Then
    MsgBox "Le proxy ne démarre pas." & vbCrLf & "Node.js est-il installé ? (https://nodejs.org, version LTS, gratuit)", vbExclamation, "Menu TV"
    WScript.Quit 1
  End If
End If

If test Then
  WScript.Echo "Proxy OK sur " & url
  If lance Then ArreteProxy
  WScript.Quit 0
End If

' 2. la fenêtre de l'appli (profil Edge dédié : ton menu y est enregistré)
edge = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
If Not fso.FileExists(edge) Then edge = sh.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
profil = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\MenuTV\fenetre")
sh.Run """" & edge & """ --app=" & url & " --user-data-dir=""" & profil & """ --start-maximized --no-first-run --autoplay-policy=no-user-gesture-required", 1, True

' 3. fenêtre fermée ? on arrête le proxy qu'on a lancé
If lance Then ArreteProxy
