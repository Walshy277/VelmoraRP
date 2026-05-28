INSERT INTO knowledge_entries (name, category, description, requirements)
VALUES
  ('Basic Foraging', 'survival', 'Identify safe edible plants and basic water sources.', '{}'),
  ('Stone Toolmaking', 'crafting', 'Shape stone and wood into simple survival tools.', '{"resources":["stone","wood"]}'),
  ('Simple Shelter', 'construction', 'Build basic huts and weather protection.', '{"resources":["wood","fiber"]}')
ON CONFLICT (name) DO NOTHING;
