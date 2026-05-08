---
layout: post
title: "Warum dein KI-Gedächtnis lügen muss (und das nicht mal seine Schuld ist)"
slug: "warum-dein-ki-gedaechtnis-luegen-muss"
date: 2026-05-08
description: "Ein populärwissenschaftlicher Spaziergang durch das No-Escape-Theorem semantischer Speicher – und warum Halluzination kein Bug ist, sondern der Preis für Bedeutung."
image: butler.png
tags:
  - KI
  - Memory
  - RAG
  - Embeddings
  - Religionspädagogik
  - OER
  - Vergessen
license: https://creativecommons.org/licenses/by-sa/4.0/deed.de
lang: de
---

Stell dir vor, du baust dir einen perfekten digitalen Butler. Er soll sich an alles erinnern: Den Namen deines Hundes, das Datum deiner Hochzeit, dass du Koriander hasst, und dass du im Jahr 2017 mal kurz mit dem Gedanken gespielt hast, Imker zu werden. Du fütterst ihn brav. Tag für Tag. Drei Jahre lang.

Und dann fragst du ihn: „Wie hieß nochmal das Restaurant, in dem ich mit meiner Schwiegermutter im Mai 1953 war?"

Und der Butler sagt: „Du warst mit deiner *Mutter* bei *Da Mario*."

Du warst nicht bei Da Mario. Du warst bei Trattoria Bellini. Mit der Schwiegermutter. Aber dein Butler ist sich völlig sicher.

Tja, das ist der **Preis der Bedeutung**.

![](butler.png)

## Das Versprechen, das nicht eingelöst werden kann

Die KI-Industrie verkauft uns gerade ein hübsches Bild: dass Sprachmodelle endlich ein „echtes" Gedächtnis bekommen. Lange Kontextfenster! Vektor-Datenbanken! Knowledge Graphs! Persönliche Memory-Systeme, die mit dir wachsen wie ein guter Freund!

