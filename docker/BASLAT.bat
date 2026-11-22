@echo off
chcp 65001 >nul
title Suru Izleme - Docker baslatiliyor
cd /d "%~dp0"
echo.
echo  Suru Izleme Platformu - sis ve bulut servisleri
echo  ------------------------------------------------
docker info >nul 2>&1
if errorlevel 1 (
  echo  Docker Desktop calismiyor. Once Docker Desktop'i acin,
  echo  sol altta "Engine running" yazisini gorunce bu dosyayi yeniden calistirin.
  echo.
  pause
  exit /b 1
)
echo  Bes kapsayici baslatiliyor. Ilk seferde 1-2 GB indirilir, birkac dakika surebilir...
docker compose up -d
if errorlevel 1 (
  echo.
  echo  Baslatma sirasinda hata olustu. Bu pencerenin ekran goruntusunu gonderin.
  pause
  exit /b 1
)
echo.
echo  Servisler aciliyor, 20 saniye bekleniyor...
timeout /t 20 /nobreak >nul
start "" http://localhost:3000
start "" http://localhost:1880
echo.
echo  Grafana panosu : http://localhost:3000
echo  Node-RED akisi : http://localhost:1880
echo  Durdurmak icin DURDUR.bat dosyasini calistirin.
echo.
pause
