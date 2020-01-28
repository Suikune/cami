var version = 16;

//--------
// Adjustable stuff
var settings = JSON.parse($("#hiddenDiv").text());

// setting 
var autoStartBattle = !!settings.autoStartBattle;

var playSafe = !!settings.playSafe;
// end setting

var attack_delay = 500; // 300+ safe, lower maybe ban 
var run_when_non_union = false;
var use_speed_hacks = true;
var skip_vs_boss_fight_animation = true;
var skip_burst_animation = true;
var skip_messages = true; // e.g. blah is raging, blah is stun
var use_custom_AAB = true; // Uses abilities in a more intelligent order. Also uses summons and potions.
var ascension = 80; // Your ascension bonus %. Needed by custom AAB to use heals more intelligently.
var skip_help_request = true; // Get rid of the help request popup on raid start/reload
var auto_post_help_request = true; // Auto sends help request to union when entering rag raid
var auto_post_stamp = true;
var auto_exit_won_battle = true;
var auto_exit_lost_raid = true;
var auto_exit_timed_out_raid = true;
var display_hp_numbers = true; // Display the enemy's hp number in their hp bar
var display_para_timer = true; // Displays a timer on paralyse duration during UE
var burst_mode = 0; // 0 - always burst asap, 1 - always save for full burst, 2 - let the bot decide

var auto_start_next_battle = true;
var auto_start_type = "raid_event"; // "ue_expert", "ue_ult", "advent_ult", "raid_event", "daily"
var daily_quest_id = 32; // 28 - thunder ult, 29 - fire ult, 30 - water ult, 31 - wind ult, 32 - light ult, 33 - dark ult
var strong_party_no = 10; // 1 to 12
var strong_party_element = "light"; // "fire", "water", "wind", "thunder", "light", "dark", "phantom", "loot"
var loot_party_no = 9; // 1 to 12
var loot_party_element = "loot"; // "fire", "water", "wind", "thunder", "light", "dark", "phantom", "loot"
var time_before_next_battle = 3 + 3 * Math.random(); // 3-6 seconds
var half_elixir_limit = 100; // auto start next battle will stop if the number of half elixirs left reach this number

// comment it out if you don't want to auto start AAB for that quest type
var auto_start_aab = !!settings.autoStartBattle;
var auto_start_participants = 1;
var auto_start_aab_quest_types = [
    "event", // advent
    "daily", // daily
    "mission", // guild order
    "accessory", // accessory quest
    "event_raid", // raid event
    "event_union_demon_raid", // union event demon
    "event_union_lilim_raid", // union event lilim
    "raid", // raid quest
    "guerrilla",
    "epic",
    "prizehunt",
    "scoreattack"
];
var my_unions_member_array = [];

function skipAnimation() {
    var solo = getNumParticipants() == 1;
    if (!use_speed_hacks || turnOffHacks()) return 0;
    if (quest_type == "event") return 2;
    if (quest_type == "mission") return 2;
    if (quest_type == "tower_event") return 0;
    if (quest_type == "accessory") return 2;
    if (quest_type == "daily") return 2;
    if (quest_type == "raid" && solo) return 2;
    if (quest_type == "raid" && !solo) return 2;
    if (quest_type == "event_raid" && solo) return 2;
    if (quest_type == "event_raid" && !solo) return 2;
    if (quest_type == "event_union_demon_raid" && solo) return 2;
    if (quest_type == "event_union_demon_raid" && !solo) return 2;
    if (quest_type == "event_union_lilim_raid" && solo) return 2;
    if (quest_type == "event_union_lilim_raid" && !solo) return 2;
    if (quest_type == "guerrilla" && solo) return 2;
    if (quest_type == "prizehunt") return 2;
    if (quest_type == "epic") return 2;
    return 0;
}

function getRndInteger(min, max) {
    return !use_speed_hacks || turnOffHacks() ? 0 : enemiesSEDur("paralyse") > 0 ? attack_delay * 3 : attack_delay * 2;
}

// Perform next action without waiting for server response if this timeout is reached after using an ability.
function getAbilityResponseTimeout() {
    var solo = getNumParticipants() == 1;
    if (!use_speed_hacks || turnOffHacks()) return Infinity;
    if (quest_type == "event") return 9000;
    if (quest_type == "mission") return Infinity;
    if (quest_type == "tower_event") return Infinity;
    if (quest_type == "accessory") return Infinity;
    if (quest_type == "daily") return 9000;
    if (quest_type == "raid" && solo) return 9000;
    if (quest_type == "raid" && !solo) return 9000;
    if (quest_type == "event_raid" && solo) return 800;
    if (quest_type == "event_raid" && !solo) return Infinity;
    if (quest_type == "event_union_demon_raid" && solo) return 12000;
    if (quest_type == "event_union_demon_raid" && !solo) return 12000;
    if (quest_type == "event_union_lilim_raid" && solo) return 9000;
    if (quest_type == "event_union_lilim_raid" && !solo) return Infinity;
    if (quest_type == "prizehunt") return 800;
    if (quest_type == "epic") return 800;
    return Infinity;
}

// Perform next action without waiting for server response if this timeout is reached after using an attack.
function getAttackResponseTimeout() {
    var solo = getNumParticipants() == 1;
    var paralysed = enemiesSEDur("paralyse") >= 10;
    if (!use_speed_hacks || turnOffHacks()) return Infinity;
    if (quest_type == "event") return 60000;
    if (quest_type == "mission") return 60000;
    if (quest_type == "tower_event") return Infinity;
    if (quest_type == "accessory") return 60000;
    if (quest_type == "daily") return 60000;
    if (quest_type == "raid") return 60000;
    if (quest_type == "event_raid") return 60000;
    if (quest_type == "event_union_demon_raid" && paralysed && solo) return 12000;
    if (quest_type == "event_union_demon_raid" && paralysed && !solo) return 12000; //4500;
    if (quest_type == "event_union_demon_raid" && !paralysed) return 60000; //60000;
    if (quest_type == "event_union_lilim_raid") return 60000;
    if (quest_type == "prizehunt") return 800;
    if (quest_type == "epic") return 800;
    return Infinity;
}

//--------

var quest_id;
var quest_type;
var battle_id;
var bw;
var apibattle;
var apia;

var my_player_id;
var my_party_ids;
var half_elixir_id;
var energy_seed_id;
var ue_event_id;
var advent_event_id;
var raid_event_id;

var usedThisTurn = new Set();
var last_ability_name = null;

var processingServerResponse = false;
var processServerResponseQueue = [];
var actionPromises = [];

var enemy_priority_list = [
    // Fire rag
    "Prison of Fire Catastrophe",
    "Blaze Type Calamity α",
    "Blaze Type Calamity β",

    // Water rag
    "Frostbite Type Calamity γ",
    "Prison of Ice Catastrophe",

    // Wind rag
    ["Storm Type Calamity α", () => hpPercent("Storm Type Calamity α") <= hpPercent("Storm Type Calamity β") - 20],
    "Storm Type Calamity β",
    "Storm Type Calamity α",
    "Prison of Wind Catastrophe",

    // Thunder rag
    ["Prison of Lightning Catastrophe", () => isRaging("Prison of Lightning Catastrophe"), () => hpPercent("Lightning Type Calamity γ") < modeGaugePercent("Prison of Lightning Catastrophe") - 10],
    "Lightning Type Calamity γ",
    "Prison of Lightning Catastrophe",

    // Light rag
    "Luminescent Type Calamity β",
    "Luminescent Type Calamity α",
    "Prison of Light Catastrophe",

    // Dark rag
    ["Abyss Type Calamity β", () => !(hpPercent("Abyss Type Calamity β") + 5 <= hpPercent("Abyss Type Calamity α"))],
    "Abyss Type Calamity α",
    "Prison of Darkness Catastrophe",
];

var elements = ["fire", "water", "wind", "thunder", "light", "dark"];

var status_effect_ids = {
    atk_buff: { // 8, 136,
        a: 6,
        b: 7,
        c: 5,
        sb: 40001,
        stacking: 9,
    },
    atk_debuff: {
        a: 10,
        b: 12,
        c: 11,
        d: 143,
        sb: 40002,
        stacking: 100,
    },
    def_buff: { // 74, 164
        a: 14,
        b: 15,
        c: 13,
        sb: 40003,
        stacking: 164,
    },
    def_debuff: { // 166
        a: 16,
        b: 18,
        c: 17,
        d: 144,
        sb: 40004,
        stacking: 158,
    },
    ability_damage_buff: {
        a: 19,
        sb: 96,
        stacking: 20,
    },
    double_attack_buff: { // 82,
        a: 23,
        b: 83,
        sb: 40005,
        stacking: 168,
    },
    double_attack_debuff: {
        a: 25,
        sb: 40007, // unsure
    },
    triple_attack_buff: {
        a: 24,
        sb: 40006,
        stacking: 169,
    },
    triple_attack_debuff: {
        a: 26,
        sb: 40008, // unsure
    },
    status_resist_buff: 21,
    status_resist_debuff: 22, // 214
    recovery_limit_buff: 32,
    block_affliction: 47,
    paralyse: 62,
    pluto_blocks: 95,
    fire_attack_buff: {
        a: 101,
        sb: 40009,
    },
    water_attack_buff: {
        a: 102,
        sb: 40010,
    },
    wind_attack_buff: {
        a: 103,
        sb: 40011,
    },
    thunder_attack_buff: {
        a: 104,
        sb: 40012,
    },
    light_attack_buff: {
        a: 105,
        sb: 40013,
    },
    dark_attack_buff: {
        a: 106,
        sb: 40014,
    },
    fire_attack_debuff: 107,
    water_attack_debuff: 108,
    wind_attack_debuff: 109,
    thunder_attack_debuff: 110,
    light_attack_debuff: 111,
    dark_attack_debuff: 112, // 40026
    fire_resist_buff: {
        a: 113,
        sb: 40015,
    },
    water_resist_buff: {
        a: 114,
        sb: 40016,
    },
    wind_resist_buff: {
        a: 115,
        sb: 40017,
    },
    thunder_resist_buff: {
        a: 116,
        sb: 40018,
    },
    light_resist_buff: {
        a: 117,
        sb: 40019,
    },
    dark_resist_buff: {
        a: 118,
        sb: 40020,
    },

    fire_resist_debuff: 119,
    water_resist_debuff: 120,
    wind_resist_debuff: 121,
    thunder_resist_debuff: 122,
    light_resist_debuff: 123,
    dark_resist_debuff: 124,
    barrier_buff: 138,
    arianrod_arrow: 161,
    fortitude: 163,
    vigoras: 176,
    nike_talisman: 177,
    takeminakata_sword: 182,
    metatron_countdown: 210,
    lugh_burst_buff: 234,
    azazel_burst_buff: 278,
};

