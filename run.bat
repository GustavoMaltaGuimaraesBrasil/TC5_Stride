@echo off
setlocal
title TC5_STRIDE Runner

:menu
cls
echo ==========================================
echo   TC5_STRIDE - Inicializacao
echo ==========================================
echo.
echo 1. Subir Web
echo 2. Subir Mobile no simulador (Android)
echo 3. Subir Mobile com QR Code (celular)
echo 4. Executar Teste Automatico (pasta teste)
echo 0. Sair
echo.
set /p opt=Escolha uma opcao: 

if "%opt%"=="1" goto web
if "%opt%"=="2" goto mobile_sim
if "%opt%"=="3" goto mobile_qr
if "%opt%"=="4" goto run_test
if "%opt%"=="0" goto end

echo.
echo Opcao invalida.
pause
goto menu

:web
call :start_backend
if not exist "frontend\web\package.json" (
  echo.
  echo Pasta frontend\web nao encontrada.
  pause
  goto menu
)
echo.
echo Iniciando Web...
cd /d "%~dp0frontend\web"
call npm install
call npm run dev
goto end

:mobile_sim
call :start_backend
if not exist "frontend\mobile\package.json" (
  echo.
  echo Pasta frontend\mobile nao encontrada.
  pause
  goto menu
)
echo.
echo Iniciando Mobile no simulador Android...
cd /d "%~dp0frontend\mobile"
call npm install
call npx expo start --android
goto end

:mobile_qr
call :start_backend
if not exist "frontend\mobile\package.json" (
  echo.
  echo Pasta frontend\mobile nao encontrada.
  pause
  goto menu
)
echo.
echo Iniciando Mobile com QR Code para celular...
cd /d "%~dp0frontend\mobile"
call npm install
call npx expo start --tunnel
goto end

:run_test
call :start_backend
if not exist "teste\test_batch.py" (
  echo.
  echo Script de teste nao encontrado em teste\test_batch.py
  pause
  goto menu
)
if not exist "teste" (
  echo.
  echo Pasta teste nao encontrada.
  pause
  goto menu
)
echo.
echo Executando teste automatizado...
cd /d "%~dp0"
python teste\test_batch.py
echo.
echo Fim do teste. Relatorio esperado em teste\test_report.json
pause
goto menu

:end
endlocal
goto :eof

:start_backend
if not exist "%~dp0backend\app\main.py" (
  echo.
  echo Backend nao encontrado em backend\app\main.py
  exit /b 1
)

netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo.
  echo Backend ja esta ativo na porta 8000.
  exit /b 0
)

echo.
echo Subindo backend na porta 8000...
start "TC5 Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"
timeout /t 2 >nul
exit /b 0
