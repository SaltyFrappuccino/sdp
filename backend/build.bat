@echo off
echo Compiling TypeScript...
npx tsc
if %errorlevel% equ 0 (
    echo Compilation successful!
    echo JavaScript files generated in dist/ folder
) else (
    echo Compilation failed!
    echo Check the errors above
)
pause