var summon_buffs = [
    ["Fleurety", someCharDontHave("thunder_resist_debuff", "sb")],

    ["Managarmr", someCharDontHave("triple_attack_buff", "sb")],
    ["Icarus", someCharDontHave("triple_attack_buff", "sb")],
    ["Sandalphon", someCharDontHave("triple_attack_buff", "sb")],
    ["Kazuki Kazami", someCharDontHave("triple_attack_buff", "sb")],
    ["Aratoron", someCharDontHave("triple_attack_buff", "sb")],

    ["Adramelech", someCharDontHave("double_attack_buff", "sb")],
    ["Garuda", someCharDontHave("double_attack_buff", "sb")],
    ["Thunderbird", someCharDontHave("double_attack_buff", "sb")],
    ["Delphyne", someCharDontHave("double_attack_buff", "sb")],
    ["Nova Kaiser Dragoon", someCharDontHave("fire_attack_buff", "sb")],
    ["Lilim Ira", someCharDontHave("fire_attack_buff", "sb")],

    ["Aqua Kaiser Dragoon", someCharDontHave("water_attack_buff", "sb")],
    ["Lilim Acedia", someCharDontHave("water_attack_buff", "sb")],

    ["Gale Kaiser Dragoon", someCharDontHave("wind_attack_buff", "sb")],
    ["Lilim Luxuria", someCharDontHave("wind_attack_buff", "sb")],

    ["Pulse Kaiser Dragoon", someCharDontHave("thunder_attack_buff", "sb")],
    ["Lilim Gula", someCharDontHave("thunder_attack_buff", "sb")],
    ["Ixion", someCharDontHave("thunder_attack_buff", "sb")],
    ["Wild Hunt", someCharDontHave("thunder_attack_buff", "sb")],

    ["God Kaiser Dragoon", someCharDontHave("light_attack_buff", "sb")],
    ["Lilim Superbia", someCharDontHave("light_attack_buff", "sb")],

    ["Evil Kaiser Dragoon", someCharDontHave("dark_attack_buff", "sb")],
    ["Lilim Invidia", someCharDontHave("dark_attack_buff", "sb")],

    ["Haggith", someCharDontHave("atk_buff", "sb")],
    ["Belial", someCharDontHave("atk_buff", "sb")],
    ["Ifrit", someCharDontHave("atk_buff", "sb")],
    ["Lilim Avaritia", someCharDontHave("atk_buff", "sb")],
    ["Meng Huo (Mii)", someCharDontHave("atk_buff", "sb")],
    ["Typhon", someCharDontHave("atk_buff", "sb")],

    ["Fenrir", someCharDontHave("ability_damage_buff", "a")],
    ["Quetzalcoatl", someCharDontHave("ability_damage_buff", "a")],

    ["Kirin", someCharDontHave("status_resist_buff")],
    ["Phoenix", someCharDontHave("status_resist_buff")],
    ["Trivia", someCharDontHave("status_resist_buff")],

    ["Archangel", targetIsRaging()],
    ["Stolas", someCharDontHave("def_buff", "sb")],
    ["Saint Nicholas", someCharDontHave("def_buff", "sb")],
    ["Huanglong", targetIsStunned()],

    "Marchosias",
    "Barong", // nullify one affliction for random ally
    "Diabolos (Unleashed)", // special atk up
    "Hanuman", // applies counterattack to all allies
    "Houkei x Tei'iku (Fu)", // random betweem atk, def, bg or barrier buff
    "Iwanaga-Hime", // applies counterattack to all allies
    "Tartarus", // applies evasion to all allies
    "Vampire Vlad Tepes", // applies 100 hp energy drain to all allies
    "Yam", // applies 200 hp regeneration to all allies
    "Yggdrasil", // applies 200 hp regeneration to all allies
    "Kyu Ei",
];

var summon_dots = [
    "Cthugha",
    "Dullahan",
    "Jabberwock",
    "Medusa",
    "Vritra",
];

var self_bg_up_buffs_data = [
    ["Miracle Chalice", "Arthur", 100],
    ["Roaring Blaze", "Shingen", 35],
    ["Kukira Execution", "Masamune", 25],
    ["Red Charge", "Yukimura", 25],
    ["Hall Ignition", "(Summer's Bloom) Metatron", 100],
    ["Akashi Fire", "Akane", 20],
    ["Mind's Eye", "Amon", 15],
    ["Amicus Ale", "Neptune", 25],
    ["Shamuha Frates", "Enkidu", 20],
    ["Rune Storm", "Odin [Awakened]", 30],
    ["Rune Storm", "Odin", 20],
    ["Forceful Assault", "Justitia", 100],
    ["Kingly Bell", "Marduk", 100],
    ["Kingly Bell", "Marduk [Awakened]", 100],
    ["Starting Roll", "Perkunas", 100],
    ["Effect Absorb", "Ogma", 30],
    ["Cersusu Punisher", "Azrael", 25],
    ["Sober Anode", "Liber", 20],
    ["Launch Out", "Metatron", 100],
    ["Launch Out", "Metatron [Awakened]", 100],
    ["Lager de Mision", "Frey", 15],
    ["Medicinal Power", "Kali", 100],
    ["Groom wrap", "Chernobog", 30],
    ["Grim Reaper", "Thanatos", 25],
];

var party_bg_up_buff_data = [
    ["Adjustment", 10],
    ["Billowing Spout", 20],
    ["Charm Feed", 100],
    ["Dark Harvest", 15],
    ["Deal Energie", 20],
    ["Divided Dragon", 10],
    ["Encourage Inspiration", 20],
    ["Eternal Moon", 10],
    ["Laced Brandy", 20],
    ["Morale Foil", 10],
    ["Pretty shock", 10],
    ["Sakura x Mio", 10],
    ["San Michel", 20],
    ["Sleipnir", 20],
    ["Takemikazuchi", 15],
    ["The Decree", 10],
    ["Tusken Blast", 15],
];

if (self_bg_up_buffs_data) {
    var self_bg_up_buffs_allows_full_burst = self_bg_up_buffs_data.map(t => [t[0], allowsFullBurst(t[1], t[2])]);
    var self_bg_up_buffs_speeds_up_full_burst = self_bg_up_buffs_data.map(t => [t[0], speedsUpFullBurst(t[1], t[2])]);
    var self_bg_up_buffs_speeds_up_self_burst = self_bg_up_buffs_data.map(t => [t[0], speedsUpSelfBurst(t[1], t[2])]);
}
if (party_bg_up_buff_data) {
    var party_bg_up_buffs = party_bg_up_buff_data.map(t => t[0]);
    var party_bg_up_buffs_allows_more_burst = party_bg_up_buff_data.map(t => [t[0], allowsMoreBurst(t[1])]);
}

var full_burst_bg_up_buffs = [
    [self_bg_up_buffs_allows_full_burst],
    [party_bg_up_buffs, () => !allCanBurst()],
    [self_bg_up_buffs_speeds_up_full_burst],
];

var anytime_burst_bg_up_buffs = [
    [party_bg_up_buffs, () => noneCanBurst()],
    [party_bg_up_buffs_allows_more_burst],
    [self_bg_up_buffs_speeds_up_self_burst],
];

var bg_up_buffs = [
    [full_burst_bg_up_buffs, () => saveForFullBurst()],
    [anytime_burst_bg_up_buffs, () => !saveForFullBurst()],
];

var party_zeal_buffs = [
    ["Beat Raidenschaft", shouldUsePartyZeal(10, 5)],
    ["Cheer", shouldUsePartyZeal(10, 4)],
    ["Dreams of Passion", shouldUsePartyZeal(10, 5)],
    ["Jack O'Lantern", shouldUsePartyZeal(5, 2)],
    ["Risen Sound", shouldUsePartyZeal(10, 4)],
    ["Shurez hand", shouldUsePartyZeal(10, 5)],
    ["Sponsored Love Dance", shouldUsePartyZeal(10, 5)],
    ["Windshear Yorti", shouldUsePartyZeal(10, 2.5)],
    ["Yule Goat", shouldUsePartyZeal(5, 2)],
];

var party_barrier_buffs = [
    ["Hard Faculty", shouldUsePartyBarrier(1000)],
    ["Thunder Bolt Wall", shouldUsePartyBarrier(1000)],
    ["Catafigio Geros", shouldUsePartyBarrier(800)],
    ["Size Expanse", shouldUsePartyBarrier(800)],
    ["Amaltheia", shouldUsePartyBarrier(750)],
    ["Python", shouldUsePartyBarrier(750)],
    ["Tiamat", shouldUsePartyBarrier(750)],
    ["Phul", shouldUsePartyBarrier(1600)],
];

var rage_buffs = [
    "Dock Flood",
    "The Key Struggle",
    "Vauparstraalen",
    "Hydro Burst+"
];

var stun_buffs = [
    "Afterglow Blast",
    "Current of Despair",
    "Dragon Blood",
    "Dragon Buster",
    "Enuma Elis",
    "Epic of a Military Hero",
    "Fierce Flame Combo",
    "Hammer Chase",
    "Pan Dallas Smash",
];

var ammo_buffs = [
    "Light Fringes", ["Amphael Giazza", () => playerSELevel(getCharacter("Pluto"), "pluto_blocks") == 0],
];

var buffs = [
    ["Insane Shout", () => false],
    ["Entry Crowding", () => burstGauge("Takeminakata") <= 20],
    ["Samildanach", () => !isUsable("Fogablaigi"), () => curHPProp("Lugh") >= 0.7],
    ["Samildanach", () => !isUsable("Fogablaigi"), () => curHPProp("Lugh") >= 0.5, () => hasBuff("Lugh", "lugh_burst_buff")],
    ["Revitalize", () => hasBuff("Azazel [Awakened]", "azazel_burst_buff", undefined, true), () => curHPProp("Azazel [Awakened]") <= 0.7],
    ["Storm Zeal", () => hasBuff("Azazel [Awakened]", "azazel_burst_buff", undefined, true)],
    [ammo_buffs],
    "Indomitable", [bg_up_buffs],
    [party_zeal_buffs],
    [party_barrier_buffs],
    [summon_buffs],
    [rage_buffs, targetIsRaging()],
    [stun_buffs, targetIsStunned()],
];

var status_resist_debuffs = [
    "Vicissitudes of Fortune",
    "Evil Eye",
    "Gleasononia",
    "Kaleidoscope Puff",
    "Lesal Scatter",
    "Liberty Loto",
    "Libra Judge",
    "Litter Grunts",
    "Poisones Snug",
    "Show Illusion",
    "Sphinx",
    "Trick Rook",
    "Tutanshamus",
];

var status_resist_debuffs_when_running_out = [
    [status_resist_debuffs, debuffRunningOut("status_resist_debuff")],
];

var fire_resist_debuffs = [
    "Gladius Burst",
    "Misery Experiment",
];

var water_resist_debuffs = [
    "Liquid Gauge",
];

var wind_resist_debuffs = [
    "Blow Antler",
    "Show Illusion",
];

var thunder_resist_debuffs = [
    "Cross Intrude",
    "Weakning Spark",
];

var light_resist_debuffs = [
    "Axishura+",
    "Moonbeam Arrow",
    "Trick Rook",
];

var dark_resist_debuffs = [
    "Dead End++",
    "Lesal Scatter",
];

var elem_resist_debuffs = elements.map(e => [this[e + "_resist_debuffs"]]);

var elem_resist_debuffs_when_running_out = elements.map(e => [this[e + "_resist_debuffs"], debuffRunningOut(e + "_resist_debuff")]);

var orb_eat_abilities = [
    "Angel Ring",
    "Anubis",
    "Bind Pressure",
    "Covering Shot",
    "Dark Banish",
    "Darkness Lost",
    "Interaction",
    "Jack Frost",
    "Martial Artillery",
    "Otherworldly Call",
    "Snow Freeze",
    "Tentacle Hold",
    "Tied Bandage",
];

var summon_debuffs = [
    "Abou",
    "Amphisbaena",
    "Apocalypse",
    "Azathoth",
    "Crom Cruach",
    "Echidna",
    "Girimehkala",
    "Jormungandr",
    "Mastema",
    "Monoceros",
    "Ouroboros",
    "Pazuzu",
    "Yatagarasu",
    "Yato no kami",
    "Leviathan",
];

var a_frame_def_debuffs = [
    "Ambush",
    "Ammina Penetrate",
    "Andres help",
    "Apparition of Confusion",
    "Aqua Tusk Blast",
    "Blaze Break",
    "Chenal Chenaiden",
    "Curse Water",
    "Dead End",
    "Emerald Llama",
    "Holy Requiem",
    "Hydoor Shot",
    "Legendary Slash",
    "Litter Grunts",
    "Microwave",
    "Moon Arrow",
    "Restrained Maris",
    "Smothering Smoke",
    "Stanshocker",
    "State of Grace",
    "Stun Shocker",
    "Tempest",
    "Trick Rook",
    "Turbulence",
];

var b_frame_def_debuffs = [
    "Blaze Cursed Dance",
    "Demon Seal Light",
    "Emprestelize",
    "Gleasononia",
    "Icicle Prison",
    "Leon Mistral",
    "Misery Experiment",
    "Mistletoe Drain",
    "Multi Painting",
    "Outrage",
    "Prison of the Soul",
    "Sakura Dance",
    "Scarlet Banner",
    "Seven Deadly sins",
    "Sneak Attack",
    "Sniper Shot",
    "Solar Eclipse",
    "Total Solar Eclipse",
    "Weakening Book",
];

var c_frame_def_debuffs = [
    "Dazzun Reheat Ring",
    "Hades Destroyer",
    "Hard Shell Breaking",
    "Illuminate Coil",
    "Leage Halo",
    "Liberty Loto",
    "Mental Abberation",
    "Optimus Levin",
    "Rapid Hail",
    "Show Illusion",
    "Sniper Shot",
];

