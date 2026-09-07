// Ministerposter = regeringen Kristerssons nuvarande departement/titlar (24 poster, 11 departement).
// Kandidatpoolen är ett kurerat urval av framträdande riksdagsledamöter / partiledningar /
// gruppledare / talespersoner för M, L, KD och SD (partistyrelser, riksdagsgrupper, aktuella
// statsråd) — inte en fullständig lista över samtliga riksdagsledamöter.

const PARTIES = {
  M:  { name: "Moderaterna",        color: "#1F4FCB" },
  L:  { name: "Liberalerna",        color: "#12A594" },
  KD: { name: "Kristdemokraterna",  color: "#6E3FB0" },
  SD: { name: "Sverigedemokraterna",color: "#E8B923" },
};

const PORTFOLIOS = [
  { id: "pm",        dept: "Statsrådsberedningen",                     title: "Statsminister",
    fixed: "kristersson" },
  { id: "eu",         dept: "Statsrådsberedningen",                     title: "EU-minister" },

  { id: "arbetsm",    dept: "Arbetsmarknadsdepartementet",              title: "Arbetsmarknadsminister" },
  { id: "jamstalld",  dept: "Arbetsmarknadsdepartementet",              title: "Jämställdhetsminister" },

  { id: "finans",     dept: "Finansdepartementet",                      title: "Finansminister" },
  { id: "civil",      dept: "Finansdepartementet",                      title: "Civilminister" },
  { id: "finansm",    dept: "Finansdepartementet",                      title: "Finansmarknadsminister" },

  { id: "forsvar",    dept: "Försvarsdepartementet",                    title: "Försvarsminister" },
  { id: "civforsvar", dept: "Försvarsdepartementet",                    title: "Minister för civilt försvar" },

  { id: "justitie",   dept: "Justitiedepartementet",                    title: "Justitieminister" },
  { id: "migration",  dept: "Justitiedepartementet",                    title: "Migrationsminister" },

  { id: "energi",     dept: "Klimat- och näringslivsdepartementet",     title: "Energi- och näringsminister" },
  { id: "klimat",     dept: "Klimat- och näringslivsdepartementet",     title: "Klimat- och miljöminister" },

  { id: "kultur",     dept: "Kulturdepartementet",                      title: "Kulturminister" },

  { id: "landsbygd",  dept: "Landsbygds- och infrastrukturdepartementet", title: "Landsbygdsminister" },
  { id: "infra",      dept: "Landsbygds- och infrastrukturdepartementet", title: "Infrastruktur- och bostadsminister" },

  { id: "social",     dept: "Socialdepartementet",                      title: "Socialminister" },
  { id: "aldre",      dept: "Socialdepartementet",                      title: "Äldre- och socialförsäkringsminister" },
  { id: "socialtj",   dept: "Socialdepartementet",                      title: "Socialtjänstminister" },
  { id: "sjukvard",   dept: "Socialdepartementet",                      title: "Sjukvårdsminister" },

  { id: "utbintegr",  dept: "Utbildningsdepartementet",                 title: "Utbildnings- och integrationsminister" },
  { id: "gymhogsk",   dept: "Utbildningsdepartementet",                 title: "Gymnasie-, högskole- och forskningsminister" },

  { id: "utrikes",    dept: "Utrikesdepartementet",                     title: "Utrikesminister" },
  { id: "bistand",    dept: "Utrikesdepartementet",                     title: "Bistånds- och utrikeshandelsminister" },
];

