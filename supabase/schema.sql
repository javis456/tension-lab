-- ============================================================
-- Tension Lab by Mensin Tennis — Supabase schema + seed data
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once (it won't duplicate rows or wipe accounts).
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strings (
  id         SERIAL PRIMARY KEY,
  brand      TEXT NOT NULL,
  name       TEXT NOT NULL,
  material   TEXT NOT NULL,
  geo        TEXT NOT NULL,
  gauges     JSONB NOT NULL,
  tier       TEXT NOT NULL DEFAULT '$$',
  known_for  TEXT NOT NULL DEFAULT '',
  claim      TEXT NOT NULL DEFAULT '',
  ratings    JSONB NOT NULL,
  price_usd  REAL NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rackets (
  id         SERIAL PRIMARY KEY,
  slug       TEXT,
  brand      TEXT NOT NULL,
  name       TEXT NOT NULL,
  ver        TEXT NOT NULL DEFAULT '',
  year       INTEGER,
  mains      INTEGER NOT NULL DEFAULT 16,
  crosses    INTEGER NOT NULL DEFAULT 19,
  head_size  INTEGER NOT NULL DEFAULT 100,
  ra         INTEGER NOT NULL DEFAULT 66,
  weight     INTEGER,
  char_label TEXT NOT NULL DEFAULT '',
  known_for  TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS setups (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  config     JSONB NOT NULL,
  scores     JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- seed: strings ----
INSERT INTO strings (id,brand,name,material,geo,gauges,tier,known_for,claim,ratings,price_usd) VALUES
  (1,'Babolat','VS Touch','gut','round','[1.3,1.25]','$$$$','The reference natural gut — the softest, liveliest string made, and the gold standard for comfort and tension stability.','Claims elite power, sensitivity and tension maintenance from a high-grade cow-gut construction.','{"pw":90,"co":66,"sp":52,"cf":97,"fe":95,"du":42,"tm":94}',44),
  (2,'Wilson','Natural Gut','gut','round','[1.3,1.35]','$$$$','Federer''s mains string. Explosive pocketing power with huge comfort; the classic gut half of a gut/poly hybrid.','Claims maximum power, feel and shock absorption.','{"pw":91,"co":64,"sp":50,"cf":96,"fe":93,"du":44,"tm":93}',42),
  (3,'Luxilon','Natural Gut','gut','round','[1.3,1.25]','$$$$','Premium gut tuned to pair with Luxilon polys in hybrids — a touch crisper than most guts.','Claims tour-level power with reliable tension maintenance.','{"pw":89,"co":68,"sp":53,"cf":94,"fe":91,"du":45,"tm":92}',36),
  (4,'Tecnifibre','X-One Biphase','multi','round','[1.3,1.24,1.18]','$$$','The premium ''gut-alternative'' multi — arm-friendly power that many use as the soft half of a hybrid.','Claims gut-like comfort and power with better value and durability.','{"pw":85,"co":58,"sp":47,"cf":90,"fe":82,"du":52,"tm":72}',30),
  (5,'Wilson','NXT','multi','round','[1.3,1.24]','$$','A benchmark comfort multi — plush, powerful, forgiving. A go-to for players with arm issues.','Claims premium comfort and power close to natural gut.','{"pw":83,"co":57,"sp":46,"cf":89,"fe":79,"du":54,"tm":68}',17),
  (6,'Wilson','Sensation','multi','round','[1.3,1.28]','$$','A softer, all-day comfort multi at a friendlier price.','Claims soft, cushioned feel for touch and comfort.','{"pw":80,"co":56,"sp":45,"cf":90,"fe":78,"du":50,"tm":66}',19),
  (7,'Head','Velocity MLT','multi','round','[1.3,1.25]','$$','A well-rounded comfort multi that balances feel and durability better than most.','Claims lively power with all-court comfort.','{"pw":82,"co":58,"sp":47,"cf":87,"fe":80,"du":56,"tm":69}',14),
  (8,'Tecnifibre','NRG2','multi','round','[1.32,1.24]','$$','An ultra-soft multi prized for shock absorption and touch.','Claims maximum comfort and elasticity.','{"pw":83,"co":55,"sp":45,"cf":92,"fe":83,"du":49,"tm":67}',19),
  (9,'Yonex','Rexis','multi','round','[1.3,1.25]','$$','A modern comfort multi with a crisp, controlled feel unusual for the category.','Claims soft comfort with more control than typical multis.','{"pw":80,"co":61,"sp":47,"cf":86,"fe":80,"du":53,"tm":68}',19),
  (10,'Babolat','Xcel','multi','round','[1.3,1.25]','$$$','A powerful, cushioned multi favored by comfort-seeking club players.','Claims high power and comfort with a soft response.','{"pw":84,"co":56,"sp":46,"cf":90,"fe":80,"du":52,"tm":69}',16),
  (11,'Prince','Premier Touch','multi','round','[1.3,1.25]','$$$','One of the plushest multis available — pure touch and arm comfort.','Claims exceptional softness and feel.','{"pw":82,"co":55,"sp":45,"cf":93,"fe":84,"du":48,"tm":66}',22),
  (12,'Dunlop','Silk','multi','round','[1.3,1.25]','$$','A soft, silky multi aimed squarely at comfort players.','Claims smooth, comfortable power.','{"pw":81,"co":56,"sp":45,"cf":89,"fe":79,"du":51,"tm":66}',19),
  (13,'Prince','Synthetic Gut w/ Duraflex','syn','round','[1.3,1.25]','$','The default value string — a dependable, do-everything nylon most shops sell by the reel.','Claims all-round performance and durability for the price.','{"pw":70,"co":64,"sp":51,"cf":71,"fe":66,"du":70,"tm":60}',5),
  (14,'Wilson','Synthetic Gut Power','syn','round','[1.3,1.25]','$','The classic beginner/intermediate all-rounder — cheap, reliable, no drama.','Claims balanced power and durability.','{"pw":71,"co":63,"sp":50,"cf":70,"fe":64,"du":69,"tm":59}',5),
  (15,'Gosen','OG-Sheep Micro','syn','round','[1.3,1.25]','$','A cult-favorite budget nylon known for punching above its price on feel.','Claims soft feel and good value.','{"pw":70,"co":63,"sp":50,"cf":73,"fe":67,"du":67,"tm":60}',5),
  (16,'Luxilon','ALU Power','poly','round','[1.25,1.3,1.2]','$$$','The most-used poly in pro tennis — the benchmark for crisp, connected control with just enough pop.','Claims precision, control and a lively response with an aluminium-infused co-poly.','{"pw":56,"co":88,"sp":76,"cf":44,"fe":66,"du":80,"tm":52}',20),
  (17,'Luxilon','4G','poly','round','[1.25,1.3]','$$$','The tension-maintenance king — holds its stringbed stiffness longer than almost anything.','Claims class-leading tension stability and durability.','{"pw":52,"co":90,"sp":74,"cf":38,"fe":60,"du":88,"tm":78}',18),
  (18,'Yonex','Poly Tour Pro','poly','round','[1.25,1.3,1.2]','$$','An unusually arm-friendly poly — smooth and comfortable while still controlled.','Claims a softer, more comfortable poly response.','{"pw":58,"co":82,"sp":72,"cf":58,"fe":66,"du":76,"tm":56}',15),
  (19,'Yonex','Poly Tour Strike','poly','round','[1.25,1.2]','$$','A firmer, more precise poly for flat, aggressive hitters who want a locked-in bed.','Claims direct, controlled power for hard hitters.','{"pw":55,"co":86,"sp":70,"cf":46,"fe":64,"du":80,"tm":55}',16),
  (20,'Tecnifibre','Razor Code','poly','round','[1.25,1.3,1.2]','$$','A control poly with surprising comfort — a favorite for players who find most polys too harsh.','Claims control and durability with a softer, arm-friendly feel.','{"pw":57,"co":84,"sp":73,"cf":56,"fe":67,"du":78,"tm":55}',15),
  (21,'Solinco','Confidential','polysoft','round','[1.25,1.2]','$$','Solinco''s softest control poly — precise but easier on the arm than Tour Bite.','Claims premium control with a comfortable, muted feel.','{"pw":56,"co":85,"sp":74,"cf":58,"fe":66,"du":78,"tm":56}',17),
  (22,'Head','Lynx Tour','poly','round','[1.25,1.3]','$$','A smooth, controlled all-round poly used by many Head-sponsored pros as a base.','Claims a blend of control, comfort and spin.','{"pw":57,"co":83,"sp":73,"cf":52,"fe":65,"du":78,"tm":55}',13),
  (23,'Head','Hawk Touch','polysoft','round','[1.3,1.25,1.2]','$$','A soft, comfort-oriented poly for players stepping up from multifilament.','Claims poly control with multifilament-like comfort.','{"pw":60,"co":80,"sp":71,"cf":62,"fe":68,"du":72,"tm":54}',12),
  (24,'Luxilon','Element','polysoft','round','[1.25,1.3]','$$$','Luxilon''s soft, warm poly — control with noticeably more give for sensitive arms.','Claims a softer, more comfortable poly with good spin.','{"pw":60,"co":80,"sp":72,"cf":64,"fe":69,"du":74,"tm":55}',19),
  (25,'Isospeed','Cream','polysoft','round','[1.2,1.25]','$$','One of the softest polys on the market — famous for comfort with real spin.','Claims elite comfort for a co-poly with strong spin.','{"pw":62,"co":78,"sp":75,"cf":68,"fe":70,"du":70,"tm":52}',16),
  (26,'Weiss Cannon','Silverstring','poly','round','[1.25,1.2]','$$','A thin, crisp control poly beloved by string enthusiasts for its clean pocketing.','Claims precise control and comfortable crispness.','{"pw":56,"co":85,"sp":73,"cf":50,"fe":70,"du":74,"tm":53}',11),
  (27,'Babolat','RPM Blast','polyspin','shaped','[1.25,1.3,1.2,1.35]','$$$','Nadal''s string. An octagonal spin monster — heavy topspin, aggressive control, firm feel.','Claims maximum spin and control from a shaped, low-friction co-poly.','{"pw":54,"co":85,"sp":90,"cf":42,"fe":62,"du":80,"tm":50}',18),
  (28,'Solinco','Hyper-G','polyspin','shaped','[1.25,1.2,1.15,1.3]','$$','A cult-favorite spin/control poly — bright green, biting spin, easy on the wallet.','Claims elite spin and control with a soft-for-poly feel.','{"pw":56,"co":86,"sp":88,"cf":50,"fe":64,"du":78,"tm":54}',14),
  (29,'Solinco','Tour Bite','polyspin','shaped','[1.25,1.2,1.15]','$$','A square-shaped, ultra-biting spin string for players who swing fast and hard.','Claims maximum spin and razor control.','{"pw":52,"co":87,"sp":92,"cf":40,"fe":60,"du":82,"tm":50}',14),
  (30,'Luxilon','ALU Power Rough','polyspin','textured','[1.25,1.3]','$$$','The textured ALU — the crosses in many pro hybrids (incl. reported Federer/Djokovic setups) for extra bite.','Claims ALU control with added spin from a roughened surface.','{"pw":55,"co":87,"sp":82,"cf":44,"fe":65,"du":79,"tm":52}',21),
  (31,'Head','Sonic Pro Edge','polyspin','shaped','[1.25,1.3]','$$','A budget-friendly shaped spin poly with crisp control.','Claims strong spin and control from a co-poly.','{"pw":55,"co":83,"sp":85,"cf":46,"fe":62,"du":78,"tm":52}',16),
  (32,'Tecnifibre','Black Code','polyspin','shaped','[1.28,1.24,1.18]','$$','A pentagonal spin poly with a comfortable edge — spin without the harshest sting.','Claims spin and control with more comfort than most shaped polys.','{"pw":56,"co":83,"sp":86,"cf":52,"fe":64,"du":76,"tm":52}',14),
  (33,'Yonex','Poly Tour Rev','polyspin','shaped','[1.25,1.2,1.15]','$$','A soft-shaped spin poly — big snapback spin with a more comfortable feel.','Claims explosive spin with a smooth response.','{"pw":58,"co":81,"sp":88,"cf":54,"fe":65,"du":72,"tm":52}',16),
  (34,'Volkl','Cyclone','polyspin','shaped','[1.25,1.3,1.2]','$','A gear-shaped spin poly that''s a perennial best-value spin pick.','Claims great spin and control at a low price.','{"pw":55,"co":82,"sp":85,"cf":48,"fe":61,"du":76,"tm":51}',9),
  (35,'MSV','Focus Hex','polyspin','shaped','[1.23,1.18,1.27]','$','A six-sided budget spin poly with a loyal enthusiast following.','Claims strong spin and control at a bargain price.','{"pw":55,"co":83,"sp":86,"cf":47,"fe":62,"du":76,"tm":51}',9),
  (36,'Signum Pro','Hyperion','polyspin','shaped','[1.24,1.29,1.18]','$','A shaped spin poly praised for comfort-to-spin ratio at a low cost.','Claims spin and control with reasonable comfort.','{"pw":56,"co":82,"sp":85,"cf":52,"fe":63,"du":74,"tm":51}',10),
  (37,'Solinco','Barb Wire','polyspin','shaped','[1.25,1.2]','$$','An aggressively-shaped spin string for extreme, heavy topspin games.','Claims tour-level spin and bite.','{"pw":52,"co":85,"sp":91,"cf":42,"fe":61,"du":80,"tm":50}',16),
  (38,'Toroline','Caviar','polyspin','shaped','[1.25,1.2]','$$','A newer enthusiast-darling spin poly with a crisp, snappy response.','Claims high spin and lively control.','{"pw":57,"co":83,"sp":87,"cf":50,"fe":66,"du":74,"tm":53}',12),
  (39,'Diadem','Solstice Power','polyspin','shaped','[1.25,1.3]','$$','A shaped poly that leans a bit more toward pop than most spin strings.','Claims spin and control with added power.','{"pw":60,"co":81,"sp":84,"cf":50,"fe":64,"du":76,"tm":52}',13),
  (40,'Babolat','Pro Hurricane Tour','poly','shaped','[1.25,1.3,1.2]','$$','A durable, firm control poly — the older-school tour workhorse before RPM.','Claims control and durability for aggressive baseliners.','{"pw":53,"co":86,"sp":78,"cf":40,"fe":60,"du":84,"tm":53}',15),
  (41,'Kirschbaum','Pro Line Evolution','poly','round','[1.25,1.3]','$','A dependable, firm control poly popular with stringers for value and consistency.','Claims durable control at a low price.','{"pw":54,"co":85,"sp":74,"cf":44,"fe":62,"du":82,"tm":54}',11),
  (42,'Ashaway','Kevlar','kevlar','round','[1.2,1.1]','$$','For chronic string-breakers only — nearly indestructible, extremely stiff, almost always used as hybrid mains.','Claims the ultimate durability for players who shred everything else.','{"pw":34,"co":90,"sp":56,"cf":14,"fe":40,"du":99,"tm":32}',13),
  (43,'Ashaway','MonoGut ZX','zyex','round','[1.27,1.22]','$$','A rare non-poly monofilament — soft and durable, a comfort control option for arm-sensitive players.','Claims poly-like control and durability with far more comfort.','{"pw":68,"co":74,"sp":60,"cf":80,"fe":72,"du":84,"tm":76}',17),
  (44,'Grapplesnake','Tour M8','polyspin','shaped','[1.25,1.3]','$$','TennCom''s top-ranked all-rounder. An octagonal control poly that''s soft-yet-crisp, hugely durable, and does everything at an 8/10 level.','Claims elite tension maintenance and snapback longevity with a plush-but-connected feel.','{"pw":57,"co":86,"sp":83,"cf":60,"fe":72,"du":86,"tm":68}',14),
  (45,'Grapplesnake','Tour Sniper','polyspin','shaped','[1.25,1.3]','$$','A pentagonal control poly billed as a softer, shaped ALU Power — comes partially pre-stretched so it barely loses tension.','Claims silky feel, low launch and control ''to the max'' with minimal notching.','{"pw":54,"co":89,"sp":80,"cf":56,"fe":69,"du":80,"tm":66}',14),
  (46,'Grapplesnake','Alpha','polysoft','shaped','[1.25]','$$','Tour Sniper''s softer ''sister'' — a little more power and give while keeping strong directional control.','Claims a softer feel with added power and precise control.','{"pw":60,"co":82,"sp":78,"cf":65,"fe":71,"du":76,"tm":60}',16),
  (47,'Grapplesnake','Tour Mako','polyspin','textured','[1.25]','$$','A round, power-and-feel Tour poly with a mildly abrasive surface for spin and a predictable launch.','Claims new non-metallic additives for feel, durability and spin with a consistent trajectory.','{"pw":64,"co":80,"sp":75,"cf":63,"fe":73,"du":76,"tm":60}',16),
  (48,'Grapplesnake','Soldier','polyspin','shaped','[1.25,1.3]','$$','A sharp seven-sided spin poly for big hitters who want maximum stability and playing life.','Claims class-leading tension maintenance and higher spin than Sniper or M8.','{"pw":54,"co":87,"sp":88,"cf":53,"fe":66,"du":88,"tm":70}',16),
  (49,'Grapplesnake','Paradox Pro','polysoft','round','[1.26]','$$$','A metal-infused ''new generation'' poly that''s counter-intuitively solid, accurate, powerful AND comfortable at once.','Claims a vintage precise feel with unusual comfort, power and durability combined.','{"pw":62,"co":84,"sp":74,"cf":66,"fe":75,"du":84,"tm":64}',25),
  (50,'Tru Pro','Black Knight','polyspin','shaped','[1.25,1.2,1.3]','$$','A muted six-sided control poly with exceptional directional and depth control — softer than most tension-holding polys.','Claims elite control and depth for high-racket-speed players; string a touch lower than usual.','{"pw":50,"co":90,"sp":82,"cf":55,"fe":66,"du":80,"tm":64}',7),
  (51,'Tru Pro','Firewire','polyspin','shaped','[1.3,1.25,1.2]','$$','A triangular red string rated #1 in spin for three years — one of the biggest ball-bites in the industry.','Claims maximum ball bite and tension stability with a crisp but arm-friendly feel.','{"pw":55,"co":82,"sp":93,"cf":52,"fe":64,"du":76,"tm":58}',16),
  (52,'Tru Pro','Ghost Wire','polysoft','round','[1.27,1.22,1.17]','$$','Lab-tested as one of the softest co-polys made — round, slick, and a superb arm-friendly hybrid cross.','Claims super-soft, arm-friendly play with maximum durability and tension stability.','{"pw":64,"co":78,"sp":66,"cf":75,"fe":72,"du":80,"tm":62}',7),
  (53,'Tru Pro','Tour Status','polyspin','shaped','[1.25,1.3]','$$','An eight-sided all-rounder — Tru Pro''s most balanced string for power and control.','Claims a perfectly balanced blend of power, control and spin.','{"pw":57,"co":84,"sp":85,"cf":55,"fe":66,"du":80,"tm":60}',7),
  (54,'Tru Pro','Pure Rush','polysoft','shaped','[1.23]','$$','A lively six-sided poly with extra pop, spin and feel — a softer, more powerful take on Black Knight.','Claims added power, spin and feel with good comfort.','{"pw":64,"co":78,"sp":80,"cf":66,"fe":70,"du":70,"tm":55}',6),
  (55,'Tru Pro','Atomos','polysoft','shaped','[1.25]','$$','A notably plush ''flower-shaped'' spin poly — more spin than Black Knight with standout comfort.','Claims high spin with an unusually plush, comfortable feel.','{"pw":60,"co":80,"sp":84,"cf":66,"fe":72,"du":74,"tm":58}',16),
  (56,'Toroline','O-Toro','polyspin','shaped','[1.23,1.2,1.25]','$$','Toroline''s most popular string — a hexagonal spin poly with above-average comfort and tension maintenance.','Claims the most spin-friendly Toroline profile with comfort and tension hold above the co-poly average.','{"pw":58,"co":82,"sp":86,"cf":61,"fe":68,"du":76,"tm":62}',12),
  (57,'Toroline','O-Toro Tour','polyspin','shaped','[1.23,1.2]','$$','A firmer, control-first O-Toro for big hitters who want precision on full swings.','Claims pinpoint accuracy and control on aggressive cuts.','{"pw":54,"co":87,"sp":84,"cf":53,"fe":66,"du":80,"tm":60}',16),
  (58,'Toroline','Wasabi','polyspin','shaped','[1.23,1.2]','$$','A square, four-edged spin monster that bites hard while staying comfortable for its class.','Claims heavy spin from sharp edges with a comfortable response.','{"pw":56,"co":84,"sp":90,"cf":57,"fe":66,"du":76,"tm":58}',12),
  (59,'Toroline','Wasabi X','polysoft','shaped','[1.23]','$$','A softer, ultra-slick Wasabi — great in a full bed and a top hybrid cross for explosive snapback.','Claims a slick low-friction surface for snapback with a softer feel.','{"pw":60,"co":80,"sp":82,"cf":66,"fe":70,"du":74,"tm":56}',12),
  (60,'Toroline','Toro Toro','polyspin','shaped','[1.23,1.27]','$$','A slick six-sided all-court poly that balances spin and control with a comfortable, lively feel.','Claims a well-rounded spin/control response for all-court play.','{"pw":58,"co":83,"sp":84,"cf":59,"fe":68,"du":76,"tm":60}',12),
  (61,'Toroline','Truffle X','zyex','round','[1.3]','$$$','Toroline''s softest, most elastic string — a breakthrough non-polyester polymer built for comfort and pocketing.','Claims unmatched feel and comfort; pair with a slick poly for plush power and snapback.','{"pw":70,"co":74,"sp":62,"cf":85,"fe":79,"du":78,"tm":74}',16),
  (62,'reString','Zero','polyspin','shaped','[1.25,1.2,1.3]','$$','A hexagonal spin-and-power specialist with a signature snapback coating and best-in-class tension maintenance.','Claims explosive snapback spin and power with superior tension hold.','{"pw":61,"co":80,"sp":88,"cf":56,"fe":68,"du":76,"tm":66}',11),
  (63,'reString','Sync','poly','round','[1.28,1.23,1.2]','$$','A round control string that gets ~80% of ALU Power''s feel with far better durability — a favorite modern hybrid cross.','Claims ALU-like pocketing and crispness with a slick coating for snapback and long life.','{"pw":56,"co":86,"sp":70,"cf":58,"fe":74,"du":82,"tm":70}',12),
  (64,'reString','Vivo','polyspin','shaped','[1.23,1.28]','$$','A firm hexagonal control/spin poly made from recycled polyester — compared favorably to Lynx Tour and Hyper-G.','Claims direct feedback, gripping spin and superior tension hold from a sustainable material.','{"pw":55,"co":85,"sp":82,"cf":54,"fe":66,"du":78,"tm":68}',12),
  (65,'Signum Pro','Firestorm','poly','round','[1.24,1.29]','$','A round, arm-friendly control poly that''s a value-pick base string for comfort-minded players.','Claims comfortable control with reliable durability at a low price.','{"pw":58,"co":82,"sp":70,"cf":60,"fe":66,"du":78,"tm":56}',9),
  (66,'Tourna','Big Hitter Black 7','polyspin','shaped','[1.3,1.25,1.2]','$','A German-made, 7-sided co-poly repeatedly rated among the highest-spin strings ever tested — big bite with mid-range power and a softer-than-usual poly feel.','Claims maximum spin and pinpoint accuracy without the harshness of a stiff poly, at a budget price.','{"pw":56,"co":82,"sp":90,"cf":54,"fe":62,"du":80,"tm":60}',8),
  (67,'Tourna','Big Hitter Silver 7 Tour','polyspin','shaped','[1.3,1.25,1.2]','$','Black 7''s firmer sibling — a 7-sided spin string awarded best-in-class tension maintenance by TWU labs, for players who want spin that holds its stiffness.','Claims elite tension maintenance with top-tier spin and precise control.','{"pw":54,"co":85,"sp":86,"cf":48,"fe":62,"du":84,"tm":74}',9)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('strings','id'), GREATEST((SELECT MAX(id) FROM strings), 1));

-- ---- seed: rackets ----
INSERT INTO rackets (id,slug,brand,name,ver,year,mains,crosses,head_size,ra,weight,char_label,known_for) VALUES
  (1,'generic','—','Generic / not sure','',NULL,16,19,100,66,310,'balanced','A neutral 16×19, medium-stiffness 100 — the average modern racket. Pick your real frame for a sharper read.'),
  (2,'rf97','Wilson','Pro Staff RF97','Autograph',2019,16,19,97,68,357,'control, heavy','Federer''s successor line — a heavy, plush control stick. Roger Federer''s signature frame.'),
  (3,'ps97v14','Wilson','Pro Staff 97','v14',2023,16,19,97,66,340,'control & feel','A thin-beam control classic that rewards a full swing.'),
  (4,'pa2019','Babolat','Pure Aero','',2019,16,19,100,69,300,'spin & power','An aerodynamic spin-and-power frame built to launch heavy topspin. Rafael Nadal''s spin weapon.'),
  (5,'speedmp2022','Head','Speed MP','Auxetic',2022,16,19,100,64,320,'all-court','A fast, balanced all-court frame — spin, control and comfort together.'),
  (6,'blade98_19_v7','Wilson','Blade 98 16×19','v7',2019,16,19,98,62,305,'flexible control','The popular control frame — flexible feel and precise placement.'),
  (7,'blade98_19_v8','Wilson','Blade 98 16×19','v8',2021,16,19,98,62,305,'flexible control','The popular control frame — flexible feel and precise placement.'),
  (8,'pa2026','Babolat','Pure Aero','',2026,16,19,100,67,300,'spin & power','An aerodynamic spin-and-power frame built to launch heavy topspin.'),
  (9,'pa98_2026','Babolat','Pure Aero 98','',2026,16,20,98,66,305,'spin & control','A compact 16×20 Aero — spin plus control for fast, advanced swingers. Carlos Alcaraz''s frame.'),
  (10,'pa2023','Babolat','Pure Aero','',2023,16,19,100,67,300,'spin & power','An aerodynamic spin-and-power frame built to launch heavy topspin.'),
  (11,'paplus2026','Babolat','Pure Aero Plus','',2026,16,19,100,68,300,'spin & power','An aerodynamic spin-and-power frame built to launch heavy topspin.'),
  (12,'paplus2023','Babolat','Pure Aero Plus','',2023,16,19,100,68,300,'spin & power','An aerodynamic spin-and-power frame built to launch heavy topspin.'),
  (13,'pateam2023','Babolat','Pure Aero Team','',2023,16,19,100,65,285,'spin & power','An aerodynamic spin-and-power frame built to launch heavy topspin.'),
  (14,'pd2025','Babolat','Pure Drive','',2025,16,19,100,69,300,'power','A benchmark power frame — effortless pace that pairs well with a control poly.'),
  (15,'pd98_2025','Babolat','Pure Drive 98','',2025,16,19,98,68,305,'power','A benchmark power frame — effortless pace that pairs well with a control poly.'),
  (16,'pdplus2025','Babolat','Pure Drive Plus','',2025,16,19,100,70,300,'power','A benchmark power frame — effortless pace that pairs well with a control poly.'),
  (17,'ps16x20_2024','Babolat','Pure Strike 100 16×20','',2024,16,20,100,66,305,'control-power','A crisp control-power frame for aggressive, first-strike baseline tennis.'),
  (18,'ps100_2024','Babolat','Pure Strike 100','',2024,16,19,100,67,300,'control-power','A crisp control-power frame for aggressive, first-strike baseline tennis.'),
  (19,'ps97_2024','Babolat','Pure Strike 97','',2024,16,19,97,66,310,'control-power','A crisp control-power frame for aggressive, first-strike baseline tennis.'),
  (20,'ps98_19_2024','Babolat','Pure Strike 98 16×19','',2024,16,19,98,66,305,'control-power','A crisp control-power frame for aggressive, first-strike baseline tennis.'),
  (21,'ps98_20_2024','Babolat','Pure Strike 98 18×20','',2024,18,20,98,65,305,'control-power','A crisp control-power frame for aggressive, first-strike baseline tennis.'),
  (22,'fx500','Dunlop','FX 500','',NULL,16,19,100,68,300,'power-spin','A lively, forgiving power-spin tweener.'),
  (23,'fx500tour','Dunlop','FX 500 Tour','',NULL,16,18,100,67,305,'power-spin','A lively, forgiving power-spin tweener.'),
  (24,'cx200_18_le','Dunlop','CX 200 18×20 LE','',NULL,18,20,98,64,305,'control','A clean, precise control frame for flatter, accurate hitters.'),
  (25,'cx400tour','Dunlop','CX 400 Tour','',NULL,16,19,100,66,300,'control','A clean, precise control frame for flatter, accurate hitters.'),
  (26,'cx200_2024','Dunlop','CX 200','',2024,16,19,98,65,305,'control','A clean, precise control frame for flatter, accurate hitters.'),
  (27,'cx200tour19_2024','Dunlop','CX 200 Tour 16×19','',2024,16,19,95,63,320,'control','A clean, precise control frame for flatter, accurate hitters.'),
  (28,'cx200tour20','Dunlop','CX 200 Tour 18×20','',NULL,18,20,95,62,320,'control','A clean, precise control frame for flatter, accurate hitters.'),
  (29,'sx300tour_2025','Dunlop','SX 300 Tour','',2025,16,19,100,66,315,'spin','A grippy, launch-friendly spin frame for heavy topspin.'),
  (30,'sx300_2025','Dunlop','SX 300','',2025,16,19,100,69,300,'spin','A grippy, launch-friendly spin frame for heavy topspin.'),
  (31,'boommp_2024','Head','Boom MP','',2024,16,19,100,65,300,'spin-power','A lively, modern spin-power frame with a forgiving, connected feel.'),
  (32,'extreme_g360','Head','Extreme MP','Graphene 360+',2020,16,19,100,64,300,'spin','An open-bed spin frame with a grippy, topspin-friendly response.'),
  (33,'speedmp2024','Head','Speed MP','Auxetic 2.0',2024,16,19,100,62,300,'all-court','A fast, balanced all-court frame — spin, control and comfort together. Jannik Sinner''s base frame.'),
  (34,'speedpro2024','Head','Speed Pro','Auxetic 2.0',2024,18,20,100,63,310,'control','The dense-pattern Speed — heavier and more precise for flatter hitters. From the Djokovic family.'),
  (35,'boompro_2026','Head','Boom Pro','',2026,16,19,100,66,310,'spin-power','A lively, modern spin-power frame with a forgiving, connected feel.'),
  (36,'speedtour','Head','Speed Tour','',NULL,16,19,100,62,315,'all-court','A fast, balanced all-court frame — spin, control and comfort together.'),
  (37,'headsquared','Head','Squared','',NULL,16,19,100,65,300,'all-round','An atypical/older Head frame — specs approximate.'),
  (38,'boompro_2024','Head','Boom Pro','',2024,16,19,100,67,310,'spin-power','A lively, modern spin-power frame with a forgiving, connected feel.'),
  (39,'extrememp_2024','Head','Extreme MP','Auxetic 2.0',2024,16,19,100,63,300,'spin','An open-bed spin frame with a grippy, topspin-friendly response.'),
  (40,'gravitympxl_2025','Head','Gravity MP XL','Auxetic 2.0',2025,16,20,104,61,295,'comfort control','A flexible, comfortable 16×20 control frame with a big sweet spot.'),
  (41,'prestigemp_2023','Head','Prestige MP','Auxetic',2023,18,19,99,62,320,'classic control','A dense, flexible control classic for precise, flatter hitters.'),
  (42,'radicaltour_2025','Head','Radical Tour','',2025,16,19,98,63,315,'all-round control','A versatile, comfortable players'' control frame.'),
  (43,'speedmplegend_2025','Head','Speed MP Legend','',2025,16,19,100,62,300,'all-court','A fast, balanced all-court frame — spin, control and comfort together.'),
  (44,'speedprolegend_2025','Head','Speed Pro Legend','',2025,18,20,100,63,310,'control','The dense-pattern Speed — heavier and more precise for flatter hitters.'),
  (45,'radicalpro_2023','Head','Radical Pro','Auxetic',2023,16,19,98,66,315,'all-round control','A versatile, comfortable players'' control frame.'),
  (46,'extremepro_2024','Head','Extreme Pro','Auxetic 2.0',2024,16,19,100,65,315,'spin','An open-bed spin frame with a grippy, topspin-friendly response.'),
  (47,'gravitymp_2025','Head','Gravity MP','Auxetic 2.0',2025,16,20,100,61,300,'comfort control','A flexible, comfortable 16×20 control frame with a big sweet spot.'),
  (48,'gravitypro_2025','Head','Gravity Pro','Auxetic 2.0',2025,18,20,100,61,325,'comfort control','A flexible, comfortable 16×20 control frame with a big sweet spot.'),
  (49,'gravitytour_2025','Head','Gravity Tour','Auxetic 2.0',2025,16,20,100,62,310,'comfort control','A flexible, comfortable 16×20 control frame with a big sweet spot.'),
  (50,'prestigempl_2023','Head','Prestige MP L','Auxetic',2023,18,19,99,61,305,'classic control','A dense, flexible control classic for precise, flatter hitters.'),
  (51,'prestigepro_2023','Head','Prestige Pro','Auxetic',2023,18,20,98,63,320,'classic control','A dense, flexible control classic for precise, flatter hitters.'),
  (52,'prestigetour_2023','Head','Prestige Tour','Auxetic',2023,18,20,95,62,315,'classic control','A dense, flexible control classic for precise, flatter hitters.'),
  (53,'radicalmp_2025','Head','Radical MP','',2025,16,19,98,64,300,'all-round control','A versatile, comfortable players'' control frame.'),
  (54,'radicalpro_2025','Head','Radical Pro','',2025,16,19,98,66,315,'all-round control','A versatile, comfortable players'' control frame.'),
  (55,'acrospeed300','Mizuno','Acrospeed 300','',NULL,16,19,100,66,300,'spin-power','Mizuno''s whippy, lively spin-power frame.'),
  (56,'acrostrike305','Mizuno','Acrostrike 305','',NULL,16,19,98,65,305,'control-power','Mizuno''s stable, precise control-power frame.'),
  (57,'ats_tour98','Prince','ATS Textreme Tour 98','',NULL,16,19,98,63,310,'control','A players'' control frame with a clean, connected response.'),
  (58,'phantom100p_2024','Prince','Phantom 100P','',2024,18,20,100,60,305,'flexible feel','An ultra-flexible control frame prized for touch and comfort.'),
  (59,'phantom100x_305','Prince','Phantom 100X 305g','',NULL,16,18,100,63,305,'flexible feel','An ultra-flexible control frame prized for touch and comfort.'),
  (60,'phantom107g_2024','Prince','Phantom 107G','',2024,16,19,107,59,283,'flexible feel','An ultra-flexible control frame prized for touch and comfort.'),
  (61,'ripcord98xs','Prince','Ripcord 98 XS','',NULL,16,19,98,65,300,'spin-power','An open, lively spin-power frame for aggressive baseliners.'),
  (62,'ats_tour100_310','Prince','ATS Textreme Tour 100','310',NULL,16,18,100,64,310,'control','A players'' control frame with a clean, connected response.'),
  (63,'ats_tour100p','Prince','ATS Textreme Tour 100P','',NULL,18,20,100,63,310,'control','A players'' control frame with a clean, connected response.'),
  (64,'o3phantom100x_310','Prince','O3 Phantom 100X','310g',NULL,16,18,100,62,310,'flexible feel','An ultra-flexible control frame prized for touch and comfort.'),
  (65,'phantom100x_20_2024','Prince','Phantom 100X 18×20','',2024,18,20,100,61,310,'flexible feel','An ultra-flexible control frame prized for touch and comfort.'),
  (66,'phantom100x_290','Prince','Phantom 100X 290','',NULL,16,18,100,62,290,'flexible feel','An ultra-flexible control frame prized for touch and comfort.'),
  (67,'ripcord100_300','Prince','Ripcord 100 300g','',NULL,16,19,100,67,300,'spin-power','An open, lively spin-power frame for aggressive baseliners.'),
  (68,'ripstick100_300','Prince','Ripstick 100 300g','',NULL,16,19,100,68,300,'spin-power','An open, lively spin-power frame for aggressive baseliners.'),
  (69,'ripstick98','Prince','Ripstick 98','',NULL,16,19,98,66,305,'spin-power','An open, lively spin-power frame for aggressive baseliners.'),
  (70,'blackacepro','ProKennex','Black Ace Pro','',NULL,16,19,98,64,320,'comfort control','A Kinetic-damped frame famous for arm comfort with control.'),
  (71,'kineticpro7g','ProKennex','Kinetic Pro 7G','',NULL,16,19,95,60,325,'comfort control','A Kinetic-damped frame famous for arm comfort with control.'),
  (72,'blackace315','ProKennex','Black Ace 315','',NULL,16,19,98,63,315,'comfort control','A Kinetic-damped frame famous for arm comfort with control.'),
  (73,'blackace300','ProKennex','Black Ace 300','',NULL,16,19,98,63,300,'comfort control','A Kinetic-damped frame famous for arm comfort with control.'),
  (74,'whiteout305_20_v2','Solinco','Whiteout 305 XTD 18×20 v2','',NULL,18,20,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (75,'blackout300_v2','Solinco','Blackout 300 v2','',NULL,16,19,100,67,300,'spin-power','Solinco''s open, explosive spin-power frame.'),
  (76,'blackout300xtd_v2','Solinco','Blackout 300 XTD v2','',NULL,16,19,100,67,300,'spin-power','Solinco''s open, explosive spin-power frame.'),
  (77,'whiteout305_v2camo','Solinco','Whiteout 305 v2 Camo','',NULL,16,19,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (78,'blackout300xtdplus','Solinco','Blackout 300 XTD+','',NULL,16,19,100,68,300,'spin-power','Solinco''s open, explosive spin-power frame.'),
  (79,'whiteout305_20','Solinco','Whiteout 305 XTD 18×20','',NULL,18,20,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (80,'whiteout305_20plain','Solinco','Whiteout 305 18×20','',NULL,18,20,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (81,'blackout300','Solinco','Blackout 300','',NULL,16,19,100,67,300,'spin-power','Solinco''s open, explosive spin-power frame.'),
  (82,'whiteout305','Solinco','Whiteout 305','',NULL,16,19,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (83,'whiteout305xtd','Solinco','Whiteout 305 XTD','',NULL,16,19,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (84,'blackout300xtd','Solinco','Blackout 300 XTD','',NULL,16,19,100,67,300,'spin-power','Solinco''s open, explosive spin-power frame.'),
  (85,'whiteout305xtdplus','Solinco','Whiteout 305 XTD+','',NULL,16,19,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (86,'whiteout305xtd_v2','Solinco','Whiteout 305 XTD v2','',NULL,16,19,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (87,'whiteout305_20camo_v2','Solinco','Whiteout 305 18×20 Camo v2','',NULL,18,20,98,65,305,'control','Solinco''s firm, precise players'' control frame.'),
  (88,'tfight315s','Tecnifibre','TFight 315S','',NULL,16,19,98,66,320,'control-power','A stable control-power frame from the TFight line (Medvedev family).'),
  (89,'tfight300s','Tecnifibre','TFight 300S','',NULL,16,19,98,65,305,'control-power','A stable control-power frame from the TFight line (Medvedev family).'),
  (90,'tfight305s','Tecnifibre','TFight 305S','',NULL,16,19,98,66,315,'control-power','A stable control-power frame from the TFight line (Medvedev family). Daniil Medvedev''s line.'),
  (91,'tfight300','Tecnifibre','TFight 300','',NULL,18,20,98,64,305,'control','A dense, precise control frame with a classic feel.'),
  (92,'tf40_290','Tecnifibre','TF40 290g','',NULL,16,19,98,63,290,'control','A dense, precise control frame with a classic feel.'),
  (93,'fire300','Tecnifibre','Fire 300','',NULL,16,19,100,69,300,'power-spin','Tecnifibre''s easy power-and-spin frame.'),
  (94,'fire305s','Tecnifibre','Fire 305S','',NULL,16,19,100,68,305,'power-spin','Tecnifibre''s easy power-and-spin frame.'),
  (95,'vostrav1mp','Volkl','Vostra V1 MP','',NULL,16,19,100,68,300,'power-comfort','A comfortable, lively Volkl frame.'),
  (96,'vostrav1pro','Volkl','Vostra V1 Pro','',NULL,16,19,100,70,315,'power-comfort','A comfortable, lively Volkl frame.'),
  (97,'vcellv1pro','Volkl','V-Cell V1 Pro','',NULL,16,19,100,69,315,'power-comfort','A comfortable, lively Volkl frame.'),
  (98,'vfeelv8pro','Volkl','V-Feel V8 Pro','',NULL,16,19,100,64,320,'comfort','A plush, arm-friendly Volkl comfort frame.'),
  (99,'vostrav10_300','Volkl','Vostra V10 300g','',NULL,16,19,100,66,300,'power-comfort','A comfortable, lively Volkl frame.'),
  (100,'vostrav10_320','Volkl','Vostra V10 320g','',NULL,16,19,100,66,320,'power-comfort','A comfortable, lively Volkl frame.'),
  (101,'vostra7','Volkl','Vostra 7','',NULL,16,19,100,67,300,'power-comfort','A comfortable, lively Volkl frame.'),
  (102,'vostrav8_300','Volkl','Vostra V8 300g','',NULL,16,19,100,66,300,'power-comfort','A comfortable, lively Volkl frame.'),
  (103,'vostra8_315','Volkl','Vostra 8 315g','',NULL,16,19,100,66,315,'power-comfort','A comfortable, lively Volkl frame.'),
  (104,'vostrav9_290','Volkl','Vostra V9 290g','',NULL,16,19,100,67,290,'power-comfort','A comfortable, lively Volkl frame.'),
  (105,'vostrav9_305','Volkl','Vostra V9 305g','',NULL,16,19,100,67,305,'power-comfort','A comfortable, lively Volkl frame.'),
  (106,'c10pro_2022','Volkl','C10 Pro','',2022,16,19,100,61,325,'flexible control','A super-flexible classic — plush comfort and heavy plow-through.'),
  (107,'vcell10_300','Volkl','V-Cell 10 300g','',NULL,16,19,100,65,300,'comfort','A plush, arm-friendly Volkl comfort frame.'),
  (108,'vcell10_320','Volkl','V-Cell 10 320g','',NULL,16,19,100,65,320,'comfort','A plush, arm-friendly Volkl comfort frame.'),
  (109,'v1evo','Volkl','V1 Evo','',NULL,16,19,102,65,285,'power-comfort','A comfortable, lively Volkl frame.'),
  (110,'bladepro98_19_v9','Wilson','Blade Pro 98 16×19','v9',2024,16,19,98,62,322,'flexible control','The popular control frame — flexible feel and precise placement.'),
  (111,'hyperhammer53','Wilson','Hyper Hammer 5.3 Stretch','',NULL,16,19,110,66,262,'power (extended)','A light, extended power frame with a big sweet spot.'),
  (112,'blade98_20_v10','Wilson','Blade 98 18×20','v10',2026,18,20,98,61,305,'tight control','The dense-pattern Blade — maximum precision and directional control.'),
  (113,'blade98s_v9','Wilson','Blade 98S','v9',2024,18,16,98,62,305,'spin-control','The 18×16 Blade — an extra-open bed for spin with a control-frame feel.'),
  (114,'bladepro100_v10','Wilson','Blade Pro 100','v10',2026,16,19,100,62,320,'flexible control','The popular control frame — flexible feel and precise placement.'),
  (115,'clash100v3','Wilson','Clash 100','v3',2025,16,19,100,55,295,'ultra-flexible','Famously flexible and arm-friendly — forgiving with almost any string.'),
  (116,'ps97classic','Wilson','Pro Staff 97 Classic','',NULL,16,19,97,66,340,'control & feel','A thin-beam control classic that rewards a full swing.'),
  (117,'ps97v10','Wilson','Pro Staff 97','v10',NULL,16,19,97,66,315,'control & feel','A thin-beam control classic that rewards a full swing.'),
  (118,'shift99','Wilson','Shift 99','v1',2023,16,19,99,60,305,'flexible spin','A bendy, spin-friendly frame with an open bed.'),
  (119,'blade100_v9','Wilson','Blade 100','v9',2024,16,19,100,61,300,'flexible control','The popular control frame — flexible feel and precise placement.'),
  (120,'blade104_v9','Wilson','Blade 104','v9',2024,16,19,104,60,300,'flexible control','The popular control frame — flexible feel and precise placement.'),
  (121,'blade98_19_v9','Wilson','Blade 98 16×19','v9',2024,16,19,98,62,305,'flexible control','The popular control frame — flexible feel and precise placement.'),
  (122,'blade98_20_v9','Wilson','Blade 98 18×20','v9',2024,18,20,98,62,305,'tight control','The dense-pattern Blade — maximum precision and directional control.'),
  (123,'bladepro_20_v9','Wilson','Blade Pro 18×20','v9',2024,18,20,98,62,322,'tight control','The dense-pattern Blade — maximum precision and directional control.'),
  (124,'clash100pro_v3','Wilson','Clash 100 Pro','v3',2025,16,19,100,55,310,'ultra-flexible','Famously flexible and arm-friendly — forgiving with almost any string.'),
  (125,'ps61_100_v14','Wilson','Pro Staff Six.One 100','v14',2023,16,19,100,66,320,'control & feel','A thin-beam control classic that rewards a full swing.'),
  (126,'rf01future','Wilson','RF 01 Future','',2025,16,19,97,66,295,'control, heavy','Federer''s successor line — a heavy, plush control stick.'),
  (127,'rf01pro','Wilson','RF 01 Pro','',2025,16,19,97,68,350,'control, heavy','Federer''s successor line — a heavy, plush control stick.'),
  (128,'rf01','Wilson','RF 01','',2025,16,19,97,67,340,'control, heavy','Federer''s successor line — a heavy, plush control stick.'),
  (129,'ultra100_v5','Wilson','Ultra 100','v5',2025,16,19,100,71,300,'power','A stiff, powerful frame — best paired with a control poly.'),
  (130,'ultrapro99_v5','Wilson','Ultra Pro 99','v5',2025,16,19,99,69,305,'power','A stiff, powerful frame — best paired with a control poly.'),
  (131,'ultrapro19_v4','Wilson','Ultra Pro 16×19','v4',2022,16,19,97,69,305,'power','A stiff, powerful frame — best paired with a control poly.'),
  (132,'ultrapro20_v4','Wilson','Ultra Pro 18×20','v4',2022,18,20,97,68,305,'power','A stiff, powerful frame — best paired with a control poly.'),
  (133,'shift99pro','Wilson','Shift 99 Pro','',2023,16,19,99,60,315,'flexible spin','A bendy, spin-friendly frame with an open bed.'),
  (134,'vcore100_g8','Yonex','VCORE 100','8th Gen',2026,16,19,100,66,300,'spin-control','Yonex''s grippy spin frame — lively, loves shaped polys.'),
  (135,'vcore100plus_g8','Yonex','VCORE 100+','8th Gen',2026,16,19,100,66,300,'spin-control','Yonex''s grippy spin frame — lively, loves shaped polys.'),
  (136,'vcore95_g8','Yonex','VCORE 95','8th Gen',2026,16,20,95,66,310,'spin-control','Yonex''s grippy spin frame — lively, loves shaped polys.'),
  (137,'vcore98_2026','Yonex','VCORE 98','',2026,16,19,98,65,305,'spin-control','Yonex''s grippy spin frame — lively, loves shaped polys.'),
  (138,'vcore98tour_g8','Yonex','VCORE 98 Tour','8th Gen',2026,16,20,98,64,320,'spin-control','Yonex''s grippy spin frame — lively, loves shaped polys.'),
  (139,'vcore98plus_2026','Yonex','VCORE 98+','',2026,16,19,98,65,305,'spin-control','Yonex''s grippy spin frame — lively, loves shaped polys.'),
  (140,'ezone100_2025','Yonex','EZONE 100','',2025,16,19,100,65,300,'comfort-power','Yonex''s plush power-control frame with a soft, connected feel.'),
  (141,'ezone100plus_2025','Yonex','EZONE 100+','',2025,16,19,100,65,300,'comfort-power','Yonex''s plush power-control frame with a soft, connected feel.'),
  (142,'ezone98_2025','Yonex','EZONE 98','',2025,16,19,98,64,305,'comfort-power','Yonex''s plush power-control frame with a soft, connected feel.'),
  (143,'ezone98plus_2025','Yonex','EZONE 98+','',2025,16,19,98,64,305,'comfort-power','Yonex''s plush power-control frame with a soft, connected feel.'),
  (144,'percept97_2023','Yonex','Percept 97','',2023,16,19,97,62,310,'feel & control','A flexible, feel-rich control frame for touch players.'),
  (145,'percept97d_2023','Yonex','Percept 97D','',2023,18,20,97,63,320,'feel & control','A flexible, feel-rich control frame for touch players.')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('rackets','id'), GREATEST((SELECT MAX(id) FROM rackets), 1));

-- ---- v2: favorites + visitor counter ----
CREATE TABLE IF NOT EXISTS favorites (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('racket','string')),
  item_id    INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, item_id)
);
CREATE TABLE IF NOT EXISTS site_stats (
  key   TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);
INSERT INTO site_stats (key, value) VALUES ('visits', 0) ON CONFLICT (key) DO NOTHING;

-- ---- v3: user-owned rackets + game feedback (Racket Room) ----
ALTER TABLE rackets ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_rackets_owner ON rackets(owner_user_id);
CREATE TABLE IF NOT EXISTS feedback (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setup_id      INTEGER REFERENCES setups(id) ON DELETE SET NULL,
  racket_label  TEXT NOT NULL DEFAULT '',
  combo_label   TEXT NOT NULL DEFAULT '',
  algo_scores   JSONB NOT NULL,
  player_scores JSONB NOT NULL,
  overall       INTEGER,
  notes         TEXT NOT NULL DEFAULT '',
  share_id      TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);

-- ---- v4: email confirmation ----
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT;
CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(verify_token);

-- ---- v5: clubs (community) ----
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username)) WHERE username IS NOT NULL;
CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE, description TEXT NOT NULL DEFAULT '',
  owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS club_members (
  id SERIAL PRIMARY KEY, club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (club_id, user_id));
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE TABLE IF NOT EXISTS club_posts (
  id SERIAL PRIMARY KEY, club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, kind TEXT NOT NULL, data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_club_posts_club ON club_posts(club_id, created_at DESC);
CREATE TABLE IF NOT EXISTS post_likes (
  id SERIAL PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, UNIQUE (post_id, user_id));
CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);
INSERT INTO clubs (name, slug, description, is_default)
VALUES ('Thailand Tennis Club', 'thailand-tennis-club', 'The home club for every Tension Lab player. Share your setups and match feedback here.', true)
ON CONFLICT (slug) DO NOTHING;

-- ---- v6: post captions + one-time username change ----
ALTER TABLE club_posts ADD COLUMN IF NOT EXISTS caption TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_change_used BOOLEAN NOT NULL DEFAULT false;

-- ---- v7: racket photos ----
CREATE TABLE IF NOT EXISTS racket_images (
  racket_id    INTEGER PRIMARY KEY REFERENCES rackets(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  data         BYTEA NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS explore_combos (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  config      JSONB NOT NULL,
  scores      JSONB NOT NULL,
  archetype   TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS combo_votes (
  id       SERIAL PRIMARY KEY,
  combo_id INTEGER NOT NULL REFERENCES explore_combos(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dir      SMALLINT NOT NULL,
  UNIQUE(combo_id, user_id)
);
CREATE TABLE IF NOT EXISTS combo_rackets (
  id        SERIAL PRIMARY KEY,
  combo_id  INTEGER NOT NULL REFERENCES explore_combos(id) ON DELETE CASCADE,
  racket_id INTEGER NOT NULL REFERENCES rackets(id) ON DELETE CASCADE,
  added_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(combo_id, racket_id)
);
CREATE TABLE IF NOT EXISTS combo_racket_votes (
  id              SERIAL PRIMARY KEY,
  combo_racket_id INTEGER NOT NULL REFERENCES combo_rackets(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dir             SMALLINT NOT NULL,
  UNIQUE(combo_racket_id, user_id)
);
CREATE TABLE IF NOT EXISTS combo_comments (
  id        SERIAL PRIMARY KEY,
  combo_id  INTEGER NOT NULL REFERENCES explore_combos(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body      TEXT NOT NULL,
  racket_id INTEGER REFERENCES rackets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_explore_created ON explore_combos(created_at DESC);