var sb_frame_def_debuffs = [
    "Cerberus",
    "Hoder",
    "Hraesvelgr",
    "Medjed",
    "Nidhoggr",
];

var def_debuffs = [
    [a_frame_def_debuffs],
    [b_frame_def_debuffs],
    [c_frame_def_debuffs],
    [sb_frame_def_debuffs],
];

var def_debuffs_when_running_out = [
    [a_frame_def_debuffs, debuffRunningOut("def_debuff", "a")],
    [b_frame_def_debuffs, debuffRunningOut("def_debuff", "b")],
    [c_frame_def_debuffs, debuffRunningOut("def_debuff", "c")],
    [sb_frame_def_debuffs, debuffRunningOut("def_debuff", "sb")],
];

var dispel_abilities = [
    "Alfrodull",
    "Chaos Magic",
    "Effect Absorb",
    "Fallen Abyss",
    "Force Seal",
    "Lightning Canon",
    "Mars Vanish",
    "Problem Solved",
    "Ringing Shot",
    "Sugary Crush",
];

var debuffs = [
    [status_resist_debuffs],
    [elem_resist_debuffs],
    [orb_eat_abilities, shouldUseOrbEat()],
    [summon_debuffs],
    [def_debuffs],
    [dispel_abilities, shoulUseDispelAbilities()]
];



var fire_elem_buffs_data = [
    ["Nova Kaiser Dragoon", 50, 50, 2],
    ["Ignited Dragoon", 15, 20, 3],
];

var water_elem_buffs_data = [
    ["Aqua Kaiser Dragoon", 50, 50, 2],
    ["Aurora Dragoon", 15, 20, 3],
    ["President Verde", 20, 20, 3],
];

var wind_elem_buffs_data = [
    ["Gale Kaiser Dragoon", 50, 50, 2],
    ["Tempest Dragoon", 15, 20, 3],
];

var thunder_elem_buffs_data = [
    ["Pulse Dragoon", 50, 50, 2],
    ["Lightning Dragoon", 15, 20, 3],
];

var light_elem_buffs_data = [
    ["God Kaiser Dragoon", 50, 50, 2],
    ["Ray Dragoon", 15, 20, 3],
    ["Sacred Conviction", 25, 25, 3],
];

var dark_elem_buffs_data = [
    ["Evil Kaiser Dragoon", 50, 50, 2],
    ["Guilty Dragoon", 15, 20, 3],
];

var fire_resist_buffs_data = [
    ["Reiki", 15, 1],
    ["Pure Aqua", 35, 2],
    ["Flute of Love", 30, 2],
    ["Aqua Wings", 25, 2],
];

var water_resist_buffs_data = [
    ["Acropolis", 40, 1],
];

var wind_resist_buffs_data = [
    ["Gale Seal", 40, 2],
    ["Scatter of Fireworks", 30, 1],
];

var thunder_resist_buffs_data = [
    ["Kyuki", 10, 2],
    ["Fleurety", 10, 3],
    ["Rahab", 10, 3],
    ["Aero Revoke", 35, 2],
];

var light_resist_buffs_data = [
    ["Ease Sophia", 20, 3],
    ["Alinate Blackness", 10, 3],
];

var dark_resist_buffs_data = [
    ["Shune Psalm", 25, 2],
];

var elem_resist_buffs = 0;

var dmg_cut_once_buffs = [
    "Brain Narcotic",
    "Divination",
    "Doxa Rescinded",
    "Full Cover Guard",
    "Illuyanka", ["Innocent", () => playerSELevel(getCharacter("Takeminakata"), "takeminakata_sword") >= 2],
    "Maiden Guardian",
    "Refined Tactics",
];

var dmg_cut_buffs = [
    ["Para Mail", numParticipantsAtLeast(5)],
    ["Twelve Warriors", numParticipantsAtLeast(5)],
    ["Voice of the Gods", numParticipantsAtLeast(5)],

    ["Aurora Shelter", bigHitWithin(2)],
    ["Azim Ossi Leon", bigHitWithin(2)],
    ["Ballet Religio", bigHitWithin(3)],
    ["Brilliant Protector", bigHitWithin(1)],
    ["Build Fortress", bigHitWithin(2)],
    ["Genesis", bigHitWithin(1)],
    ["Hysteric Flow", bigHitWithin(1)],
    ["Para Mail", bigHitWithin(1)],
    ["Raijin's Dance", bigHitWithin(1)],
    ["Regenesis", bigHitWithin(1)],
    ["Shade Veil", bigHitWithin(3)],
    ["Star Num Buckler", bigHitWithin(1)],
    ["Throne Barrier", bigHitWithin(2)],
    ["Twelve Warriors", bigHitWithin(1)],
    ["Voice of the Gods", bigHitWithin(1)],
];

var reflect_buffs = [
    ["Compute Scope", bigHitWithin(2)],
    ["Fin Reflect", bigHitWithin(1)],
    ["Horus", bigHitWithin(1)],
    ["Laminate Mirror", bigHitWithin(2)],
    ["Parry Command", bigHitWithin(2)],
    ["Pomp and Circumstances", bigHitWithin(2)],
    ["Revitalize", bigHitWithin(3)],
    ["Exult Combat", bigHitWithin(3)],
];

var nullify_buffs = [
    ["Banish Signal", bigHitWithin(1)],
    ["Blizzard Surgam", bigHitWithin(1)],
    ["Botania Telon", bigHitWithin(1)],
    ["Caz Hysteria", bigHitWithin(2)],
    ["Dimension Barrier", bigHitWithin(1)],
    ["Food of the Gods", bigHitWithin(1)],
    ["Foresight", bigHitWithin(1)],
    ["Frozen Solid", bigHitWithin(2)],
    ["Hallucination", bigHitWithin(1)],
    ["Heat Haze", bigHitWithin(1)],
    ["Karmat Torrator", bigHitWithin(2)],
    ["Mermaid Step", bigHitWithin(1)],
    ["Monarch Silt", bigHitWithin(1)],
    ["Mother Earth", bigHitWithin(2)],
    ["Movement Research", bigHitWithin(1)],
    ["Phone Feste", bigHitWithin(1)],
    ["Premonition", bigHitWithin(1)],
    ["Rickless Wheel", bigHitWithin(2)],
    ["Ross Entity", bigHitWithin(2)],
    ["Scaled Barrier", bigHitWithin(1)],
    ["Sneek Step", bigHitWithin(1)],
];

var a_frame_def_buffs = [
    ["Cursed Canting Chains", bigHitWithin(3)],
    ["Ruthless Beauty", bigHitWithin(3)],
    ["Divine Solar Shield", bigHitWithin(3)],
    ["Dura Defense", bigHitWithin(3)],
    ["Sunwa Shield", bigHitWithin(3)],
    ["Cupidophilia", bigHitWithin(3)],
    ["Pure Spirit", bigHitWithin(3)],
    ["Victor Shield", bigHitWithin(3)],
    ["Luna Veil", bigHitWithin(3)],
    ["Repulsive Force", bigHitWithin(2)],
    ["Carlavitty", bigHitWithin(2)],
    ["Freely Lenajum", bigHitWithin(3)],
    ["Square-circular Stratagem", bigHitWithin(3)],
];

var b_frame_def_buffs = [
    ["Secret Traiing", bigHitWithin(3)],
    ["Cyber Focus", bigHitWithin(3)],
    ["Mire Suho Prison", bigHitWithin(3)],
    ["Argore Fliegen", bigHitWithin(3)],
    ["Deia Wing", bigHitWithin(3)],
    ["Divine Revelation", bigHitWithin(3)],
    ["Fairy Song", bigHitWithin(3)],
    ["Fiery Song", bigHitWithin(3)],
    ["Motherland", bigHitWithin(3)],
    ["Assault Shield", bigHitWithin(3)],
    ["Diesal Fever", bigHitWithin(3)],
    ["Mater Idea", bigHitWithin(3)],
    ["Prepare Strategy", bigHitWithin(3)],
];

var c_frame_def_buffs = [];

var sb_frame_def_buffs = [
    ["Amaru", bigHitWithin(3)],
    ["Fafnir", bigHitWithin(2)],
    ["Hecatonchires", bigHitWithin(3)],
    ["Rudra", bigHitWithin(3)],
];

var def_buffs = [
    ["Cursed Canting Chains", numParticipantsAtLeast(5)],
    ["Ruthless Beauty", numParticipantsAtLeast(5)],
    ["Perfect Black", someCharDontHave("light_resist_buff", "sb")],
    [a_frame_def_buffs, someCharDontHave("def_buff", "a")],
    [b_frame_def_buffs, someCharDontHave("def_buff", "b")],
    [c_frame_def_buffs, someCharDontHave("def_buff", "c")],
    [sb_frame_def_buffs, someCharDontHave("def_buff", "sb")],
];

var dmg_reductions = [
    [elem_resist_buffs],
    [dmg_cut_once_buffs, bigHitWithin(1)],
    [dmg_cut_buffs],
    [reflect_buffs],
    [nullify_buffs],
    [def_buffs],
    [def_buffs, bigHitWithin(1)],
];

var party_cleanse_abilities = [
    ["Sunlight Furnace", () => hasBuff("Sol [Awakened]", "recovery_limit_buff")],
    ["Medical Check", () => hasBuff("Dian Cecht", "recovery_limit_buff")],
    "Behemoth",
    "Electric Pulse",
    "Glistening Removal",
    "Guard Abu Route",
    "Maiden's Prayer",
    "Purification",
    "Raise Formea",
    "Wash Detox",
];

var revives = [
    "Resuscitation",
];

var self_heals_data = [
    ["All for One", "D'Artagnan", 2000, 6],
    ["Almighty", "Baldr", 1500, 8],
    ["Beyond the World", "(Paradise Wind) Yamaraja", 6000, 7], // Heals 50% of "MISSING" HP
    ["Cosmo Charge", "Brahma (Awakened)", 2000, 6],
    ["Cosmo Charge", "Brahma", 1500, 6],
    ["Divine Black Blood", "Susanoo (Awakened)", 2000, 6],
    ["Divine Black Blood", "Susanoo", 1500, 7],
    ["Elysian Savior", "El", 3600, 5], // heals 30% of Max HP
    ["Eternal Gale", "Gaia", 2000, 7],
    ["Eureen Hac", "Dis", 800, 7],
    ["Ever Regain", "Justitia", 4500, 6, () => neededToBurst("Justitia") > 0], // -30 BG
    ["Fatigue Mend", "Argos", 800, 6],
    ["Flying Sword", "Akane", 1200, 6],
    ["Glacie Ace Robe", "Luna", 1000, 9],
    ["Hateful Smash", "Thor", 1500, 6],
    ["High Voltage Heel", "Indra", 800, 5],
    ["Idea Proof", "Shamash", 1500, 6],
    ["In-Guest Flare", "Molech", 1500, 9],
    ["Leila Volmos", "Vulthoom", 1500, 8],
    ["Luminotherapy", "Diana", 1500, 6],
    ["Moonshine", "Billy the Kid", 1000, 4],
    ["Night Curtain", "Apep", 500, 6],
    ["Nutrient", "Ceridwen", 1200, 6],
    ["Pillage", "Granuaile", 1500, 5],
    ["Resolution", "Jupiter", 1200, 6, () => neededToBurst("Jupiter") > 0], // +30 BG
    ["Rose Drain", "Maeve", 1000, 9],
    ["Shocker", "Skuld", 1000, 7],
    ["Special Takoyaki", "Triton", 1500, 6],
    ["Stir the Intent", "Isis", 2000, 8], // applies fortitude once

    ["Botania Telon", "Cybele (Unleashed)", 1500, 6], // 1 turn of nullify
    ["Caz Hysteria", "Neamhain", 2000, 10], // 2 turns of nullify
    ["Movement Research", "(Deep Sea Ray) Gabriel", 1500, 6], // 1 turn of nullify

];

var single_heals_data = [
    ["Evil Lightning Impact", 1000, 2], // Cleanse 1 Affliction for ally
    ["Holy Sheath's Ray", 1800, 6],
    ["Love Kiss", 1200, 5],
    ["Medic Potion", 1500, 6],
    ["Otamashi Furi", 800, 5],
    ["Perdu Lab", 1200, 5],
    ["Reclaim Photo", 2000, 4], // Applies a 2k Barrier to target
    ["Solar Healing", 1200, 6],
    ["Tear Deviation", 9000, 6], // heals 100% hp, -20% self max hp
    ["Vigorous Heal", 350, 3], //Applies a 1k Barrier to target
    ["Ghat Hakra", 2500, 2], //Applies a 1k Barrier to target
];

