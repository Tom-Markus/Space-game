# Musiques de fond 🎵

Déposez ici vos fichiers de musique. Ils seront joués automatiquement au lancement
du jeu, **dans le désordre** (tirage aléatoire, jamais deux fois la même piste
d'affilée), avec **5 secondes de silence** entre chaque piste, en boucle infinie.

## Nommage des fichiers

Nommez-les **exactement** ainsi (format **.mp3**) :

```
musique_1.mp3
musique_2.mp3
musique_3.mp3
musique_4.mp3   ← (facultatif, etc.)
...
```

- Le jeu cherche `musique_1.mp3`, `musique_2.mp3`, … jusqu'à `musique_16.mp3`,
  et s'arrête au premier numéro manquant (numérotation continue requise).
- Mettez-en **autant que vous voulez** (1, 3, 6, 10…) ; l'ordre de lecture est
  tiré au hasard à chaque fois, pas l'ordre des numéros.
- Si aucun fichier n'est présent, le jeu se lance normalement, sans musique.

## Lecture / coupure

- La musique démarre dès que vous cliquez sur **DÉCOLLAGE** (les navigateurs
  exigent un clic avant de jouer du son — c'est ce clic qui l'autorise).
- Le petit bouton **♪** à côté de la mini-carte (en bas) coupe / remet le son.
- Quand vous coupez le son, **la musique continue de tourner en silence** :
  en la rallumant, elle a avancé (elle ne reprend pas là où vous l'aviez coupée).
