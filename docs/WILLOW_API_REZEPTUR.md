# 🌿 Willow ChurchTools API Rezeptur

Alles was man braucht, um Personen per API im Willow-System zu verwalten.

---

## 🔐 Authentifizierung

```http
POST /api/login
Content-Type: application/json

{ "username": "schoedel.stefan@gmail.com", "password": "..." }
```

**Wichtig:** Den `set-cookie` Header der Antwort speichern und bei allen Folge-Requests als `Cookie` Header mitsenden.

---

## 📋 Willow System IDs

### Gruppen
| Gruppe | ID | GroupType |
|--------|----|-----------|
| Interessenten | **652** | 7 |
| Getauft | **655** | 7 |

### Rollen (GroupType 7)
| Rolle | ID | Typ |
|-------|----|-----|
| participant (Teilnehmer) | **46** | `participant` |
| leader (Leiter) | **49** | `leader` |

### Taufmanager Custom Fields
| Feld | Key (für PATCH) | API Field ID |
|------|-----------------|-------------|
| Status (Auswahl) | `taufmanager_status` | 190 |
| Onboarding (Datum) | `taufmanager_onboarding` | 172 |
| Seminar (Datum) | `taufmanager_seminar` | 175 |
| Taufe (Datum) | `taufmanager_taufe` | 178 |
| Urkunde (Datum) | `taufmanager_urkunde` | 181 |
| Integration (Datum) | `taufmanager_integration` | 184 |
| Offboarding (Datum) | `taufmanager_offboarding` | 187 |

### Status-Optionen (taufmanager_status)
| Status | Wert |
|--------|------|
| Aktiv | `4` |
| Inaktiv | `5` |

### Pflichtfelder bei Person erstellen
| Feld | Typ | Erlaubte Werte |
|------|-----|----------------|
| `departmentIds` | Array | `[1]` = Gemeindeliste |
| `statusId` | Number | `0, 1, 3, 4` (3 = Mitglied) |
| `campusId` | Number | `0` = Winterhude, `1` = Hafencity |

---

## 🧑 Person erstellen

```http
POST /api/persons?force=true
Content-Type: application/json

{
    "firstName": "Dora",
    "lastName": "Becker",
    "sexId": 2,                          // 1=männlich, 2=weiblich
    "email": "dora.becker@test.de",
    "departmentIds": [1],                // PFLICHT: Array!
    "statusId": 3,                       // PFLICHT: 3=Mitglied
    "campusId": 0,                       // PFLICHT: 0=Winterhude
    "firstContact": "2026-02-04",
    "dateOfBelonging": "2025-11-24",
    "privacyPolicyAgreementDate": "2025-11-24",
    "privacyPolicyAgreementTypeId": 3,   // Schriftliche Einwilligung
    "privacyPolicyAgreementWhoId": 1     // Person selbst
}
```

> **`?force=true`** — Überspringt die Duplikat-Prüfung. Ohne diesen Parameter gibt CT einen 403-Fehler wenn ein Name schon existiert.

---

## 📝 Taufmanager-Felder setzen

```http
PATCH /api/persons/{personId}
Content-Type: application/json

{
    "taufmanager_status": 4,
    "taufmanager_onboarding": "2023-08-01",
    "taufmanager_seminar": "2023-08-12",
    "taufmanager_taufe": "2023-09-02",
    "taufmanager_integration": "2023-10-02"
}
```

Alle Felder können in einem einzigen PATCH gesetzt werden. Leere Felder einfach weglassen.

---

## 👥 Person zu Gruppe hinzufügen

### Als Teilnehmer
```http
PUT /api/groups/{groupId}/members/{personId}
Content-Type: application/json

{ "groupRoleId": 46 }
```

### Als Leiter
```http
PUT /api/groups/{groupId}/members/{personId}
Content-Type: application/json

{ "groupRoleId": 49 }
```

---

## 🗑️ Person entfernen / löschen

### Aus Gruppe entfernen
```http
DELETE /api/groups/{groupId}/members/{personId}
```

### Person löschen
```http
DELETE /api/persons/{personId}
```

---

## 🔍 Nützliche Abfragen

```http
GET /api/whoami                          # Eingeloggter User
GET /api/persons?limit=100&page=1        # Personen (paginiert)
GET /api/persons?name=Dora+Becker        # Suche nach Name
GET /api/persons/{id}                     # Einzelne Person (inkl. Custom Fields)
GET /api/groups/{id}                      # Gruppendetails
GET /api/groups/{id}/members              # Gruppenmitglieder
GET /api/person/masterdata                # Rollen, Felder, Departments, Campuses
```

---

## ⚠️ Fallstricke

1. **`departmentIds` ist ein Array** — `[1]` nicht `1`. Sonst 400-Fehler.
2. **`statusId` ≠ `taufmanager_status`** — `statusId` ist der CT-Personenstatus (Mitglied etc.), `taufmanager_status` ist unser Custom Field (Aktiv/Inaktiv).
3. **Rollen-IDs sind nicht portabel** — Dev-System hat Teilnehmer=22, Willow hat participant=46. Code muss `type: "participant"` aus der Masterdata dynamisch auflösen.
4. **`force=true` bei Duplikaten** — Ohne den Query-Parameter verweigert CT die Erstellung wenn der Name schon existiert.
5. **Cookie-Auth** — Der Login gibt einen Session-Cookie zurück, kein Bearer Token.

---

## 📐 Dev vs. Willow ID-Vergleich

| Ressource | Dev | Willow |
|-----------|-----|--------|
| Interessenten Gruppe | 13 | 652 |
| Getauft Gruppe | 16 | 655 |
| Kalender | 7 | 67 |
| Teilnehmer Rolle | 22 | 46 |
| Leiter Rolle | 9 | 49 |
| taufmanager_onboarding | 211 | 172 |
| taufmanager_seminar | 184 | 175 |
| taufmanager_taufe | 187 | 178 |
| taufmanager_urkunde | 190 | 181 |
| taufmanager_integration | 193 | 184 |
| taufmanager_offboarding | 208 | 187 |
| taufmanager_status | 196 | 190 |
| Status: Aktiv | 4 | 4 |
| Status: Inaktiv | 5 | 5 |

---

*Dokumentiert: 2026-02-11 — Verifiziert mit erfolgreicher Migration von 59 Personen*
