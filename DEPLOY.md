# Instrukcje wdrażania Zaur na CapRover

To repozytorium zawiera dashboard dla projektu Zaur, które można wdrożyć na serwerze CapRover.

## Wymagania

- Dostęp do serwera z zainstalowanym CapRover
- Git zainstalowany na komputerze
- Domena zaur.app skierowana na serwer CapRover

## Kroki wdrożenia

### 1. Przygotowanie repozytorium

Kod aplikacji powinien być wrzucony do repozytorium Git. Pamiętaj, że repozytorium musi zawierać:
- Dockerfile
- captain-definition

### 2. Tworzenie aplikacji w CapRover

1. Zaloguj się do panelu administracyjnego CapRover
2. Przejdź do sekcji "Apps"
3. Kliknij "Create a new app"
4. Wprowadź nazwę aplikacji, np. "zaur"
5. Kliknij "Create New App"

### 3. Konfiguracja domeny

**Uwaga:** Domyślnie, aplikacja będzie dostępna pod adresem `zaur.zaur.app`. Jeśli chcesz używać domeny głównej `zaur.app`, sprawdź instrukcje w pliku `DOMAIN-SETUP.md`.

1. W ustawieniach utworzonej aplikacji przejdź do zakładki "HTTP Settings"
2. W sekcji "Connect New Domain":
   - Wpisz domenę: zaur.app (lub użyj domyślnej zaur.zaur.app)
   - Zaznacz "Enable HTTPS"
   - Kliknij "Connect New Domain"

### 4. Wdrożenie aplikacji z repozytorium Git

1. W ustawieniach aplikacji przejdź do zakładki "Deployment"
2. W sekcji "Method 3: Deploy from GitHub/GitLab/BitBucket":
   - Wklej URL repozytorium: `https://github.com/nomideusz/zaur.git`
   - Wprowadź gałąź (domyślnie "master")
   - Kliknij "Deploy"

Alternatywnie, możesz użyć CapRover CLI:

```bash
# Instalacja CapRover CLI
npm install -g caprover

# Logowanie do serwera CapRover
caprover login

# Wdrożenie aplikacji
caprover deploy
```

### 5. Weryfikacja wdrożenia

Po zakończeniu wdrożenia, aplikacja powinna być dostępna pod adresem zaur.zaur.app lub zaur.app (w zależności od konfiguracji).

## Aktualizacja aplikacji

Aby zaktualizować aplikację, wystarczy wprowadzić zmiany do kodu, zacommitować je i wypchać do repozytorium Git, a następnie ponownie wdrożyć aplikację w panelu CapRover.

```bash
git add .
git commit -m "Opis zmian"
git push origin master
```

Następnie z panelu CapRover kliknij "Deploy" dla aplikacji "zaur".

## Debugowanie

Jeśli napotkasz problemy z wdrożeniem, sprawdź:
1. Logi aplikacji w panelu CapRover
2. Upewnij się, że Dockerfile jest poprawnie skonfigurowany
3. Sprawdź, czy domena jest poprawnie skierowana na serwer CapRover
4. Zweryfikuj, czy wszystkie zmienne środowiskowe są poprawnie ustawione 