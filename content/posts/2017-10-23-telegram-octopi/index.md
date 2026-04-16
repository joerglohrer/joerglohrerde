---
layout: post
title: "Telegram Bot für Octopi"
description: "Schnittstelle zwischen Telegram und OctoPrint"
image: octopi1.png
cover:
  image: octopi1.png
tags: [ "Telegram", "Octopi", "Raspberry", "3DDruck" ]
date: "2017-10-23"
author: Jörg Lohrer
slug: "telegram-octopi"
lang: de
dir: ltr
images:
  - file: octopi1.png
    role: cover
    alt: "Screenshot der OctoPrint-Plugin-Verwaltung während der Installation des Telegram-Plugins — Fortschrittsanzeige läuft"
    license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"
    authors:
      - name: "Jörg Lohrer"

  - file: octopi2.png
    alt: "Screenshot der Konfigurationsmaske des OctoPrint-Telegram-Plugins mit Eingabefeld für den Telegram-Bot-Token"
    license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"
    authors:
      - name: "Jörg Lohrer"

  - file: octopi3.png
    alt: "Screenshot der OctoPrint-Telegram-Plugin-Oberfläche nach erfolgreichem Token-Eintrag — Benutzerliste wird angezeigt, Rechte fehlen noch"
    license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"
    authors:
      - name: "Jörg Lohrer"

  - file: octopi4.png
    alt: "Screenshot der Benutzer-Rechte-Konfiguration mit gesetzten Häkchen bei 'Command' und 'Notify'"
    license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de"
    authors:
      - name: "Jörg Lohrer"
---



Das [OctoPrint-Telegram-Plugin](http://plugins.octoprint.org/plugins/telegram/) schafft eine Schnittstelle zwischen Telegram und OctoPrint.
Hier die Anleitung auf Englisch: [https://github.com/fabianonline/OctoPrint-Telegram/blob/stable/README.md](https://github.com/fabianonline/OctoPrint-Telegram/blob/stable/README.md)

Das dauert eine Weile:
![](octopi1.png)


Token eingeben:
![](octopi2.png)

Heisst aber nicht, dass jetzt alles gleich klappt:
![](octopi3.png)

Es müssen dem Benutzer noch die Rechte “Command” und “Notify” gegeben werden:
![](octopi4.png)