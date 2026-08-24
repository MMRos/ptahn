@echo off
title Ptahn - Servidor Nativo IA
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================================
echo    👑 PTAHN - PLATAFORMA DE ROL Y NARRATIVA IA
echo ======================================================
echo.
echo  Iniciando servidor local y abriendo aplicacion...
echo  (Presiona Ctrl+C en esta ventana para cerrar el servidor)
echo.

node scripts\launcher.js

pause
