# Engine V2 — Render PDF

Nouvelle génération de dossier tournoi **sans PowerPoint ni LibreOffice**.

## Objectif

Remplacer à terme l'Engine classique (PPTX → LO → PDF) par un pipeline unifié avec Live :

```
Excel → moteur tournoi → rendu PyMuPDF (pages Live) → PDF
```

## État actuel (v0.1)

| Composant | Statut |
|-----------|--------|
| `POST /api/v2/generate` | OK |
| Couverture, participants, convocations | Rendu natif V2 |
| Tableaux / planning / classement | Réutilise `live_export_render` + `live_render_pdf` |
| Snapshot `.live.json` Manager | Compatible |
| Wizard frontend | `/#/engine-v2` (parallèle, Hub non modifié) |
| Poules (slides dédiées) | À faire |
| Layout sans `.live.json` PPTX | À faire (configs JSON par format) |

## Déploiement Render (service séparé)

- **Service** : `tournament-manager-engine-v2`
- **Branche** : `feature/engine-v2`
- **URL** : `https://tournament-manager-engine-v2.onrender.com`
- **Env** : `DEPLOY_TARGET=engine-v2`
- **Health** : `GET /api/v2/health`

Créer le service dans Render Dashboard → New Web Service → branche `feature/engine-v2`.

**Docker** : `Dockerfile.engine-v2` (sans LibreOffice, démarrage plus rapide). Si le service
existait déjà avec le Dockerfile principal, mettre à jour **Settings → Docker → Dockerfile Path**
vers `Dockerfile.engine-v2`.

L'Engine prod (`main`) et le preview Hub (`feature/manager`) **ne sont pas impactés**.

## Routes

| Route | Rôle |
|-------|------|
| `GET /api/v2/health` | Santé Engine V2 |
| `POST /api/v2/generate` | Génération PDF (mêmes champs que `/api/generate`) |
| `/#/engine-v2` | Wizard React V2 |

## Structure code

```
engine_v2/
  generate.py          # orchestrateur
  pdf_document.py      # assemblage multi-pages
  template_registry.py # cache .live.json (géométrie templates)
  pages/
    cover.py
    participants.py
    convocations.py
api/v2_router.py       # routes FastAPI
```

## Prochaines étapes

1. Valider rendu PDF 16 / 20 / 24 équipes vs Engine classique
2. Pages poules + composition
3. Header/footer unifiés (style Live, sans bandeaux Engine)
4. Layout JSON natifs (supprimer dépendance aux PPTX pour la géométrie)
5. Brancher Hub → Engine V2 quand qualité validée
