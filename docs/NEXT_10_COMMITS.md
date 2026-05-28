# Next 10 Commits Roadmap

## 1. Add Migration Runner

Introduce a real migration workflow instead of applying one monolithic schema file. Add ordered migration files and a `schema_migrations` table.

## 2. Implement Action Intake API

Add `POST /actions` with Zod validation. Commands should enqueue into `player_actions` and never mutate world state directly.

## 3. Implement Character Creation

Add account and character creation routes, starter spawn placement, lineage creation, and initial inventory.

## 4. Implement Resource Gathering

Convert queued `gather_resource` actions into real resource node depletion and inventory updates.

## 5. Implement Crafting And Building Commands

Add queued actions for crafting basic tools and placing starter structures.

## 6. Add Settlement And Tribe Formation

Allow players to create groups, join groups, found settlements, and assign simple leadership roles.

## 7. Add Territory Claim Evaluation

Calculate claim strength from structures, member presence, settlement control, and progression-rate modifiers.

## 8. Add Knowledge Transmission MVP

Allow characters to learn starter knowledge, teach nearby characters, and preserve knowledge through archives.

## 9. Add Admin Observability

Create endpoints for tick status, system run metrics, queued action inspection, and recent historical events.

## 10. Add Integration Tests

Test a full MVP loop: create character, gather resources, build structure, form group, claim territory, and verify history output.
