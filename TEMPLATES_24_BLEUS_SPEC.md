# Spécification — Templates « bleus » (Avancé) 24 équipes

Objectif : créer les 6 templates bleus manquants pour le format 24 équipes,
au même standard visuel que les templates bleus 16 et 20.

| Fichier à produire (dans `templates bleus/`) | Fichier basic de référence (structure/balises déjà correctes) |
|---|---|
| `Template_24_1J.pptx`         | `templates/Template_24_1J.pptx` |
| `Template_24_2J.pptx`         | `templates/Template_24_2J.pptx` |
| `Template_24_3J.pptx`         | `templates/Template_24_3J.pptx` |
| `Template_24_poules_1J.pptx`  | `templates/Template_24_poules_1J.pptx` |
| `Template_24_poules_2J.pptx`  | `templates/Template_24_poules_2J.pptx` |
| `Template_24_poules_3J.pptx`  | `templates/Template_24_poules_3J.pptx` |

> ⚠️ Les fichiers `Template_24_*.pptx` actuellement dans `templates bleus/` sont
> de simples **copies** des basic. Ils doivent être remplacés par de vrais
> designs bleus.

---

## Méthode recommandée : RE-STYLISER le basic, ne pas repartir de zéro

Le basic-24 contient **déjà** toutes les balises, tous les tableaux et toutes les
positions de boîtes de tableau, corrects et validés. La façon la plus sûre de
produire le bleu sans casser le moteur :

1. Ouvrir `templates/Template_24_XX.pptx` (basic) dans PowerPoint.
2. **Ajouter la slide de couverture bleue** en tête (voir plus bas).
3. Appliquer l'habillage bleu (polices, tailles, couleurs, fonds) **sans toucher
   au texte des balises `{{...}}` ni à la structure des tableaux**.
4. Enregistrer sous `templates bleus/Template_24_XX.pptx`.

Ne jamais renommer, scinder ou fusionner une balise `{{...}}` : elle doit rester
**dans un seul bloc de texte** (sinon le moteur ne la remplace pas).

---

## Palette du design bleu (relevée sur `Template_20_1J` bleu)

Dimensions de slide : **9 906 000 × 6 858 000 EMU** (identiques au basic — ne pas changer).

### Polices
- **Titres / gros chiffres** : `Grindy Brush`
- **Textes de marque, sous-titres, codes de match** : `TSL Sans`
- **Contenu dense des tableaux/brackets** : `Noto Sans`

### Tailles & couleurs par type de texte
| Élément | Police | Taille | Couleur |
|---|---|---|---|
| Titre principal `{{TYPE}}` (couverture) | Grindy Brush | 96 pt | **#FFFF00** (jaune) |
| `{{DATE}}` / `{{HEURE}}` (couverture) | Grindy Brush | 30 pt | blanc |
| `{{NB_EQUIPES}}` / `{{NB_TERRAINS}}` (couverture) | Grindy Brush | 28 pt | blanc |
| Titre de section (`{{PARTICIPANTS}}`, `TABLEAU PRINCIPAL`, `POULE A`…) | Grindy Brush | 32 pt | blanc |
| Placeholder logo `{{LOGO}}` (si pas de logo) | TSL Sans | 42 pt | — |
| Sous-info `{{TYPE}}` / `{{DATE}}` (bandeau des slides de contenu) | TSL Sans | 18 pt | — |
| Code de match `{{Px_CODE}}`, `{{Hx_CODE}}`… | TSL Sans | 11 pt | — |
| Équipes dans les boîtes `{{..._EQ1}}` / `{{..._EQ2}}` | Noto Sans | 8 pt | — |
| « vs » | Noto Sans | 9 pt | — |
| « score: » | Noto Sans | 10 pt | — |

### Tableaux
- Couleur de fond des **cellules d'en-tête** : **#00B0F0** (bleu cyan), texte blanc.
- Les lignes de contenu conservent la mise en forme de la ligne modèle.

---

## Slide de couverture bleue (à AJOUTER — absente du basic)

C'est la seule slide « nouvelle » par rapport au basic. Elle porte ces balises :

```
{{LOGO}}   {{TYPE}}   {{DATE}}   {{HEURE}}   {{NB_EQUIPES}}   {{NB_TERRAINS}}
```

(styles : voir tableau ci-dessus).

---

## Règles du moteur à respecter absolument

### 1. Deux tableaux à remplissage automatique (duplication de lignes)
Le moteur duplique automatiquement les lignes de **deux** tableaux, repérés par
un mot-clé présent dans le texte de la slide :

