@echo off
echo Building frontend...
npm run build
if %errorlevel% equ 0 (
    echo Frontend build successful!
) else (
    echo Frontend build failed!
)
pause
