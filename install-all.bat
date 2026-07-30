@echo off
cd /d "%~dp0"
for %%d in (server site-client portal-staff admin-panel) do (
  echo Installing %%d...
  cd %%d && call npm install && cd ..
)
echo Done. Run start-all.bat
pause