var self_heals = self_heals_data.map(t => [t[0], () => lostHP(t[1]) >= 0.75 * t[2]].concat(t.slice(4)));
self_heals.push(["Innocent", () => curHP("Takeminakata") < 5000]);

var single_heals = single_heals_data.map(t => [t[0], () => maxLostHP() >= 0.8 * t[1]].concat(t.slice(3)));
single_heals.push(["bottle", shouldUseSingleHeal(0.4)]);

// name, heal amount, cooldown
var party_heals = [
    ["Hero's Salvation", () => hasBuff("Andromeda", "recovery_limit_buff") && shouldUsePartyHeal(1600, 5)],
    ["Dark Harvest", () => hasBuff("Osiris", "recovery_limit_buff")],
    ["Hero's Salvation", numParticipantsAtLeast(5)],
    ["Healing Wave", numParticipantsAtLeast(5)],
    ["Cure Water", numParticipantsAtLeast(5)],
    ["Immunity Up"],
    ["Active Flow", shouldUsePartyHeal(1500, 7)],
    ["Angel Feather", shouldUsePartyHeal(750, 5)],
    ["Beauty Aqua", shouldUsePartyHeal(1500, 7)],
    ["Care Knowledge", shouldUsePartyHeal(1000, 6)],
    ["Cure Water", shouldUsePartyHeal(750, 5)],
    ["Dark Harvest", shouldUsePartyHeal(1100, 5)],
    ["Entire Recovery", shouldUsePartyHeal(1000, 5)],
    ["Fiery Embrace", shouldUsePartyHeal(1200, 6)],
    ["Flowering Treatment", shouldUsePartyHeal(1200, 6)],
    ["Healing Wave", shouldUsePartyHeal(1200, 5)],
    ["Hero's Salvation", shouldUsePartyHeal(1600, 5)],
    ["Logistic Bellmouth", shouldUsePartyHeal(1200, 8)],
    ["Makina Regenerate", shouldUsePartyHeal(1500, 6)],
    ["Medical Check", shouldUsePartyHeal(1500, 6)],
    ["Orfick Rua", shouldUsePartyHeal(1000, 6)],
    ["Recovery Phaser", shouldUsePartyHeal(1800, 7)],
    ["Refreshing Candy", shouldUsePartyHeal(1750, 8)],
    ["Remedy Gifts", shouldUsePartyHeal(1000, 6)],
    ["Return of Spring", shouldUsePartyHeal(500, 5)],
    ["Screen Iris", shouldUsePartyHeal(1500, 8)],
    ["Spiritual Repos", shouldUsePartyHeal(1200, 10)],
    ["Sunlight Furnace", shouldUsePartyHeal(1800, 6)],
    ["Sunset Cure", shouldUsePartyHeal(1500, 6)],
    ["Transformer Fuse", shouldUsePartyHeal(800, 6)],
    ["Vitality", shouldUsePartyHeal(1000, 6)],
    ["Winds of Prosperity", shouldUsePartyHeal(500, 5)],
    ["medic", shouldUsePartyHeal(3200, 20)],
];

var blocks = [
    ["Perfect Black", () => !hasBuff("Hades [Awakened]", "block_affliction")],
    ["Devil's Kiss", () => !hasBuff("Amon", "block_affliction")],
    "Blazing Heart",
];

var heals = [
    quest_type == "prizehunt" ? "Hero's Salvation" : "", [blocks],
    [party_cleanse_abilities, shouldUsePartyCleanse()],
    [revives, shouldUseRevive()],
    [party_heals],
    [self_heals],
    [single_heals],
];

var rage_damages = [
    "Annihilation Snipe",
    "Catastrophe Fist",
    "Conviction of Thunder",
    "Dispiriting Fire",
    "Giant Slayer",
    "Grendel Killer",
    "Impulse Pierce",
    "Overdrive",
    "Reckless Courage",
    "Septem Trigger",
    "Surprise Claw",
    "Zau Simos",
    "Hydro Burst"
    // ...
];

var stun_damages = [
    "Scythe Khrima",
    // ...
];

var damages = [
    "Holy Ascension",
    "Series Landing", ["Fogablaigi", () => !willBurst("Lugh")],
    [rage_damages, targetIsRaging()],
    [stun_damages, targetIsStunned()],
];



var paralyse_abilities = [
    "Blitz Donner",
    "Entrap Across",
    "Evil Eye's Curse",
    "Place Under",
    "Usha Ritz Tether",
];

var rampage_buffs = [
    "Act Arbitration",
    "Ardent Sati",
    "Argria Steron",
    "Bewitching Sedition",
    "Demon Shout",
    "Doping Tonic",
    "Ferrox Draw II",
    "Frenzy Sweetness",
    "Genocide Breaker",
    "Headlong Charge",
    "Incite Madness",
    "Light Runaway",
    "Magical Mischief",
    "Mega Therion", ["Nandi", () => false],
    ["Psychadelic Singing", shouldUsePartyZeal(10, 10)],
    "Thermal Frenzy",
    "Trans Berserk",
    "Tuela Ane",
    "Proud Pulse",
];

var just_before_attack_abilities = [
    ["Exult Combat", () => false],
    ["Cremated Scream", () => hasBuff("[Emperor of Hell] Beelzebub", "block_affliction")],
    [paralyse_abilities],
    [rampage_buffs, shouldUseRampage()],
];

buffs.push({ colour: "yellow", exclude: [buffs, dmg_reductions, just_before_attack_abilities] });
debuffs.push({ colour: "blue", exclude: [debuffs, just_before_attack_abilities] });
heals.push({ colour: "green", exclude: [heals] });
damages.push({ colour: "red", exclude: [damages, buffs, debuffs, just_before_attack_abilities] });

var attack = [
    ["no_burst_attack", () => saveForFullBurst() && !allCanBurst()],
    "burst_attack"
];

var snatch_abilities = [
    "Snatch 3rd",
    "Snatch Ex",
    "Snatch 2nd",
    "Snatch",
    "Lexplander",
    "Scrounge",
    "More Please",
];

var snatch_attack_actions = [
    "San Michel",
    "Sniper Shot", [snatch_abilities],
    [heals],
    [attack],
];

var arianrod_ue_actions = [
    ["Esthetic Set", () => neededToBurst("Arianrod") > 40, () => enemiesSEDur("paralyse") <= 10, () => isUsable("Transfer Refill")],
    ["Esthetic Set", () => neededToBurst("Arianrod") > 40, () => enemiesSEDur("paralyse") <= 10, () => playerSELevel(getCharacter("Arianrod"), "arianrod_arrow") >= 2],
    "Transfer Refill",
];

var ue_actions = [
    [arianrod_ue_actions],

    [attack, () => enemiesSEDur("paralyse") >= 5, () => getAttackResponseTimeout() >= 9000],

    [status_resist_debuffs_when_running_out],
    [elem_resist_debuffs_when_running_out],
    [def_debuffs_when_running_out],

    [paralyse_abilities],
];

var all_para_action = [
    // [heals, () => bw.enemyStatusBarList[getTarget()]._name == "Prison of Darkness Catastrophe"],
    [attack]
];

var normal_actions = [
    [all_para_action, () => enemiesSEDur("paralyse") >= 3],
    [buffs],
    [debuffs],
    [dmg_reductions],
    [heals],
    [attack, targetIsRaging(), () => quest_type == "event_union_demon_raid"],
    [damages],
    [just_before_attack_abilities],
    [attack]
];

var actions = [
    [snatch_attack_actions, () => quest_type == "daily"],
    [snatch_attack_actions, () => quest_type == "event" && getMaxEnemyLevel() <= 25],
    [snatch_attack_actions, () => quest_type == "event_raid" && getMaxEnemyLevel() <= 35],
    [snatch_attack_actions, () => quest_type == "raid" && getMaxEnemyLevel() <= 50],
    [snatch_attack_actions, () => quest_type == "event_story" && getMaxEnemyLevel() <= 50],
    [snatch_attack_actions, () => quest_type == "epic" && getMaxEnemyLevel() <= 50],
    [snatch_attack_actions, () => quest_type == "prizehunt" && getMaxEnemyLevel() < 50],
    [ue_actions, () => quest_type == "event_union_demon_raid"],
    [normal_actions],
];

function performAction() {
    selectEnemyTarget();
    getUsableActions();

    //	let before_time = Date.now();
    if (!tryToUseAction([actions])) {
        console.error("No action selected!");
    }
    //	let after_time = Date.now();

    //	console.error("Select action took: " + (after_time - before_time) + "ms");

    addStatusEffects();
}

function selectEnemyTarget() {
    var esbl = bw.enemyStatusBarList.filter(Boolean);
    if (esbl.length == 1) return;
    enemy_priority_list.some(r => {
        if (typeof r == "string") {
            let e = esbl.find(t => t._name == r);
            if (e) {
                _.invoke(_.compact(bw.enemyStatusBarList), "untarget");
                ccui.helper.seekWidgetByName(e.ui, kh.ENEMY_STATUS_BAR_ELEMENT_NAMES.TARGET).setVisible(!0);
                return true;
            }
            return false;
        }
        if (Array.isArray(r)) {
            let e = esbl.find(t => t._name == r[0]);
            if (e && r.slice(1).every(t => t())) {
                _.invoke(_.compact(bw.enemyStatusBarList), "untarget");
                ccui.helper.seekWidgetByName(e.ui, kh.ENEMY_STATUS_BAR_ELEMENT_NAMES.TARGET).setVisible(!0);
                return true;
            }
            return false;
        }
        console.error("Unrecognised rule form for target!" + r);
    });
}


function getUsableActions() {
    usable_actions = [];
    aliveCharacters().forEach(c => {
        bw.characterAbilityList[c.index].forEach(a => {
            if (!a.isUsable()) return;
            if (!a._abilityData.name) return;
            if (usedThisTurn.has(a._abilityData.name)) return;
            usable_actions.push({
                name: a._abilityData.name.replace(/\++$/g, ''),
                colour: a.color,
                execute: () => {
                    usedThisTurn.add(a._abilityData.name);
                    let target = getAbilityTarget(a);
                    bw.battleStatus.forceNextUpdate("_abilityNotSatisfied");
                    let timeout = includesAbility(rampage_buffs, a) ? Infinity : getAbilityResponseTimeout();
                    let delay = includesAbility(rampage_buffs, a) ? 2000 : getRndInteger(600, 1500);
                    Q.delay(delay).then(() => {
                        sendAction(
                            apibattle.postAbilityJson(quest_type, c.index, a.getIndex(), target),
                            timeout
                        );
                    });
                }
            });
        });
    });
    if (!usedThisTurn.has("summon") && !_.isEmpty(bw.characterList[0]) && bw.characterList[0].isJob) {
        let pl = kh.createInstance("battleUI").SummonButton.panelList;
        if (pl) pl.forEach((s, i) => {
            if (!s) return;
            if (s._card._turnLabel._stringValue != "") return;
            usable_actions.push({
                name: s._summonData.name,
                execute: () => {
                    usedThisTurn.add("summon");
                    sendAction(
                        apibattle.postAttackSummonJson(quest_type, i),
                        getAbilityResponseTimeout()
                    );
                }
            });
        });
    }
    if (!usedThisTurn.has("medic") && kh.createInstance("curePopup")._getCureItemData("cure_medic").count > 0) {
        usable_actions.push({
            name: "medic",
            execute: () => {
                usedThisTurn.add("medic");
                sendAction(
                    apibattle.postUseItem(quest_type, "cure-medic"),
                    getAbilityResponseTimeout()
                );
            }
        });
    }
    if (!usedThisTurn.has("bottle") && kh.createInstance("curePopup")._getCureItemData("cure_bottle").count > 0) {
        usable_actions.push({
            name: "bottle",
            execute: () => {
                usedThisTurn.add("bottle");
                var pos = aliveCharacters().reduce((a, b) => a.hp / a.maxHp < b.hp / b.maxHp ? a : b).index;
                sendAction(
                    apibattle.postUseItem(quest_type, "cure-bottle", pos),
                    getAbilityResponseTimeout()
                );
            }
        });
    }

    usable_actions.push({
        name: "burst_attack",
        execute: () => {
            Q.delay(getRndInteger(600, 1500)).then(() => {
                sendAction(
                    apibattle.postAttack(quest_type, true, bw.getTarget()),
                    getAttackResponseTimeout()
                );
            })
        }
    });

    usable_actions.push({
        name: "no_burst_attack",
        execute: () => {
            Q.delay(getRndInteger(600, 1500)).then(() => {
                sendAction(
                    apibattle.postAttack(quest_type, false, bw.getTarget()),
                    getAttackResponseTimeout()
                );
            })
        }
    });

    usable_actions.push({
        name: "wait",
        execute: () => {
            var d = Q.defer();
            d.promise.then(() => kh.createInstance("autoScenarioHandler").runPostAttackScenario());
            Q.delay(100).then(d.resolve);
        }
    })

}

