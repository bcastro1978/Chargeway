-- LIMPIEZA DE DATOS GEOESPACIALES - PUNTOS DE CARGA
-- Generado automáticamente para corregir provincias y cantones

-- Eliminar fila de encabezado inválida: NOMBRE DEL PUNTO
DELETE FROM public.charging_points WHERE id = '510c82d3-64aa-4b88-a1b1-cb7668611715';

-- Corregir registro: Ultra NRG Gasolinera Multiservicios
UPDATE public.charging_points 
SET province = 'Santo Domingo de los Tsáchilas', city_or_canton = 'La Concordia', lat = -0.0148146, lng = -79.3826533
WHERE id = 'a4259c21-7e5a-422d-ad40-d7a6d2ba91e3';

-- Corregir registro: Gasolinera P&S San Mateo
UPDATE public.charging_points 
SET province = 'Esmeraldas', city_or_canton = 'Esmeraldas', lat = 0.8769098, lng = -79.6376649
WHERE id = '1d3cc566-b7c9-4d1c-84f4-3af6d7bb995d';

-- Corregir registro: Castelnuovo
UPDATE public.charging_points 
SET province = 'Esmeraldas', city_or_canton = 'Atacames', lat = 0.8818976, lng = -79.8352511
WHERE id = 'fbf48f6e-7aab-4e5b-b642-8e863fe6f603';

-- Corregir registro: KFC Santo Domingo — EVINKA CONECT
UPDATE public.charging_points 
SET province = 'Santo Domingo de los Tsáchilas', city_or_canton = 'Santo Domingo', lat = -0.2627128, lng = -79.114653
WHERE id = '6607cddc-1e2d-4d5e-9464-b0cae7c03953';

-- Corregir registro: BYD Bomboli Shopping — EVINKA CONECT
UPDATE public.charging_points 
SET province = 'Santo Domingo de los Tsáchilas', city_or_canton = 'Santo Domingo', lat = -0.2536396, lng = -79.2212342
WHERE id = 'f6300159-85a6-46ff-a82d-e060ab72e4e0';

-- Corregir registro: BYD Bomboli Shopping — CONDOR CHARGE
UPDATE public.charging_points 
SET province = 'Santo Domingo de los Tsáchilas', city_or_canton = 'Santo Domingo', lat = -0.2536396, lng = -79.2212342
WHERE id = '50829a09-5b1c-4aa6-8a78-c04e55414abf';

-- Corregir registro: Club del Campo Hotel & Convenciones
UPDATE public.charging_points 
SET province = 'Santo Domingo de los Tsáchilas', city_or_canton = 'Santo Domingo', lat = -0.2339237, lng = -79.1345977
WHERE id = 'b336530f-700b-4c70-b2e7-e14bdb641085';

-- Corregir registro: Hostería Los Colorados
UPDATE public.charging_points 
SET province = 'Santo Domingo de los Tsáchilas', city_or_canton = 'Santo Domingo', lat = -0.2730613, lng = -79.0872073
WHERE id = '8fa946a0-4723-493e-b386-9a51c4aaa1e9';

-- Corregir registro: Vulcanizadora Recinto La Virgen
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Machachi', lat = -0.4432349, lng = -78.7547383
WHERE id = '3a651cf5-9f57-4b7b-afb0-65dec03b4231';

-- Corregir registro: Vulcanizadora
UPDATE public.charging_points 
SET province = 'Los Ríos', city_or_canton = 'Buena Fe', lat = -0.568778, lng = -79.370833
WHERE id = 'eac4ba56-1dbf-4268-b40e-7eeb99fc3cc2';

-- Corregir registro: Primax Puerto Azul
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Guayaquil', lat = -2.187429, lng = -79.9741114
WHERE id = '51419f12-84f3-42de-89bf-e20577dc6286';

-- Corregir registro: Burger King — EVINKA CONECT
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Guayaquil', lat = -2.1822202, lng = -79.9819071
WHERE id = '4b8e2325-1d3d-41cc-b3a4-e8136793eec6';

-- Corregir registro: Village
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Guayaquil', lat = -2.1034457, lng = -79.9266375
WHERE id = '41082154-e952-490e-86b2-2a797fb1556a';

-- Corregir registro: Parque La Paz Aurora
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Daule', lat = -2.0508396, lng = -79.9044505
WHERE id = 'eee3205c-fc5f-4cfd-ab17-90946cdbc0c5';

-- Corregir registro: La Costa Club de Campo
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Guayaquil', lat = -2.2724914, lng = -80.1556681
WHERE id = '5687f14e-ae74-4364-be2d-75a08a55d3e5';

-- Corregir registro: Hotel Presidente Premium
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'General Villamil', lat = -2.6600364, lng = -80.3767978
WHERE id = '111344ac-8051-470c-909b-54785714a604';

