-- Complete the category-aware quick-add catalog for the inventory screen.
insert into public.inventory_item_templates (
  key,
  name,
  emoji,
  category_key,
  default_quantity,
  default_low_stock_threshold,
  sort_order
)
values
  ('shampoo', 'Shampoo', '🧴', 'bathroom', 1, 1, 10),
  ('soap', 'Jabón', '🧼', 'bathroom', 1, 1, 20),
  ('toilet_paper', 'Papel higiénico', '🧻', 'bathroom', 4, 2, 30),
  ('toothpaste', 'Pasta dental', '🪥', 'bathroom', 1, 1, 40),
  ('deodorant', 'Desodorante', '🧴', 'bathroom', 1, 1, 50),

  ('detergent', 'Detergente', '🧼', 'cleaning', 1, 1, 10),
  ('bleach', 'Lavandina', '🧴', 'cleaning', 1, 1, 20),
  ('all_purpose_cleaner', 'Limpiador multiuso', '🧽', 'cleaning', 1, 1, 30),
  ('sponges', 'Esponjas', '🧽', 'cleaning', 2, 1, 40),
  ('trash_bags', 'Bolsas de residuos', '🗑️', 'cleaning', 1, 1, 50),

  ('batteries', 'Pilas', '🔋', 'tools', 4, 2, 10),
  ('lightbulbs', 'Lamparitas', '💡', 'tools', 2, 1, 20),
  ('screws', 'Tornillos', '🔩', 'tools', 10, 5, 30),
  ('adhesive_tape', 'Cinta adhesiva', '🩹', 'tools', 1, 1, 40),
  ('work_gloves', 'Guantes', '🧤', 'tools', 1, 1, 50),

  ('pain_reliever', 'Analgésico', '💊', 'medication', 1, 1, 10),
  ('bandages', 'Curitas', '🩹', 'medication', 1, 1, 20),
  ('antiseptic', 'Antiséptico', '🧴', 'medication', 1, 1, 30),
  ('allergy_medicine', 'Antialérgico', '💊', 'medication', 1, 1, 40),
  ('thermometer', 'Termómetro', '🌡️', 'medication', 1, 1, 50),

  ('pet_food', 'Alimento para mascota', '🐾', 'pets', 1, 1, 10),
  ('cat_litter', 'Arena sanitaria', '🐾', 'pets', 1, 1, 20),
  ('pet_treats', 'Premios', '🦴', 'pets', 1, 1, 30),
  ('waste_bags', 'Bolsas para paseos', '🛍️', 'pets', 1, 1, 40),
  ('pet_shampoo', 'Shampoo para mascota', '🧴', 'pets', 1, 1, 50),

  ('paper_towels', 'Servilletas de papel', '🧻', 'general', 1, 1, 10),
  ('tissues', 'Pañuelos', '🧻', 'general', 1, 1, 20),
  ('candles', 'Velas', '🕯️', 'general', 1, 1, 30),
  ('aluminum_foil', 'Papel aluminio', '📜', 'general', 1, 1, 40),
  ('storage_bags', 'Bolsas herméticas', '🛍️', 'general', 1, 1, 50)
on conflict (key) do update
set
  name = excluded.name,
  emoji = excluded.emoji,
  category_key = excluded.category_key,
  default_quantity = excluded.default_quantity,
  default_low_stock_threshold = excluded.default_low_stock_threshold,
  sort_order = excluded.sort_order;