function sendAction(p, timeout) {
    var scene_id = bw._getSceneInstanceId();
    var d = Q.defer();
    d.promise.then(function() {
        return bw._verifySceneInstance(scene_id) ? void(kh.createInstance("stage").isStageCleared() || kh.createInstance("autoScenarioHandler").runPostAttackScenario()) : Q.resolve("Scenario aborted due to a reload")
    }).fail(function(err) { console.error(err); });
    p.then(
        function(t) { return processServerResponse(t, scene_id).then(d.resolve).fail(function(err) { console.error(err); }); },
        function(err) {
            console.error(err);
            d.resolve();
        }
    )
    if (timeout != Infinity) setTimeout(d.resolve, timeout);
    actionPromises.push(p);
}

function processServerResponse(t, scene_id) {
    var s = t.body.scenario || t.body.pubsubScenario;
    if (s && s.length && ["win", "lose"].includes(s[s.length - 1].cmd)) {
        kh.createInstance("autoScenarioHandler").interrupt();
    }
    return queueForProcessing()
        .then(function() {
            if (scene_id !== undefined && !bw._verifySceneInstance(scene_id)) return;
            return bw._handleData(t);
        })
        .then(function() {
            resolveNextForProcessing();
            return Q.resolve();
        }, function(err) {
            resolveNextForProcessing();
            console.error(err);
            return Q.resolve();
        });
}

function queueForProcessing() {
    if (processingServerResponse) {
        var s = Q.defer();
        processServerResponseQueue.push(s);
        return s.promise;
    } else {
        processingServerResponse = true;
        return Q.resolve();
    }
}

function resolveNextForProcessing() {
    if (processServerResponseQueue.length) {
        var s = processServerResponseQueue.shift();
        s.resolve();
    } else {
        processingServerResponse = false;
    }
}

function getAbilityTarget(a) {
    let i;
    let acl = aliveCharacters();
    let c;
    if (includesAbility(single_heals, a)) {
        return aliveCharacters().reduce((a, b) => a.hp / a.maxHp < b.hp / b.maxHp ? a : b).index;
    }
    if (!a._abilityData.party_member_selectable) return bw.getTarget();
    if (a._abilityData.name.startsWith("Fond in Part")) {
        c = getCharacter("Michael [Awakened]");
        if (c && playerSETurn(c, "triple_attack_buff") == 0) return c.index;
        c = getCharacter("Tishtrya");
        if (c && playerSETurn(c, "triple_attack_buff") == 0) return c.index;
        return acl[0].index;
    }
    if (a._abilityData.name.startsWith("Ghaggar Tihai") || a._abilityData.name.startsWith("Jor Helmand")) {
        c = getCharacter("Hercules");
        if (c) return c.index;
        c = getCharacter("Shiva [Awakened]");
        if (c) return c.index;
        return acl[0].index;
    }
    if (a._abilityData.party_member_selectable_type == "heal") {
        return aliveCharacters().reduce((a, b) => a.hp / a.maxHp < b.hp / b.maxHp ? a : b).index;
    }
    if (a._abilityData.party_member_selectable_type == "revive") {
        return bw.characterList.concat(bw.subList || []).map((t, n) => ({ character: _.isEmpty(t) ? kh.createInstance("FallenAvatarOrderHandler").getFallenByCharacterIndex(n) : t, index: n }))
            .find(t => t.character.hasFallen || 0 === t.character.hp).index;
    }
    if (a._abilityData.party_member_selectable_type == "buff") {
        return acl[Math.floor(Math.random() * acl.length)].index;
    }
    console.error("No target for ability");
    return undefined;
}

function includesAbility(l, a) {
    return l.map(u => Array.isArray(u) ? u[0] : u).some(t => a._abilityData.name.startsWith(t));
}

function tryToUseAction(t) {
    if (typeof t == "string") {
        let a = usable_actions.find(u => u.name == t);
        return a ? (a.execute(), true) : false;
    }
    if (Array.isArray(t)) {
        if (typeof t[0] == "string") {
            let a = usable_actions.find(u => u.name == t[0]);
            return (a && t.slice(1).every(u => u())) ? (a.execute(), true) : false;
        }
        if (Array.isArray(t[0])) {
            if (t[0].some(u => u == undefined)) console.error(t[0]);
            return t.slice(1).every(u => u()) && t[0].some(u => tryToUseAction(u));
        }
        console.error("Unrecognised action rule head!" + t[0]);
        return false;
    }
    if (t.colour) {
        let a = usable_actions.find(u => u.colour == t.colour && !recursiveIncludes(t.exclude, u.name));
        return a ? (a.execute(), true) : false;
    }
    console.error("Unrecognised rule form!" + t);
    return false;
}

function recursiveIncludes(a, b) {
    if (typeof a == "string") return b == a;
    if (Array.isArray(a)) return a.some(t => recursiveIncludes(t, b));
    return false;
}

function isUsable(n) {
    return aliveCharacters().some(c =>
        bw.characterAbilityList[c.index].some(a =>
            a._abilityData.name.startsWith(n) && a.isUsable()
        )
    );
}

/*

function simulateDamage(starting_hps, rate_of_damage, rate_of_heal) {
	var hps = starting_hps.slice();
	hps.sort(function(a, b) { return a - b; });
	var damage = 0;
	for (let i = 0; i < 5; i++) {
		var rate_of_hp_decrease = rate_of_damage - rate_of_heal * (1 - i / 5);
		var survival_length = hps[i] / rate_of_hp_decrease;
		damage += survival_length * (5 - i);
		for (let j = i; j < 5; j++) {
			hps[j] -= hps[i];
		}
	}
	return damage;
}

function party_heal_now(heal_amount, cooldown, rate_of_damage) {
	heal_amount = (1 + ascension/100) * heal_amount;
	rate_of_damage = rate_of_damage || 2000;

	var cur_hps = bw.characterList.map(function(t) { return _.isEmpty(t) ? 0 : t.hp; });
	var max_hps = bw.characterList.map(function(t) { return _.isEmpty(t) ? 0 : t.maxHp; });

//	cur_hps = [6000, 12000, 12000, 6000, 12000];
//	max_hps = [14000, 14000, 14000, 14000, 14000];

	var num_alive = cur_hps.filter(function(t) { return t > 0; }).length;

	var normal_prob = 2 / 3;
	var aoe_overdrive_prob = 1 / 6;
	var random_overdrive_prob = 1 / 6;

	var heal_now_damage = 0;
	var heal_next_damage = 0;

	// In normal: random target, equal chance of 1, 2, 3 hits for 1.25 times damage
//	not right if we start off with dead people
	var normal_mult = 1.25;
	for (let i = 0; i < 5; i++) {
		if (cur_hps[i] == 0) continue;
		for (let j = 1; j <= 3; j++) {
			let hps;
			// heal now
			hps = cur_hps.slice();
			for (let k = 0; k < 5; k++) {
				if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount, max_hps[k]);
			}
			hps[i] = Math.max(hps[i] - j * normal_mult * rate_of_damage, 0);
			for (let k = 0; k < 5; k++) {
				if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount / cooldown, max_hps[k]);
			}
			heal_now_damage += normal_prob / 3 / num_alive * simulateDamage(hps, 5 * rate_of_damage, 3.75 * rate_of_damage);
			// heal next
			hps = cur_hps.slice();
			hps[i] = Math.max(hps[i] - j * normal_mult * rate_of_damage, 0);
			for (let k = 0; k < 5; k++) {
				if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount, max_hps[k]);
			}
			heal_next_damage += normal_prob / 3 / num_alive * simulateDamage(hps, 5 * rate_of_damage, 3.75 * rate_of_damage);
		}
	}

	// In AOE overdrive: everyone gets hit for 2 times damage
	var aoe_overdrive_mult = 2;
//	{
		let hps;
		// heal now
		hps = cur_hps.slice();
		for (let k = 0; k < 5; k++) {
			if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount, max_hps[k]);
			if (hps[k] != 0) hps[k] = Math.max(hps[k] - aoe_overdrive_mult * rate_of_damage, 0);
			if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount / cooldown, max_hps[k]);
		}
		heal_now_damage += aoe_overdrive_prob * simulateDamage(hps, 5 * rate_of_damage, 3.75 * rate_of_damage);
		// heal next
		hps = cur_hps.slice();
		for (let k = 0; k < 5; k++) {
			if (hps[k] != 0) hps[k] = Math.max(hps[k] - aoe_overdrive_mult * rate_of_damage, 0);
			if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount, max_hps[k]);
		}
		heal_next_damage += aoe_overdrive_prob * simulateDamage(hps, 5 * rate_of_damage, 3.75 * rate_of_damage);
//	}

	// In random overdrive: 5 random hits of 2 times damage
	var random_overdrive_mult = 2;
	var hits = [0, 0, 0, 0, 0];
	// 5 + num_alive - 1 choose num_alive - 1
	var num_cases = 1.0;
	for (let i = 1; i < num_alive; i++) {
		num_cases *= (5 + i) / i;
	}

	for (hits[0] = 0; hits[0] <= (cur_hps[0] != 0 ? 5 : 0); hits[0]++) {
		for (hits[1] = 0; hits[1] <= (cur_hps[1] != 0 ? 5 - hits[0] : 0); hits[1]++) {
			for (hits[2] = 0; hits[2] <= (cur_hps[2] != 0 ? 5 - hits[0] - hits[1] : 0); hits[2]++) {
				for (hits[3] = 0; hits[3] <= (cur_hps[3] != 0 ? 5 - hits[0] - hits[1] - hits[2] : 0); hits[3]++) {
					for (hits[4] = 0; hits[4] <= (cur_hps[4] != 0 ? 5 - hits[0] - hits[1] - hits[2] - hits[3] : 0); hits[4]++) {
						if (hits[0] + hits[1] + hits[2] + hits[3] + hits[4] != 5) continue;
						let hps;
						// heal now
						hps = cur_hps.slice();
						for (let k = 0; k < 5; k++) {
							if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount, max_hps[k]);
							if (hps[k] != 0) hps[k] = Math.max(hps[k] - hits[k] * random_overdrive_mult * rate_of_damage, 0);
							if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount / cooldown, max_hps[k]);
						}
						heal_now_damage += random_overdrive_prob / num_cases * simulateDamage(hps, 5 * rate_of_damage, 3.75 * rate_of_damage);
						// heal next
						hps = cur_hps.slice();
						for (let k = 0; k < 5; k++) {
							if (hps[k] != 0) hps[k] = Math.max(hps[k] - hits[k] * random_overdrive_mult * rate_of_damage, 0);
							if (hps[k] != 0) hps[k] = Math.min(hps[k] + heal_amount, max_hps[k]);
						}
						heal_next_damage += random_overdrive_prob / num_cases * simulateDamage(hps, 5 * rate_of_damage, 3.75 * rate_of_damage);
					}
				}
			}
		}
	}
	return heal_now_damage >= heal_next_damage;
}
*/
function normalcdf(x) {
    var z = x / Math.sqrt(2);
    var t = 1 / (1 + 0.3275911 * Math.abs(z));
    var a1 = 0.254829592;
    var a2 = -0.284496736;
    var a3 = 1.421413741;
    var a4 = -1.453152027;
    var a5 = 1.061405429;
    var erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    var sign = z < 0 ? -1 : 1;
    return (1 / 2) * (1 + sign * erf);
}

