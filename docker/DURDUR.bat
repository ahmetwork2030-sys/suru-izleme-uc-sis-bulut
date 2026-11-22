@echo off
chcp 65001 >nul
cd /d "%~dp0"
docker compose down
echo.
echo  Servisler durduruldu. Olcumler InfluxDB biriminde saklanir; BASLAT.bat ile kaldigi yerden devam eder.
pause
