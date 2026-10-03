insert into public.specialties(slug,name,description,icon) values
('cardiology','Cardiology','Heart and circulation care','heart'),
('dermatology','Dermatology','Skin, hair and nail care','sparkles'),
('pediatrics','Pediatrics','Healthcare for children','baby'),
('orthopedics','Orthopedics','Bones, joints and mobility','bone'),
('psychiatry','Psychiatry','Mental health and wellbeing','brain'),
('neurology','Neurology','Brain and nervous system care','activity'),
('general-medicine','General Medicine','Primary and preventive care','plus'),
('gynecology','Gynecology','Women’s health','circle')
on conflict (slug) do update set name=excluded.name,description=excluded.description,icon=excluded.icon,active=true;
