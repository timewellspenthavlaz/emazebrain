# Data Model — Entities

All entities live in `base44/entities/<Name>.jsonc`. Built-in attributes on every record (never declared): `id`, `created_date`, `updated_date`, `created_by_id`. The `User` entity is built-in (read-only: `id`, `created_date`, `full_name`, `email`; editable `role`).

## Patient
| Field | Type | Notes |
|---|---|---|
| full_name | string | **required** |
| date_of_birth | date | |
| age_group | enum | `3-5`, `6-8`, `9-11`, `12-14`, `15-18` |
| gender | enum | `male`, `female`, `other` |
| clinic_id / clinic_name | string | denormalized clinic |
| therapist_id / therapist_name | string | denormalized therapist |
| diagnosis_ids / diagnosis_names | string[] | taxonomy links |
| brain_region_ids | string[] | |
| functional_skill_ids | string[] | |
| level | enum | `beginner` (default), `intermediate`, `advanced` |
| pulse | number | pulse score |
| status | enum | `active` (default), `inactive`, `pending` |
| signup_method | enum | `admin_created` (default), `self_registered` |
| notes | string | |

## Clinic
`name` (required), `address`, `city`, `state`, `contact_email` (email), `contact_phone`, `status` (`active` default / `inactive` / `pending`), `description`.

## Therapist
`full_name` + `email` (email) **required**; `phone`, `clinic_id`, `clinic_name`, `specialty`, `license_number`, `status` (`pending` default / `active` / `inactive`), `signup_method` (`admin_created` default / `self_registered`).

## GameSession — one row per game run
| Field | Type | Notes |
|---|---|---|
| game_id | string | default `block-crasher`; e.g. `tunnel-rush` |
| patient_id | string | **required** |
| patient_name | string | denormalized |
| session_id | string | UUID from the game |
| session_date | date-time | |
| version | string | payload version, default `1.0` |
| score | number | default 0 |
| duration_seconds | number | |
| levels_completed / highest_level | number | |
| lives_remaining | number | |
| input_method | string | e.g. `keyboard/mouse`, `touch` |
| metrics | object | **game-specific telemetry** (see per-game docs) |
| level_history | object[] | per-level detail rows |
| status | enum | `completed` (default) / `game_over` / `abandoned` |

## ContentItem — videos & games catalogue
| Field | Type | Notes |
|---|---|---|
| title | string | **required** |
| type | enum | `video`, `game` (**required**) |
| description | string | |
| link_type | enum | `external` (default), `cdn_upload` |
| url | string | |
| thumbnail_url | string | |
| background_id / background_url / background_name | string | game background selection |
| therapist_ids / therapist_names | string[] | |
| brain_region_ids / functional_skill_ids / diagnosis_ids | string[] | taxonomy |
| age_groups | enum[] | `3-5`, `6-8`, `9-11`, `12-14`, `15-18` |
| level | enum | `beginner` (default), `intermediate`, `advanced` |
| duration_minutes | number | default 5 |
| usage_setting | enum | `in_clinic`, `at_home`, `both` (default) |
| status | enum | `active` (default), `inactive` |
| tags | string[] | |

## GameBackground
`name`, `image_url`, `category` (**all required**; category: `solid_warm` / `solid_cold` / `textured_warm` / `textured_cold`), `sort_order` (number, default 0).

## Diagnosis
`name` (**required**), `description`, `brain_region_ids` / `brain_region_names`, `functional_skill_ids` / `functional_skill_names`, `status` (`active` default / `inactive`).

## BrainRegion
`name` + `level_type` (**required**; level_type: `hemisphere` / `neuroanatomical` / `lobe` / `brodmann_area`); `hemisphere` (`both` default / `left` / `right`), `parent_id` / `parent_name`, `lobe`, `brodmann_area`, `description`, `functional_skill_ids`, `diagnosis_ids`, `status`, `sort_order`.

## FunctionalSkill
`name` (**required**), `description`, `category`, `brain_region_ids` / `brain_region_names`, `diagnosis_ids`, `status`.

## TherapyLog — signed clinical note
| Field | Type | Notes |
|---|---|---|
| patient_id / therapist_id / session_date / clinical_notes | | **required** |
| patient_name / therapist_name / clinic_id / clinic_name | string | denormalized |
| session_summary | string | |
| duration_minutes | number | default 0 |
| location | enum | `in_clinic` (default), `at_home` |
| progress_score | number | 0–100 |
| signed_at | date-time | |
| signed_by_id / signed_by_name | string | |
| signature_hash | string | SHA-256 (see `docs/BACKEND.md`) |
| amendments | object[] | `{ note, amended_at, amended_by_id, amended_by_name }` |
| status | enum | `signed` (default), `amended` |

## SessionLog — lightweight content-consumption log
`patient_id` + `content_item_id` **required**; `patient_name`, `therapist_id` / `therapist_name`, `clinic_id` / `clinic_name`, `content_title`, `content_type` (`video` / `game`), `duration_minutes`, `session_date` (date-time), `location` (`in_clinic` default / `at_home`), `progress_score`, `notes`.

## TherapyPlan
`name` + `patient_id` **required**; `patient_name`, `therapist_id` / `therapist_name`, `clinic_id` / `clinic_name`, `content_item_ids` (string[]), `plan_type` (`in_clinic` default / `at_home`), `is_favorite` (bool, default false), `status` (`active` default / `inactive` / `completed`), `notes`.