# 🌌 TP3 - Infographie : Simulation de Trou Noir (Gargantua)

**Auteurs :** PALANCA Clément & CAGNON Leny  
**Module :** Infographie - Master 1 Informatique

🔗 **[Démo en ligne (Render)](https://tp3-infographie.onrender.com/)**  
🔗 **[Code source (GitHub)](https://github.com/KoZanyyy/TP3-INFOGRAPHIE)**

## Ce projet est une simulation interactive d'un trou noir inspiré de _Gargantua_ (du film Interstellar), réalisée en WebGL avec la bibliothèque **Three.js**.

---

## 🚀 Fonctionnalités

- **Trou noir complet** : Sphère noire (horizon des événements), disque d'accrétion animé, et halo simulant la photonsphère.
- **Lentille Gravitationnelle Apparente** : Le halo (photonsphère) utilise un shader sur un plan en "Billboard" (qui fait toujours face à la caméra) pour simuler la déformation optique de la lumière.
- **Disque d'Accrétion Procédural** : Généré via un Shader (GLSL) utilisant du bruit fractal (FBM) pour créer des stries et des filaments de gaz incandescents en rotation.
- **Physique des Planètes** :
  - Orbites affectées par la gravité du trou noir.
  - Interaction à la souris (force de répulsion).
  - Effet de _Spaghettification_ : lorsqu'une planète franchit l'horizon des événements, elle est étirée et disloquée avant d'être engloutie.
- **Croissance dynamique** : Le trou noir augmente sa masse (son échelle et sa gravité) à chaque fois qu'il absorbe une planète.

---

## 📁 Architecture du projet

\`\`\`text
.
├── index.html
├── css/
│ └── basic.css
├── js/
│ ├── main.js # Initialisation Three.js, Caméra, Boucle de rendu
│ ├── blackhole.js # Création et animation du Groupe Trou Noir
│ ├── planets.js # Physique, orbites et spaghettification
│ └── shaders/
│ ├── diskVert.js # Vertex shader du disque
│ ├── diskFrag.js # Fragment shader du disque (Bruit FBM)
│ ├── haloVert.js # Vertex shader du halo
│ └── haloFrag.js # Fragment shader du halo (Effet Sablier)
└── images/ # Textures (Cubemap, Planètes)
\`\`\`

---

## 🧠 Explication des Shaders (GLSL)

### 1. Le Disque d'Accrétion (`diskFrag.js`)

Contrairement à une simple texture, le disque est généré de manière procédurale :

- **FBM (Fractional Brownian Motion)** : On superpose plusieurs couches de bruit pour créer la texture organique des gaz.
- **Coordonnées Polaires** : On transforme les UV cartésiens en coordonnées polaires `(angle, rayon)`. L'angle est multiplié par le temps pour animer les filaments et donner l'illusion qu'ils orbitent à des vitesses différentes.

### 2. Le Halo / Photonsphère (`haloFrag.js`)

Simuler une vraie lentille gravitationnelle en 3D temps réel demande du _Raymarching_ (très lourd). Ici, on utilise une astuce optique très optimisée :

- **Technique du Billboard** : Un simple plan 2D qui regarde toujours la caméra.
- **Déformation Sablier** : Dans le fragment shader, on compresse les coordonnées en X au fur et à mesure qu'on s'approche de `Y=0` (l'équateur).
- **Formule clé** : `flare = exp(-abs(p.y) * 4.0)`. Cela crée une courbe exponentielle qui donne l'illusion que l'anneau lumineux contourne le trou noir et "fusionne" avec le disque d'accrétion horizontal.

---

## ☄️ Logique Physique (`planets.js`)

Chaque planète possède une propriété `userData.velocity`. À chaque frame (dans `updatePlanets`) :

1. **Gravité** : On calcule le vecteur unitaire pointant vers le trou noir, on le multiplie par l'inverse du carré de la distance (`1 / d²`), pondéré par la masse (l'échelle) actuelle du trou noir.
2. **Spaghettification** : Si la distance passe sous un seuil critique, la planète perd son vecteur de vélocité. Elle est `lerp` vers le centre, son échelle en Z (axe vers le trou noir) est multipliée, et elle devient transparente.
3. **Absorption** : Arrivée au centre, la planète disparaît, fait grandir le trou noir (`bhParams.targetScale += 0.15`), puis réapparaît (_respawn_) plus loin.

---
