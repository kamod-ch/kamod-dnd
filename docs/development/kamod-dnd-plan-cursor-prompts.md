# Kamod DnD – Umsetzungsplan und Cursor-Prompts

Stand: 18. Oktober 2026. Architekturvorschlag für ein neues Projekt; kein Audit eines bestehenden kamod-dnd-Repositories. Alle vorgeschlagenen Exportnamen sind Entwürfe und keine bereits existierenden Kamod-APIs.

## 1. Ziel und Entscheidung

Baue `@kamod-ch/dnd` als kleine, headless Preact-Library mit Signals, typisierten Drag-Daten und zugänglicher Bedienung. Verwende zunächst eine bestehende Engine. Der Mehrwert besteht in der Preact-Integration, einer konsistenten API und praxistauglichen Kamod-Beispielen.

Erste Referenzanwendung: sortierbare Inhaltsblöcke eines Editors. Zweite Referenzanwendung: Kanban mit mehreren Listen. Aus beiden Anwendungen wird die wiederverwendbare API abgeleitet.

Keine eigene Engine im MVP. Wenn die untersuchten Engines eine zwingende Anforderung verfehlen, dokumentiere die Lücke und plane einen separaten Engine-Spike, bevor die Umsetzung ausgeweitet wird.

## 2. Umfang

### MVP

- Vertikale Listen mit stabilen IDs und variablen Elementhöhen.
- Verschieben zwischen Listen, einschließlich leerer Zielcontainer.
- Maus, Touch und Tastatur; Drag nur am Handle.
- Aktivierungsschwelle, Escape-Abbruch und zuverlässiges Cleanup.
- Einfügemarkierung, Drag-Vorschau und Scrollen im unterstützten Scrollcontainer.
- Typisierte Nutzdaten und synchrone Regeln für zulässige Drops.
- Fokuswiederherstellung, lokalisierbare Screenreader-Meldungen und Verschiebemenü.
- SSR-sicherer Import, mehrere unabhängige Instanzen und Preact ohne compat.
- Zwei dokumentierte Beispiele, Browser-Tests und installierbares Paket.

### Später

Grids, verschachtelte Bäume, Virtualisierung, Mehrfachauswahl, Canvas, externe Dateien und Cross-Window-Drops. Ein allgemeiner File-Upload-Manager gehört nicht in dieses MVP. Auch Undo/Redo und Server-Persistenz bleiben zunächst Aufgaben der Anwendung.

## 3. Architektur

Ein Repository, ein veröffentlichbares Paket, zwei Beispiele. Kein separates Paket für jede interne Schicht.

| Bereich                 | Verantwortung                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Interner Engine-Adapter | Übersetzt Events, Registrierung, Ziele und Cleanup der ausgewählten Engine         |
| Session-Zustand         | Aktive ID, Ziel, Phase, Drop-Erlaubnis und Vorschau als gezielt abonnierbare Werte |
| Preact-Bindings         | Provider, Hooks, Ref-Verwaltung, Mount/Unmount und instanzgebundener Zustand       |
| Sortable-Subpath        | Reorder- und Transfer-Intents, Listenregistrierung und Einfügeposition             |
| Accessibility           | Tastatur, Fokus, Live-Region und zugängliche Alternativaktionen                    |
| Beispiele               | Editorblöcke und Kanban mit Kamod UI, Icons und Theme                              |

Vorgeschlagene Struktur:

```text
src/
  engine/
  session/
  preact/
  sortable/
  accessibility/
  index.ts
examples/
  editor-blocks/
  kanban/
tests/
docs/
  decisions/
  engine-evaluation.md
  implementation-status.md
```

Vorgeschlagene API-Familie: `DndProvider`, `useDraggable`, `useDroppable`, `useDndState`, `useSortable` und ein `MoveIntent`-Typ. Namen erst nach dem Prototyp festschreiben. Engine-Typen nicht unkontrolliert in die öffentliche API übernehmen. Der interne Adapter unterstützt genau eine Engine; kein universelles Plugin-System vorab bauen.