function dieProbMultiHit(hits, amount, num_targets) {
    num_targets = num_targets || aliveCharacters().length;
    return function(hp) {
        let n = hits;
        let p = 1 / num_targets;
        return normalcdf(-(hp / amount - n * p) / Math.sqrt(n * p * (1 - p)));
    };
}

function party_heal_now(amount, cooldown, die_prob) {
    amount = (1 + ascension / 100) * amount;
    die_prob = die_prob || dieProbMultiHit(5, 2000); // Can look at fight state to get a more accurate one
    return aliveCharacters().reduce((a, t) => a + die_prob(t.hp) * amount + amount / cooldown - 0.5 * Math.max(t.hp + amount - t.maxHp, 0), 0) >= 0;
}

function shouldUsePartyHeal(heal_amount, cooldown) {
    return () => party_heal_now(heal_amount, cooldown);
}

function shouldUseSingleHeal(threshold) {
    return () => aliveCharacters().map(t => t.hp / t.maxHp).reduce((a, b) => Math.min(a, b), 1) <= threshold;
}

function shoulUseDispelAbilities() {
    return () => {
        try {
            const abilityID = [5, 6, 7, 9, 13, 14, 15, 19, 21, 23, 24, 27, 35, 38, 58, 59, 75, 78, 84, 89, 101, 178, 215, 243, 295, 296, 303, 304, 305, 40003, 40001, 40005];
            const target = getTarget();
            if (bw.enemyStatusBarList[target])
                return bw.enemyStatusBarList[target]._statusEffectIconHandler._statusEffectList.filter(e => abilityID.includes(e._id)).length > 0;
            return false;
        } catch (e) {
            return false;
        }
    }
}

function curHP(n) {
    let c = getCharacter(n);
    return c && c.hp;
}

function hpPercent(n) {
    let a = getCharacter(n) || getEnemy(n);
    return a && a.hp / a.maxHp * 100;
}

function lostHP(n) {
    let c = getCharacter(n);
    return c && (c.maxHp - c.hp);
}

function curHPProp(n) {
    let c = getCharacter(n);
    return c && (c.hp / c.maxHp);
}

function maxLostHP() {
    return aliveCharacters().map(t => t.maxHp - t.hp).reduce((a, b) => Math.max(a, b), 0);
}

function shouldUseRevive() {
    return () => bw.characterList.concat(bw.subList || []).map((t, n) => ({ character: _.isEmpty(t) ? kh.createInstance("FallenAvatarOrderHandler").getFallenByCharacterIndex(n) : t, index: n }))
        .find(t => t.character.hasFallen || 0 === t.character.hp) != undefined;
}



function shouldUsePartyCleanse() {
    return () => {
        try {
            // const badStatuses = [10,11,12,16,17,18,22,25,26,54,55,56,57,58,59,60,61,62,63,64,65,69,89,114,120,134];
            // if (has(bw, "characterPanelList")){
            // 	const charStats = bw.characterPanelList;
            // 	let len = charStats.length;
            // 	if (len>5) {len=5;}
            // 	for (var i=0;i<len;i++) {
            // 		for (var j=0;j<badStatuses.length;j++){
            // 			if (has(bw,"statusEffectList",badStatuses[j],"_characters",i,0)){
            // 				return true;
            // 			}
            // 		}
            // 	}
            // }
            const badStatuses = [10, 11, 12, 16, 17, 18, 22, 25, 26, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 69, 89, 114, 120, 243, 134, 178, 300, 301, 40004];
            return _.filter(bw.statusEffectList, (item) => {
                return badStatuses.includes(item._id) && _.reduce(item._characters,
                    (sum, curr) => {
                        return (typeof sum === 'object' ? sum.length : sum) + curr.length;
                    });
            }).length > 0;
        } catch (e) {
            return false;
        }
    }
}

function has(obj) {
    var prop;
    if (obj !== Object(obj)) {
        return false;
    }
    for (i = 1; i < arguments.length; i++) {
        prop = arguments[i];
        if ((prop in obj) && obj[prop] !== null && obj[prop] !== 'undefined') {
            obj = obj[prop];
        } else {
            return false;
        }
    }
    return true;
}
// +t BG, -u% hp
function shouldUsePartyZeal(t, u) {
    return () => {
        return false;
        // ...
    }
}

function shouldUsePartyBarrier(x) {
    return () => {
        return someCharDontHave("barrier_buff");
        // ...
    }
}

function burstGauge(n) {
    let c = getCharacter(n);
    return c && c._avatarData.burst;
}

function neededToBurst(n) {
    var bgs = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
        if (_.isEmpty(bw.characterList[i])) continue;
        bgs[i] = bw.characterList[i]._avatarData.burst;
    }
    for (let i = 0; i < 5; i++) {
        if (_.isEmpty(bw.characterList[i])) continue;
        if (bw.characterList[i].name == n) return Math.max(100 - bgs[i], 0);
        if (bgs[i] >= 100) {
            var inc = 10;
            if (bw.characterList[i].name == "Michael [Awakened]") inc = 30;
            for (let j = i + 1; j < 5; j++) {
                bgs[j] += inc;
            }
        }
    }
}

function willBurst(n) {
    return saveForFullBurst() ? allCanBurst() : neededToBurst(n) == 0;
}

function numCanBurst(bgs, incs) {
    let s = 0;
    for (let i = 0; i < bgs.length; i++) {
        if (bgs[i] >= 100) {
            s++;
            for (let j = i + 1; j < bgs.length; j++) bgs[j] += incs[i];
        }
    }
    return s;
}

function noneCanBurst() {
    let chars = aliveCharacters();
    let incs = chars.map(t => t.name == "Michael [Awakened]" ? 30 : 10);
    let bgs = chars.map(t => t._avatarData.burst);
    return numCanBurst(bgs, incs) == 0;
}

function allCanBurst() {
    let chars = aliveCharacters();
    let incs = chars.map(t => t.name == "Michael [Awakened]" ? 30 : 10);
    let bgs = chars.map(t => t._avatarData.burst);
    return numCanBurst(bgs, incs) == chars.length;
}

// party BG buff allows more himes to burst
function allowsMoreBurst(amount) {
    return () => {
        let chars = aliveCharacters();
        let incs = chars.map(t => t.name == "Michael [Awakened]" ? 30 : 10);
        let bgs = chars.map(t => t._avatarData.burst);
        let bgs2 = chars.map(t => t._avatarData.burst + amount);
        return numCanBurst(bgs2, incs) > numCanBurst(bgs, incs);
    }
}

// self BG buff allows full burst
function allowsFullBurst(name, amount) {
    return () => {
        let chars = aliveCharacters();
        let incs = chars.map(t => t.name == "Michael [Awakened]" ? 30 : 10);
        let bgs = chars.map(t => t._avatarData.burst);
        let bgs2 = chars.map(t => t._avatarData.burst + t.name == name ? amount : 0);
        return numCanBurst(bgs, incs) != chars.length && numCanBurst(bgs2, incs) == chars.length;
    }
}

// self BG buff has good chance of making full burst occur earlier
function speedsUpFullBurst(name, amount) {
    return () => {
        let chars = aliveCharacters();
        let incs = chars.map(t => t.name == "Michael [Awakened]" ? 30 : 10);
        let bgs = chars.map(t => t._avatarData.burst);
        let needed = [];
        let my_index;
        for (let i = 0; i < bgs.length; i++) {
            needed.push(Math.max(0, 100 - bgs[i]));
            if (chars[i].name == n) my_index = i;
            for (let j = i + 1; j < bgs.length; j++) bgs[j] += incs[i];
        }
        needed = needed.map(t => Math.ceil(t / 10));
        return my_needed > Math.max.apply(null, needed);
    }
}

// self BG buff has good chance of making self burst occur earlier
function speedsUpSelfBurst(name, amount) {
    return () => {
        let t = neededToBurst(name);
        return t > 0 && t > amount - 80;
    }
}

function shouldUseOrbEat() {
    return () => bw.enemyStatusBarList[getTarget()]._chargeTurnDotsActiveCount > 0;
}


function shouldUseRampage() {
    return () => {
        return true;
        // ...
    }
}

function saveForFullBurst() {
    if (burst_mode == 0) return false;
    if (burst_mode == 1) return true;
    //    let there_is_cc = ???;
    //    if (there_is_cc) return false;
    //    let someone_lagging_badly = ???;
    //    if (someone_lagging_badly) return false;
    //    if (someone_might_die_before_fb && !(BT || subs_have_100_BG_skill)) return false;
    //    if (bottom_add_in_wind_rag_alive) return false;
    //    if (dark_rag) return false;
    //    if (water_rag) return true;
    //    if (thunder_rag) return true;

    //    if (aliveEnemies().length > 1) return true;
    return false;
}

function someCharDontHave(type, frame) {
    return () => playersSETurnsMin(type, frame) == 0;
}

function noCharHave(type, frame) {
    return () => playersSETurnsMax(type, frame) == 0;
}

function debuffRunningOut(type, frame, threshold) {
    threshold = threshold || 20;
    return () => enemiesSEDur(type, frame) < threshold;
}

function bigHitWithin(turns) {
    return () => turns >= turnsToBossOverdrive() || highDmgTrigger();
}

function numParticipantsAtLeast(k) {
    return () => getNumParticipants() >= k;
}

function getCharacter(n) {
    return aliveCharacters().find(t => t.name == n);
}

function getEnemy(n) {
    return aliveEnemies().find(t => t.name == n);
}

function aliveCharacters() {
    return bw.characterList.filter(t => !_.isEmpty(t));
}

function aliveEnemies() {
    return bw.enemyList.filter(t => !_.isEmpty(t));
}

function getTarget() {
    let pos = bw.getTarget();
    return pos == -1 ? aliveEnemies()[0].index : pos;
}

function getMaxEnemyLevel() {
    return aliveEnemies().reduce((a, t) => Math.max(a, t._avatarData.level), 0);
}

function getSEID(type, frame) {
    return frame ? status_effect_ids[type][frame] : status_effect_ids[type];
}

function enemySEDur(e, t, f) {
    let u = bw.statusEffectList[getSEID(t, f)];
    return e && u && u._enemies[e.index] && u._enemies[e.index].length && u._enemies[e.index][0].seconds && u._enemies[e.index][0].seconds.get() || 0;
}

function playerSETurn(c, t, f) {
    let u = bw.statusEffectList[getSEID(t, f)];
    return c && u && u._characters[c.index] && u._characters[c.index].length && u._characters[c.index][0].turn || 0;
}

function playerSEBuff(c, t, f) {
    let u = bw.statusEffectList[getSEID(t, f)];
    return c && u && u._characters[c.index] && u._characters[c.index].length || 0;
}

function hasBuff(n, t, f, check) {
    let c = getCharacter(n);
    return c && (check ? playerSEBuff(c, t, f) > 0 : playerSETurn(c, t, f) > 0);
}

function playerSELevel(c, t, f) {
    let u = bw.statusEffectList[getSEID(t, f)];
    return c && u && u._characters[c.index] && u._characters[c.index].length && u._characters[c.index][0].level || 0;
}

function enemiesSEDur(t, f) {
    console.log(t, f);
    return aliveEnemies().map(e => enemySEDur(e, t, f)).reduce((a, b) => Math.min(a, b), Infinity);
}

function playersSETurnsMin(t, f) {
    return aliveCharacters().map(c => playerSETurn(c, t, f)).reduce((a, b) => Math.min(a, b), Infinity);
}

function playersSETurnsMax(t, f) {
    return aliveCharacters().map(c => playerSETurn(c, t, f)).reduce((a, b) => Math.max(a, b), 0);
}

function isRaid() {
    return ["raid", "event_raid", "event_union_demon_raid", "event_union_lilim_raid"].includes(quest_type);
}

function getNumParticipants() {
    return isRaid() ? kh.createInstance("battleUI").BattleUIHeader._currentParticipants : 1;
}

function getTurn() {
    return bw.turn.turnNumber;
}

function isRaging(n) {
    let e = n ? getEnemy(n) : getTarget();
    if (e) return e.statusPanel._modeGaugeTextRaging.isVisible();
}

function targetIsRaging() {
    return () => bw.enemyStatusBarList[getTarget()]._modeGaugeTextRaging.isVisible();
}

function targetIsStunned() {
    return () => bw.enemyStatusBarList[getTarget()]._modeGaugeTextStun.isVisible();
}