- Slide contenant le mot **PARTICIPANTS** → 1er tableau de la slide.
  - Doit avoir : **1 ligne d'en-tête + 1 ligne modèle** (stylée).
  - **6 colonnes**, dans cet ordre :
    `NOM J1 | CLASSEMENT J1 | NOM J2 | CLASSEMENT J2 | POIDS PAIRE | TS`
- Slide contenant le mot **CONVOCATIONS** → 1er tableau de la slide.
  - Doit avoir : **1 ligne d'en-tête + 1 ligne modèle** (stylée).
  - **2 colonnes**, dans cet ordre : `ÉQUIPE | HEURE`

Pour ces deux tableaux, la mise en forme (police, taille, couleur, hauteur) de la
**ligne modèle** est recopiée sur toutes les lignes générées : soignez-la.

### 2. Tous les autres tableaux (Poules, Planning, Points) sont remplis par balises
Ils ne se dupliquent pas : chaque cellule contient une balise fixe
(ex. `{{PA_M1_CODE}}`, `{{PL1_EQ1}}`, `{{PTS1}}`) qui sera remplacée sur place.
Il faut donc que **toutes** les balises listées ci-dessous soient présentes.

### 3. Balises spéciales gagnant/perdant
- `{{WIN_XXX}}` → devient « 🏆 XXX: » (emoji trophée)
- `{{LOSE_XXX}}` → devient « ❌ XXX: » (emoji croix)
- `{{WIN_POULE_A}}` / `{{SECOND_POULE_A}}` → labels de poule (🏆 / 🥈)

Placez ces balises telles quelles ; le moteur ajoute l'emoji.

---

## Inventaire des balises par format (source de vérité = fichiers basic-24)

La liste complète, slide par slide, est celle des fichiers `templates/Template_24_*.pptx`.
En ré-stylisant ces fichiers, vous conservez automatiquement l'inventaire exact.

Repères de volume (occurrences de balises) :
- 24 élimination 1J / 2J / 3J : **591** balises, **16 slides**
- 24 poules 1J : **652** balises, **16 slides**
- 24 poules 2J : **652** balises, **16 slides**
- 24 poules 3J : **655** balises, **17 slides**

Familles de balises présentes :
- **Globales** : `{{TYPE}}`, `{{DATE}}`, `{{HEURE}}`, `{{CLUB}}`, `{{NB_EQUIPES}}`,
  `{{NB_TERRAINS}}`, `{{PARTICIPANTS}}`, `{{LOGO}}`
- **Matchs (tableau)** : `{{<CODE>_CODE}}`, `{{<CODE>_HEURE}}`, `{{<CODE>_TERRAIN}}`,
  `{{<CODE>_EQ1}}`, `{{<CODE>_EQ2}}` — codes : `P1..P8` (tour préliminaire),
  `H1..H8`, `Q1..Q4`, `D1/D2`, `PF`, `F`, et classements `C5_6`, `C5_8_1`, `C7_8`,
  `C9_10`, `C9_12_1/2`, `C9_16_1..4`, `C11_12`, `C13_14`, `C13_16_1/2`, `C15_16`,
  `C17_18`, `C17_20_1/2`, `C17_24_1..4`, `C19_20`, `C21_22`, `C21_24_1/2`, `C23_24`
- **Gagnant/Perdant** : `{{WIN_...}}`, `{{LOSE_...}}`
- **Poules** (formats poules uniquement) : `{{POULE_A_1_EQ}}..{{POULE_D_4_EQ}}`,
  `{{EXEMPT_1_EQ}}..{{EXEMPT_8_EQ}}`, `{{PA_M1..6_...}}` … `{{PD_M1..6_...}}`,
  `{{WIN_POULE_A..D}}`, `{{SECOND_POULE_A..D}}`
- **Planning** : `{{PLn_...}}` (1 jour) ou `{{Jj_PLn_...}}` (2-3 jours),
  répartis sur plusieurs slides « PLANNING DES MATCHS … »
- **Points** : `{{PTS1}}..{{PTS24}}` (2 slides « CLASSEMENT FINAL / POINTS »)

---

## Validation

Une fois vos 6 fichiers déposés dans `templates bleus/`, le contrôle automatique
vérifie qu'aucune balise n'est manquante ni oubliée (remplissage à blanc de chaque
format, style Avancé). Je m'en charge dès réception.