### Datenfluss

Die Anwendung besitzt die Elementdaten und ihre Reihenfolge. Die Library besitzt ausschließlich die laufende Drag-Session. Beim Ablegen erzeugt sie einen typisierten Verschiebe-Intent mit Quellcontainer, Zielcontainer und Zielposition. Die Anwendung übernimmt die Änderung kontrolliert und kann danach speichern oder Undo anbieten.

Während des Ziehens nur Vorschau und Einfügemarkierung aktualisieren. Domain-Daten nicht bei jedem Pointer-Event umschreiben. Wenn der Engine-Sortieralgorithmus temporäre Projektionen benötigt, bleiben diese interne Vorschauzustände.

Listen und Elemente brauchen stabile IDs. Der Vertrag muss klären, ob der Zielindex vor oder nach Entfernen des Quellobjekts gilt; empfohlen: Zielindex nach Entfernen aus der Quelle. Positionsberechnung und Tastaturaktionen verwenden dieselben Regeln.

### Signals

Verwende `@preact/signals` für die Preact-Anbindung. `@preact/signals-core` nur direkt hinzufügen, wenn die interne Trennung dies tatsächlich benötigt. Keine Persistenz von Pointer-Koordinaten oder Drag-Sessions. `@kamod-ch/signals` ist für den MVP nicht erforderlich.

Öffentliche Zustandswerte möglichst readonly anbieten. Keine globale Drag-Session; Zustand pro Provider/Controller. Cleanup muss Listener, Effects, Observer und laufende Animation-Frames entfernen. Falls die Engine einen eigenen reaktiven Zustand besitzt, nur die benötigten Werte anbinden und keine zweite vollständige Zustandsmaschine spiegeln.

## 4. Engine-Auswahl

Zuerst den aktuellen TypeScript-/DOM-Einstieg von dnd-kit untersuchen. Pragmatic Drag and Drop als zweite Option mit denselben Szenarien prüfen. Das ist eine Präferenz für die Untersuchung, keine vorweggenommene Auswahl.

| Muss-Kriterium                  | Nachweis                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Preact ohne React/compat        | Minimaler Build und Laufzeitprüfung der Dependency-Kette                         |
| Touch und Scrollen              | Browser-Test und dokumentierter Test auf realem Mobilgerät vor stabiler Freigabe |
| Tastatur                        | Reorder, Transfer, Abbruch, Fokus und Alternativaktion                           |
| Editor-Verträglichkeit          | Textauswahl, Eingabefelder und contenteditable funktionieren weiter              |
| Variable Höhen und leere Listen | Beide Referenzbeispiele                                                          |
| SSR und Cleanup                 | Import/Render ohne DOM, Unmount während Drag                                     |
| Wartbarkeit                     | Verifizierte Version, Lizenz, dokumentierte APIs und Erweiterungspunkte          |

Zusätzlich Bundlegröße, Abhängigkeiten und Integrationsaufwand messen. Sicherheits- und Funktions-Muss-Kriterien werden nicht durch einen guten Gesamtscore ausgeglichen. Ungeprüfte Eigenschaften als ungeprüft markieren.

## 5. Roadmap und Aufwand

Schätzungen in fokussierten Entwicklertagen, einschließlich gezielter Tests. Installation, Integrationsprobleme und manuelle Geräteprüfungen können zusätzliche Zeit kosten.

| Phase | Ergebnis                                                        | Aufwand  |
| ----- | --------------------------------------------------------------- | -------- |
| 0     | Bestandsaufnahme, zwei Engine-Spikes, Architekturentscheidung   | 2–4 Tage |
| 1     | Paketgerüst, Session und Preact-Bindings                        | 2–3 Tage |
| 2     | Sortierung, Transfer, Regeln und Abbruch                        | 3–4 Tage |
| 3     | Tastatur, Touch, Fokus und Screenreader-Verhalten fertigstellen | 2–3 Tage |
| 4     | Editor- und Kanban-Integration                                  | 2–3 Tage |
| 5     | Browserprüfung, Paketprüfung und Dokumentation                  | 2–3 Tage |

