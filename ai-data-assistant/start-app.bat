@echo off
echo Parando processos Node existentes...
taskkill /F /IM node.exe 2>nul

echo.
echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo Iniciando Backend na porta 3001...
start "Backend" cmd /k "cd backend && npm run dev"

echo.
echo Aguardando 5 segundos...
timeout /t 5 /nobreak >nul

echo.
echo Iniciando Frontend na porta 3000...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Pressione qualquer tecla para sair...
pause >nul
