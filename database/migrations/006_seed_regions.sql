INSERT INTO regions (name, shard_key, terrain, climate)
SELECT name, shard_key, terrain, climate
FROM (VALUES
  ('The Verdant Lowlands', 'verdant-lowlands', '{"type":"river_basin","fertility":80,"elevation":"low"}', '{"type":"temperate","rainfall":"abundant"}'),
  ('The Stonemoor Hills', 'stonemoor-hills', '{"type":"highlands","fertility":30,"elevation":"medium"}', '{"type":"cool","rainfall":"moderate"}'),
  ('The Amberwood Forest', 'amberwood-forest', '{"type":"forest","fertility":70,"elevation":"low"}', '{"type":"temperate","rainfall":"high"}'),
  ('The Dustbite Expanse', 'dustbite-expanse', '{"type":"plains","fertility":40,"elevation":"low"}', '{"type":"arid","rainfall":"low"}'),
  ('The Cinderpeaks', 'cinderpeaks', '{"type":"mountainous","fertility":20,"elevation":"high"}', '{"type":"cold","rainfall":"low"}')
) AS r(name, shard_key, terrain, climate)
WHERE NOT EXISTS (SELECT 1 FROM regions WHERE regions.name = r.name);

INSERT INTO resource_nodes (region_id, kind, position_x, position_y, quantity, max_quantity, regen_per_tick)
SELECT r.id, n.kind, n.x, n.y, n.qty, n.max_qty, n.regen
FROM regions r
CROSS JOIN (VALUES
  ('food', 20, 30, 80, 80, 5),
  ('food', 50, 60, 80, 80, 5),
  ('water', 10, 20, 100, 100, 3),
  ('water', 70, 70, 100, 100, 3),
  ('wood', 30, 40, 60, 60, 4),
  ('wood', 60, 20, 60, 60, 4),
  ('stone', 80, 40, 40, 40, 2),
  ('stone', 20, 80, 40, 40, 2),
  ('fiber', 40, 10, 60, 60, 4),
  ('fiber', 80, 80, 60, 60, 4),
  ('clay', 45, 50, 30, 30, 1),
  ('copper', 70, 30, 15, 15, 1),
  ('tin', 30, 70, 15, 15, 1),
  ('iron', 90, 90, 10, 10, 1)
) AS n(kind, x, y, qty, max_qty, regen)
WHERE r.name = 'The Verdant Lowlands'
AND NOT EXISTS (SELECT 1 FROM resource_nodes WHERE region_id = r.id LIMIT 1);

INSERT INTO resource_nodes (region_id, kind, position_x, position_y, quantity, max_quantity, regen_per_tick)
SELECT r.id, n.kind, n.x, n.y, n.qty, n.max_qty, n.regen
FROM regions r
CROSS JOIN (VALUES
  ('food', 15, 20, 40, 40, 3),
  ('water', 10, 15, 40, 40, 2),
  ('stone', 25, 30, 80, 80, 5),
  ('stone', 60, 50, 80, 80, 5),
  ('wood', 40, 20, 30, 30, 2),
  ('clay', 30, 60, 50, 50, 3),
  ('clay', 70, 30, 50, 50, 3),
  ('copper', 50, 40, 40, 40, 2),
  ('copper', 80, 70, 40, 40, 2),
  ('tin', 20, 70, 25, 25, 2),
  ('iron', 85, 85, 15, 15, 1),
  ('fiber', 45, 80, 30, 30, 2)
) AS n(kind, x, y, qty, max_qty, regen)
WHERE r.name = 'The Stonemoor Hills'
AND NOT EXISTS (SELECT 1 FROM resource_nodes WHERE region_id = r.id LIMIT 1);

INSERT INTO resource_nodes (region_id, kind, position_x, position_y, quantity, max_quantity, regen_per_tick)
SELECT r.id, n.kind, n.x, n.y, n.qty, n.max_qty, n.regen
FROM regions r
CROSS JOIN (VALUES
  ('food', 30, 40, 60, 60, 4),
  ('food', 70, 30, 60, 60, 4),
  ('wood', 20, 20, 100, 100, 6),
  ('wood', 50, 60, 100, 100, 6),
  ('wood', 80, 80, 100, 100, 6),
  ('fiber', 10, 50, 80, 80, 5),
  ('fiber', 60, 10, 80, 80, 5),
  ('water', 40, 30, 60, 60, 3),
  ('water', 90, 60, 60, 60, 3),
  ('stone', 35, 70, 20, 20, 1),
  ('clay', 25, 45, 25, 25, 1)
) AS n(kind, x, y, qty, max_qty, regen)
WHERE r.name = 'The Amberwood Forest'
AND NOT EXISTS (SELECT 1 FROM resource_nodes WHERE region_id = r.id LIMIT 1);

INSERT INTO resource_nodes (region_id, kind, position_x, position_y, quantity, max_quantity, regen_per_tick)
SELECT r.id, n.kind, n.x, n.y, n.qty, n.max_qty, n.regen
FROM regions r
CROSS JOIN (VALUES
  ('food', 10, 10, 30, 30, 2),
  ('water', 15, 20, 30, 30, 1),
  ('stone', 30, 40, 60, 60, 4),
  ('stone', 70, 30, 60, 60, 4),
  ('iron', 40, 50, 30, 30, 2),
  ('iron', 80, 70, 30, 30, 2),
  ('copper', 50, 20, 25, 25, 2),
  ('copper', 30, 80, 25, 25, 2),
  ('tin', 70, 60, 20, 20, 1),
  ('wood', 60, 80, 20, 20, 1),
  ('fiber', 45, 45, 25, 25, 2),
  ('clay', 20, 60, 20, 20, 1)
) AS n(kind, x, y, qty, max_qty, regen)
WHERE r.name = 'The Dustbite Expanse'
AND NOT EXISTS (SELECT 1 FROM resource_nodes WHERE region_id = r.id LIMIT 1);

INSERT INTO resource_nodes (region_id, kind, position_x, position_y, quantity, max_quantity, regen_per_tick)
SELECT r.id, n.kind, n.x, n.y, n.qty, n.max_qty, n.regen
FROM regions r
CROSS JOIN (VALUES
  ('stone', 20, 30, 100, 100, 6),
  ('stone', 60, 50, 100, 100, 6),
  ('iron', 40, 40, 50, 50, 3),
  ('iron', 80, 60, 50, 50, 3),
  ('copper', 30, 70, 35, 35, 2),
  ('copper', 70, 20, 35, 35, 2),
  ('tin', 50, 80, 30, 30, 2),
  ('clay', 25, 25, 20, 20, 1),
  ('food', 10, 10, 15, 15, 1),
  ('water', 15, 15, 20, 20, 1),
  ('wood', 80, 80, 10, 10, 1)
) AS n(kind, x, y, qty, max_qty, regen)
WHERE r.name = 'The Cinderpeaks'
AND NOT EXISTS (SELECT 1 FROM resource_nodes WHERE region_id = r.id LIMIT 1);
