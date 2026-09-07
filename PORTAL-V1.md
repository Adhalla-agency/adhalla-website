# Adhalla Client Reporting Portal V1

Branch: `client-reporting-portal-v1`

## V1 eesmärk

Esimene kliendipoolne raportiportaal samas veebirepos. Production sait jääb eraldi `main` branchi seisule kuni portaal on testitud.

V1 sisaldab:
- Google/Firebase Auth arhitektuuri
- deny-by-default kliendiautoriseerimise reegleid
- mock client `0000` dashboardi
- toimivat date-range filtrit mock daily data peal
- KPI-de arvutust ja perioodivõrdlust
- trendigraafikut
- interaktiivset marketing-memory kalendrit
- klikitavaid annotatsioone
- raportite arhiivi UI-d
- data-health vaadet
- client-safe export lepingut

## Turvapiir

Google login **ei anna automaatselt ligipääsu andmetele**.

Päris režiimis peab eksisteerima `portalUsers/{firebase_uid}` dokument, näiteks:

```json
{
  "enabled": true,
  "role": "client_viewer",
  "allowed_clients": ["0007"]
}
```

Alles siis lubavad Firestore/Storage reeglid lugeda `clients/0007/...`.

Kliendi brauser ei saa kirjutada kliendiandmetega dokumente. V1 portal on read-only.

## Soovitatud Firestore struktuur

```text
portalUsers/{uid}

clients/{client_id}
  name
  tier
  dataThrough
  lastProcessed
  state

clients/{client_id}/metrics_daily/{YYYY-MM-DD}
clients/{client_id}/timeline/{event_id}
clients/{client_id}/reports/{report_id}
clients/{client_id}/sources/{source_id}
```

PDF failid Storage'is:

```text
clients/{client_id}/reports/{report_id}.pdf
```

## Firebase aktiveerimine

Vaja on sinu Firebase projekti Web App config objekti.

Firebase Console'is:
1. loo või vali projekt;
2. lisa Web App;
3. Authentication -> Google provider ON;
4. loo Firestore Database;
5. aktiveeri Storage;
6. lisa `adhalla.ee` Auth authorized domains alla;
7. kopeeri Web App `firebaseConfig`.

Seejärel asenda `portal/firebase-config.js` väärtus `null` päris config objektiga ja pane `demoMode = false`.

Firebase web config ei ole salasõna. Ligipääsu kontrollivad Auth + Firestore/Storage Rules.

## Järgmine etapp

Kui Firebase config on olemas:
1. ühenda päris Google login;
2. tee `admin@adhalla.ee` esimene `adhalla_admin`;
3. seo testkonto kliendiga `0000`;
4. kirjuta backendist esimene client-safe export Firestore'i;
5. ühenda Storage'i päris PDF;
6. testi tundmatu konto / client 0000 / admin roll;
7. alles siis lisa production-nav'i kliendiportaali link.
