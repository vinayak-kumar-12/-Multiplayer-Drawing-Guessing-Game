# Music Streaming with Shared Listening Rooms – System Design Repository

## Overview

This repository contains a **complete, submission‑ready system design** for a large‑scale music streaming service that supports individual listening and **shared listening rooms** where many participants hear the same track in near‑real‑time.

The repository **does not include any implementation code**—only design documentation, architectural diagrams, and supporting analysis.

---

## Problem Statement

Design the backend architecture for a Spotify‑style service that must:
- Serve 20 M monthly active users and 2 M concurrent listeners.
- Provide a catalogue of 50 M tracks.
- Allow users to create **shared listening rooms** (2‑5 000 participants per room, 200 000 rooms at peak).
- Keep playback across a room synchronized within **≈ 200 ms**.
- Support queueing, voting, pausing, seeking, and graceful failure handling.

---

## Functional Requirements

- Create/join rooms via shareable links.
- Host controls pause/seek; any member can add tracks or vote to skip.
- Playback timeline is shared among all members.

## Non‑Functional Requirements

- **Scalability** – handle the listed peak loads.
- **Low latency** – command propagation & playback synchronization ≤ 200 ms.
- **High availability** – regional outage tolerance, no forced room drops.
- **Observability** – metrics, tracing, and alerts for synchronization health.

---

## Scale Assumptions (as given)

| Metric | Value |
|--------|-------|
| Monthly users | 20 M |
| Peak concurrent listeners | 2 M |
| Catalogue size | 50 M tracks |
| Peak concurrent rooms | 200 000 |
| Listeners per room | 2 – 5 000 |
| Sync target | ~200 ms |

---

## Architecture Summary & Technology Choices

- **Clients** – Web & native mobile (HTML5 audio, HLS/DASH).
- **API Layer** – Node.js / Express, behind a cloud load balancer.
- **Room Coordination** – Stateless service leveraging **Redis Cluster** for active state and **Kafka** for durable event log.
- **Catalogue** – Authoritative data in **PostgreSQL**, searchable index in **OpenSearch**.
- **Media** – Ingest → transcoding → **object storage (S3‑compatible)** → **CDN** (HLS/DASH, adaptive bitrate).
- **Observability** – **Prometheus** + **Grafana**, **OpenTelemetry**, centralized logging.
- **Deployment** – Containerised (Docker) on Kubernetes (or comparable orchestration).

---

## Repository Structure

```
/README.md                         – this file
/docs/
   system-design.md                – full design document (3‑6 pages)
   failure-scenarios.md            – failure analysis (10 scenarios)
   capacity-planning.md            – capacity calculations & testing plan
/diagrams/
   architecture.mmd                – Mermaid source for logical architecture
   architecture.png                – rendered PNG
   pause-sequence.mmd              – Mermaid sequence diagram for pause flow
   pause-sequence.png              – rendered PNG
.gitignore                         – ignores editor/temp files
```

---

## Main Architectural Decisions (summary)

- **PostgreSQL** for durable relational data; **Redis** for low‑latency room state.
- **WebSockets** (Socket.IO compatible) for real‑time room events; **polling** only for non‑interactive API calls.
- **CDN** for all audio bytes – never route media through application servers.
- **Kafka** for asynchronous analytics, listening‑history, and royalty processing.
- **OpenSearch** solely as a search index; source of truth stays in PostgreSQL.
- **State versioning & fencing tokens** protect against stale commands and coordinator failover.

---

## How to View Diagrams

The repository contains both the Mermaid source (`.mmd`) and the rendered PNGs. To view or edit the diagrams:
1. Open the `.mmd` files in any Mermaid editor (e.g., VS Code with the Mermaid preview extension) to see the source.
2. Open the `.png` files directly – they are generated with the Mermaid CLI (light theme, 1200 px width).

---

**Note:** This repository is documentation‑only; no runnable application code is included.