function turnsToBossOverdrive() {
    let boss = aliveEnemies().reduce((a, b) => a._avatarData.level > b._avatarData.level ? a : b);
    if (!boss.statusPanel._chargeTurnDotsCount) return 1;
    return boss.statusPanel._chargeTurnDotsCount - boss.statusPanel._chargeTurnDotsActiveCount + 1;
}

function modeGaugePercent(n) {
    let e = n ? getEnemy(n) : getTarget();
    if (e) return e.statusPanel._modeGauge.percent;
}

function waterRagTrigger() {
    let boss = getEnemy("Prison of Ice Catastrophe");
    if (!boss || boss._avatarData.level != 90) return false;
    if (parseInt(localStorage.water_rag_trigger) == battle_id) return false;
    return !!bw.statusEffectList[215];
}

function thunderRagTrigger() {
    let boss = getEnemy("Prison of Lightning Catastrophe");
    if (!boss || boss._avatarData.level != 90) return false;
    return aliveEnemies().length == 1;
}

function highDmgTrigger() {
    if (waterRagTrigger()) return true;
    if (thunderRagTrigger()) return true;
    return false;
}

function startAutoBattle() {
    if (getNumParticipants() < auto_start_participants) return;
    var ash = kh.createInstance("autoScenarioHandler");
    if (auto_start_aab_quest_types.includes(quest_type)) {
        ash.changeState(kh.AutoScenario.State.STATES.ABILITY);
        ash.interrupt();
    }
}

function postHelpRequest() {
    if (quest_type == "raid" && getMaxEnemyLevel() >= 70) {
        apibattle.postHelpRequest(false, false, false, quest_type);
    }
    if (quest_type == "event_raid") {
        apibattle.postHelpRequest(false, false, false, quest_type);
    }
}

function postStamp() {
    if (parseInt(localStorage.stamp_posted) == battle_id) return;
    localStorage.stamp_posted = battle_id;
    if (["raid", "event_raid", "event_union_demon_raid"].includes(quest_type)) {
        setTimeout(() => !turnOffHacks() ? apibattle.postStamp(quest_type, Math.floor(Math.random() * 48) + 1) : void 0, 5000 + Math.floor(Math.random() * 5000));
    }
}

async function startNextBattle() {}

async function getIds() {
    my_player_id = getStoredInt("my_player_id");
    if (!my_player_id) {
        my_player_id = (await apia._http.get({ url: "/a_players/me", json: { id_numeric: true } })).body.a_player_id;
        localStorage.my_player_id = my_player_id;
    }
    my_party_ids = getStoredArray("my_party_ids");
    if (!my_party_ids.length) {
        my_party_ids = (await apia._http.get({ url: "/a_parties_decks" })).body.decks.map(t => t.a_party_id);
        localStorage.my_party_ids = JSON.stringify(my_party_ids);
    }
    half_elixir_id = getStoredInt("half_elixir_id");
    if (!half_elixir_id) {
        half_elixir_id = (await apia._http.get({ url: "/a_items", json: { type: "cure_evolution", page: 1, per_page: 100000 } })).body.data.find(t => t.name == "Half Elixir").a_item_id;
        localStorage.half_elixir_id = half_elixir_id;
    }
    energy_seed_id = getStoredInt("energy_seed_id");
    if (!energy_seed_id) {
        energy_seed_id = (await apia._http.get({ url: "/a_items", json: { type: "cure_evolution", page: 1, per_page: 100000 } })).body.data.find(t => t.name == "Energy Seed").a_item_id;
        localStorage.energy_seed_id = energy_seed_id;
    }
    if (checkTimeStamp("get_event_info", 3.6e6)) {
        localStorage.setItem("last_get_event_info", Date.now().toString());
        let r = (await apia._http.get({ url: "/a_banners/event_on_period" })).body.data;
        let e;
        e = r.find(t => t.navigate_page.startsWith("unionraid"));
        localStorage.ue_event_id = e && e.event_id;
        e = r.find(t => t.navigate_page.startsWith("conquest"));
        localStorage.advent_event_id = e && e.event_id;
        e = r.find(t => t.navigate_page.startsWith("raidevent"));
        localStorage.raid_event_id = e && e.event_id;
    }
    ue_event_id = getStoredInt("ue_event_id");
    advent_event_id = getStoredInt("advent_event_id");
    raid_event_id = getStoredInt("raid_event_id");
}


/*
function announceBotRoom() {
	if (quest_type == "event_union_demon_raid" && use_speed_hack_in_ue && !_.isEmpty(bw.enemyList[0])) {
		level = bw.enemyList[0]._avatarData.level;
		var xhr = new XMLHttpRequest();
		xhr.open("POST", "https://discordapp.com/api/webhooks/584327141642993664/eh70Sy8TKrW7-tDeliHeaKZf8N2iVWWB89nlC1vFYZW5e4qYVL-SYLZ3QHTDoEl1r2vw", true);
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify({
			"username": discord_nick_name,
			"content": "Speedbot entering room " + level
		}));
	}
}
*/

var contains_non_union_members = false;

async function checkTurnOffHacks() {
    if (quest_type != "raid" && quest_type != "event_raid") return;
    my_union_members = (await apia._http.get({ url: "/a_unions/me/members", json: { page: 1, per_page: 100000 } })).body;
    for (var i = 0; i < my_union_members.max_record_count; i++) {
        my_unions_member_array.push(my_union_members.data[i].name);
    }
    if (!contains_non_union_members) {
        r = await apibattle.getRanking(quest_type);
        r.body.forEach(t => {
            if (!my_unions_member_array.includes(t.player_name)) {
                contains_non_union_members = true;
                localStorage.contains_non_union_members = battle_id;
                console.log("found " + t.player_name);
            }
        });
    }
}

var hacks_turned_off = false;

function turnOffHacks() {
    let r = contains_non_union_members;
    if (r && !hacks_turned_off) {
        hacks_turned_off = false;
        // console.error("suỵt, có người ngoài!");
    }
    return playSafe && r;
}

var status_effects;

{
    var value = localStorage.getItem("status_effects");
    status_effects = (value ? JSON.parse(value) : {});
}

function addStatusEffects() {
    for (let id in bw.statusEffectList) {
        if (status_effects[id]) continue;
        status_effects[id] = {
            _description: bw.statusEffectList[id]._description,
            _id: bw.statusEffectList[id]._id,
            _type: bw.statusEffectList[id]._type,
        }
        localStorage.setItem("status_effects", JSON.stringify(status_effects));
    }
}

var ability_results;

{
    var value = localStorage.getItem("ability_results");
    ability_results = (value ? JSON.parse(value) : []);
}

function checkParaResult(s) {
    let statuses_to_collect = [
        "paralyse",
        "status_resist_debuff",
        "fire_resist_debuff",
        "water_resist_debuff",
        "wind_resist_debuff",
        "thunder_resist_debuff",
        "light_resist_debuff",
        "dark_resist_debuff",
    ];
    s.filter(t => t.cmd == "apply_status" && statuses_to_collect.map(u => status_effect_ids[u]).includes(t.id)).forEach(t => {
        t.affected_avatars.enemies.forEach(u => {
            let enemy_name = bw.enemyStatusBarList[u.pos]._name;
            let resist_debuffs = [];
            let e = bw.enemyList[u.pos];
            ["status", "fire", "water", "wind", "thunder", "light", "dark"].forEach(v =>
                enemySEDur(e, v + "_resist_debuff") && resist_debuffs.push(v)
            );
            ability_results.push({
                ability: last_ability_name,
                desc: t.description,
                target: enemy_name,
                resist_debuffs: resist_debuffs,
                applied: u.applied,
            });
            localStorage.setItem("ability_results", JSON.stringify(ability_results));
        });
    });
    if (last_ability_name) last_ability_name = null;
}

function checkTriggers(s) {
    s.filter(t => t.cmd == "message" && t.category == "Special Ability Activation").forEach(t => {
        if (t.name.startsWith("Prison of Ice Catastrophe activated End of Blizzard")) {
            localStorage.water_rag_trigger = battle_id;
        }
    });
}

function getStoredInt(t, d) {
    d = d || 0;
    let value = localStorage[t];
    return value ? parseInt(value) : d;
}

function checkTimeStamp(key, period) {
    var timestamp = parseInt(localStorage.getItem("last_" + key));
    return isNaN(timestamp) || Date.now() - timestamp >= period;
}

function getStoredArray(t, d) {
    d = d || [];
    let value = localStorage[t];
    return value ? JSON.parse(value) : d;
}

function replaceMethod(p, n, c, f) {
    let orig_f = p.prototype[n];
    p.prototype[n] = function g() {
        if (c()) {
            try {
                return f.apply(this, g.arguments);
            } catch (err) {
                console.error(err);
            }
        }
        return orig_f.apply(this, g.arguments);
    };
}

function insertBeforeMethod(p, n, c, f) {
    let orig_f = p.prototype[n];
    p.prototype[n] = function g() {
        if (c()) {
            try {
                f.apply(this, g.arguments);
            } catch (err) {
                console.error(err);
            }
        }
        return orig_f.apply(this, g.arguments);
    };
}

function insertBeforeAMethod(p, n, c, f) {
    let orig_f = p.prototype[n];
    p.prototype[n] = function g() {
        if (c()) {
            try {
                let g_this = this;
                let g_arguments = Array.prototype.slice.call(g.arguments);
                return f.apply(this, g.arguments).then(function() { return orig_f.apply(g_this, g_arguments); });
            } catch (err) {
                console.error(err);
            }
        }
        return orig_f.apply(this, g.arguments);
    };
}

function insertAfterMethod(p, n, c, f) {
    let orig_f = p.prototype[n];
    p.prototype[n] = function g() {
        orig_f.apply(this, g.arguments);
        if (c()) {
            try {
                f.apply(this, g.arguments);
            } catch (err) {
                console.error(err);
            }
        }
    };
}

var battle_ended = false;

console.errorOrig = console.error;
console.warnOrig = console.warn;

var overrideMethodsDone = false;