Gesamt: etwa 13–20 Entwicklertage für eine begrenzte Beta. Teilzeit entsprechend mehr Kalenderzeit. Accessibility beginnt beim API-Entwurf und wird in Phase 3 vervollständigt, nicht erst nachträglich hinzugefügt.

Freigabe als Beta nur mit bestandenen automatisierten Gates und offen ausgewiesenen manuellen Prüflücken. Eine stabile Version setzt praktische Prüfung von Touch und Screenreader-Bedienung voraus.

## 6. Cursor verwenden

Speichere dieses Dokument im Zielrepository unter `docs/kamod-dnd-plan-cursor-prompts.md`. Öffne das Repository in Cursor. Gib zunächst den Basisprompt und danach die Aufgaben 01–08 nacheinander ein. Alternativ verwende anschließend den Durchlauf-Prompt für eine zusammenhängende Umsetzung.

Die Prompts beauftragen Cursor zur Implementierung. Diese Datei selbst ist ein Plan; es wurde noch kein DnD-Code erstellt oder getestet.

### Basisprompt – für alle Aufgaben

```text
Du implementierst kamod-dnd: eine headless Preact-/Signals-Library für sortierbare Editorblöcke und Kanban.

Lies zuerst AGENTS.md, vorhandene Projektregeln, package.json, Lockfile, TypeScript-Konfiguration, Quellstruktur und Tests. Lies docs/kamod-dnd-plan-cursor-prompts.md sowie docs/implementation-status.md, falls vorhanden.
Nutze den Skill build-with-kamod, sofern er in dieser Umgebung verfügbar ist. Behaupte keine Skill-Nutzung, wenn er nicht verfügbar ist. Verifiziere verwendete Kamod-Exports anhand installierter Typen oder offizieller Quellen.

Arbeite im vorhandenen Repository. Bewahre fremde Änderungen und den vorhandenen Package Manager. Bei leerem Repository verwende pnpm, TypeScript strict und Preact. Verwende Oxlint und Oxfmt; integriere sie in die vorhandenen Checks, ohne erforderliche bestehende Prüfungen zu entfernen.

Kein React, React DOM, preact/compat oder Radix. Keine erfundenen Library-APIs. Nutze eine bestehende DnD-Engine nach dokumentierter Auswahl. Kein Eigenbau der Engine ohne gesonderte Entscheidung.
Das Laufzeitpaket bleibt headless und unabhängig von Kamod UI und Tailwind. Verwende Kamod UI und Icons nur in den Beispielen, sofern verfügbar. Theme dort einmal global importieren.

Anwendungsdaten bleiben kontrolliert in der Anwendung. Drag-Sessions bleiben lokal und flüchtig. Vermeide globalen Zustand und Browserzugriffe beim SSR-Import. Unterstütze Cleanup, mehrere Instanzen und readonly Zustandsbeobachtung.

Implementiere die jeweilige Aufgabe vollständig, einschließlich sinnvoller Verhaltenstests. Führe Typecheck, Oxlint, Oxfmt-Check und die betroffenen Tests aus; bei Paketänderungen auch den Build. Repariere eigene Fehler, deaktiviere keine Tests oder Gates, um einen grünen Status vorzutäuschen.
Dokumentiere Ergebnis, geänderte Dateien, tatsächliche Prüfkommandos, offene Grenzen und nächsten Schritt in docs/implementation-status.md. Unverfügbare Prüfungen als blockiert markieren.
Triff reversible Detailentscheidungen selbst. Stoppe bei fehlendem Zugriff, einer grundlegenden Architekturblockade oder einer erforderlichen destruktiven Aktion. Kein Push, Publish oder Deployment.
```

