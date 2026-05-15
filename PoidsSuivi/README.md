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
├── src/
│   ├── screens/              # 4 écrans : Home, Add, Chart, History
│   ├── components/           # StatCard, MA5Badge, WeightChart
│   ├── utils/                # dates.js, calculations.js (MA5, trend, peaks)
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

- **🏠 Accueil** : poids du jour, 4 cartes stats (Poids/MA5/Δ MA5/Min-Max),
  graphique compact (20 dernières), badges MA5 scrollables, référence éditable, FAB +
- **➕ Ajouter** : DatePicker natif Android, validation 50–150 kg, anti-doublon,
  preview MA5 en direct, haptic, bouton « Annuler la dernière saisie »
- **📊 Graphique** : plein écran, segments 7j/30j/3 mois/Tout, tooltip au tap,
  pics colorés en rouge, ligne objectif si défini
- **📋 Historique** : tendance 7j/30j, phrase synthétique, streak + régularité du mois,
  objectif (date estimée), liste swipeable, export CSV via le menu de partage Android

## Données initiales

53 pesées du 08/03/2026 au 15/05/2026 sont préchargées au premier démarrage.
Au démarrage suivant, on conserve la sauvegarde locale dès qu'elle est plus
complète (ou égale) qu'INITIAL_DATA.

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