-- Corregir registro: Hotel Luna Azzul
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'General Villamil', lat = -2.6417404, lng = -80.389927
WHERE id = '3c0161e8-81a9-4e33-b747-a57ca53258a5';

-- Corregir registro: Cascada La Poderosa — Vía Chillanes
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Chillanes', lat = -2.1312003, lng = -79.1181197
WHERE id = '7fbd85f7-d69b-4b53-930c-ac63d1e7256d';

-- Corregir registro: Hotel Ballenita Blue
UPDATE public.charging_points 
SET province = 'Santa Elena', city_or_canton = 'Santa Elena', lat = -2.2097994, lng = -80.8809017
WHERE id = 'b0d35120-77dc-426c-bbf5-3147285e9c3e';

-- Corregir registro: Hotel Kanagua
UPDATE public.charging_points 
SET province = 'Santa Elena', city_or_canton = 'Santa Elena', lat = -1.9788989, lng = -80.7554866
WHERE id = 'df5666c0-cfad-4df0-bb48-56dfd9e1ec26';

-- Corregir registro: Hostal El Tamarindo
UPDATE public.charging_points 
SET province = 'Santa Elena', city_or_canton = 'Santa Elena', lat = -1.9795656, lng = -80.7524336
WHERE id = '083dbd6a-06d8-4d20-88e3-1540e35e82b0';

-- Corregir registro: DHARMA BEACH Hotel
UPDATE public.charging_points 
SET province = 'Santa Elena', city_or_canton = 'Santa Elena', lat = -1.8252003, lng = -80.7541495
WHERE id = '1c83e20b-f7a6-43a1-a95b-4974e33b1ce5';

-- Corregir registro: Plaza La Quadra
UPDATE public.charging_points 
SET province = 'Manabí', city_or_canton = 'Ecuador (EEZ)', lat = -0.9456396, lng = -81.9063377
WHERE id = '43342cb9-3d7c-4168-8316-99ba8a944887';

-- Corregir registro: Cerro Lobo
UPDATE public.charging_points 
SET province = 'Manabí', city_or_canton = 'Puerto López', lat = -1.706744, lng = -80.7978054
WHERE id = '667a4684-4977-4430-98a9-0efcc6bd4388';

-- Eliminar fila de encabezado inválida: NOMBRE DEL PUNTO
DELETE FROM public.charging_points WHERE id = 'f42e8d18-7ab9-4774-b76f-173735aacfd7';

-- Corregir registro: BYD Sangolquí
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Sangolquí', lat = -0.3455378, lng = -78.4509215
WHERE id = '5a2d8bab-ef15-43ce-bbf0-b173f0ef5d8f';

-- Corregir registro: Burger King Cumbayá — EVINKA CONECT
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = -0.1954441, lng = -78.4475184
WHERE id = '82d621bd-60f7-4195-9679-ae50188b1ddf';

-- Corregir registro: Scala Shopping Mall
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = -0.2019853, lng = -78.4610634
WHERE id = '35e218a1-6ed1-4556-9cc1-4e7ef3235cdb';

-- Corregir registro: La Tejeadora
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = -0.2060792, lng = -78.4281647
WHERE id = 'd63289e8-8861-4fef-a6ec-1b60b01469f5';

-- Corregir registro: BYD Cumbayá
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = -0.1978221, lng = -78.4391145
WHERE id = '31424930-4291-49fa-b5eb-ffedb867e6a6';

-- Corregir registro: BYD en Valle de los Chillos — San Rafael
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = -0.2023123, lng = -78.6312406
WHERE id = 'ec3cbce4-a1be-4208-8b9b-1ac805cf7657';

-- Corregir registro: Burger King Valle Chillos — EVINKA CONECT
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = -0.294309, lng = -78.45129
WHERE id = 'faf988a1-1b6a-4ff9-b116-0a5af4e9333e';

-- Corregir registro: Supermaxi San Bartolo — CONDOR CHARGE
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = -0.2736051, lng = -78.5479471
WHERE id = '4a0d7dd0-8f87-41e7-849c-8452c32d047d';

-- Corregir registro: Supermaxi La Cerámica
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = -0.2153406, lng = -78.411815
WHERE id = '661c0176-b6e0-448a-b134-a946466a6d41';

-- Corregir registro: Tomacorriente Tipo Chino
UPDATE public.charging_points 
SET province = 'Tungurahua', city_or_canton = 'Píllaro', lat = -1.170751, lng = -78.545616
WHERE id = '71b5ebf2-cac9-40d8-afa5-c7db653e7d01';

-- Corregir registro: Hostería Andaluza
UPDATE public.charging_points 
SET province = 'Chimborazo', city_or_canton = 'Guano', lat = -1.5383734, lng = -78.7352718
WHERE id = '08cb80f7-ce09-4280-b123-9c2c943f39a3';