### Prompt 01 – Engine-Spike und Architekturentscheidung

```text
Führe Phase 0 aus. Inventarisiere zuerst das Repository und erkenne bestehende DnD-Funktionen, insbesondere in bereits eingebundenen Kamod Hooks. Erzeuge keine doppelte API ohne Begründung.

Prüfe die aktuellen offiziellen TypeScript-/DOM-APIs von dnd-kit und den Core von Pragmatic Drag and Drop. Verifiziere Versionen, Lizenz, Runtime-Abhängigkeiten und Importpfade. Alte @dnd-kit/core-Beispiele nicht ungeprüft auf die neue Generation übertragen.

Baue je einen kleinen isolierten Preact-Spike mit einer Liste aus variabel hohen Blöcken und zwei Listen mit leerem Zielcontainer. Prüfe Handles, Textauswahl, Input/contenteditable, Tastatur, Touch-Aktivierung, Scrollcontainer, Escape und Unmount. Lege Teststatus und Grenzen pro Engine offen; behauptete Fähigkeiten ohne Nachweis zählen nicht als bestanden.

Schreibe docs/engine-evaluation.md mit Vergleich, Versionen, Quellen, Bundle-Messmethode und Empfehlung. Schreibe docs/decisions/001-engine.md mit Entscheidung und Alternativen.
Wähle selbstständig die einfachste Engine, die die Muss-Kriterien erfüllt. Wenn keine geeignet ist oder die Prüfung mangels Zugriff nicht möglich ist, dokumentiere den Blocker und stoppe die abhängige Umsetzung. Baue nicht stillschweigend eine eigene Engine.

Ergebnis: nachvollziehbare Engine-Entscheidung und ausführbare Spikes. Produktcode erhält anschließend nur die ausgewählte Engine; Vergleichsabhängigkeiten bleiben isoliert oder werden entfernt.
```

### Prompt 02 – Paketgerüst und öffentlicher Vertrag

```text
Setze auf der dokumentierten Engine-Entscheidung auf. Erstelle ein einziges veröffentlichbares ESM-Paket @kamod-ch/dnd mit TypeScript-Deklarationen und einem Sortable-Subpath. Verwende das bestehende Build-System oder einen einfachen passenden Library-Build. Verifiziere vor einer Veröffentlichung die Verfügbarkeit des Paketnamens; jetzt nicht veröffentlichen.

Definiere den minimalen öffentlichen Vertrag: instanzgebundener Controller/Provider, Draggable- und Droppable-Registrierung, readonly Session-Zustand, typisierte Nutzdaten, MoveIntent und Drop-Regeln. Die konkreten Namen im Plan sind Vorschläge; dokumentiere begründete Änderungen.
Definiere stabile IDs, Eindeutigkeit, Containerzugehörigkeit, Zielindex nach Entfernen aus der Quelle und No-op-Semantik. Lege Cancel-Gründe und Verhalten bei entfernten Quellen/Zielen fest. Native Engine-Typen sollen keine unnötige Kopplung der Consumer verursachen.

Konfiguriere Peer-Dependencies für Preact/Signals passend zur tatsächlichen Nutzung, Exports, Build, Typecheck, Oxlint und Oxfmt. Bibliothek ohne Theme/CSS-Zwang; Beispiele separat.
Prüfe SSR-Import und ein minimales Consumer-Beispiel. Ergänze Vertrags- und Typprüfungen für gültige bzw. ungültige Nutzdaten. Keine breite unbenutzte Abstraktionsschicht einführen.
```

### Prompt 03 – Drag-Session und Preact-Bindings

