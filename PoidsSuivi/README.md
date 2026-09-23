# Suivi du poids — App Android (React Native + Expo)

App de tracking de poids quotidien : tableau de bord, ajout d'une pesée,
graphique interactif (Victory Native + Skia), historique avec analyse de
tendance et export CSV. Stockage 100 % local via AsyncStorage. Dark mode natif.

## Structure

```
PoidsSuivi/
├── App.js                    # Navigation par onglets
├── app.json                  # Config Expo (theme dark, package Android)
├── babel.config.js           # Avec plugin Reanimated
├── assets/                   # icône, icône adaptative, splash
├── __tests__/                # tests Jest
├── src/
│   ├── screens/              # 5 écrans : Home, Add, Chart, History, Settings
│   ├── components/           # StatCard, MA5Badge, WeightChart
│   ├── utils/                # calculs, dates, CSV, fichiers, notifications
│   ├── storage/              # store.js + INITIAL_DATA (53 pesées)
│   └── theme/colors.js       # palette centralisée
```

## Installation

```bash
cd PoidsSuivi
npm install
```

## Lancer en dev (Expo Go)

```bash
npx expo start
```

Scanner le QR code avec **Expo Go** sur Android (API 29+).

## Fonctionnalités

- **Accueil** : dernière pesée, bandeau si pas encore pesé aujourd'hui, cartes MA5 / Δ MA5 /
  Min-Max / IMC, graphique des 20 dernières pesées, badges MA5, bouton +
- **Ajouter** : date native, boutons −/+ 0,1 kg partant de la dernière pesée, écart vs dernière
  pesée, aperçu MA5, anti-doublon, annulation de la dernière saisie
- **Graphique** : 7 j / 30 j / 3 mois / Tout (jours calendaires), tooltip au toucher, pics en rouge,
  ligne objectif + référence, stats de la période (moyenne, min, max, variation)
- **Historique** : tendance 7 j / 30 j, phase, comparaison mois courant vs précédent, streak et
  régularité, objectif avec date estimée ; toucher une ligne pour la modifier, glisser pour la
  supprimer (avec « Annuler » pendant 5 s)
- **Réglages** : rappel quotidien (notification locale à l'heure choisie), taille pour l'IMC,
  ligne de référence, import CSV (fusion ou remplacement) et export CSV

## Tests

```bash
npm test      # calculs (MA5, tendance, IMC, périodes…) et import/export CSV
```

Les tests tournent aussi dans GitHub Actions avant chaque build d'APK.

## Données initiales

53 pesées du 08/03/2026 au 15/05/2026 sont préchargées au premier démarrage.
Ensuite, la sauvegarde locale fait toujours foi (suppressions comprises).

## Calculs (`src/utils/calculations.js`)

- **MA5** : moyenne des 5 entrées consécutives (index-based)
- **Tendance** : régression linéaire (moindres carrés) sur N derniers jours →
  pente en kg/jour & kg/semaine
- **Pic** : `poids > MA5 + 1.0`
- **Streak** : pesées consécutives terminant aujourd'hui ou hier
- **Régularité** : pesées du mois ÷ jours du mois
- **Phase** : Prise / Maintien / Perte (seuils ±0.1 kg/sem)
- **Objectif** : date estimée selon la pente 30 jours

## Build Android → APK

`expo build:android` est déprécié. La voie officielle est **EAS Build** (cloud Expo, gratuit pour les builds occasionnels) :

```bash
npm install -g eas-cli
eas login                                            # compte Expo (gratuit)
eas build --platform android --profile preview       # → APK installable
# ou
eas build --platform android --profile production    # → AAB pour le Play Store
```

`eas.json` est déjà configuré : le profil **preview** produit un **APK** (et non un AAB), avec `distribution: "internal"` — tu reçois un lien de téléchargement à la fin du build (~10–15 min). Installe-le sur ton Android via le lien (autoriser les sources inconnues).

### Alternative : build local

Si tu as Android Studio installé (SDK + JDK 17+) :

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease                            # APK dans app/build/outputs/apk/release/
```

## Notes techniques

- **victory-native v41+** rend via Skia ; `react-native-reanimated` est requis
  comme peer dep et son plugin Babel est listé dans `babel.config.js`.
- **Stockage** : tout en ISO (`YYYY-MM-DD`) dans AsyncStorage,
  affichage en `DD/MM` côté UI.
- **Année** : pour les données initiales, l'année 2026 est inférée
  (les pesées vont du 08/03/26 au 15/05/26).