function overrideMethods() {
    if (overrideMethodsDone) { return; } else
        setTimeout(overrideMethods, 100);
    overrideMethodsDone = true;

    console.error = console.errorOrig;
    //	console.warn = console.warnOrig;

    var cmds_to_skip = Array(3);
    cmds_to_skip[0] = [];
    cmds_to_skip[1] = [
        t => t.cmd == "play_visual_effect",
    ];
    cmds_to_skip[2] = [
        t => t.cmd == "ability",
        t => t.cmd == "summon_movie",
        t => t.cmd == "receive_raid_points",
    ];
    var cmds_to_convert = Array(3);
    cmds_to_convert[0] = [];
    cmds_to_convert[1] = [];
    cmds_to_convert[2] = [
        t => t.cmd == "attack",
        t => t.cmd == "damage",
        t => t.cmd == "summon_damage",
    ];
    if (skip_burst_animation) {
        cmds_to_skip[0].push(t => t.cmd == "cutin");
        cmds_to_skip[0].push(t => t.cmd == "burst");
        cmds_to_convert[0].push(t => t.cmd == "damage" && t.animation_resource_type == "burst" && t.from == "player");
        cmds_to_convert[0].push(t => t.cmd == "burst_streak");
    }
    if (skip_messages) {
        cmds_to_skip[0].push(t => t.cmd == "message");
    }
    kh.BattleWorld.prototype._handleData = async function(t) {
        if (t.body.scenario) {
            checkParaResult(t.body.scenario);
            checkTriggers(t.body.scenario);
        }
        this.battleStatus._eventNotifier.triggerWhenChanged("ability_turns", null, t.body.status.ability_turns);
        if (t.body.scenario && !turnOffHacks()) {
            for (let i = 0; i <= skipAnimation(); i++) {
                t.body.scenario = t.body.scenario.filter(u => !cmds_to_skip[i].some(v => v(u)));
                t.body.scenario.forEach(u => u.cmd = cmds_to_convert[i].some(v => v(u)) ? "my_damage" : u.cmd);
            }
        }
        await this._load(t);
        await this._applyData(t.body);
        await this._updateBattleStatus(t.body);
    };
    kh.BattleCommandFactory.Registry.my_damage = kh.BattleCommandFactory.extend({
        create: function(t, e) {
            return {
                damage: e.damage,
                run: function() {
                    for (let j = 0; j < this.damage.length; j++) {
                        for (let k = 0; k < this.damage[j].length; k++) {
                            var avatar = (this.damage[j][k].to == "enemy" ? bw.enemyList[this.damage[j][k].pos] : bw.characterList[this.damage[j][k].pos]);
                            if (avatar && _.isFunction(avatar.processDamage)) avatar.processDamage(this.damage[j][k]);
                        }
                    }
                    return Q.resolve();
                }
            };
        }
    });

    // Compress attack animation
    insertBeforeMethod(kh.BattleCommand.Attack, "run", skipAnimation, function() {
        let damage = this.actionData.getModifyHPData();
        damage[0][0].value = damage.reduce((a, t) => a + t.reduce((b, u) => b + u.value, 0), 0);
        damage.splice(1, 2);
        Q.delay(800);
    });

    // Skip heal animation
    replaceMethod(kh.BattleCommand.Heal, "run", skipAnimation, function() {
        var mod_hp_data = this.actionData.getModifyHPData();
        mod_hp_data.forEach(t => t.forEach(u => {
            var avatar = (u.to == "enemy" ? bw.enemyList[u.pos] : bw.characterList[u.pos]);
            if (avatar && _.isFunction(avatar.processHeal)) avatar.processHeal(u);
        }));
        this.cleanUp();
        return Q.resolve();
    });

    // Skip apply status animation
    replaceMethod(kh.BattleCommand.ApplyStatus, "run", skipAnimation, function() {
        this._createStatusEffect(this.statusEffectData).applyStatusEffectToAvatars();
        this._clearBattleStatusCache();
        return Q.resolve();
    });

    // Skip remove status animation
    insertBeforeMethod(kh.BattleCommand.RemoveStatus, "run", skipAnimation, function() {
        this.statusEffectData.animation_id = null;
    });

    // Skip burst result animation
    replaceMethod(kh.BattleCommand.BurstResult, "run", () => skip_burst_animation, function() {
        this._playTotalAnimation(this.actionData.getTotalDamage());
        return Q.resolve();
    });

    // Speedup set enemy charge animation
    replaceMethod(kh.BattleCommand.SetEnemyChargeTurn, "run", skipAnimation, function() {
        var t = this.actionData.getCount();
        var e = this.actionData.getMax();
        var a = this.battleWorld.enemyStatusBarList[this.actionData.getPos()];
        if (!_.isUndefined(e)) a.adjustMaxChargeTurnDots(e);
        if (!_.isUndefined(t)) a.adjustActiveChargeTurnDots(t);
        return Q.resolve();
    });

    // Speedup set enemy mode animation
    replaceMethod(kh.BattleCommand.ChangeEnemyMode, "run", skipAnimation, function() {
        var n = this.actionData.getPos(),
            a = this.actionData.getType(),
            i = this.battleWorld.getAvatar(kh.ActionData.TARGET_NAMES.ENEMY, n);
        if (null == i || _.isEmpty(i))
            return console.warn("KHBattleCommandChangeEnemyMode.run: target not found"),
                Q.resolve();
        i["setDefault" + _.capitalize(a) + "Mode"]();
        i.playIdleAnimation();
        var o = this.battleWorld.enemyStatusBarList[n];
        this["_changeBar" + _.capitalize(a) + "Mode"](o);
        return Q.resolve();
    });

    // Skip turn animation
    replaceMethod(kh.BattleCommand.Turn, "run", skipAnimation, function() { return Q.resolve(); });
    insertBeforeMethod(kh.BattleCommand.Turn, "run", () => true, function() { usedThisTurn.clear(); });

    // Skip enter battle animation
    replaceMethod(kh.Avatar, "playEnterBattleAnimation", skipAnimation, function() {
        this.armature.runAction(cc.sequence(cc.spawn(cc.moveBy(0, cc.p(this.ENTER_BATTLE_ANIMATION_X, this.ENTER_BATTLE_ANIMATION_Y))), cc.callFunc(this._playStartAnimation.bind(this))));
        return Q.resolve();
    });

    // Speedup die animation
    replaceMethod(kh.Avatar, "playDieAnimation", skipAnimation, function() { return this.fadeOut(0); });
    replaceMethod(kh.Enemy, "playDieAnimation", skipAnimation, function() { return this.fadeOut(0); });

    // Speedup hp/mode gauge/burst gauge bar updates
    replaceMethod(cc.Node, "adjustPropertyByTweenAction", skipAnimation, function(e, t) {
        this[e] = t;
        return Q.resolve();
    });

    // Reduce enter battle animation delay
    insertBeforeMethod(kh.BattleWorld, "_playAllEnterBattleAnimations", () => true, function() {
        kh.BattleWorld.prototype.ENTER_BATTLE_ANIMATION_DELAY = use_speed_hacks && !turnOffHacks() ? 0 : 600;
    });
    insertBeforeMethod(kh.BattleWorld, "_playEnterBattleAnimations", () => true, function() {
        kh.BattleWorld.prototype.ENTER_BATTLE_ANIMATION_DELAY = use_speed_hacks && !turnOffHacks() ? 0 : 600;
    });

    // Skip "vs Boss" animation
    replaceMethod(kh.BattleWorld, "_playBossAnimation", () => skip_vs_boss_fight_animation && !turnOffHacks(), () => Q.resolve());

    // Skip "Fight" animation
    replaceMethod(kh.BattleWorld, "_playStartAnimation", () => skip_vs_boss_fight_animation && !turnOffHacks(), () => Q.resolve());

    // Auto start auto battle, request help, post stamp
    insertBeforeMethod(kh.BattleWorld, "_start", () => true, function() {
        quest_id = kh.createInstance("questInfo").getQuestId();
        quest_type = kh.createInstance("questInfo").getQuestType();
        battle_id = kh.createInstance("questInfo").getBattleId();
        bw = this;
        apibattle = kh.createInstance("apiBattle");
        apia = kh.createInstance("apiAPlayers");
        getIds();

        if (parseInt(localStorage.contains_non_union_members) == battle_id) contains_non_union_members = true;
        checkTurnOffHacks();
        if (contains_non_union_members) {
            console.log("unionmember " + my_unions_member_array[1]);
        }
        if (auto_start_aab) startAutoBattle();
        if (auto_post_help_request) postHelpRequest();
        if (auto_post_stamp) postStamp();

        bw.enemyList.filter(t => !_.isEmpty(t)).forEach(updateHPText);

        if (display_para_timer && quest_type == "event_union_demon_raid") {
            updateParaText();
            setInterval(updateParaText, 1000);
        }
    });

    // Might reduce some raid bugs
    insertBeforeMethod(kh.RaidBattleWorld, "_handleRaidDataScenario", skipAnimation, function(t, e) {
        for (let key in e)
            if (!["enemies", "timestamp"].includes(key)) delete e[key];
    });

    // Get rid of help request popup
    replaceMethod(kh.RaidBattleWorld, "_checkRaidRequestPopupConditions", () => skip_help_request && !turnOffHacks(), () => false);

    // Use improved auto battle
    replaceMethod(kh.AutoScenario.Ability, "runPreAttackScenario", () => use_custom_AAB, function() {
        try {
            performAction();
        } catch (err) {
            console.error(err);
        }
        return Q.reject();
    });

    // Auto press next button
    if (auto_exit_won_battle) {
        insertBeforeMethod(kh.CenterPanel, "showNextButton", () => true, function() {
            Q.delay(500).then(function() {
                bw.battleUI.NextButton._onTouchCallback();
                bw.battleUI.NextButton._onTouchCallback = null;
            });
        });
    }

    // Auto exit won battle
    if (auto_exit_won_battle) {
        insertBeforeMethod(kh.BattleCommand.Win, "run", () => true, function() {
            if (kh.createInstance("stage").isStageCleared()) this._showNextButton();
        });
    }

    // Auto exit won raid
    if (auto_exit_won_battle) {
        insertBeforeMethod(kh.RaidDownPopupFactory, "create", () => true, function() {
            bw.endBattle();
        });
    }

    // Auto exit lost raid
    if (auto_exit_lost_raid) {
        kh.RaidBattleCommand.Lose.prototype.run = function() {
            if (quest_type == "event_raid") apibattle.postHelpRequest(true, true, true, quest_type);
            kh.createInstance("router").navigate("quest/q_006");
            return Q.resolve();
        };
    }

    // Auto exit timed out raid
    if (auto_exit_timed_out_raid) {
        kh.BattleCommand.Timeup.prototype.run = function() {
            localStorage.last_battle_id = battle_id,
                localStorage.last_battle_type = quest_type,
                kh.createInstance("router").navigate("quest/q_006");
            return Q.resolve();
        };
    }

    // Add hp number and paralyse timer
    insertAfterMethod(kh.EnemyStatusBar, "ctor", () => true, function(t, n, a, i) {
        var hp_text = new ccui.Text();
        hp_text.setName("hp_text");
        hp_text.setFontSize(10);
        hp_text.setPosition([234, 145, 145][a - 1], 42);
        this.ui.addChild(hp_text);
        var para_text = new ccui.Text();
        para_text.setName("para_text");
        para_text.setFontSize(12);
        para_text.setPosition([380, 280, 180][a - 1], 54);
        this.ui.addChild(para_text);
    });

    formatNumber = function(num) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
    }
    updateHPText = function(e) {
        if (!display_hp_numbers) return;
        ccui.helper.seekWidgetByName(e.statusPanel.ui, "hp_text").setText(formatNumber(e.hp) + "/" + formatNumber(e.maxHp));
    }

    kh.Enemy.prototype.adjustHP = function(t) {
        kh.Avatar.prototype.adjustHP.call(this, t);
        updateHPText(this);
    }

    updateParaText = function() {
        bw.enemyList.filter(t => !_.isEmpty(t)).forEach(t =>
            ccui.helper.seekWidgetByName(t.statusPanel.ui, "para_text").setText("Para: " + enemySEDur(t, "paralyse").toString() + "s")
        );
    }

    insertBeforeMethod(kh.BattleWorld, "reloadBattle", () => true, function() {
        processServerResponseQueue = [];
        processingServerResponse = false;
    });

    // Check if hack objector joined
    insertBeforeMethod(kh.BattleCommand.IncreaseParticipants, "run", () => true, function() {
        if (getNumParticipants() == auto_start_participants - 1 && auto_start_aab_quest_types.includes(quest_type)) {
            kh.createInstance("autoScenarioHandler").changeState(kh.AutoScenario.State.STATES.ABILITY);
            bw.battleUI.AttackButton.simulateAttack()
        }
        if (contains_non_union_members) return;
        let message = this.__proto__.run.arguments[0].actionData._actionData.raid_message;
        let name = message.line_1_action.replace("\'s party ", "");
        if (!my_unions_member_array.includes(name)) {
            contains_non_union_members = true;
            localStorage.contains_non_union_members = battle_id;
        }
    });

    // Possibly fix a bug in the original code
    {
        let orig_f = kh.BattleCommand.EventLogic.prototype.__registerStatusIcon;
        kh.BattleCommand.EventLogic.prototype.__registerStatusIcon = function(t) {
            let e = _.flatten(this._getTargets().slice(0));
            if (e.some(t => !_.isFunction(t.playReceiveStatusEffectAnimation))) {
                console.error(e);
                return;
            }
            orig_f.call(this, t);
        };
    }

    // Collect paralyse stats

    insertBeforeMethod(kh.Api.ABattles, "postAbilityJson", () => true, function(t, e, n, a) {
        last_ability_name = bw.characterAbilityList[e][n]._abilityData.name.replace(/\++$/g, '');
    });

    //skip A server error occured popup
    replaceMethod(kh.HttpConnection, "_openRetryMessagePopup", () => true, function(e, t) {
        var i = e[3];
        this.retrySettings.maxCount > i.count ? this._retryAfterMinWait(e, t, this.retrySettings.minWait) : n.postMessage("reload");
    });

}

// {

// 	let origFunc = cc.game.onStart;
// 	cc.game.onStart = function() {
// 		try {
// 			overrideMethods();
// 		} catch(err) {
// 			console.error(err);
// 		}
// 		origFunc.call(this);
// 	}
// }
function rereload() {
    kh.createInstance("battleWorld").reloadBattle();
}
//setTimeout(rereload,300000);

//return to mypage
function returnToMyPage() {
    kh.createInstance("router").navigate("quest/q_006");
    return Q.resolve();
}

setTimeout(returnToMyPage, 300000);
setTimeout(overrideMethods, 500);