```text
Implementiere den internen Adapter für die ausgewählte Engine und die Preact-Bindings. Nutze verifizierte APIs. Übernimm bereits vorhandene Sensor-/Lifecycle-Funktionen der Engine, statt sie doppelt zu implementieren.

Expose nur benötigte Signals, beispielsweise activeId, overId, phase und canDrop. Häufig aktualisierte Positionen dürfen keine gesamte Liste zum Rendern zwingen. Dokumentiere die Datenhoheit zwischen Engine, Adapter und Anwendung.
Implementiere Ref-Registrierung, Deregistrierung, unabhängige Provider, deaktivierte Elemente, synchrone Drop-Prüfung und Cancel. Pointer-Starts nur am Handle; Eingaben und Textauswahl dürfen nicht versehentlich starten.

Räume Listener, Effects, Observer und Animation-Frames beim Abbruch und Unmount zuverlässig auf. Entfernte aktive Elemente oder Ziele müssen eine definierte sichere Reaktion auslösen.
Teste zwei unabhängige Instanzen, wiederholtes Mount/Unmount, Unmount während Drag, Escape und verbotene Drops. Erstelle eine minimale headless Demo.
```

### Prompt 04 – Sortable und kontrollierte Transfers

```text
Implementiere den Sortable-Subpath auf dem bestehenden Vertrag. Unterstütze variable Höhen, Reorder innerhalb einer Liste und Transfers zwischen Listen, einschließlich leerer Ziele und letzter Position.

Leite während Drag eine Vorschau/Einfügemarkierung ab. Ändere Domain-Daten erst über einen kontrollierten MoveIntent bei erfolgreichem Drop. Ermögliche der Anwendung, einen Intent abzulehnen. No-op-Drops dürfen keine Änderung auslösen. Revalidiere das Ziel beim Drop.
Implementiere kleine pure Helfer für Reorder/Transfer ohne Mutation der Eingabedaten. Verwende IDs als Identität und den dokumentierten Zielindexvertrag. Vermeide doppelte Commit-Events.

Teste erstes/letztes Element, Nachbarwechsel, leeres Ziel, ungültigen Drop, Cancel, No-op, fehlende IDs und während Drag aktualisierte Daten. Entscheide und dokumentiere, ob widersprüchliche externe Änderungen die Session abbrechen oder sicher neu auflösen; für den MVP ist ein klarer Abbruch akzeptabel.
```

### Prompt 05 – Tastatur, Touch und Accessibility

```text
Vervollständige die Eingabemethoden. Nutze die Sensoren und Accessibility-Hilfen der Engine, soweit geeignet. Plane keine proprietäre parallele Sensor-Engine.

Lege eine konsistente Tastaturbedienung fest: Handle fokussieren, Aufnahme, Bewegung, Ablegen und Escape-Abbruch. Dokumentiere die Bedienung für Containerwechsel. Erhalte die bestehenden Rollen der Anwendung; keine pauschale role=application-Lösung.
Ergänze lokalisierbare Meldungen für Aufnahme, neue Position, Containerwechsel, Ablegen und Abbruch. Live-Region nicht mit jedem Pointer-Pixel aktualisieren. Fokus nach Drop/Cancel auf ein sinnvolles vorhandenes Element setzen.
Ergänze zugängliche Alternativaktionen wie Nach oben, Nach unten und In Liste verschieben; diese nutzen dieselben MoveIntents und Drop-Regeln.

Prüfe Touch-Aktivierung gegen Scrollen, Pointer-Cancel und Klick nach einem Drag. touch-action nur gezielt am Handle einsetzen. Dokumentiere Reduced-Motion-Verhalten und schalte unnötige Animationen entsprechend ab.
Teste Tastaturabläufe und Fokus im Browser. Automatische Accessibility-Prüfung ergänzen, falls sinnvoll; sie ersetzt keine Screenreader-Prüfung. Lege eine kurze manuelle Checkliste für VoiceOver/Safari oder NVDA/Firefox sowie ein reales Touchgerät an. Nicht durchgeführte Prüfungen offen kennzeichnen.
```

