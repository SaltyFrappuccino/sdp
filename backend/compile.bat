@echo off
echo Compiling TypeScript...
npx tsc
if %errorlevel% equ 0 (
    echo Compilation successful!
) else (
    echo Compilation failed!
)
pause