const CANDIDATES = [
  // --- M ---
  { id: "kristersson",        name: "Ulf Kristersson",           party: "M",  role: "Partiledare, statsminister" },
  { id: "rosencrantz",        name: "Jessica Rosencrantz",       party: "M",  role: "EU-minister" },
  { id: "svantesson",         name: "Elisabeth Svantesson",      party: "M",  role: "Finansminister" },
  { id: "wykman",             name: "Niklas Wykman",             party: "M",  role: "Finansmarknadsminister" },
  { id: "jonson",             name: "Pål Jonson",                party: "M",  role: "Försvarsminister" },
  { id: "bohlin",             name: "Carl-Oskar Bohlin",         party: "M",  role: "Minister för civilt försvar" },
  { id: "strommer",           name: "Gunnar Strömmer",           party: "M",  role: "Justitieminister" },
  { id: "forssell",           name: "Johan Forssell",            party: "M",  role: "Migrationsminister" },
  { id: "liljestrand",        name: "Parisa Liljestrand",        party: "M",  role: "Kulturminister" },
  { id: "tenje",              name: "Anna Tenje",                party: "M",  role: "Äldre- och socialförsäkringsminister" },
  { id: "walterssongronvall", name: "Camilla Waltersson Grönvall", party: "M", role: "Socialtjänstminister" },
  { id: "malmerstenergard",   name: "Maria Malmer Stenergard",   party: "M",  role: "Utrikesminister" },
  { id: "dousa",              name: "Benjamin Dousa",             party: "M",  role: "Bistånds- och utrikeshandelsminister" },
  { id: "wallmark",           name: "Hans Wallmark",             party: "M",  role: "Ordförande, utrikesutskottet" },
  { id: "riedl",              name: "Edward Riedl",              party: "M",  role: "Ordförande, finansutskottet" },
  { id: "alm",                name: "Ann-Sofie Alm",             party: "M",  role: "Riksdagsledamot" },
  { id: "aberg",              name: "Boriana Åberg",             party: "M",  role: "Riksdagsledamot" },
  { id: "lundkopparklint",    name: "Marléne Lund Kopparklint",  party: "M",  role: "Riksdagsledamot" },
  { id: "manouchi",           name: "Noria Manouchi",            party: "M",  role: "Riksdagsledamot" },
  { id: "bergheden",          name: "Sten Bergheden",            party: "M",  role: "Riksdagsledamot" },
  { id: "coenraads",          name: "Åsa Coenraads",             party: "M",  role: "Riksdagsledamot" },
  { id: "beckman",            name: "Lars Beckman",              party: "M",  role: "Riksdagsledamot" },
  { id: "hjalmered",          name: "Lars Hjälmered",            party: "M",  role: "Utbildningspolitisk talesperson" },
  { id: "warnick",            name: "Viktor Wärnick",            party: "M",  role: "Bostadspolitisk talesperson" },

  // --- KD ---
  { id: "busch",              name: "Ebba Busch",                party: "KD", role: "Partiledare, energi- och näringsminister" },
  { id: "forssmed",           name: "Jakob Forssmed",            party: "KD", role: "Socialminister" },
  { id: "slottner",           name: "Erik Slottner",             party: "KD", role: "Civilminister" },
  { id: "kullgren",           name: "Peter Kullgren",            party: "KD", role: "Landsbygdsminister" },
  { id: "andreascarlson",     name: "Andreas Carlson",           party: "KD", role: "Infrastruktur- och bostadsminister" },
  { id: "lann",               name: "Elisabet Lann",             party: "KD", role: "Sjukvårdsminister" },
  { id: "brodin",             name: "Camilla Brodin",            party: "KD", role: "Gruppledare, energipolitisk talesperson" },
  { id: "christiancarlsson",  name: "Christian Carlsson",        party: "KD", role: "Socialpolitisk talesperson" },
  { id: "eklind",             name: "Hans Eklind",               party: "KD", role: "Ekonomisk-politisk talesperson" },
  { id: "magnusoscarsson",    name: "Magnus Oscarsson",          party: "KD", role: "Trafik- och jordbrukspolitisk talesperson" },
  { id: "ottosson",           name: "Kjell-Arne Ottosson",       party: "KD", role: "Miljö- och klimatpolitisk talesperson" },
  { id: "soder",              name: "Larry Söder",               party: "KD", role: "Bostadspolitisk talesperson" },
  { id: "mikaeloscarsson",    name: "Mikael Oscarsson",          party: "KD", role: "Försvarspolitisk talesperson" },
  { id: "berntsson",          name: "Magnus Berntsson",          party: "KD", role: "Utrikespolitisk talesperson" },
  { id: "elofsson",           name: "Torsten Elofsson",          party: "KD", role: "Rättspolitisk talesperson" },
  { id: "brunegard",          name: "Gudrun Brunegård",          party: "KD", role: "Biståndspolitisk talesperson" },
  { id: "kihlstrom",          name: "Ingemar Kihlström",         party: "KD", role: "Socialförsäkringspolitisk talesperson" },
  { id: "jacobsson",          name: "Magnus Jacobsson",          party: "KD", role: "Arbetsmarknadspolitisk talesperson" },
  { id: "rinaldomiller",      name: "Camilla Rinaldo Miller",    party: "KD", role: "Familje- och jämställdhetspolitisk talesperson" },
  { id: "utbult",             name: "Roland Utbult",             party: "KD", role: "Kulturpolitisk talesperson" },

  // --- L ---
  { id: "mohamsson",          name: "Simona Mohamsson",          party: "L",  role: "Partiledare, utbildnings- och integrationsminister" },
  { id: "edholm",             name: "Lotta Edholm",              party: "L",  role: "Gymnasie-, högskole- och forskningsminister" },
  { id: "pourmokhtari",       name: "Romina Pourmokhtari",       party: "L",  role: "Klimat- och miljöminister" },
  { id: "britz",              name: "Johan Britz",               party: "L",  role: "Arbetsmarknadsminister" },
  { id: "ninalarsson",        name: "Nina Larsson",              party: "L",  role: "Jämställdhetsminister" },
  { id: "nordquist",          name: "Lina Nordquist",            party: "L",  role: "Gruppledare" },
  { id: "eklund",             name: "Louise Eklund",             party: "L",  role: "Vice gruppledare" },
  { id: "ronn",               name: "Cecilia Rönn",              party: "L",  role: "Riksdagsledamot" },
  { id: "hannah",             name: "Robert Hannah",             party: "L",  role: "Riksdagsledamot" },
  { id: "danielsson",         name: "Malin Danielsson",          party: "L",  role: "Riksdagsledamot" },
  { id: "pehrson",            name: "Johan Pehrson",             party: "L",  role: "Tidigare partiledare, riksdagsledamot" },
  { id: "teimouri",           name: "Arman Teimouri",            party: "L",  role: "Riksdagsledamot" },
  { id: "joarforssell",       name: "Joar Forssell",             party: "L",  role: "Riksdagsledamot" },

  // --- SD ---
  { id: "akesson",            name: "Jimmie Åkesson",            party: "SD", role: "Partiledare" },
  { id: "vinge",              name: "Henrik Vinge",              party: "SD", role: "Vice partiledare" },
  { id: "lindberg",           name: "Linda Lindberg",            party: "SD", role: "Vice partiledare" },
  { id: "backstromjohansson", name: "Mattias Bäckström Johansson", party: "SD", role: "Partisekreterare" },
  { id: "sjostedt",           name: "Oscar Sjöstedt",            party: "SD", role: "Ekonomisk-politisk talesperson" },
  { id: "jomshof",            name: "Richard Jomshof",           party: "SD", role: "Riksdagsledamot" },
  { id: "tobiasandersson",    name: "Tobias Andersson",          party: "SD", role: "Rättspolitisk talesperson, utskottsordförande" },
  { id: "kinnunen",           name: "Martin Kinnunen",           party: "SD", role: "Partistyrelsen" },
  { id: "kronlid",            name: "Julia Kronlid",             party: "SD", role: "Riksdagens vice talman" },
  { id: "soder_bjorn",        name: "Björn Söder",               party: "SD", role: "Riksdagens vice talman" },
  { id: "erixon",             name: "Louise Erixon",             party: "SD", role: "Familjepolitisk talesperson" },
  { id: "emilsson",           name: "Aron Emilsson",             party: "SD", role: "Partistyrelsen" },
  { id: "broman",             name: "Bo Broman",                 party: "SD", role: "Kulturpolitisk talesperson" },
  { id: "dioukarev",          name: "Dennis Dioukarev",          party: "SD", role: "Partistyrelsen" },
  { id: "lindahl",            name: "Fredrik Lindahl",           party: "SD", role: "Partistyrelsen" },
  { id: "kronvall",           name: "Andrea Kronvall",           party: "SD", role: "Partistyrelsen" },
  { id: "hannanilsson",       name: "Hanna Nilsson",             party: "SD", role: "Partistyrelsen" },
  { id: "silbvers",           name: "Kristian Silbvers",         party: "SD", role: "Partistyrelsen" },
  { id: "magnusolsson",       name: "Magnus Olsson",             party: "SD", role: "Partistyrelsen" },
  { id: "hedlund",            name: "Roger Hedlund",             party: "SD", role: "Partistyrelsen" },
  { id: "mattiaskarlsson",    name: "Mattias Karlsson",          party: "SD", role: "Partistyrelsen" },
  { id: "marttinen",          name: "Adam Marttinen",            party: "SD", role: "Rättspolitik" },
  { id: "aspling",            name: "Ludvig Aspling",            party: "SD", role: "Utrikes- och EU-politik" },
  { id: "quensel",            name: "Charlotte Quensel",         party: "SD", role: "Riksdagsledamot" },
  { id: "eskilandersson",     name: "Mikael Eskilandersson",     party: "SD", role: "Konstitutionella frågor" },
  { id: "fromutterstedt",     name: "Ann-Christine From Utterstedt", party: "SD", role: "Äldrefrågor" },
  { id: "stahlherrstedt",     name: "Carina Ståhl Herrstedt",    party: "SD", role: "Socialförsäkringsfrågor" },
  { id: "palmqvist",          name: "Eric Palmqvist",            party: "SD", role: "Miljö- och jordbrukspolitik" },
  { id: "strandman",          name: "Mikael Strandman",          party: "SD", role: "Försvarspolitik" },
  { id: "stenkvist",          name: "Robert Stenkvist",          party: "SD", role: "Försvarspolitik" },
  { id: "nyberg",             name: "Katja Nyberg",              party: "SD", role: "Polisfrågor" },
  { id: "angelikabengtsson",  name: "Angelika Bengtsson",        party: "SD", role: "Idrottspolitik" },
  { id: "gille",              name: "Sara Gille",                party: "SD", role: "Riksdagsledamot" },
  { id: "christiansson",      name: "Alexander Christiansson",   party: "SD", role: "Riksdagsledamot" },
  { id: "stegrud",            name: "Jessica Stegrud",           party: "SD", role: "Migrations- och rättspolitik" },
];

