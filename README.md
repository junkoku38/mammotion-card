# Mammotion Card

Carte Lovelace pour tondeuse robot Mammotion (Luba, Luba 2 AWD, Yuka).
Double anneau progression / batterie, phases, courbe de batterie, zones et contrôle segmenté.

## Sécurité

Helper `esc()` sur toutes les interpolations dynamiques. `script.*` et `automation.*` rejetés dans `callService`.

## Installation

HACS → Dépôts personnalisés → `https://github.com/junkoku38/mammotion-card`, catégorie Lovelace.

## Configuration

```yaml
type: custom:mammotion-card
name: Luba 2 AWD
mower: lawn_mower.jardin_luba_vszztydu
battery: sensor.jardin_luba_vszztydu_batterie
progress: sensor.jardin_luba_vszztydu_progression
remaining_time: sensor.jardin_luba_vszztydu_temps_restant
session_duration: sensor.jardin_luba_vszztydu_temps_ecoule
elapsed_time: sensor.jardin_luba_vszztydu_temps_ecoule
total_time: sensor.jardin_luba_vszztydu_temps_total
area: sensor.jardin_luba_vszztydu_zone
current_zone: sensor.jardin_luba_vszztydu_zone
charging: binary_sensor.jardin_luba_vszztydu_en_charge
blade_height: sensor.jardin_luba_vszztydu_hauteur_des_lames
blade_hours: sensor.jardin_luba_vszztydu_duree_d_utilisation_de_la_lame
satellites: sensor.jardin_luba_vszztydu_satellites_robot
rtk_status: sensor.jardin_luba_vszztydu_position_rtk
error: sensor.jardin_luba_vszztydu_derniere_erreur
error_code: sensor.jardin_luba_vszztydu_dernier_code_d_erreur
error_time: sensor.jardin_luba_vszztydu_heure_de_la_derniere_erreur
odometer: sensor.jardin_luba_vszztydu_kilometrage_total
idle_hours: sensor.jardin_luba_vszztydu_heures_non_travaillees
activity_1_button: button.jardin_luba_vszztydu_activite_1
activity_1_label: Espacement 20
activity_2_button: button.jardin_luba_vszztydu_activite_espacement25
activity_2_label: Espacement 25
edge_button: button.jardin_luba_vszztydu_bordure
leave_dock_button: button.jardin_luba_vszztydu_quitter_la_base
restart_button: button.jardin_luba_vszztydu_redemarrer_la_tondeuse
sync_map_button: button.jardin_luba_vszztydu_synchroniser_les_cartes
sync_schedule_button: button.jardin_luba_vszztydu_synchroniser_les_plannings
sync_rtk_button: button.jardin_luba_vszztydu_synchroniser_rtk_et_base
hours: 4
show_battery_chart: true
show_phases: true
theme: glass  # glass | minimal | modern | nature
```

## Nouveautés v1.4.0

- **Caméra et boutons réparés** : le template ne contenait pas les blocs
  `cam-slot` / `extra-btns` — les options camera, bordure, quitter la base,
  redémarrer étaient silencieusement mortes depuis la v1.3.
- **Boutons d'activités** : lancement direct des tontes pré-configurées
  (`activity_1_button` + `activity_1_label`...), le raccourci du quotidien.
- **Session fiable** : `temps écoulé / temps total` en plus de la
  progression terrain — « session 99 % » répond à « quand ça finit ».
