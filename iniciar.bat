@echo off
title Oferta Segura - servidor local
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado neste computador.
  echo Instale a versao LTS em https://nodejs.org e abra este arquivo de novo.
  pause
  exit /b 1
)
rem Suas IDs de afiliado ficam em minhas-ids.txt; a cada inicio elas sao aplicadas.
if exist minhas-ids.txt copy /Y minhas-ids.txt .env.local >nul
if not exist node_modules (
  echo Instalando dependencias. Isso leva alguns minutos na primeira vez...
  call npm install
  if errorlevel 1 (
    echo A instalacao falhou. Veja a mensagem acima.
    pause
    exit /b 1
  )
)
echo.
echo Oferta Segura no ar em http://localhost:3000  ^(feche esta janela para parar^)
echo.
call npm run dev
pause