-- Corregir registro: Gasolinera Primax
UPDATE public.charging_points 
SET province = 'Chimborazo', city_or_canton = 'Cajabamba', lat = -1.7258022, lng = -78.7635487
WHERE id = 'f2a693cb-bf66-4711-8656-440488552596';

-- Corregir registro: Mestizo Restaurant
UPDATE public.charging_points 
SET province = 'Azuay', city_or_canton = 'Cuenca', lat = -2.7582503, lng = -79.401931
WHERE id = 'ae3880d5-24af-4229-89b7-d53c26580f4e';

-- Corregir registro: Vulcanizadora
UPDATE public.charging_points 
SET province = 'Cañar', city_or_canton = 'Canar', lat = -2.57094, lng = -78.9337916
WHERE id = 'd3e60fc0-61f6-4474-8b11-e3cf4554e6ba';

-- Corregir registro: Estación de Servicio Los Arrayanes
UPDATE public.charging_points 
SET province = 'Bolívar', city_or_canton = 'San Miguel', lat = -1.8050354, lng = -79.0909551
WHERE id = '95daed10-3c5d-42e9-924d-469b980b8e65';

-- Corregir registro: Vulcanizadora cerca Gasolinera PSP
UPDATE public.charging_points 
SET province = 'Bolívar', city_or_canton = 'San Miguel', lat = -1.710272, lng = -79.047983
WHERE id = '93d1bcee-38e2-432c-8897-275a34a841df';

-- Eliminar fila de encabezado inválida: NOMBRE DEL PUNTO
DELETE FROM public.charging_points WHERE id = 'b9487380-c991-40ab-8768-ded89b55315c';

-- Corregir registro: Hamadryade Lodge Hotel
UPDATE public.charging_points 
SET province = 'Napo', city_or_canton = 'Tena', lat = -1.0349355, lng = -77.7287603
WHERE id = 'aadf828a-f705-492c-9935-119678cf69fb';

-- Eliminar fila de encabezado inválida: VELOCIDAD
DELETE FROM public.charging_points WHERE id = '3494964f-5ee4-44cd-9f02-e68a0d8dda9d';

-- Corregir registro: 🟡 NORMAL
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Quito', lat = NULL, lng = NULL
WHERE id = 'a6ec1161-d06c-4bc9-a2af-5a0dd4a5d2e6';

-- Corregir registro: 🟡 NORMAL
UPDATE public.charging_points 
SET province = 'Pichincha', city_or_canton = 'Mejía', lat = NULL, lng = NULL
WHERE id = '15a79f0e-63de-40ee-b8d2-ffa2ece23e38';

-- Corregir registro: 🟡 NORMAL
UPDATE public.charging_points 
SET province = 'Cotopaxi', city_or_canton = 'Latacunga', lat = NULL, lng = NULL
WHERE id = 'cd12801b-f35f-4794-bf5b-fed99c87519f';

-- Corregir registro: 🟢 RÁPIDA
UPDATE public.charging_points 
SET province = 'Tungurahua', city_or_canton = 'Ambato', lat = NULL, lng = NULL
WHERE id = '5919ad5d-cbd5-4906-a369-f1e0f09f561f';

-- Corregir registro: 🟢 RÁPIDA
UPDATE public.charging_points 
SET province = 'Tungurahua', city_or_canton = 'Pelileo', lat = NULL, lng = NULL
WHERE id = '24e8c0b2-7a34-42b8-a43d-82bafde20dc9';

-- Corregir registro: 🟡 NORMAL
UPDATE public.charging_points 
SET province = 'Chimborazo', city_or_canton = 'Pallatanga', lat = NULL, lng = NULL
WHERE id = '43982f97-7973-4f85-9f1e-5148ab28dc42';

-- Corregir registro: 🟡 NORMAL
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Bucay', lat = NULL, lng = NULL
WHERE id = '6dfc4e57-0fb4-4b5b-87b7-d4ab32e200c8';

-- Corregir registro: 🟡 NORMAL
UPDATE public.charging_points 
SET province = 'Los Ríos', city_or_canton = 'Buena Fe', lat = NULL, lng = NULL
WHERE id = '94e7f772-fa3b-4688-ab5d-e00fcb88b928';

-- Corregir registro: 🟢 RÁPIDA
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Guayaquil', lat = NULL, lng = NULL
WHERE id = '82ebabb1-c1e9-44a7-b84b-3019b108cdbe';

-- Corregir registro: 🟢 RÁPIDA
UPDATE public.charging_points 
SET province = 'Guayas', city_or_canton = 'Guayaquil', lat = NULL, lng = NULL
WHERE id = '4267369f-fb98-493a-8848-1862ed30db5e';