### Prompt 06 – Editor und Kanban als Referenzanwendungen

```text
Baue zwei vollständige, kleine Beispiele mit verifizierten Kamod-UI- und Icons-APIs, semantischen Theme-Tokens sowie Hell-/Dunkelmodus.

Editor: Überschrift, Text und Bildplatzhalter als variabel hohe Blöcke, Handle außerhalb der editierbaren Fläche, Einfügemarkierung und stabile Block-IDs. Falls editable.ts im Workspace vorhanden ist, analysiere und integriere dessen tatsächlichen Vertrag. Andernfalls nutze einen klar bezeichneten simplen Editing-Dummy; erfinde keine editable.ts-API und lade keine beliebige namensgleiche Abhängigkeit. Implementiere nur Block-DnD, keinen neuen Rich-Text-Editor.
Prüfe, dass Auswahl, Schreiben, Fokus und Auswahlbereich durch Start/Abbruch nicht unnötig verloren gehen. Drags nur über den Handle.

Kanban: drei Spalten, eine anfänglich leer, variable Kartenhöhen, Transfer, Drop-Regel und Verschiebemenü. Anwendung übernimmt MoveIntents kontrolliert. Optional ein kleines Undo auf Anwendungsebene, falls ohne Erweiterung des Library-Vertrags möglich.

Beide Beispiele nutzen dieselbe öffentliche API. Keine privaten Engine-Imports in Consumer-Komponenten. Wenn eine Abstraktion nur in einer Demo funktioniert, vereinfache oder korrigiere sie. Prüfe schmale Viewports, Tastatur und Theme-Kontrast.
```

### Prompt 07 – Verhalten, Performance und Paketprüfung

```text
Prüfe die verbleibenden konkreten Risiken mit gezielten Browser-Tests. Verwende vorhandene Infrastruktur oder Playwright, wenn noch keine besteht. Teste reale Pointer-/Tastaturpfade der Engine; rufe nicht ausschließlich interne Drop-Callbacks auf.

Decke Reorder, Transfer in leere Liste, Escape, verbotene Ziele, Scrollcontainer, Unmount und externe Datenänderung ab. Prüfe Chromium, Firefox und WebKit, soweit ausführbar. Touch-Emulation ersetzt keine reale Geräteprüfung; benenne diese Grenze.

Erstelle reproduzierbare Performance-Szenarien für 100 und 500 einfache Elemente ohne Virtualisierung. Miss Renderanzahl, lange Tasks bzw. Frame-Verhalten während Drag und Bundlegröße des minimalen Consumers mit Produktionsbuild. Nenne Browser, Hardware/Umgebung, Szenario und Messmethode. Behaupte keine allgemeine 60-FPS-Garantie und keinen Vorteil gegenüber anderen Libraries ohne Vergleichsmessung.
Optimiere nur gemessene Engpässe: Layout-Reads bündeln, unnötige Subscriptions reduzieren, Positionen sinnvoll pro Frame aktualisieren. Keine komplette Liste bei jedem Pointer-Event neu rendern.

Packe das npm-Artefakt lokal und installiere es in einem isolierten Preact-Consumer. Prüfe Root-/Sortable-Imports, Typen, SSR-Import, ESM-Exports und fehlende React-Abhängigkeiten. Führe Typecheck, Oxlint, Oxfmt-Check, Tests und Build aus. Dokumentiere tatsächliche Resultate und Blocker.
```

### Prompt 08 – Dokumentation und Beta-Vorbereitung