// Namn som alltid ska ingå vid slumpmässig tillsättning ("Slumpa fram kandidater").
const GUARANTEED_SD_IDS = [
  "jomshof",
  "akesson",
  "soder_bjorn",
  "aspling",
  "stegrud",
  "emilsson",
  "mattiaskarlsson",
];

// En illustrativ, plausibel fyllning som visar hur få av dagens (M/L/KD) statsråd som
// får plats när minst 12 poster måste bli SD. De 11 icke-SD-posterna behåller här sina
// nuvarande innehavare — de 12 SD-posterna tar över resten, inklusive Försvars-,
// Justitie- och Utrikesdepartementet.
const EXAMPLE_FILL = {
  eu:        "aspling",
  arbetsm:   "nyberg",
  jamstalld: "ninalarsson",
  finans:    "sjostedt",
  civil:     "slottner",
  finansm:   "dioukarev",
  forsvar:   "strandman",
  civforsvar:"stenkvist",
  justitie:  "tobiasandersson",
  migration: "jomshof",
  energi:    "palmqvist",
  klimat:    "pourmokhtari",
  kultur:    "broman",
  landsbygd: "kullgren",
  infra:     "andreascarlson",
  social:    "forssmed",
  aldre:     "kronlid",
  socialtj:  "walterssongronvall",
  sjukvard:  "lann",
  utbintegr: "mohamsson",
  gymhogsk:  "edholm",
  utrikes:   "soder_bjorn",
  bistand:   "dousa",
};

// Ersätter L-innehavarna i EXAMPLE_FILL med M/KD-namn när Liberalerna är avstängda
// (dvs. inte "tog sig in i riksdagen"), så exempelregeringen aldrig visar L-personer
// i det läget.
const EXAMPLE_FILL_NO_L_OVERRIDES = {
  jamstalld: "rinaldomiller",
  klimat:    "ottosson",
  utbintegr: "hjalmered",
  gymhogsk:  "warnick",
};
