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

## Licence

MIT