```text
Erstelle eine präzise README mit Installation, verifiziertem Minimalbeispiel, kontrollierter Datenhoheit, Sortable-/Transfer-Beispiel, Tastaturbedienung, lokalisierbaren Meldungen, SSR-Grenzen und Cleanup. Alle Beispiele müssen gegen das lokale Paket typgeprüft sein.

Dokumentiere Engine und Lizenzpflichten, Peer-Dependencies, unterstützten Umfang und offene Grenzen. Keine Behauptungen zu Bäumen, Grids, Virtualisierung, Dateien oder Cross-Window-Support, wenn sie nicht implementiert und geprüft sind.
Erstelle eine Integrationsanleitung für Kamod UI. Halte das Runtime-Paket headless. Dokumentiere den Weg, die bewährten Beispielkomponenten später in Kamod UI zu übernehmen, ohne jetzt ungeprüft ein anderes Repository zu ändern.

Erstelle Changelog, lokale Beta-Release-Checkliste und docs/implementation-status.md mit einer Anforderung-zu-Nachweis-Tabelle. Prüfe Pack-Inhalt, Lizenzdateien und fehlende versehentliche Demo-Abhängigkeiten.
Führe die abschließenden Checks aus. Berichte klar: implementiert, getestet, ungeprüft, blockiert. Bereite das Paket lokal zur Veröffentlichung vor, veröffentliche und pushe es aber nicht.
```

## 7. Optionaler Durchlauf-Prompt

Nach Einfügen des Basisprompts kann dieser Prompt die Einzelaufgaben zusammenhängend abarbeiten lassen. Er umgeht keine Freigaben oder fehlenden Werkzeuge der Cursor-Umgebung.

```text
Setze docs/kamod-dnd-plan-cursor-prompts.md in der Reihenfolge Prompt 01 bis 08 um. Führe eine Aufgabe nach der anderen vollständig aus; nach einem erfolgreichen Meilenstein fahre ohne routinemäßige Rückfrage fort.

Lege docs/implementation-status.md mit den acht Aufgaben, Status, Entscheidungen, Prüfkommandos, Ergebnissen und offenen Blockern an. Aktualisiere es nach jedem Meilenstein, damit eine spätere Sitzung sicher fortsetzen kann.
Vor jedem Folgeschritt prüfe die Abhängigkeiten. Falls kein Engine-Kandidat die Muss-Kriterien erfüllt, stoppe die davon abhängige Implementierung und liefere eine konkrete Entscheidungsvorlage. Bei fehlenden Downloads oder Tools erfinde keine Ergebnisse.
Repariere Fehler innerhalb des vereinbarten Umfangs selbstständig. Wiederhole Prüfungen gezielt nach Korrekturen, nicht unbegrenzt. Manuelle Geräte-/Screenreader-Prüfungen bleiben offen, wenn sie hier nicht ausführbar sind; bereite trotzdem alle übrigen lokalen Arbeiten vor.
Respektiere vorhandene Änderungen und Repository-Regeln. Kein Push, Publish, Deployment, Löschen fremder Arbeit oder eigenmächtiger Ausbau zu einer eigenen Engine.
Beende mit einer knappen Übersicht der implementierten Funktionen, echten Prüfergebnisse und noch erforderlichen manuellen Prüfungen.
```

## 8. Quellen und Einordnung

Die folgenden offiziellen Quellen wurden für die vorangehende Architekturberatung geprüft. Cursor muss konkrete Versionen und Importpfade zum Implementierungszeitpunkt erneut verifizieren.

- dnd-kit: https://dndkit.com/ – aktueller frameworkunabhängiger TypeScript-Einstieg und Konzepte.
- Pragmatic Drag and Drop: https://github.com/atlassian/pragmatic-drag-and-drop
- Core: https://atlassian.design/components/pragmatic-drag-and-drop/core-package/
- Accessibility: https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines
- Preact Signals: https://preactjs.com/guide/v10/signals/ – Grundlagen; die passende Dokumentationsversion zur installierten Preact-Version verwenden.

Die Engine-Auswahl ist offen. Aufwand und Architektur sind Empfehlungen, keine bereits durch Messungen bestätigten Ergebnisse eines kamod-dnd-Prototyps.
