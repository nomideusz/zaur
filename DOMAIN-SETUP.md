# Konfiguracja domeny głównej zaur.app

Obecnie aplikacja jest dostępna pod adresem `zaur.zaur.app`. Aby skonfigurować domenę główną `zaur.app`, wykonaj następujące kroki:

## 1. Konfiguracja rekordów DNS

Skonfiguruj rekordy DNS dla domeny `zaur.app`:

- Typ: A
- Nazwa: @
- Wartość: [Adres IP twojego serwera CapRover]
- TTL: 3600 (lub mniej)

Dodatkowo, warto dodać rekord dla `www`:
- Typ: CNAME
- Nazwa: www
- Wartość: zaur.app.
- TTL: 3600 (lub mniej)

## 2. Konfiguracja w panelu CapRover

1. Przejdź do panelu CapRover (captain.twojadomena.com)
2. Przejdź do zakładki "Apps" i wybierz aplikację "zaur"
3. Przejdź do zakładki "HTTP Settings"
4. W sekcji "Connect New Domain":
   - Wpisz `zaur.app`
   - Zaznacz "Enable HTTPS"
   - Kliknij "Connect New Domain"
5. Powtórz ten proces dla `www.zaur.app` jeśli potrzebujesz

## 3. Konfiguracja jako domeny głównej (Root Domain)

Jeśli chcesz używać zaur.app jako domeny głównej (bez subdomen):

1. Przejdź do "Cluster" -> "Root Domain Settings"
2. W polu "New Root Domain" wpisz `zaur.app`
3. Kliknij "Update Domain"
4. Może być konieczne ponowne uruchomienie aplikacji

## 4. Przekierowanie

Aby ustawić przekierowanie z zaur.zaur.app na zaur.app:

1. W ustawieniach aplikacji, przejdź do "HTTP Settings"
2. Znajdź domenę zaur.zaur.app
3. Włącz "Redirect to another domain" i wpisz `https://zaur.app`
4. Kliknij "Save & Update"

## Uwaga
* Zmiany DNS mogą potrzebować do 24 godzin, aby się rozpropagować
* SSL/HTTPS jest automatycznie obsługiwane przez CapRover, ale certyfikat może nie być wygenerowany natychmiast 