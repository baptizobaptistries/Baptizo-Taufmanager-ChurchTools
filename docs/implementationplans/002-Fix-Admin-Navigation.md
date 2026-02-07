# Plan 002: Admin Navigation Fix (Produktion)

## Problembeschreibung
In der Entwicklungsumgebung funktioniert der Admin-Button, da er nach `.menu-item` Elementen im DOM sucht. Im Produktionssystem (ChurchTools) existieren diese Elemente nicht, weshalb der Button ohne Funktion bleibt. Die Navigation muss stattdessen den internen Vue-State (`showAdminView`) verwenden.

## Vorgeschlagene Änderungen

### [MODIFY] [Dashboard.vue](file:///Users/mgoth/extensions/Taufmanager/src/components/Dashboard.vue)
- Die Funktion `goToAdminEntryPoint` anpassen:
  ```typescript
  function goToAdminEntryPoint() {
    console.log('[Baptizo] Switching to Admin View (Internal State)');
    showAdminView.value = true;
  }
  ```
- Den redundanten Tab `admin` (Zeile 592) prüfen und ggf. entfernen oder mit `showAdminView` synchronisieren.

### [MODIFY] [Admin.vue](file:///Users/mgoth/extensions/Taufmanager/src/components/Admin.vue)
- Die `navigateBack` Funktion so anpassen, dass sie ein Event emittiert, welches `showAdminView` im Parent wieder auf `false` setzt, falls der Button in `Dashboard.vue` (Zeile 11) nicht ausreicht.

## Verifizierung
- Starten von `npm run dev`.
- Prüfen, ob der Admin-Button das Overlay öffnet.
- Prüfen, ob "Zurück zum Dashboard" das Overlay schließt.
