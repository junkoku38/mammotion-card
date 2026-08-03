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
area: sensor.jardin_luba_vszztydu_zone
blade_height: sensor.jardin_luba_vszztydu_hauteur_des_lames
satellites: sensor.jardin_luba_vszztydu_satellites_robot
rtk_status: sensor.jardin_luba_vszztydu_position_rtk
error: sensor.jardin_luba_vszztydu_derniere_erreur
odometer: sensor.jardin_luba_vszztydu_kilometrage_total
hours: 4
show_battery_chart: true
show_phases: true
```

## Licence

MIT