Ein Paper aus dem März 2026 mit dem schönen Titel *The Price of Meaning* ([arXiv:2603.27116](https://arxiv.org/html/2603.27116v1)) hat dazu eine unbequeme Nachricht: **Das wird nicht funktionieren.** Nicht weil die Ingenieur:innen schlampen. Nicht weil die GPUs zu klein sind. Sondern weil die Mathematik nein sagt.

Genauer: Jedes Gedächtnissystem, das Informationen nach *Bedeutung* organisiert — also Embeddings, Vektordatenbanken, Attention, semantische Suche, all der schicke Kram — muss zwangsläufig vergessen und falsche Erinnerungen produzieren. Nicht *manchmal*. **Strukturell.**

Das ist eine ziemlich starke Behauptung. Schauen wir uns an, warum sie stimmt.

## Erstmal: Was heißt überhaupt „semantisches Gedächtnis"?

Stell dir einen riesigen Raum vor. Nicht einen Raum mit Wänden, sondern einen mathematischen Raum mit, sagen wir, 1.024 Dimensionen. (Ich weiß, das ist hart vorzustellen. Tu einfach so, als hätte dein Wohnzimmer 1.024 Ecken.)

In diesem Raum bekommt jedes Konzept einen Punkt. „Hund" landet irgendwo. „Welpe" landet ganz in der Nähe. „Katze" auch nicht weit weg. „Quadratwurzel" hingegen ist im völlig anderen Stadtteil — irgendwo zwischen „Hypotenuse" und „Steuererklärung".

Das ist die Grundidee von Embeddings. Bedeutung wird zu Geometrie. „Ähnliche Dinge" werden zu „nahen Punkten". Und wenn du etwas suchst, wirfst du eine Frage in den Raum und schaust, welche Punkte am nächsten dran sind.

Das ist genial. Wirklich. Ohne diese Idee gäbe es keine moderne KI-Suche.

Es ist nur leider auch der Punkt, an dem alles schiefgeht.

## Das Drama in drei Akten

### Akt 1: Der Stadtteil wird voll

Bedeutung ist *kontinuierlich*. Es gibt keine harten Grenzen zwischen „Meeting über Preise" und „Meeting über Verpackung". Beides sind Meetings, beides geht um Produkte, beides war letzte Woche. Im Bedeutungsraum landen die zwei Erinnerungen nebeneinander.

Jetzt füge das dritte Meeting hinzu („Meeting über Lieferketten"). Und ein viertes. Und das fünfundzwanzigste. Plötzlich hast du in diesem semantischen Stadtteil 25 Punkte, die alle ungefähr gleich aussehen.

Stell deinem Butler die Frage: „Was haben wir im letzten Quartal über Verpackung besprochen?"

Was er findet: einen Cluster von 25 Meeting-Erinnerungen, die *alle* mit „Verpackung" was zu tun haben könnten, weil sie alle im selben semantischen Stadtteil wohnen.

Das nennt das Paper **Crowding** — semantisches Gedrängel. Und es lässt sich nicht wegoptimieren. Die Autor:innen zeigen empirisch: Sprache hat zwar Millionen von Konzepten, aber nur **10 bis 50 wirklich unabhängige Bedeutungsdimensionen**. Egal mit welchem Modell man misst. Heißt: Wenn du genug Inhalte ansammelst, werden sie zwangsläufig zu Nachbarn. Es gibt nicht genug „Platz" für sie alle.

### Akt 2: Der ältere Nachbar wird übertönt

Was passiert, wenn ein neuer Nachbar in den Stadtteil zieht? Im echten Leben: nichts. In einem Embedding-Raum: der alte Nachbar wird leiser.

Nicht weg. Nur leiser. Beim Retrieval gewinnt immer der nähere Punkt. Wenn jetzt 30 neue Verpackungs-Meetings dazukommen, die alle näher an der Anfrage liegen als das eine wichtige Meeting von vor zwei Jahren — dann ist das eine wichtige Meeting praktisch unauffindbar. Es ist noch da. Es wird nur nie wieder gefunden.

Das Paper rechnet das durch und kommt auf eine **Power-Law-Vergessenskurve**. Wenn dir das bekannt vorkommt: Genau diese Kurve hat Hermann Ebbinghaus 1885 für menschliches Vergessen aufgezeichnet. Der Mathematiker im Paper grinst und sagt: *Tja.*

Wir bauen also Speicher, die strukturell genauso vergessen wie wir. Und wir wundern uns dann, dass sie keine perfekten Aktenschränke sind.

### Akt 3: Der Butler erfindet etwas

Hier wird's wirklich unangenehm. Selbst wenn der Butler nichts vergessen hätte, hat er noch ein zweites Problem: **falsche Wiedererkennung**.

Erinnerung an Trattoria Bellini? Liegt im Bedeutungsraum direkt neben Erinnerung an Da Mario. Beides Italiener. Beides Familie. Beides Mai. Wenn du fragst: „Wo war ich nochmal?", findet der Butler den nächstgelegenen Punkt. Manchmal ist das Bellini. Manchmal Mario. Er kann nicht zuverlässig unterscheiden — weil die Geometrie ihn nicht unterscheiden lässt.

Das ist keine Lüge. Das ist auch keine Halluzination im klassischen Sinn. Das ist semantische Topographie, die getreulich ihre eigenen Regeln befolgt. Das System antwortet *exakt richtig auf die falsche Frage*.

## „Aber was ist mit Knowledge Graphs?"

Schöne Frage! Die Autor:innen haben fünf verschiedene Architekturen getestet, weil sie wussten, dass jeder Verteidiger einer Lieblingstechnik diese Frage stellen würde. Hier ist die Tabelle, leicht populärwissenschaftlich übersetzt:

| Architektur | Was die Marketing-Abteilung sagt | Was passiert |
|---|---|---|
| **Vector-DB** (BGE-large) | „Semantisch-perfekt!" | Vergisst nach Power-Law, falsche Treffer überall |
| **Knowledge Graph** | „Strukturierte Beziehungen retten alles!" | Genau dasselbe Problem. Die Knoten sind auch nur Embeddings. |
| **Riesiges Kontextfenster** (Qwen 7B) | „Wir haben jetzt 100k Tokens!" | Funktioniert bis ~100 Distraktoren — dann kippt alles auf einmal |
| **Parametrisches Memory** (im LLM eingewoben) | „Es *ist* das Modell!" | Genauigkeit fällt von 100% auf 11%, wenn die Nachbarschaft dichter wird |
| **BM25** (klassische Stichwortsuche) | „Boomer-Tech!" | Tatsächlich immun! Aber: nur 15,5% semantisches Verständnis. Unbrauchbar für „Sinn". |

Die Pointe ist *grausam* schön: **Das einzige System, das nicht vergisst, ist auch das einzige, das nicht versteht.**

Du kannst Bedeutung haben. Oder du kannst Präzision haben. Du kannst nicht beides haben. Das ist kein technisches Limit. Das ist die Trade-off-Frontier. Sie *ist* das Theorem.

## Der Bonus-Witz mit dem Reasoning

Eine Sache hat mich beim Lesen besonders amüsiert: Systeme, die zusätzlich „nachdenken" (Reasoning, Chain-of-Thought, all das), wirken auf den ersten Blick robuster. Sie kompensieren Crowding durch Schlauheit. Eine Weile.

Und dann brechen sie nicht wie die anderen langsam ein — sie kippen **klippenartig**. Erst läuft alles bestens, dann ist plötzlich nichts mehr richtig. Das Paper nennt das *catastrophic failure*. Ich nenne das den Wile-E.-Coyote-Effekt: Du läufst weiter, weil du nicht nach unten geschaut hast, und in dem Moment, wo du es tust, fällst du.

Das ist deshalb gemein, weil man der Klippe vorher nichts ansieht. Bei einer langsam degradierenden Vector-DB merkst du: Hm, die Treffer werden schlechter. Bei einem Reasoning-System merkst du: Alles super! — bis es das nicht mehr ist.

## Wie kommt man da raus?

Drei Türen. Eine ist verriegelt, eine führt nach draußen, eine führt in einen Wandschrank.

**Tür 1: Bedeutung aufgeben.** Bau alles auf BM25. Funktioniert. Aber dann hast du Google von 1998. Niemand will Google von 1998. Wandschrank.

**Tür 2: Mehr Dimensionen!** Wenn semantische Räume „voll" werden, könnten wir ja einfach... unendlich viele Dimensionen aufmachen? Geht leider nicht. Sprache hat empirisch eine Decke bei ~50 unabhängigen Dimensionen, und diese Decke hängt nicht am Modell, sondern an der Struktur natürlicher Sprache. Verriegelt.

**Tür 3: Zwei Schichten.** Du behältst die semantische Schicht für Navigation und Generalisierung — aber **du verlässt dich nicht darauf**. Daneben legst du eine **exakte episodische Schicht**: einfache, datierte, unverdichtete Aufzeichnungen. Plain Text. Markdown. Was auch immer. Diese Schicht *vergisst nicht und phantasiert nicht*, weil sie nichts interpretiert. Wenn die semantische Schicht eine Behauptung aufstellt, kann man sie gegen die episodische verifizieren.

Das ist das, was Tools wie Claude Code, Letta, ByteRover und Konsorten heute tatsächlich machen, auch wenn sie es nicht so verkaufen: Sie schreiben Markdown-Dateien. Über die Markdown-Dateien legt sich ein LLM, das semantisch suchen kann. Aber der *Kanon der Wahrheit* sind die Dateien — nicht die Suche. Die Suche ist nur die Bibliothekarin.

Wenn die Bibliothekarin sich irrt (und sie wird sich irren), gewinnen die Bücher.

## Was das mit Religionspädagogik zu tun hat (ja, wirklich)

Ich arbeite an einem Community-Hub für religionsbezogene Bildung. Wir haben dort ähnliche Fragen: Wie speichert man Beiträge so, dass sie auch in fünf Jahren noch *als das auffindbar sind, was sie waren* — und nicht als das, was sie inzwischen *bedeuten könnten*?

Das Paper hat mir geholfen, eine Designentscheidung zu rechtfertigen, die ich vorher mehr aus Bauchgefühl getroffen hatte: Wir haben drei Schichten. Eine episodische (Beobachtungen mit Datum, ohne Reframing), eine setzungsbezogene (Entscheidungen mit Begründung), und eine semantische (Verdichtungen, Themen, Cluster). Und über der semantischen steht ein Warnhinweis: *Diese Schicht ist regenerierbar. Wenn sie der episodischen widerspricht, gewinnt die episodische.*

Das ist nicht weil die semantische Schicht „schlecht" wäre. Sie ist sogar wichtig — ohne sie könnte niemand navigieren. Aber sie ist eine *Karte*, und Karten sind keine Landschaft. Wenn die Karte und der Boden sich widersprechen, glaube dem Boden.

Das gilt für KI-Memory genauso wie für Bildung, übrigens. Lehrkräfte, die schon mal versucht haben, eine Klassenraumsituation aus dem Gedächtnis zu rekonstruieren *und dann das Tagebuch lesen*, kennen das Phänomen.

## Die eigentliche Einsicht

Wir reden gerade viel über Halluzinationen, als wären sie ein Bug, den man irgendwann fixen wird. Größere Modelle, bessere Trainingsdaten, mehr Reasoning, dann ist das Problem weg.

*The Price of Meaning* sagt: Nein. Halluzination ist kein Bug. Halluzination ist der Preis dafür, überhaupt etwas zu verstehen. Sobald du Inhalte nach Bedeutung organisierst — und das müssen wir, sonst verstehen wir nichts — kaufst du dir das Risiko mit ein, dass Bedeutungsnachbarn miteinander verschmelzen.

Menschen leben damit. Wir nennen es Kreativität, wenn es klappt, und Demenz, wenn es nicht klappt, und meistens irgendwas dazwischen. Maschinen werden auch damit leben müssen. Die Lösung ist nicht, es zu vermeiden — die Lösung ist, **eine zweite Quelle daneben zu legen, die nicht nach Bedeutung sortiert ist**.

Eine Lieblingsmetapher zum Schluss: Dein Gedächtnis ist eine Cocktailparty. Es ist laut, alle reden durcheinander, manchmal hörst du den Namen falsch und sagst dem armen Klaus drei Stunden lang Klaus-Dieter. Eine Cocktailparty ist wunderbar zum Verstehen, Verknüpfen, Inspirierenlassen. Sie ist die Hölle für Faktenrecherche.

Deshalb gehst du irgendwann nach Hause und schreibst auf, was wirklich passiert ist.

Genau das müssen wir unseren KI-Systemen beibringen.

---

## Quellen und Weiterlesen

- **Das Paper:** *The Price of Meaning: Why RAG, Knowledge Graphs, and Every Semantic Memory Will Always Fail* — [arXiv:2603.27116v1](https://arxiv.org/html/2603.27116v1)
- **Die Vorgängerarbeiten** der gleichen Gruppe (*SpectralQuant*, *The Geometry of Forgetting*) sind interessant, weil sie zeigen, dass die Vergessenskurve aus der Geometrie der Modellgewichte selbst entsteht — nicht aus der Architektur drumherum.
- **Praktische Implementierungen** des „episodischer Record + semantische Schicht"-Ansatzes findet man heute in Claude Codes Memory-Files, Letta, ByteRover, Manus.

*Lizenz: CC BY-SA 4.0. Zitate, Übersetzungen und Weiterverwendung gerne — bitte mit Verweis auf diesen Beitrag und Erhalt der Lizenz.*