- **Zone en cours** affichée pendant la tonte.
- **« En charge »** quand le binary_sensor de charge est actif (au lieu
  d'un « À la base » générique).
- **Lame en heures** (`blade_hours`, seuil d'usure à 60 h) plus parlant
  que le pourcentage.
- **Erreur contextualisée** : texte nettoyé du préfixe `common:` de
  Mammotion, daté (« il y a 2 j »), et un code d'erreur non nul prime
  sur l'état publié — Mammotion laisse parfois « paused » pendant une
  faute bloquante.
- **Boutons de synchronisation** (cartes, plannings, RTK) et **heures
  non travaillées** dans la section connexion.
- `state_entity` configurable depuis l'éditeur visuel.

## Nouveautés v2.0.0 — réglages réglables et couverture complète

**Réglages interactifs** : les `number` deviennent des sliders et les
`select` des menus — `speed` et `blade_height_set` pointent désormais les
entités *réglables* (`number.*`), pas les sensors en lecture seule. Un
`number.set_value` écrit une vraie commande à la tondeuse : l'écriture
part au relâchement du slider, pas à chaque pixel.

Nouvelles clés réglables : `blade_height_set`, `angle_traverse`,
`turn_mode`, `perimeter_rounds`, `forbidden_rounds`, `charge_path`,
`voice_gender`, `voice_volume`.

**Action Annuler** : 4ᵉ segment `cancel_button` — stopper une tâche est
plus fréquent que la lancer.

**Diagnostics RTK** : `rtk_mode`, `rtk_quality`, `rtk_age`,
`device_signal`, `visual_pos`, `map_sync`, `connection`, `mqtt`,
`location`, `light_level`, `task_path` — tout ce qui répond à « pourquoi
elle tond mal / dérive ».

**Divers** : `blade_warn_hours` (seuil d'usure lame, défaut 60 h).

Volontairement ignorés : mouvement d'urgence (danger), déplacer la
station (risqué), `switch.zone` (redondant avec les boutons d'activité).

```yaml
# réglages réglables — pointer les number/select, pas les sensors
speed: number.jardin_luba_vszztydu_vitesse_de_fonctionnement
blade_height_set: number.jardin_luba_vszztydu_hauteur_des_lames
angle_traverse: number.jardin_luba_vszztydu_angle_de_traversee
turn_mode: select.jardin_luba_vszztydu_mode_de_demi_tour
perimeter_rounds: select.jardin_luba_vszztydu_tours_de_tonte_du_perimetre
forbidden_rounds: select.jardin_luba_vszztydu_tours_de_tonte_de_zones_interdites
charge_path: select.jardin_luba_vszztydu_trajet_de_recharge
voice_gender: select.jardin_luba_vszztydu_genre_de_la_voix
voice_volume: number.jardin_luba_vszztydu_volume_de_la_voix
cancel_button: button.jardin_luba_vszztydu_annuler_la_tache_en_cours
rtk_mode: sensor.jardin_luba_vszztydu_mode_de_positionnement
rtk_quality: sensor.jardin_luba_vszztydu_rtk_signal_quality
rtk_age: sensor.jardin_luba_vszztydu_rtk_correction_age
device_signal: sensor.jardin_luba_vszztydu_device_signal_quality
visual_pos: sensor.jardin_luba_vszztydu_etat_du_positionnement_visuel
map_sync: sensor.jardin_luba_vszztydu_etat_de_synchronisation_de_la_carte
connection: sensor.jardin_luba_vszztydu_connexion
mqtt: sensor.jardin_luba_vszztydu_etat_mqtt
location: sensor.jardin_luba_vszztydu_emplacement_actuel
light_level: sensor.jardin_luba_vszztydu_luminosite_de_la_camera
task_path: sensor.jardin_luba_vszztydu_zone_de_tache_path
```

## Nouveautés v2.1.0 — design et information

- **Caméra repliable** : fermée par défaut — un flux souvent mort ne
  doit pas manger 40 % de la carte. Ouvrez-la quand vous voulez voir.
- **Marge de tonte** : batterie ÷ décharge moyenne réelle (calculée
  sur l'historique) → « marge ~3 h 24 ». Pas d'invention sans données.
- **Historique 7 jours** : barres de tonte par jour (durée + sessions),
  total de la semaine — le vrai travail accompli.
- **Double courbe** : batterie (aire) + progression (pointillée) sur
  le même graphe, échelles indépendantes. Les **paliers de batterie**
  sont marqués en jaune : pauses, blocages, charges.
- **Batterie en fin de session** : « Batterie 87 % → 63 % fin » quand
  le temps restant et la décharge sont connus.
- **Badge pluie** : si un capteur de précipitation est configuré
  (`rain_sensor`), la carte prévient avant que la tondeuse ne le
  décide elle-même.
- **Labels d'anneaux distincts** : « Tonte 77 % » / « Batterie 87 % » —
  le centre sans qualificatif prêtait à confusion.
- **Thème clair** : la carte suit le thème HA (`darkMode`), au lieu
  d'imposer son fond sombre.
- **Erreurs silencieuses** : plus de « Aucune erreur » affiché en
  temps normal, et « Error message not found » (chaîne Mammotion pour
  un code inconnu) est remplacé par « Code 6404 ».
- **Micro-interactions** : scale au toucher sur tout élément actionnable.

## Nouveautés v2.2.0 — thèmes visuels

- **Choix du design** : paramètre `theme` avec 3 styles au choix,
  sélectionnable dans l'éditeur visuel (Affichage → Design de la carte)
  ou en YAML :
  - `glass` (défaut) : design original sombre, anneaux et glow radial.
  - `minimal` : plat, aéré, bordures fines en pointillés, typographie
    légère — idéal pour un dashboard épuré.
  - `modern` : gradients, ombres portées, glassmorphism renforcé,
    effet de bordure lumineuse.
- **Aperçu rapide** : dans l'éditeur visuel, une rangée de pastilles
  colorées permet de voir et sélectionner le thème d'un coup d'œil.
- **Adaptation automatique** : chaque thème suit le mode clair/sombre
  de Home Assistant.

## Nouveautés v2.3.0 — thème Nature

- **Nouveau design `nature`** : palette verte organique (vert feuillage,
  vert sauge, terre cuite), bord de pelouse décoratif en haut de carte,
  formes très arrondies — la carte évoque le jardin qu'elle entretient.
- **Correction anneaux** : l'anneau de progression était invisible depuis
  la v2.2.0 (`var()` ne fonctionne pas dans les attributs SVG) — les
  couleurs vivent désormais en CSS.
- **Couleurs synchronisées au thème** : anneaux, courbes de batterie,
  légendes suivent la palette du thème choisi, en mode sombre et clair.

## Nouveautés v2.3.1 — correction bannière d'erreur

- **Faux positif corrigé** : la bannière rouge s'affichait quand l'entité
  `error` contenait « common:No error » (état normal Mammotion) — le texte
  était affiché tel quel après nettoyage. La carte vérifie désormais via
  `_hasRealError()` que le message est réellement une erreur avant
  d'afficher quoi que ce soit.

## Licence

MIT
