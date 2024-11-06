---
layout: post
title: "Auf Google Cloud Platform mit Ubuntu Desktop via Chrome Remote Desktop OBS und Zoom fernsteuern"
description: "Via Konsole Instanz in aufsetzen, Desktop-Linux installieren, Apps einrichten und konfigurieren"
author: Jörg Lohrer
image: 29-autostartordner.jpg
tags: [ "Ubuntu", "Google Remote Desktop", "OBS", "Zoom", "relilabtutorial" ]
date: "2022-03-19"
slug: "OB-virtualcam"
lang: de
dir: ltr
toc: true
toc_label: "Inhaltsverzeichnis"
toc_icon: "house-laptop"
toc_sticky: "true"
---



# Auf Google Cloud Platform mit Ubuntu Desktop via Chrome Remote Desktop OBS und Zoom fernsteuern

## Instanz erstellen auf [https://console.cloud.google.com/](https://console.cloud.google.com/)
- Name, Region und Zone auswählen
- E2 4 vCPU, 16GB Arbeitsspeicher - 0,17$ pro Stunde
-
- Betriebssystem Ubuntu 20.04 LTS


## Ubuntu Desktop auf Google Cloud Plattform installieren
[https://ubuntu.com/blog/launch-ubuntu-desktop-on-google-cloud](https://ubuntu.com/blog/launch-ubuntu-desktop-on-google-cloud)
[https://cloud.google.com/architecture/chrome-desktop-remote-on-compute-engine#gnome](https://cloud.google.com/architecture/chrome-desktop-remote-on-compute-engine#gnome)
[https://bytexd.com/install-chrome-remote-desktop-headless/](https://bytexd.com/install-chrome-remote-desktop-headless/)
[https://cloud.google.com/architecture/chrome-desktop-remote-on-compute-engine#automating_the_installation_process](https://cloud.google.com/architecture/chrome-desktop-remote-on-compute-engine#automating_the_installation_process)


### Via SSH/Terminal Update, Tasksel und Google Remote Desktop installieren:
```shell=
sudo apt update
sudo apt install --assume-yes wget tasksel
wget https://dl.google.com/linux/direct/chrome-remote-desktop_current_amd64.deb
sudo apt-get install --assume-yes ./chrome-remote-desktop_current_amd64.deb
```
### Cinnamon Desktop installieren
```shell=
sudo DEBIAN_FRONTEND=noninteractive \
    apt install --assume-yes cinnamon-core desktop-base dbus-x11
```
`sudo bash -c 'echo "exec /etc/X11/Xsession /usr/bin/cinnamon-session-cinnamon2d" > /etc/chrome-remote-desktop-session'`

### Zusätzliche Einstellungen:
```
sudo systemctl disable lightdm.service
```
#### [Deutsche Tastatur in der Ubuntu-Konsole festlegen](https://praxistipps.chip.de/deutsche-tastatur-in-der-ubuntu-konsole-einrichten_28691):
```
sudo dpkg-reconfigure keyboard-configuration
```
![](01-deutsche-tastatur-ubuntu.png)
![](02-chrome-remote-desktop.png)



### Optional: Google Chrome Browser installieren
```shell=
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install --assume-yes ./google-chrome-stable_current_amd64.deb
```

## Chrome Remote Desktop konfiguieren und starten
[https://cloud.google.com/architecture/chrome-desktop-remote-on-compute-engine#configuring_and_starting_the_chrome_remote_desktop_service](https://cloud.google.com/architecture/chrome-desktop-remote-on-compute-engine#configuring_and_starting_the_chrome_remote_desktop_service
))
Mit Google-Konto, das zur Remote-Stuerung benutzt werden soll, [https://remotedesktop.google.com/headless](https://remotedesktop.google.com/headless) aufrufen und den SSH-Befehl in der Konsole ausführen. 6-Stellige PIN festlegen.
![](04-remotezugriff.png)
Prüfen ob der Dienst ausgeführt wird:
```
sudo systemctl status chrome-remote-desktop@$USER
```
![](05-systemctl-status.png)

### Instanzzeitplan festlegen
[https://rominirani.com/hands-on-guide-to-scheduling-vm-instances-to-start-and-stop-a079a50e16c6](https://rominirani.com/hands-on-guide-to-scheduling-vm-instances-to-start-and-stop-a079a50e16c6)


## OBS Installation

[https://obsproject.com/wiki/install-instructions#ubuntumint-installation](https://obsproject.com/wiki/install-instructions#ubuntumint-installation)
```
sudo apt install ffmpeg
sudo apt install v4l2loopback-dkms
sudo add-apt-repository ppa:obsproject/obs-studio
sudo apt update
sudo apt install obs-studio
```

### Problem:
Test mit `v4l2-ctl --list-devices` bringt Fehlermeldung:
> Cannot open device /dev/video0, exiting.
![](06-cannot-open-video-device.png)


### Lösung für virtuelle Kamera auf virtueller Maschine:
```
sudo apt -y install v4l2loopback-dkms v4l2loopback-utils linux-modules-extra-$(uname -r)
```
```
sudo modprobe v4l2loopback
```
Jetzt:
![](07-jetzt-v412-ctl.png)

### Problem: Trotzdem nach jedem Reboot wird die virtuelle Kamera nicht geladen:
![](08-dummy-video-device.png)

### Lösung v4l2loopback bei Start laden:
[https://askubuntu.com/questions/1245212/how-do-i-automatically-run-modprobe-v4l2loopback-on-boot](https://askubuntu.com/questions/1245212/how-do-i-automatically-run-modprobe-v4l2loopback-on-boot
)
```
sudo nano /etc/modules
```
hinzufügen: ```v4l2loopback```



## Zoom Installation
[https://support.zoom.us/hc/de/articles/204206269-IZoom-unter-Linux-installieren-oder-aktualisieren](https://support.zoom.us/hc/de/articles/204206269-IZoom-unter-Linux-installieren-oder-aktualisieren
)

```
sudo apt install gdebi
sudo apt update
sudo apt upgrade
```
```
sudo snap install zoom-client
```


## Inbetriebnahme des Remote Desktop
### Verbindung zur VM-Instanz herstellen
Via [https://remotedesktop.google.com/access](https://remotedesktop.google.com/access) auf das Remote Gerät zugreifen.:
![](09-relilab-technical-host.png)
Sechsstelligen PIN eingeben:
![](10-pin-remote-desktop.png)


### Keyboard / Tastatur auf deutsch umstellen:
![](11-keyboard-tastatur-umstellen.png)
### Apps auf dem Desktop verknüpfen:
![](12-apps-verknuepfen.png)

### OBS einrichten
#### OBS mit virtueller Kamera automatisch starten:
Rechtsklick auf die Verknüpfung und dann beim Startbefehl `--startvirtualcam` ergänzen.
![](15-obs-mit-virtual-cam-starten.png)
#### Beim Systemstart mit virtueller Kamera starten:
`startup Applications` wählen
![](16-startup-application.png)
ebenfalls `--startvirtualcam` ergänzen
![](15-obs-mit-virtual-cam-starten.png)

#### Beim ersten Start von OBS
"I will only be using the virtual camera" wählen:
![](17-i-will-only-be-using-OBS.png)
In den Einstellungen die Sprache auf Deutsch umstellen:
![](14-OBS-deutsch-umstellen.png)
Videoauflösung auf 1920x1080 umstellen:
![](18-video1920.png)
Szenensammlung importieren
![](19-szenensammlung-importieren-OBS.png)
(Vorkonfigurierte Szenen für das relilab-Café [immer aktuell auf Github](https://github.com/rpi-virtuell/relilab/blob/main/zoom/relilab-cafe-obs-json.json))
    - [relilab-cafe-obs-json.json](https://raw.githubusercontent.com/rpi-virtuell/relilab/main/zoom/relilab-cafe-obs-json.json)

### Google Chrome einrichten
#### Beim ersten Systemstart Password for new Keyring erstellen:
![](20-chrome-einrichten.png)
#### Chrome zum Standardbrowser machen
![](21-chrome-standard.png)
#### Google Chrome anmelden und Sync inkl. Lesezeichen aktivieren
![](22-chrome-anmeldung.png)

### Zoom einrichten
#### Zoom-Account anmelden
![](23-zoom-anmeldung.png)
#### [Sprache ändern in Zoom](https://support.zoom.us/hc/de/articles/209982306-%C3%84nderung-der-Sprache-in-Zoom)
Zoom starten und dann das Zoom-Symbol rechts in der unteren Leiste  mit Rechtsklick der Maus das Menü zur Sprachänderung aufrufen:
![](24-zoom-sprache-aendern.png)

## Problemlösungen

#### Problem - keine Emojis in den Slides
![](25-slides-emojis.png)
#### Lösung: [https://medium.com/@harshmaur/emojis-missing-from-chrome-in-ubuntu-9c25fe10867c](https://medium.com/@harshmaur/emojis-missing-from-chrome-in-ubuntu-9c25fe10867c)
```
sudo apt-get remove fonts-noto-color-emoji
sudo apt-get install fonts-noto-color-emoji
```
#### Problem - kein Font Yanone Kaffeesatz in den Slides
#### Lösung: [https://zoomadmin.com/HowToInstall/UbuntuPackage/fonts-yanone-kaffeesatz](https://zoomadmin.com/HowToInstall/UbuntuPackage/fonts-yanone-kaffeesatz)
```
sudo apt-get update -y
sudo apt-get install -y fonts-yanone-kaffeesatz
```

#### Mögliches Problem
> GUI (Ubuntu Desktop) has its own security layer which blocks the root account from login. So, even we have a properly enabled root account with password, it does not work in GUI interface.
> ![](26-keyring-problem.png)
[https://askubuntu.com/questions/1192471/login-as-root-on-ubuntu-desktop](https://askubuntu.com/questions/1192471/login-as-root-on-ubuntu-desktop
)

[https://www.computernetworkingnotes.com/linux-tutorials/how-to-enable-and-disable-root-login-in-ubuntu.html](https://www.computernetworkingnotes.com/linux-tutorials/how-to-enable-and-disable-root-login-in-ubuntu.html#:~:text=Enabling%20and%20disable%20root%20login%20in%20nutshell&text=Use%20the%20sudo%20%E2%80%93i%20passwd,root%20password%2C%20when%20it%20asks.&text=CLI%20%26%20GUI%20both-,Use%20the%20sudo%20%E2%80%93i%20passwd%20root%20command.,root%20password%2C%20when%20it%20asks)



# Anstatt auf Cloud-Plattform mit Linux auf lokalem Windows-PC
### Autostart OBS inkl virtueller Kamera & Zoom
#### Vorbereiten OBS inkl Virtueller Kamera

Hinzufügen von `--startvirtualcam` zur OBS-Verknüpfung:
![](27-startvirtualcam-verknuepft-OBS.jpg)

open the start menu/tile thing and type in:
`Run` and hit enter. Then type in `shell:startup`
![](28-shell-startup.png)
Dann die Verknüpfungen in den Autostartordner kopieren:
![](29-autostartordner.jpg)

Weitere Schritte wie oben
