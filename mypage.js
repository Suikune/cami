$(function() {
    var settings = JSON.parse($("#hiddenDiv").text());
    var store = yutil.store;
    var hookMethod = yutil.hookMethod;
    var currentRaids = [];
    var info = {};
    var currentPartyID = 0;
    var currentSummonID = 0;
    var currentSummonElement = ""
    var currentSummon = "";
    var elements = ["fire", "water", "wind", "thunder", "dark", "light", "", "", "phantom"];
    var count = 0;
    window.checkRaid = function checkRaid(key) {
        kh.createInstance("apiAQuestInfo").get().then(function(e) {
            info.questInfo = e.body;
            if (info.questInfo.has_unverified) {
                kh.createInstance("apiABattles").getUnverifiedList().then(function(e) {
                    info.raidUnverifiedList = e.body;
                    info.raidUnverifiedList.data.map(item => {
                        kh.createInstance("apiABattles").getBattleResult(item.a_battle_id, item.quest_type).then(function(e) {
                            count++;
                            if (count == info.raidUnverifiedList.data.length) {
                                info.raidUnverifiedList.data = [];
                                window.joinRaid(key);
                            }
                        });
                    })
                }.bind(this));
            } else if (info.questInfo.in_progress.help_raid_ids.length) {
                if (info.questInfo.in_progress.help_raid_ids.length == 3) return;
                var data = currentRaids[key];
                var filter = info.questInfo.in_progress.help_raid_ids.filter(item => item == data.id).length > 0;
                if (filter) {
                    kh.createInstance("apiAPlayers").getMeNumeric().then(function(e) {
                        info.player = e.body;
                        window.raidStage(data.questType, data.id, data.questId, data.ownRaid);
                    })
                } else {
                    window.joinRaid(key);
                }
            } else {
                window.joinRaid(key);
            }
        })
    }

    window.joinRaid = function joinRaid(key) { //using global variables currentRaidID, currentQuestType, currentPartyID, currentSummonID
        var currentRaidID, currentQuestType, questId, isJoin, ownRaid;
        var data = currentRaids[key];
        currentRaidID = data.id;
        currentQuestType = data.questType;
        questId = data.questId;
        isJoin = data.is_joined;
        ownRaid = data.ownRaid;
        if (isJoin)
            window.raidStage(currentQuestType, currentRaidID, questId, ownRaid);
        else {
            if (currentPartyID === 0 || currentPartyID === undefined) { //if not have currentPartyID then find it
                kh.createInstance("apiAParties").getDecks().then(function(e) {
                    info.decks = e.body.decks;
                    kh.createInstance("apiAPlayers").getMeNumeric().then(function(e) {
                        info.player = e.body;
                        window.getPartyID(key);
                    }.bind(this));
                }.bind(this));
            } else if (currentSummonID === 0 || currentSummonID === undefined) {
                var summonElement = info.decks.filter(obj => obj.a_party_id === currentPartyID)[0].job.element_type; //get element for summon from Soul of selected party
                if (currentSummonElement !== undefined && currentSummonElement !== "") { //if element specified in raids parameters then use it
                    summonElement = elements.indexOf(currentSummonElement);
                }
                kh.createInstance("apiASummons").getSupporters(summonElement).then(function(e) {
                    info.supporters = e.body;
                    window.getSummonID(key);
                }.bind(this));
            } else { //we can join raid
                if (data.battle_bp > info.questPoints.bp) {
                    let bp = data.battle_bp - info.questPoints.bp;
                    window.useSeeds(info, bp, function() {
                        kh.createInstance("apiABattles").joinBattle(currentRaidID, currentSummonID, currentPartyID, currentQuestType).then(function(e) {
                            state = e.body;
                            window.raidStage(currentQuestType, currentRaidID, questId, ownRaid);
                            currentPartyID = 0;
                            currentSummonID = 0;
                        }.bind(this));
                    });
                } else
                    kh.createInstance("apiABattles").joinBattle(currentRaidID, currentSummonID, currentPartyID, currentQuestType).then(function(e) {
                        state = e.body;
                        window.raidStage(currentQuestType, currentRaidID, questId, ownRaid);
                        currentPartyID = 0;
                        currentSummonID = 0;
                    }.bind(this));
            }
        }
    }

    window.raidStage = function raidStage(currentQuestType, currentRaidID, questId, ownRaid) {
        window.kh.createInstance("router").navigate("battle", {
            quest_type: currentQuestType,
            a_battle_id: currentRaidID,
            a_player_id: info.player.a_player_id,
            a_quest_id: questId,
            is_own_raid: ownRaid
        });
    }

    window.useSeeds = function useSeeds(data, numSeed, func) {
        let seeds = 0;
        if (data.cure_items) {
            seeds = data.cure_items.data.filter(function(obj) { return obj.name === 'Energy Seed'; })[0];
        } else {
            window.kh.createInstance("apiAItems").getCure(1, 10).then(function(e) {
                info.cure_items = e.body;
                seeds = info.cure_items.data.filter(function(obj) { return obj.name === 'Energy Seed'; })[0];
                kh.createInstance("apiAItems").useItem(seeds.a_item_id, numSeed).then(func);
            });
            return;
        }
        kh.createInstance("apiAItems").useItem(seeds.a_item_id, numSeed).then(func);
    }


    window.getPartyID = function getPartyID(key) {
        currentPartyID = info.player.selected_party.a_party_id;
        window.joinRaid(key);
    }

    window.getSummonID = function getSummonID(key) {
        var nextSummon = info.supporters.data.filter(function(obj) { return obj.summon_info.name === currentSummon && obj.is_friend; })[0];
        if (has(nextSummon, "summon_info", "a_summon_id")) {
            currentSummonID = nextSummon.summon_info.a_summon_id;
        } else {
            currentSummonID = info.supporters.data[0].summon_info.a_summon_id;
        }
        window.joinRaid(key);
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
    setTimeout(function() {
        var _http = window.kh.createInstance("HttpConnection");

        $("#Cocos2dGameContainer").css("inherit");
        var con = $("<div style='width:240px;float:right;margin: 5px;'></div>");
        $("#Cocos2dGameContainer").before(con);

        //主菜单div
        var mainMenuDiv = $("<div></div>");
        con.append(mainMenuDiv);
        //菜单div中的分类按钮
        var statusBtn = $("<button type='button' class='btn' style='width:20%;white-space:nowrap'>Profile</button>");
        var equipBtn = $("<button type='button' class='btn' style='width:20%;white-space:nowrap'>Equiq</button>");
        var questBtn = $("<button type='button' class='btn' style='width:20%;white-space:nowrap'>Quest</button>");
        var gachaBtn = $("<button type='button' class='btn' style='width:20%;white-space:nowrap'>Gacha</button>");
        var extraBtn = $("<button type='button' class='btn' style='width:20%;white-space:nowrap'>Other</button>");
        mainMenuDiv.append(questBtn);
        mainMenuDiv.append(gachaBtn);
        mainMenuDiv.append(equipBtn);
        mainMenuDiv.append(statusBtn);
        mainMenuDiv.append(extraBtn);
        statusBtn.click(function() {
            switchMenu(0);
        });
        equipBtn.click(function() {
            switchMenu(1);
        });
        questBtn.click(function() {
            switchMenu(2);
        });
        gachaBtn.click(function() {
            switchMenu(3);
        });
        extraBtn.click(function() {
            switchMenu(4);
        });


        //调试用按钮
        //createDebugBtn();

        //分割线
        var divideDiv = $("<div style='width:240px;margin:0 auto;margin-top:5px;margin-bottom:5px;border-top:1px solid #ddd'></div>");
        con.append(divideDiv);

        //创建二级菜单div
        var secondLevelMenuDiv = $("<div></div>");
        con.append(secondLevelMenuDiv);

        //初始化二级菜单
        switchMenu(-1);

        //分割线
        var divideDiv = $("<div style='width:240px;margin:0 auto;margin-top:5px;margin-bottom:5px;border-top:1px solid #ddd'></div>");
        con.append(divideDiv);

        //log窗口
        var txtDiv = $("<div style='width:100%;height:500px;background:black;'></div>");
        con.append(txtDiv);
        var logDiv = $("<div contentEditable='true' id='id1' style='width:100%;background:white;float:left;height:500px;overflow-y: auto;font-size: small;line-height: 16px;word-break: break-all;word-wrap: break-word;'></div>");
        txtDiv.append(logDiv);

        //初始化log窗口
        initLogDivContent();

        /////////////////////////////////////////////////////////////////////////////////////////////////
        //常量定义
        /////////////////////////////////////////////////////////////////////////////////////////////////
        //元素定义
        var elementMap = {
            "0": "Fire",
            "1": "Water",
            "2": "Wind",
            "3": "Thunder",
            "5": "Light",
            "4": "Dark",
            "8": "Phantom"
        };

        //神姬类型定义
        var characterTypeMap = {
            "attack": "Attack",
            "defense": "defense",
            "balance": "balance",
            "heal": "heal",
            "special": "special"
        };

        //武器技能定义（【类型，基础值，等级增益】未有明确数据的，等级增益设为0）
        //**** 日文改英文 ****/
        var weaponSkillMap = {
            "Character ATK↑ (+)": ["assault", 0, 0.5],
            "Character ATK↑ (++)": ["assault", 3, 0.5],
            "Character ATK↑ (+++)": ["assault", 6, 0.5],
            "Character ATK↑ (++++)": ["assault", 9, 0.7],
            "Character Max HP↑ (+)": ["defender", 0, 0.5],
            "Character Max HP↑ (++)": ["defender", 3, 0.5],
            "Character Max HP↑ (+++)": ["defender", 6, 0.5],
            "character Max HP↑ (++++) ": ["defender", 10, 1],
            "Characters HP↑ (++++)": ["defender", 9, 0.7],
            "ATK↑": ["ambition", 10, 1],
            "Characters with low HP, ATK↑ (+)": ["pride", 0, 0.35, 11.4], //小：0.35×SLv+12*(1-HP/MHP)	浮动0%~11.4%
            "Characters with low HP, ATK↑ (++)": ["pride", 0, 0.5, 11.4], //中：0.5×SLv+12*(1-HP/MHP)		浮动0%~11.4%
            "Characters with low HP, ATK↑ (+++)": ["pride", 0, 0.5, 19],
            "characters left HP ratio (+)": ["vigoras", 0, 0],
            "characters left HP ratio (++)": ["vigoras", 1, 0],
            "characters left HP ratio (+++)": ["vigoras", 2, 0],
            "Characters' HP ＆ ATK↑ commensurate to low HP (+)": ["stewart", 0, 0.35, 11.4, 0, 0.5],
            "Characters' HP ＆ ATK↑ commensurate to low HP (++)": ["stewart", 0, 0.5, 11.4, 3, 0.5],
            "Characters' HP ＆ ATK↑ commensurate to low HP (+++)": ["stewart", 0, 0.5, 19, 6, 0.5],
            "Characters' Recovery↑ commensurate to HP (+)": ["sprout", 0, 0, 4, 1],
            "Characters' Recovery↑ commensurate to HP (++)": ["sprout", 1, 0, 7, 1],
            "Characters' Recovery↑ commensurate to HP (+++)": ["sprout", 2, 0, 10, 1],
            "Characters' Combo Attack Rate↑ (+)": ["avalanche", 0, 0],
            "Characters' Combo Attack Rate↑ (++)": ["avalanche", 1, 0],
            "Characters' Combo Attack Rate↑ (+++)": ["avalanche", 2, 0],
            "Characters' HP ＆ Recovery↑ (+)": ["grace", 0, 0.5, 4, 1],
            "Characters' HP ＆ Recovery↑ (++)": ["grace", 3, 0.5, 7, 1],
            "Characters' HP ＆ Recovery↑ (+++)": ["grace", 6, 0.5, 10, 1],
            "characters HP ＆ ATK↑ (+)": ["strength", 0, 0.5],
            "characters HP ＆ ATK↑ (++)": ["strength", 3, 0.5],
            "characters HP ＆ ATK↑ (+++)": ["strength", 6, 0.5],
            "Characters' ATK ＆ Recovery↑ (+)": ["resilience", 0, 0.5, 4, 1],
            "Characters' ATK ＆ Recovery↑ (++)": ["resilience", 3, 0.5, 7, 1],
            "Characters' ATK ＆ Recovery↑ (+++)": ["resilience", 6, 0.5, 10, 1],
            "Characters' ATK ＆ Crit rate↑ (+)": ["slug", 0, 0.5, 0, 0.5],
            "Characters' ATK ＆ Crit rate↑ (++)": ["slug", 3, 0.5, 3, 0.5],
            "Characters' ATK ＆ Crit rate↑ (+++)": ["slug", 6, 0.5, 6, 0.5],
            "Characters' Double Attack Rate↑ (+)": ["rush", 0, 0],
            "Characters' Double Attack Rate↑ (++)": ["rush", 1, 0],
            "Characters' Double Attack Rate↑ (+++)": ["rush", 2, 0],
            "Characters' Triple Attack Rate↑ (+)": ["barrage", 0, 0],
            "Characters' Triple Attack Rate↑ (++)": ["barrage", 1, 0],
            "Characters' Triple Attack Rate↑ (+++)": ["barrage", 2, 0],
            "Characters Crit rate↑ (+)": ["stinger", 0, 0.5],
            "Characters Crit rate↑ (++)": ["stinger", 3, 0.5],
            "Characters Crit rate↑ (+++)": ["stinger", 6, 0.5],
            "Characters Burst↑ (+)": ["exceed", 10, 1],
            "Characters Burst↑ (++)": ["exceed", 20, 1],
            "Characters Burst↑ (+++)": ["exceed", 30, 1],
            "Characters Recovery↑ (+)": ["ascension", 4, 1],
            "Characters Recovery↑ (++)": ["ascension", 7, 1],
            "Characters Recovery↑ (+++)": ["ascension", 10, 1]
        };

        //首饰稀有度最高等级
        var accessoryRarityMaxLv = {
            "0": 0,
            "N": 20,
            "R": 30,
            "R强化素材": 30,
            "SR": 40,
            "SR强化素材": 40,
            "SSR": 50
        };

        //アクセ強化に必要な経験値表（各レベル）
        var accessoryEnhanceExp = [
            0, 10, 15, 20, 25, 30, 35, 40, 45, 50,
            55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
            120, 140, 160, 180, 200, 220, 240, 260, 280, 300,
            320, 340, 360, 380, 400, 420, 440, 460, 480, 500,
            520, 540, 560, 580, 600, 620, 640, 660, 680, 700
        ];

        //アクセ強化に必要な経験値表（累計）
        var accessoryEnhanceExpTotal = [
            0, 0, 10, 25, 45, 70, 100, 135, 175, 220,
            270, 325, 385, 450, 520, 595, 675, 760, 850, 945,
            1045, 1165, 1305, 1465, 1645, 1845, 2065, 2305, 2565, 2845,
            3145, 3465, 3805, 4165, 4545, 4945, 5365, 5805, 6265, 6745,
            7245, 7765, 8305, 8865, 9445, 10045, 10665, 11305, 11965, 12645,
            13345
        ];

        //素材アクセサリーのもつ経験値
        var accessoryBaseExp = {
            "0": 0,
            "N": 50,
            "R": 100,
            "R强化素材": 150,
            "SR": 200,
            "SR强化素材": 300,
            "SSR": 400
        }; //异色经验值，同色时*1.5

        //素材のレベルによる経験値増加テーブル
        var accessoryLevelExp = [
            0, 0, 1, 2, 3, 5, 7, 9, 12, 15,
            18, 22, 26, 30, 35, 40, 45, 57, 69, 81,
            95, 109, 123, 139, 155, 171, 189, 207, 225, 245,
            265, 285, 318, 351, 384, 420, 456, 492, 531, 570,
            609, 651, 693, 735, 780, 825, 870, 934, 998, 1062,
            1130
        ];

        //raid列表
        var raidCtl = {
            raidDatas: null,
            init: function() {
                var raidDatas = store("raidDatas");
                if (raidDatas) {
                    raidDatas = JSON.parse(raidDatas);
                } else {
                    raidDatas = {};
                }
                this.raidDatas = raidDatas;
            },
            getRaidDatas: function() {
                return this.raidDatas;
            },
            getRaidData: function(questId) {
                return this.raidDatas[questId];
            },
            saveRaidData: function(raidData) {
                this.raidDatas[raidData.questId] = raidData;
                this.saveRaidDatas();
            },
            saveRaidDatas: function() {
                store("raidDatas", JSON.stringify(this.raidDatas));
            }

        }
        raidCtl.init();

        //任务翻译列表
        var missionMap = {
            "メインクエストを3回クリアしよう": "主线任务3回",
            "バーストタイムに1回レイドバトルをしよう": "burst time raid 1回",
            "幻獣を3回強化しよう": "幻兽强化3回",
            "幻獣を1回強化しよう": "幻兽强化1回",
            "他のプレイヤーに1回挨拶しよう": "留言1回",
            "幻獣を1回限界突破しよう": "幻兽限界突破1回",
            "ノーマルガチャを5回引こう": "抽卡5回",
            "ノーマルガチャを3回引こう": "抽卡3回",
            "ウェポンを3回売却しよう": "卖武器3回",
            "ウェポンを1回売却しよう": "卖武器1回",
            "幻獣を3回売却しよう": "卖幻兽3回",
            "幻獣を1回売却しよう": "卖幻兽1回",
            "レイドバトルを3回開始しよう": "自己开raid 3回",
            "ウェポンを3回強化しよう": "武器强化3回",
            "ウェポンを1回強化しよう": "武器强化1回",
            "レイドバトルの救援に3回参戦しよう": "raid参战3回",
            "神姫を3回強化しよう": "神姬强化3回",
            "SPクエストを3回クリアしよう": "SP任务完成3回",
            "ユニオンに1回寄付しよう": "工会捐款1回",
            "ウェポンを1回限界突破しよう": "武器限界突破1回",
            "レイドバトルを開始or救援で3回クリアしよう": "raid开或者参战3回",
            "レイドバトルを開始or救援で1回クリアしよう": "raid开或者参战1回",
            "曜日クエストを3回クリアしよう": "曜日本3回",
            "曜日クエストを1回クリアしよう": "曜日本1回",


            "SPクエストを30回クリアしよう": "SP任务完成30回",
            "メインクエストを25回クリアしよう": "主线任务25回",
            "ウェポンを15回強化しよう": "武器强化15回",
            "ウェポンを12回強化しよう": "武器强化12回",
            "ウェポンを10回強化しよう": "武器强化10回",
            "幻獣を15回強化しよう": "幻兽强化15回",
            "幻獣を12回強化しよう": "幻兽强化12回",
            "幻獣を10回強化しよう": "幻兽强化10回",
            "神姫を15回強化しよう": "神姬强化15回",
            "神姫を12回強化しよう": "神姬强化12回",
            "神姫を10回強化しよう": "神姬强化10回",
            "デイリーミッションを15個クリアしよう": "每日任务完成15回",
            "デイリーミッションを20個クリアしよう": "每日任务完成20回",
            "デイリーミッションを25個クリアしよう": "每日任务完成25回",
            "\u30c7\u30a4\u30ea\u30fc\u30df\u30c3\u30b7\u30e7\u30f3\u309225\u500b\u30af\u30ea\u30a2\u3057\u3088\u3046\n\u203b\u30c7\u30a4\u30ea\u30fc\u5831\u916c\u53d7\u53d6\u6642\u306b\u9054\u6210\u56de\u6570\u304c\u30ab\u30a6\u30f3\u30c8\u3055\u308c\u307e\u3059": "每日任务25回且领取报酬",
            // "デイリーミッションを25個クリアしよう↵※デイリー報酬受取時に達成回数がカウントされます":"每日任务25回且领取报酬",
            "デイリーミッションを30個クリアしよう": "每日任务完成30回",
            "曜日クエストを25回クリアしよう": "曜日本25回",
            "曜日クエストを20回クリアしよう": "曜日本20回",
            "曜日クエストを15回クリアしよう": "曜日本15回",
            "レイドバトルを開始or救援で25回クリアしよう": "raid开或者参战25回",
            "レイドバトルを開始or救援で20回クリアしよう": "raid开或者参战20回",
            "レイドバトルを開始or救援で15回クリアしよう": "raid开或者参战15回",

            "イベントクエストを5回クリアしよう": "5次活动本",
            "エリクサーを使用せずに降臨戦Expertクエストをクリアしよう": "不吃大红30AP",
            "SR以下の神姫のみで降臨戦Expertクエストをクリアしよう": "SR以下30AP",
            "エリクサーを使用せずに降臨戦Ultimateクエストをクリアしよう": "不吃大红40AP",
            "SR以下の神姫のみで降臨戦Ultimateクエストをクリアしよう": "SR以下40AP",
            "風属性の神姫・英霊のみで降臨戦Ultimateクエストをクリアしよう": "风属性40AP",
            "エリクサーを使用せずに降臨戦Ragnarokクエストをクリアしよう": "不吃大红0AP",
            "R以下の神姫のみで降臨戦Ultimateクエストをクリアしよう": "R过40AP"
        };

        //日常交换物品列表
        var dailyTreasureExchangeList = [
            55, //紅焔の龍骨
            46, //氷凍の龍骨
            37, //轟雷の龍骨
            28, //翠風の龍骨
            64, //閃光の龍骨
            73, //黒曜の龍骨
            57, //灼熱の石版
            48, //氷河の石版
            39, //電雷の石版
            30, //竜巻の石版
            66, //聖光の石版
            75, //奈落の石版
            82, //聖光石
            83 //聖光晶
        ];

        /////////////////////////////////////////////////////////////////////////////////////////////////
        //二级菜单定义
        /////////////////////////////////////////////////////////////////////////////////////////////////
        //菜单切换
        function switchMenu(index) {
            secondLevelMenuDiv.empty();
            switch (index) {
                case -1:
                    createDefaultBtns();
                    break;
                case 0:
                    createStatusBtns();
                    break;
                case 1:
                    createEquipBtns();
                    break;
                case 2:
                    createQuestBtns();
                    break;
                case 3:
                    createGachaBtns();
                    break;
                case 4:
                    createExtraBtns();
                    break;
            }
        };

        //创建初始化默认按钮组
        function createDefaultBtns() {
            createQuestBtns();
        };

        //自动化菜单
        function createAutoPrcsBtn() {
            creatCopyBtn(); //复制按钮
        }

        //创建信息按钮组
        function createStatusBtns() {
            createShowWeaponGainBtn();
            createShowPartyStateBtn();
            createCalBtn(); //计算首饰按钮
            //createCheckAccessoriesBtn();
        };

        //创建强化按钮组
        function createEquipBtns() {
            createEnhanceSRWeapon2Btn();
            createEnhanceSRWeapon3Btn();
            createEnhanceRCup5Btn();
            createEnhanceSRWeaponBtn();
            createEnhanceRCupBtn();
            createEnhanceSRCupBtn();
            createEnhanceRWeaponBtn();
        };

        //创建任务按钮组
        function createQuestBtns() {
            createCheckMissionBtn();
            createCollQuestBtn();
            createDailyTreasureExchangeBtn();
            createCheckRaidBtn();
            createRefreshExistBtn();
            createCheckSupportSummonBtn();
        };

        //创建抽卡按钮组
        function createGachaBtns() {
            createGachaBtn();
            createNWeapBtn();
            createNEidoBtn();
            createREidoBtn();
            createREidoMBtn();
            createRWeapMBtn();
            createSREidoBtn();
            //createSimGacha10Btn();
            createGachaEvent();
        };

        //创建特殊按钮组//**刷号功能在此 */
        function createExtraBtns() {
            createPresentBtn();
            createlimitPresentBtn();
            createGachaStoneBtn();
            createPrsntItmBtn();
            createSellNAccBtn();
            createSellRAccBtn();
            createSellSRAccBtn();
            createInfoBtn();
            createLocalizeInfoBtn();
        };



        /////////////////////////////////////////////////////////////////////////////////////////////////
        //功能定义
        /////////////////////////////////////////////////////////////////////////////////////////////////
        //计算武器增益
        //****未来应有幻队和彩虹队情况 添加主武器b效果****/
        function createShowWeaponGainBtn() {
            var showWeaponGainBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>Calculator</button>");
            secondLevelMenuDiv.append(showWeaponGainBtn);
            showWeaponGainBtn.click(function() {
                emptyLog();
                mypageLog("Start");
                mypageLog("Stats Weapon:");
                window.kh.createInstance("apiAParties").getDeck("selected").then(function(e) {
                    var weaQueue = [];
                    var cacheMap = {};
                    for (var i = 0; i < e.body.deck.weapons.length; i++) {
                        var item = e.body.deck.weapons[i];
                        if (item && item.a_weapon_id) {
                            var weaponId = item.a_weapon_id;
                            cacheMap[weaponId] = item;
                            if (item.skills) {
                                //已经缓存了技能
                                weaQueue.push(Promise.resolve({ body: item }));
                            } else {
                                weaQueue.push(getWeaponDetail(weaponId));
                            }

                        }
                    }
                    window.Q.all(weaQueue).spread(function() {
                        var arg = arguments;
                        var calMap = {};
                        //*查找character字符 索引技能定义（weaponskillmap）
                        for (var i = 0; i < arg.length; i++) {
                            var item = arg[i].body;
                            cacheMap[item.a_weapon_id].skills = item.skills;
                            var type = item.element_type;
                            var name = elementMap[type];
                            if (item.skills && item.skills.length > 0) {
                                for (var k = 0; k < item.skills.length; k++) {
                                    var sk = item.skills[k];
                                    var skillLevel = sk.level;
                                    var descArray = sk.description.split("\n"); //取第一行
                                    var description = descArray[0];
                                    var elemIndex0 = description.indexOf("Character"); //*"属性"改为"Character"
                                    var elemIndex;
                                    var description;
                                    if (elemIndex0 == -1) {
                                        elemIndex = description.indexOf("ATK"); //*属攻
                                        var endIndex = elemIndex + 4;
                                        description = description.slice(elemIndex, endIndex);
                                    } else {
                                        elemIndex = description.indexOf("Character");
                                        description = description.slice(elemIndex);
                                    }
                                    skillData = weaponSkillMap[description];
                                    var calItem = calMap[type];
                                    if (calItem == null) {
                                        calItem = {};
                                        calItem.type = type;
                                        calItem.name = name;
                                        calItem.assault = 0;
                                        calItem.defender = 0;
                                        calItem.ambition = 0;
                                        calItem.prideLow = 0;
                                        calItem.prideHigh = 0;
                                        calItem.rush = 0;
                                        calItem.rush1 = 0;
                                        calItem.rush2 = 0;
                                        calItem.barrage = 0;
                                        calItem.barrage1 = 0;
                                        calItem.barrage2 = 0;
                                        calItem.stinger = 0;
                                        calItem.stinger1 = 0;
                                        calItem.stinger2 = 0;
                                        calItem.exceed = 0;
                                        calItem.ascension = 0;
                                        calMap[type] = calItem;
                                    }
                                    if (typeof(skillData) != "undefined") {
                                        var skillType = skillData[0];
                                        var baseNum = skillData[1];
                                        var powWeight = skillData[2];
                                        switch (skillType) {
                                            //攻刃
                                            case "assault":
                                                calItem.assault += baseNum + powWeight * skillLevel;
                                                break;
                                                //生命
                                            case "defender":
                                                calItem.defender += baseNum + powWeight * skillLevel;
                                                break;
                                                //属攻
                                            case "ambition":
                                                calItem.ambition += baseNum + powWeight * skillLevel;
                                                break;
                                                //背水
                                            case "pride":
                                                var prideRange = skillData[3];
                                                calItem.prideLow += baseNum + powWeight * skillLevel;
                                                calItem.prideHigh += baseNum + powWeight * skillLevel + prideRange;
                                                break;
                                                //二连（只计算等级）
                                            case "rush":
                                                if (baseNum == 0) {
                                                    calItem.rush += skillLevel;
                                                } else if (baseNum == 1) {
                                                    calItem.rush1 += skillLevel;
                                                } else {
                                                    calItem.rush2 += skillLevel;
                                                }
                                                break;
                                                //三连（只计算等级）
                                            case "barrage":
                                                if (baseNum == 0) {
                                                    calItem.barrage += skillLevel;
                                                } else if (baseNum == 1) {
                                                    calItem.barrage1 += skillLevel;
                                                } else {
                                                    calItem.barrage2 += skillLevel;
                                                }
                                                break;
                                                //急所（只计算等级）
                                            case "stinger":
                                                if (baseNum == 0) {
                                                    calItem.stinger += skillLevel;
                                                } else if (baseNum == 1) {
                                                    calItem.stinger1 += skillLevel;
                                                } else {
                                                    calItem.stinger2 += skillLevel;
                                                }
                                                break;
                                            case "vigoras":
                                                if (baseNum == 0) {
                                                    calItem.vigoras += skillLevel;
                                                } else if (baseNum == 1) {
                                                    calItem.vigoras1 += skillLevel;
                                                } else {
                                                    calItem.vigoras2 += skillLevel;
                                                }
                                                break;
                                                //爆裂性能
                                            case "exceed":
                                                calItem.exceed += baseNum + powWeight * skillLevel;
                                                break;
                                                //恢复性能
                                            case "ascension":
                                                calItem.ascension += baseNum + powWeight * skillLevel;
                                                break;
                                            case "stewart":
                                                var prideRange = skillData[3];
                                                calItem.prideLow += baseNum + powWeight * skillLevel;
                                                calItem.prideHigh += baseNum + powWeight * skillLevel + prideRange;
                                                calItem.defender += skillData[4] + skillData[5] * skillLevel;
                                                break;
                                            case "sprout":
                                                if (baseNum == 0) {
                                                    calItem.vigoras += skillLevel;
                                                } else if (baseNum == 1) {
                                                    calItem.vigoras1 += skillLevel;
                                                } else {
                                                    callitem.vigoras2 += skillLevel;
                                                }
                                                calItem.ascension += skillData[3] + skillData[4] * skillLevel;
                                                break;
                                            case "avalanche":
                                                if (baseNum == 0) {
                                                    calItem.barrage += skillLevel;
                                                    calItem.rush += skillLevel;
                                                } else if (baseNum == 1) {
                                                    calItem.barrage1 += skillLevel;
                                                    calItem.rush1 += skillLevel;
                                                } else {
                                                    calItem.barrage2 += skillLevel;
                                                    calItem.rush2 += skillLevel;
                                                }
                                                break;
                                            case "grace":
                                                calItem.defender += baseNum + powWeight * skillLevel;
                                                calItem.ascension += skillData[3] + skillData[4] * skillLevel;
                                                break;
                                            case "strength":
                                                calItem.assault += baseNum + powWeight * skillLevel;
                                                calItem.defender += baseNum + powWeight * skillLevel;
                                                break;
                                            case "resilience":
                                                calItem.assault += baseNum + powWeight * skillLevel;
                                                calItem.ascension += skillData[3] + skillData[4] * skillLevel;
                                                break;
                                            case "slug":
                                                if (baseNum == 0) {
                                                    calItem.stinger += skillLevel;
                                                } else if (baseNum == 1) {
                                                    calItem.stinger1 += skillLevel;
                                                } else {
                                                    calItem.stinger2 += skillLevel;
                                                }
                                                calItem.assault += skillData[3] + skillData[4] * skillLevel;
                                                break;
                                        }
                                    }
                                }
                            }
                        }
                        for (var key in calMap) {
                            var calItem = calMap[key];
                            var str = calItem.name == "Phantom" ? "" : calItem.name + "系:Character ATK+" + calItem.assault + "%<br> HP+" + calItem.defender + "%";
                            if (calItem.ambition > 0) {
                                str += "<br>" + calItem.name + "ATK+" + calItem.ambition + "%";
                            }
                            if (calItem.prideHigh > 0) {
                                str += "<br>Pride+" + calItem.prideLow.toFixed(2) + "%~" + calItem.prideHigh.toFixed(2) + "%";
                            }
                            if (calItem.rush > 0 || calItem.rush1 > 0 || calItem.rush2 > 0) {
                                str += "<br>DA " + (calItem.rush * 0.05 + calItem.rush1 * 0.15 + calItem.rush2 * 0.25) + "%";
                            }
                            if (calItem.barrage > 0 || calItem.barrage1 > 0 || calItem.barrage2 > 0) {
                                str += "<br>TA " + (calItem.barrage * 0.05 + calItem.barrage1 * 0.1 + calItem.barrage2 * 0.15) + "%";
                            }
                            if (calItem.stinger > 0 || calItem.stinger1 > 0 || calItem.stinger2 > 0) {
                                str += "<br>Crit " + (calItem.stinger * 0.5 + (3 + calItem.stinger1 * 0.5) + (6 + calItem.stinger2 * 0.5)) + "%";
                            }
                            if (calItem.vigoras > 0 || calItem.vigoras1 > 0 || calItem.vigoras2 > 0) {
                                str += "<br>Vigoras " + (
                                    (calItem.vigoras > 0 ? ((8 + calItem.vigoras * 0.2) - Math.pow(8 + calItem.vigoras * 0.2, 0.5)) : 0) +
                                    (calItem.vigoras1 > 0 ? ((12 + calItem.vigoras1 * 0.2) - Math.pow(12 + calItem.vigoras1 * 0.2, 0.5)) : 0) +
                                    (calItem.vigoras2 > 0 ? ((16 + calItem.vigoras2 * 0.2) - Math.pow(16 + calItem.vigoras2 * 0.2, 0.5)) : 0)
                                ).toFixed(2) + "%";
                            }
                            if (calItem.exceed > 0) {
                                str += "<br>Burst DMG " + calItem.exceed + "%";
                            }
                            if (calItem.ascension > 0) {
                                str += "<br>Heal " + calItem.ascension + "%";
                            }
                            mypageLog(str);
                        }
                        //drawWeaponSkill(e.body.deck.weapons);
                    }).fail(function() {
                        mypageLog("计算出错或网络请求失败");
                    });
                }).fail(function() {
                    mypageLog("网络请求失败");
                });
            });

            function getWeaponDetail(weaponId) {
                return window.kh.createInstance("apiAWeapons").get(weaponId);
            };

            function drawWeaponSkill(weapons) {
                if (!weapons) {
                    return;
                }
                var scene = cc.director.getRunningScene();
                var a = scene.seekWidgetByName("par_002_ui");
                if (a == null) {
                    return;
                }
                var mainWeapon = weapons[0];
                var subWeapons = weapons.slice(1);
                var r = a.seekWidgetByName("partymain_weapon");
                if (r == null) {
                    return;
                }
                if (!_.isUndefined(mainWeapon.weapon_id)) {
                    if (mainWeapon.skills && mainWeapon.skills.length > 0) {
                        var n = a.seekWidgetByName("partymain_weapon")
                        makeWeaponLevelLabel(n, mainWeapon, "main", 0);
                    }
                }
                _.each(subWeapons, function(e, n) {
                    if (!(n >= 9)) {
                        var s = a.seekWidgetByName("sub_weapon_blank_" + n),
                            i = n,
                            o = s.seekWidgetByName("par_002_sub_weapon_ui");
                        if (!_.isUndefined(e.weapon_id)) {
                            if (e.skills && e.skills.length > 0) {
                                var n = o.seekWidgetByName("partysub_weapon")
                                makeWeaponLevelLabel(n, e, "sub", i);
                            }
                        }
                    }
                });
            };

            //p父卡片 s,weapon对象,
            function makeWeaponLevelLabel(p, s, type, i) {
                if (p.seekWidgetByName("slevel" + i) != null) {
                    //已经绘制
                    //return;
                    //删除前次绘制的txt   2017.7.7 swebok modified
                    p.removeChild(p.seekWidgetByName("slevel" + i));
                    p.removeChild(p.seekWidgetByName("calTxt" + i));
                }
                var txt = new ccui.Text();
                txt.name = "slevel" + i;
                var sk = s.skills[0];
                var calStr = "SLv." + sk.level;
                var skillLevel = sk.level;
                txt.setString(calStr);
                txt.setTextAreaSize({ width: 100, height: 0 });
                txt.setTextHorizontalAlignment(2)
                if (type == "main") {
                    txt.setPosition(165, 527);
                } else {
                    txt.setPosition(72, 163);
                }
                p.addChild(txt);
                var line = 0;
                for (var i = 0; i < s.skills.length; i++) {
                    var calTxt = new ccui.Text();
                    calTxt.name = "calTxt" + i;
                    var sk = s.skills[i];
                    var skillLevel = sk.level;
                    var descArray = sk.description.split("\n"); //取第一行
                    var description = descArray[0];
                    var elemIndex0 = description.indexOf("Character"); //*"属性"改为"Character"
                    var elemIndex;
                    var description;
                    if (elemIndex0 == -1) {
                        elemIndex = description.indexOf("ATK"); //*属攻
                        var endIndex = elemIndex + 4;
                        description = description.slice(elemIndex, endIndex);
                    } else {
                        elemIndex = description.indexOf("Character");
                        description = description.slice(elemIndex);
                    }
                    skillData = weaponSkillMap[description];
                    var mainStr, str;
                    if (typeof(skillData) != "undefined") {
                        var skillType = skillData[0];
                        var baseNum = skillData[1];
                        var powWeight = skillData[2];
                        switch (skillType) {
                            //攻刃
                            case "assault":
                                str = "+" + (baseNum + powWeight * skillLevel) + "%";
                                mainStr = "ATK" + str;
                                break;
                                //生命
                            case "defender":
                                str = "+" + (baseNum + powWeight * skillLevel) + "%";
                                mainStr = "MHP" + str;
                                break;
                                //属攻
                            case "ambition":
                                mainStr = "EAT+" + (baseNum + powWeight * skillLevel) + "%";
                                break;
                                //背水
                            case "pride":
                                var prideRange = skillData[3];
                                var prideLow = baseNum + powWeight * skillLevel;
                                var prideHigh = baseNum + powWeight * skillLevel + prideRange;
                                mainStr = "背水+" + prideLow + "~" + prideHigh + "%";

                                break;
                                //二连（只计算等级）
                            case "rush":
                                if (baseNum == 0) {
                                    mainStr = "二段(小)Lv" + skillLevel;
                                } else if (baseNum == 1) {
                                    mainStr = "二段(中)Lv" + skillLevel;
                                } else {
                                    mainStr = "二段(大)Lv" + skillLevel;
                                }
                                break;
                                //三连（只计算等级）
                            case "barrage":
                                if (baseNum == 0) {
                                    mainStr = "三段(小)Lv" + skillLevel;
                                } else if (baseNum == 1) {
                                    mainStr = "三段(中)Lv" + skillLevel;
                                } else {
                                    mainStr = "三段(大)Lv" + skillLevel;
                                }
                                break;
                                //急所（只计算等级）
                            case "stinger":
                                if (baseNum == 0) {
                                    mainStr = "急所(小)Lv" + skillLevel;
                                } else if (baseNum == 1) {
                                    mainStr = "急所(中)Lv" + skillLevel;
                                } else {
                                    mainStr = "急所(大)Lv" + skillLevel;
                                }
                                break;
                                //爆裂性能
                            case "exceed":
                                mainStr = "Burst+" + (baseNum + powWeight * skillLevel) + "%";
                                break;
                                //恢复性能
                            case "ascension":
                                mainStr = "回復+" + (baseNum + powWeight * skillLevel) + "%";
                                break;
                        }
                        if (type == "main") {
                            calTxt.setString(mainStr);
                            calTxt.setTextAreaSize({ width: 100, height: 0 });
                            calTxt.setTextHorizontalAlignment(2);
                            calTxt.setPosition(165, 507 - 20 * i);
                        } else {
                            calTxt.setTextAreaSize({ width: 40, height: 0 });
                            calTxt.setFontSize(12);
                            calTxt.setScale(0.9);
                            if (skillType == "assault") {
                                calTxt.setString(str);
                                calTxt.setPosition(50, 15);
                            } else if (skillType == "defender") {
                                calTxt.setString(str);
                                calTxt.setPosition(50, 41);
                            } else {
                                calTxt.setString(mainStr);
                                calTxt.setPosition(25, 120 - 15 * line);
                                line += 1;
                            }
                        }
                    }
                    p.addChild(calTxt);
                }
            };
        };



        //显示队伍状态
        function createShowPartyStateBtn() {
            var showPartyStateBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>Team</button>");
            secondLevelMenuDiv.append(showPartyStateBtn);
            showPartyStateBtn.click(function() {
                emptyLog();
                mypageLog("开始获取信息");
                window.kh.createInstance("apiAParties").getSelectedDeck().then(function(e) {
                    //获取Ex技能
                    var partyId = e.body.a_party_id;
                    //输出队伍ID
                    mypageLog("队伍ID：" + partyId);
                    var deck = e.body.deck;
                    console.log(deck);
                    window.kh.createInstance("apiAParties").getExAbilitiesByParty(e.body.a_party_id).then(function(e) {
                        var data = e.body.data;
                        var exSkill;
                        console.log(data);
                        if (typeof(data) != "undefined" && data != null) {
                            for (var i = 0; i < data.length; i++) {
                                if (data[i].is_set) {
                                    exSkill = data[i];
                                }
                            }
                        }
                        //队伍名
                        mypageLog("队伍名：" + deck.name);
                        //英灵名
                        mypageLog("英灵：" + deck.job.name);
                        //英灵属性
                        mypageLog("英灵属性：" + elementMap[deck.job.element_type]);
                        //Ex技
                        if (typeof(exSkill) != "undefined") {
                            mypageLog("英灵Ex：" + exSkill.name + "(" + exSkill.description + ")");
                        } else {
                            mypageLog("英灵Ex：无");
                        }
                        //神姬稀有度、属性、类型
                        var rareDic = { "SSR": 0, "SR": 0, "R": 0 };
                        var elementType = [0, 0, 0, 0, 0, 0, 0];
                        var characterTypeDic = { "attack": 0, "defense": 0, "balance": 0, "heal": 0, "special": 0 };
                        for (var i = 0; i < deck.characters.length; i++) {
                            var character = deck.characters[i];
                            if (typeof(character) != "undefined") {
                                rareDic[character.rare] += 1;
                                elementType[character.element_type] += 1;
                                characterTypeDic[character.character_type] += 1;
                            }
                        }
                        mypageLog("神姬稀有度：SSR(" + rareDic["SSR"] + "),SR(" + rareDic["SR"] + "),R(" + rareDic["R"] + ")");
                        str = "神姬属性：";
                        for (var i = 0; i < elementType.length; i++) {
                            if (elementType[i] > 0) {
                                str += elementMap[i] + "(" + elementType[i].toString() + "),";
                            }
                        }
                        mypageLog(str);
                        str = "神姬类型：";
                        for (var key in characterTypeDic) {
                            if (characterTypeDic[key] > 0) {
                                str += characterTypeMap[key] + "(" + characterTypeDic[key] + "),";
                            }
                        }
                        mypageLog(str);

                    }).fail(playFailHandler);
                }).fail(playFailHandler);
            });
        };

        //显示个人信息
        /*function createShowPsnlInfoBtn() {
			var showPsnlInfoBtn = $("<button type='button' class='btn'>个人信息</button>");
			secondLevelMenuDiv.append(showPsnlInfoBtn);
			showPsnlInfoBtn.click(function(){
				emptyLog();
				mypageLog("开始获取信息");
                _http.post({
                    url: kh.env.urlRoot + "/a_players/me",
                }).then(function (e) {
                    handlePsnlInfoResult(e);
                });
				function handlePsnlInfoResult(e) {
                    var arrinfo = e.body["obtained_info"];
		*/


        //检查首饰
        /*function createCheckAccessoriesBtn() {
        };*/

        //强化R武器
        function createEnhanceRWeaponBtn() {
            var enhanceRWeaponBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>R level 2</button>");
            secondLevelMenuDiv.append(enhanceRWeaponBtn);
            enhanceRWeaponBtn.click(function() {
                emptyLog();
                //获取武器数组
                mypageLog("开始获取R武器信息");
                var srWeaponArr = [];
                var rWeaponArr = [];
                _http.get({
                    url: kh.env.urlRoot + "/a_weapons",
                    json: {
                        //selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    if (data && data.length > 0) {
                        // _.each(data, function (item, i) {
                        // 	//过滤R武器
                        // 	if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                        // 		rWeaponArr.push(item.a_weapon_id);
                        // 	}
                        // });
                        // debugger;
                        rWeaponArr = data.filter((item) => {
                                return item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked
                            }).map(item => item.a_weapon_id)
                            // data.map((item) => {
                            // 	if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                            // 		debugger;
                            // 		rWeaponArr.push(item.a_weapon_id);
                            // 	}
                            // })
                    }
                    mypageLog("总计未强化R武器数量" + rWeaponArr.length);
                    batchEnhanceRWeapon(rWeaponArr); //批量强化R武器
                }).fail(playFailHandler);
            });

            //批量强化R武器
            function batchEnhanceRWeapon(weaponArr) {
                var actTargetWeaponArr = weaponArr.splice(0, 1);
                var actWeaponArr = weaponArr.splice(0, 1);
                if (actTargetWeaponArr.length > 0 && actWeaponArr.length > 0) {
                    kh.createInstance("apiAWeapons").enhance(actTargetWeaponArr[0], actWeaponArr[0]).then(function(e) {
                        mypageLog("R武器强化lv1->lv2完毕");
                        batchEnhanceRWeapon(weaponArr);
                    }).fail(playFailHandler);
                } else {
                    //执行完毕
                    mypageLog("执行完毕");
                }
            };
        };

        //强SR武至2级
        function createEnhanceSRWeapon2Btn() {
            var enhanceSRWeapon2Btn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>R Cup 3</button>");
            secondLevelMenuDiv.append(enhanceSRWeapon2Btn);
            enhanceSRWeapon2Btn.click(function() {
                emptyLog();
                //获取武器数组
                mypageLog("开始获取SR武器和R武器信息");
                var rCupArr = [];
                var rWeaponArr = [];
                _http.get({
                    url: kh.env.urlRoot + "/a_weapons",
                    json: {
                        //selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤SR武器（SR圣杯基础攻击150）
                            if (item.weapon_id == 6000 && item.rare == "R" && item.level == 1 && item.bonus == 0 && item.exp == 0 && !item.is_equipped && !item.is_locked) {
                                rCupArr.push(item.a_weapon_id);
                            }
                            // //过滤R武器
                            // if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                            // 	rWeaponArr.push(item.a_weapon_id);
                            // }
                        });
                    }
                    mypageLog("总计未强化R圣杯数量:" + rCupArr.length);
                    // mypageLog("Tong R    :" + rWeaponArr.length);
                    batchEnhanceSRWeapon2(rCupArr, rWeaponArr); //批量强化SR武器
                }).fail(playFailHandler);
            });

            //批量强化SR武至2级
            function batchEnhanceSRWeapon2(targetWeaponArr, weaponArr) {
                var actTargetWeaponArr = targetWeaponArr.splice(0, 1);
                // var actWeaponArr = weaponArr.splice(0, 1);
                var actRCupEnchance = targetWeaponArr.splice(0, 1);
                if (actTargetWeaponArr.length > 0 && actRCupEnchance.length > 0) {
                    var actWeaponArr1 = actRCupEnchance.splice(0, 1);
                    // actWeaponArr1.push();
                    kh.createInstance("apiAWeapons").enhance(actTargetWeaponArr[0], actWeaponArr1).then(function(e) {
                        mypageLog("R cup lv1->lv3");
                        batchEnhanceSRWeapon2(targetWeaponArr, weaponArr);
                    }).fail(playFailHandler);
                } else {
                    //执行完毕
                    mypageLog("het nguyen lieu ep");
                }
            };
        }

        //强化R圣杯
        function createEnhanceRCupBtn() {
            var enhanceRCupBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>R cup</button>");
            secondLevelMenuDiv.append(enhanceRCupBtn);
            enhanceRCupBtn.click(function() {
                emptyLog();
                //获取R圣杯和R武器数组
                mypageLog("开始获取R圣杯和R武器信息");
                var rCupArr = [];
                var rWeaponArr = [];
                _http.get({
                    url: kh.env.urlRoot + "/a_weapons",
                    json: {
                        //selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤R圣杯
                            if (item.weapon_id == 6000 && item.rare == "R" && item.level == 1 && item.bonus == 0 && item.exp == 0 && !item.is_equipped && !item.is_locked) {
                                rCupArr.push(item.a_weapon_id);
                            }
                            //过滤R武器
                            if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                                rWeaponArr.push(item.a_weapon_id);
                            }
                        });
                    }
                    mypageLog("总计未强化R圣杯数量" + rCupArr.length);
                    mypageLog("总计未强化R武器数量" + rWeaponArr.length);
                    batchEnhanceRCup(rCupArr, rWeaponArr); //批量强化R圣杯
                }).fail(playFailHandler);
            });

            //批量强化R圣杯
            function batchEnhanceRCup(targetCupArr, weaponArr) {
                var actTargetCupArr = targetCupArr.splice(0, 1);
                var actWeaponArr = weaponArr.splice(0, 3);
                if (actTargetCupArr.length > 0 && actWeaponArr.length == 3) {
                    kh.createInstance("apiAWeapons").enhance(actTargetCupArr[0], actWeaponArr).then(function(e) {
                        mypageLog("R圣杯强化lv1->lv4完毕");
                        batchEnhanceRCup(targetCupArr, weaponArr);
                    }).fail(playFailHandler);
                } else {
                    mypageLog("执行完毕");
                }
            };
        };

        //强化SR武器3
        function createEnhanceSRWeapon3Btn() {
            var enhanceSRWeapon3Btn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>R Cup 4</button>");
            secondLevelMenuDiv.append(enhanceSRWeapon3Btn);
            enhanceSRWeapon3Btn.click(function() {
                emptyLog();
                //获取SR武器和R武器数组
                mypageLog("开始获取SR武器和R武器信息");
                var rCupArr = [];
                var rWeaponArr = [];
                _http.get({
                    url: kh.env.urlRoot + "/a_weapons",
                    json: {
                        selectable_base_filter: "enhance",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤SR武器（SR圣杯基础攻击150）
                            // if (item.rare == "SR" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 160 && !item.is_equipped && !item.is_locked) {
                            // 	srWeaponArr.push(item.a_weapon_id);
                            // }
                            // //过滤R武器
                            // if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                            // 	rWeaponArr.push(item.a_weapon_id);
                            // }
                            if (item.weapon_id == 6000 && item.rare == "R" && item.skill_level == 3 && item.bonus == 0 && !item.is_equipped && !item.is_locked) {
                                rCupArr.push(item.a_weapon_id);
                            }
                            // //过滤R武器
                            if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                                rWeaponArr.push(item.a_weapon_id);
                            }
                        });
                    }
                    mypageLog("总计未强化R武器数量" + rCupArr.length);
                    mypageLog("总计未强化R武器数量" + rWeaponArr.length);
                    batchEnhanceSRWeapon(rCupArr, rWeaponArr); //批量强化R圣杯
                }).fail(playFailHandler);
            });

            //批量强化SR武器
            function batchEnhanceSRWeapon(targetWeaponArr, weaponArr) {
                var actTargetWeaponArr = targetWeaponArr.splice(0, 1);
                var actWeaponArr = weaponArr.splice(0, 1);
                if (actTargetWeaponArr.length > 0 && actWeaponArr.length > 0) {
                    var actWeaponArr1 = actWeaponArr.splice(0, 1);
                    kh.createInstance("apiAWeapons").enhance(actTargetWeaponArr[0], actWeaponArr1).then(function(e) {
                        mypageLog("R武器强化lv3->lv4完毕");
                        batchEnhanceSRWeapon(targetWeaponArr, weaponArr);
                    }).fail(playFailHandler);
                } else {
                    //执行完毕
                    mypageLog("执行完毕");
                }
            };
        }

        //强化SR武器3
        function createEnhanceRCup5Btn() {
            var enhanceSRWeapon3Btn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>R Cup 5</button>");
            secondLevelMenuDiv.append(enhanceSRWeapon3Btn);
            enhanceSRWeapon3Btn.click(function() {
                emptyLog();
                //获取SR武器和R武器数组
                mypageLog("开始获取SR武器和R武器信息");
                var rCupArr = [];
                var rWeaponArr = [];
                _http.get({
                    url: kh.env.urlRoot + "/a_weapons",
                    json: {
                        selectable_base_filter: "enhance",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤SR武器（SR圣杯基础攻击150）
                            // if (item.rare == "SR" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 160 && !item.is_equipped && !item.is_locked) {
                            // 	srWeaponArr.push(item.a_weapon_id);
                            // }
                            // //过滤R武器
                            // if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                            // 	rWeaponArr.push(item.a_weapon_id);
                            // }
                            if (item.weapon_id == 6000 && item.rare == "R" && item.skill_level == 3 && item.bonus == 0 && !item.is_equipped && !item.is_locked) {
                                rCupArr.push(item.a_weapon_id);
                            }
                            // //过滤R武器
                            if (item.weapon_id == 6000 && item.rare == "R" && item.level == 1 && item.bonus == 0 && item.exp == 0 && !item.is_equipped && !item.is_locked) {
                                rWeaponArr.push(item.a_weapon_id);
                            }
                        });
                    }
                    mypageLog("总计未强化R武器数量" + rCupArr.length);
                    mypageLog("总计未强化R武器数量" + rWeaponArr.length);
                    batchEnhanceSRWeapon(rWeaponArr, rCupArr); //批量强化R圣杯
                }).fail(playFailHandler);
            });

            //批量强化SR武器
            function batchEnhanceSRWeapon(targetWeaponArr, weaponArr) {
                var actTargetWeaponArr = targetWeaponArr.splice(0, 1);
                var actWeaponArr = weaponArr.splice(0, 1);
                if (actTargetWeaponArr.length > 0 && actWeaponArr.length > 0) {
                    var actWeaponArr1 = actWeaponArr.splice(0, 1);
                    kh.createInstance("apiAWeapons").enhance(actTargetWeaponArr[0], actWeaponArr1).then(function(e) {
                        mypageLog("R武器强化lv3->lv5完毕");
                        batchEnhanceSRWeapon(targetWeaponArr, weaponArr);
                    }).fail(playFailHandler);
                } else {
                    //执行完毕
                    mypageLog("执行完毕");
                }
            };
        }


        //强化SR武器4
        function createEnhanceSRWeaponBtn() {
            var enhanceSRWeaponBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>SR level 4</button>");
            secondLevelMenuDiv.append(enhanceSRWeaponBtn);
            enhanceSRWeaponBtn.click(function() {
                emptyLog();
                //获取SR武器和R武器数组
                mypageLog("开始获取SR武器和R武器信息");
                var srWeaponArr = [];
                var rWeaponArr = [];
                _http.get({
                    url: kh.env.urlRoot + "/a_weapons",
                    json: {
                        selectable_base_filter: "enhance",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤SR武器（SR圣杯基础攻击150）
                            if (item.rare == "SR" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 160 && !item.is_equipped && !item.is_locked) {
                                srWeaponArr.push(item.a_weapon_id);
                            }
                            //过滤R武器
                            if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                                rWeaponArr.push(item.a_weapon_id);
                            }
                        });
                    }
                    mypageLog("总计未强化SR武器数量" + srWeaponArr.length);
                    mypageLog("总计未强化R武器数量" + rWeaponArr.length);
                    batchEnhanceSRWeapon(srWeaponArr, rWeaponArr); //批量强化R圣杯
                }).fail(playFailHandler);
            });

            //批量强化SR武器
            function batchEnhanceSRWeapon(targetWeaponArr, weaponArr) {
                var actTargetWeaponArr = targetWeaponArr.splice(0, 1);
                var actWeaponArr = weaponArr.splice(0, 6);
                if (actTargetWeaponArr.length > 0 && actWeaponArr.length == 6) {
                    kh.createInstance("apiAWeapons").enhance(actTargetWeaponArr[0], actWeaponArr).then(function(e) {
                        mypageLog("SR武器强化lv1->lv4完毕");
                        batchEnhanceSRWeapon(targetWeaponArr, weaponArr);
                    }).fail(playFailHandler);
                } else {
                    //执行完毕
                    mypageLog("执行完毕");
                }
            };
        }

        //强化SR圣杯
        function createEnhanceSRCupBtn() {
            var enhanceSRCupBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>SR cup</button>");
            secondLevelMenuDiv.append(enhanceSRCupBtn);
            enhanceSRCupBtn.click(function() {
                emptyLog();
                //获取R圣杯和R武器数组
                mypageLog("开始获取SR圣杯和R武器信息");
                var srCupArr = [];
                var rWeaponArr = [];
                _http.get({
                    url: kh.env.urlRoot + "/a_weapons",
                    json: {
                        //selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤SR圣杯
                            if (item.weapon_id == 5000 && item.rare == "SR" && item.level == 1 && item.exp == 0 && item.bonus == 0 && !item.is_equipped && !item.is_locked) {
                                srCupArr.push(item.a_weapon_id);
                            }
                            //过滤R武器
                            if (item.rare == "R" && item.level == 1 && item.exp == 0 && item.bonus == 0 && item.attack > 100 && !item.is_equipped && !item.is_locked) {
                                rWeaponArr.push(item.a_weapon_id);
                            }
                        });
                    }
                    mypageLog("总计未强化SR圣杯数量" + srCupArr.length);
                    mypageLog("总计未强化R武器数量" + rWeaponArr.length);
                    batchEnhanceSRCup(srCupArr, rWeaponArr); //批量强化R圣杯
                }).fail(playFailHandler);
            });

            //批量强化SR圣杯
            function batchEnhanceSRCup(targetCupArr, weaponArr) {
                var actTargetCupArr = targetCupArr.splice(0, 1);
                var actWeaponArr = weaponArr.splice(0, 10);
                if (actTargetCupArr.length > 0 && actWeaponArr.length == 10) {
                    var actWeaponArr1 = actWeaponArr.splice(0, 1);
                    kh.createInstance("apiAWeapons").enhance(actTargetCupArr[0], actWeaponArr1).then(function(e) {
                        mypageLog("SR圣杯强化lv1->lv2完毕");
                        var actWeaponArr2 = actWeaponArr.splice(0, 2);
                        kh.createInstance("apiAWeapons").enhance(actTargetCupArr[0], actWeaponArr2).then(function(e) {
                            mypageLog("SR圣杯强化lv2->lv3完毕");
                            var actWeaponArr3 = actWeaponArr.splice(0, 3);
                            kh.createInstance("apiAWeapons").enhance(actTargetCupArr[0], actWeaponArr3).then(function(e) {
                                mypageLog("SR圣杯强化lv3->lv4完毕");
                                kh.createInstance("apiAWeapons").enhance(actTargetCupArr[0], actWeaponArr).then(function(e) {
                                    mypageLog("SR圣杯强化lv4->lv5完毕");
                                    batchEnhanceSRCup(targetCupArr, weaponArr);
                                }).fail(playFailHandler);
                            }).fail(playFailHandler);
                        }).fail(playFailHandler);
                    }).fail(playFailHandler);
                } else {
                    //执行完毕
                    mypageLog("执行完毕");
                }
            };
        };

        //卖n幻兽
        function createNEidoBtn() {
            var sellSumBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>Sell N eido</button>");
            secondLevelMenuDiv.append(sellSumBtn);
            sellSumBtn.click(function() {
                logDiv.empty();
                sellSum();
            });
        };

        //卖n武器
        function createNWeapBtn() {
            var sellWeaponBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>Sell N weapon</button>");
            secondLevelMenuDiv.append(sellWeaponBtn);
            sellWeaponBtn.click(function() {
                logDiv.empty();
                sellWeapon();
            });
        };

        //卖r幻兽
        function createREidoBtn() {
            var sellRSumBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>卖r幻兽</button>");
            secondLevelMenuDiv.append(sellRSumBtn);
            sellRSumBtn.click(function() {
                emptyLog();
                mypageLog("开始获取幻兽信息");
                _http.get({
                    url: kh.env.urlRoot + "/a_summons",
                    json: {
                        selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    var sellArr = [];
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤R卡
                            if (item.can_sell && item.level == 1 && item.exp == 0 && item.rare == "R" && item.bonus == 0 && item.overlimit_count == 0 && item.attack > 20) {
                                sellArr.push(item.a_summon_id);
                            }
                        });
                    }
                    mypageLog("获取R卡数量" + sellArr.length);
                    batchSellSummon(sellArr);
                }).fail(playFailHandler);
            });
        };

        //卖r幻兽材
        function createREidoMBtn() {
            var sellRSumDogFoodBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>卖r幻兽材</button>");
            secondLevelMenuDiv.append(sellRSumDogFoodBtn);
            sellRSumDogFoodBtn.click(function() {
                emptyLog();
                mypageLog("开始获取R幻兽狗粮信息");
                _http.get({
                    url: kh.env.urlRoot + "/a_summons",
                    json: {
                        selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    var sellArr = [];
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤R卡
                            if (item.can_sell && item.level == 1 && item.exp == 0 && item.rare == "R" && item.bonus == 0 && item.overlimit_count == 0 && item.attack == 6) {
                                sellArr.push(item.a_summon_id);
                            }
                        });
                    }
                    mypageLog("获取R狗粮数量" + sellArr.length);
                    batchSellSummon(sellArr);
                }).fail(playFailHandler);
            });
        };

        //卖r武材
        function createRWeapMBtn() {
            var sellRWeapMBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>卖r武材</button>");
            secondLevelMenuDiv.append(sellRWeapMBtn);
            sellRWeapMBtn.click(function() {
                emptyLog();
                mypageLog("开始获取R武器狗粮信息");
                _http.get({
                    url: kh.env.urlRoot + "/a_weapons",
                    json: {
                        selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    var sellArr = [];
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤R卡
                            if (item.level == 1 && item.exp == 0 && item.rare == "R" && item.bonus == 0 && item.overlimit_count == 0 && item.attack == 8 && !item.is_equipped && !item.is_locked) {
                                sellArr.push(item.a_weapon_id);
                            }
                        });
                    }
                    mypageLog("获取R武器狗粮数量" + sellArr.length);
                    batchSellWeapon(sellArr);
                }).fail(playFailHandler);
            });
        };

        //卖sr幻兽材
        function createSREidoBtn() {
            var sellSRSumDogFoodBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>sr幻兽材</button>");
            secondLevelMenuDiv.append(sellSRSumDogFoodBtn);
            sellSRSumDogFoodBtn.click(function() {
                emptyLog();
                mypageLog("开始获取SR幻兽狗粮信息");
                _http.get({
                    url: kh.env.urlRoot + "/a_summons",
                    json: {
                        selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var data = e.body.data;
                    var sellArr = [];
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            //过滤SR卡
                            if (item.can_sell && item.level == 1 && item.exp == 0 && item.rare == "SR" && item.bonus == 0 && item.overlimit_count == 0 && item.attack == 12) {
                                sellArr.push(item.a_summon_id);
                            }
                        });
                    }
                    mypageLog("获取SR狗粮数量" + sellArr.length);
                    batchSellSummon(sellArr);
                }).fail(playFailHandler);
            });
        };

        //apiASummons  getRecommendSellableList  sell
        // t.createInstance("apiASummons").getRecommendSellableList().then(function(t) {
        //     return console.log(t),
        //     0 === t.body.max_record_count ? void this._popupNoOffer(e) : (n.each(t.body.data, function(e, t) {
        //         this._selectableCardList[e.a_summon_id] = t,
        //         this._selectableRecordList[e.a_summon_id] = e
        //     }, this),
        //     void this._popupConfirmRareSell(e, "btnCallbackTab1NodeBtnDecision"))
        // }

        function sellWeapon() {
            window.kh.createInstance("apiAWeapons").getRecommendSellableList().then(function(e) {
                if (0 === e.body.max_record_count) {
                    logDiv.append("N武器数量0<br/>");
                } else {
                    var sellArr = [];
                    for (var i = 0; i < e.body.data.length; i++) {
                        sellArr.push(e.body.data[i].a_weapon_id);
                    }
                    logDiv.append("N武器数量" + sellArr.length + "<br/>");
                    window.kh.createInstance("apiAWeapons").sell(sellArr).then(function(e) {
                        logDiv.append("出售完毕<br/>");
                        if (sellArr.length >= 20) {
                            //继续捐献
                            sellWeapon();
                        } else {}
                    }).fail(playFailHandler);;
                }
            }).fail(playFailHandler);
        }

        function sellSum() {
            window.kh.createInstance("apiASummons").getRecommendSellableList().then(function(e) {
                if (0 === e.body.max_record_count) {
                    logDiv.append("N幻兽数量0<br/>");
                } else {
                    var sellArr = [];
                    for (var i = 0; i < e.body.data.length; i++) {
                        sellArr.push(e.body.data[i].a_summon_id);
                    }
                    logDiv.append("N幻兽数量" + sellArr.length + "<br/>");
                    window.kh.createInstance("apiASummons").sell(sellArr).then(function(e) {
                        logDiv.append("出售完毕<br/>");
                        if (sellArr.length >= 20) {
                            //继续捐献
                            sellSum();
                        } else {}
                    }).fail(playFailHandler);
                }
            }).fail(playFailHandler);
        }

        function batchSellSummon(sellArr) {
            var actSellArr = sellArr.splice(0, 20);
            if (actSellArr.length > 0) {
                kh.createInstance("apiASummons").sell(actSellArr).then(function(e) {
                    mypageLog("出售幻兽共" + actSellArr.length + "。");
                    batchSellSummon(sellArr);
                }).fail(playFailHandler);
            } else {
                //执行完毕
                mypageLog("执行完毕");
            }
        }

        function batchSellWeapon(sellArr) {
            var actSellArr = sellArr.splice(0, 20);
            if (actSellArr.length > 0) {
                kh.createInstance("apiAWeapons").sell(actSellArr).then(function(e) {
                    mypageLog("出售武器共" + actSellArr.length + "。");
                    batchSellWeapon(sellArr);
                }).fail(playFailHandler);
            } else {
                //执行完毕
                mypageLog("执行完毕");
            }
        }

        function batchSellAcc(sellArr) {
            let sellArray = sellArr.splice(0, 20);
            if (sellArray.length > 0) {
                window.kh.createInstance("apiAAccessories").sell(sellArray).then(function(e) {
                    mypageLog("出售幻兽共" + sellArray.length + "。");
                    if (sellArr.length >= 20) {
                        //继续卖出
                        batchSellAcc(sellArr);
                    }
                }).fail(playFailHandler);
            } else {
                mypageLog("执行完毕");
            }
        }
        //出售N首饰
        function createSellNAccBtn() {
            var sellNAccBtn = $("<button type='button' class='btn'  style='width:33%;white-space:nowrap'>Sell ACC N</button>");
            secondLevelMenuDiv.append(sellNAccBtn);
            sellNAccBtn.click(function() {
                emptyLog();
                sellNAcc();
            });

            function sellNAcc() {
                window.kh.createInstance("apiAAccessories").getRecommendSellableList().then(function(e) {
                    if (0 === e.body.max_record_count) {
                        mypageLog("N首饰数量0");
                    } else {
                        var sellArr = [];
                        for (var i = 0; i < e.body.data.length; i++) {
                            sellArr.push(e.body.data[i].a_accessory_id);
                        }
                        mypageLog("出售N首饰共" + sellArr.length + "。");
                        window.kh.createInstance("apiAAccessories").sell(sellArr).then(function(e) {
                            mypageLog("出售完毕");
                            if (sellArr.length >= 20) {
                                //继续卖出
                                sellNAcc();
                            }
                        }).fail(playFailHandler);
                    }
                }).fail(playFailHandler);
            };
        };

        function createSellRAccBtn() {
            var sellNAccBtn = $("<button type='button' class='btn'  style='width:33%;white-space:nowrap'>Sell ACC R</button>");
            secondLevelMenuDiv.append(sellNAccBtn);
            sellNAccBtn.click(function() {
                emptyLog();
                sellRAcc();
            });

            function sellRAcc() {
                _http.get({
                        url: kh.env.urlRoot + "/a_accessories",
                        json: {
                            //selectable_base_filter: "sellable",
                            page: 1,
                            per_page: 500
                        }
                    }).then(function(e) {
                        var sellArr = e.body.data.filter((item) => {
                            return item.rare == "R" && item.attack >= 100 && item.level == 1 && !item.is_locked && !item.is_equipped
                        }).map((item) => {
                            return item.a_accessory_id;
                        });
                        batchSellAcc(sellArr);
                    })
                    // window.kh.createInstance("apiAAccessories").getRecommendSellableList().then(function (e) {
                    // 	if (0 === e.body.max_record_count) {
                    // 		mypageLog("N首饰数量0");
                    // 	} else {
                    // 		var sellArr = [];
                    // 		for (var i = 0; i < e.body.data.length; i++) {
                    // 			sellArr.push(e.body.data[i].a_accessory_id);
                    // 		}
                    // 		mypageLog("出售N首饰共" + sellArr.length + "。");
                    // 		window.kh.createInstance("apiAAccessories").sell(sellArr).then(function (e) {
                    // 			mypageLog("出售完毕");
                    // 			if (sellArr.length >= 20) {
                    // 				//继续卖出
                    // 				sellRAcc();
                    // 			}
                    // 		}).fail(playFailHandler);
                    // 	}
                    // }).fail(playFailHandler);
            };


        };

        function createSellSRAccBtn() {
            var sellNAccBtn = $("<button type='button' class='btn'  style='width:33%;white-space:nowrap'>Sell ACC SR</button>");
            secondLevelMenuDiv.append(sellNAccBtn);
            sellNAccBtn.click(function() {
                emptyLog();
                sellRAcc();
            });

            function sellRAcc() {
                _http.get({
                    url: kh.env.urlRoot + "/a_accessories",
                    json: {
                        //selectable_base_filter: "sellable",
                        page: 1,
                        per_page: 500
                    }
                }).then(function(e) {
                    var sellArr = e.body.data.filter((item) => {
                        return item.rare == "SR" && item.attack >= 100 && item.level == 1 && !item.is_locked && !item.is_equipped
                    }).map((item) => {
                        return item.a_accessory_id;
                    });
                    batchSellAcc(sellArr);
                })
            };
        };

        function batchSellSummon(sellArr) {
            var actSellArr = sellArr.splice(0, 20);
            if (actSellArr.length > 0) {
                kh.createInstance("apiASummons").sell(actSellArr).then(function(e) {
                    mypageLog("出售幻兽共" + actSellArr.length + "。");
                    batchSellSummon(sellArr);
                }).fail(playFailHandler);
            } else {
                //执行完毕
                mypageLog("执行完毕");
            }
        }

        //刷新存在
        function createRefreshExistBtn() {
            var refreshExistBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>RefreshExist</button>");
            secondLevelMenuDiv.append(refreshExistBtn);
            refreshExistBtn.click(function() {
                emptyLog();
                mypageLog("Bắt đầu");
                _http.get({
                    url: window.kh.env.urlRoot + "/a_players/me/game_config"
                }).then(function(e) {
                    var si = e.body.game_config.sound_info;
                    var param = {
                        sound_info: {
                            sound_enabled: si.sound_enabled,
                            bgm_enabled: si.bgm_enabled,
                            voice_enabled: si.voice_enabled,
                            se_enabled: si.se_enabled
                        }
                    }
                    _http.put({
                        url: "/v1/a_players/me/game_config",
                        json: param
                    }).then(function(a) {
                        mypageLog("Hoàn tất");
                    }).fail(function() {
                        mypageLog("Kết nối thất bại");
                    });
                }).fail(function() {
                    mypageLog("Kết nối thất bại");
                });
            });
        };

        //检查raid
        function createCheckRaidBtn() {
            var checkRaidBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>Raid</button>");
            secondLevelMenuDiv.append(checkRaidBtn);
            checkRaidBtn.click(function() {
                emptyLog();
                mypageLog("Kiểm tra raid");
                _http.get({
                    url: "/v1/a_battles",
                    json: {
                        kind: "raid_request"
                    }
                }).then(function(data) {
                    if (data.body.max_record_count == 0) {
                        mypageLog("Đéo có raid");
                    } else {
                        kh.createInstance("apiAPlayers").getQuestPoints().then(function(e) {
                            info.questPoints = e.body.quest_points;
                        }.bind(this));
                        var recommendItem = null;
                        currentRaids = [];
                        $.each(data.body.data, function(i, item) {
                            var questId = item.quest_id;
                            var raidData = raidCtl.getRaidData(questId);
                            let raid = {
                                id: item.a_battle_id,
                                questId: item.a_quest_id,
                                questType: item.quest_type,
                                battle_bp: item.battle_bp,
                                element: item.recommended_element_type,
                                ownRaid: item.is_own_raid,
                                help_requested_player_name: item.help_requested_player_name,
                                is_joined: item.is_joined
                            }
                            currentRaids[i] = raid;
                            if (!raidData) {
                                raidData = {
                                    hp: item.enemy_max,
                                    name: item.enemy_name,
                                    bp: item.battle_bp,
                                    level: item.enemy_level,
                                    questId: item.quest_id,
                                }
                                raidCtl.saveRaidData(raidData);
                            }

                            if (typeof(item) != "undefined" && item != null) {
                                /*
                                item.recommended_element_type
                                item.owner_account_id
                                */
                                mypageLog(
                                    "<div style='color:" + getElementByRecommended(item.recommended_element_type) + "'>" +
                                    item.enemy_name + "</br>" +
                                    "level : " + item.enemy_level + "</br>" +
                                    "hp : " + item.enemy_hp + "/" + item.enemy_max + " (" + Math.round(parseInt(item.enemy_hp) / parseInt(item.enemy_max) * 100) + "%)" + "</br>" +
                                    "people : " + item.participants + "</br>" +
                                    "summon by : " + item.help_requested_player_name + "</br>" +
                                    "time left : " + item.time_left + "</br>" +
                                    "<button onclick='window.checkRaid(" + i + ")'>" + "Join Raid</button>" +
                                    "</div>"
                                );
                                //+",战斗id:"+item.a_battle_id+",任务id:"+item.a_quest_id
                            }
                        });
                    }
                });
            });
        };




        function getElementByRecommended(id) {
            switch (id) {
                case 0:
                    return "green";
                case 1:
                    return "red";
                case 2:
                    return "gold";
                case 3:
                    return "blue";
                case 4:
                    return "black";
                case 5:
                    return "pink";
                default:
                    return "gray";
            }
        }

        //检查任务
        function createCheckMissionBtn() {
            var checkMissionBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap' style='width:33%;white-space:nowrap'>CheckMission</button>");
            secondLevelMenuDiv.append(checkMissionBtn);
            checkMissionBtn.click(function() {
                emptyLog();

                var missionApi = kh.createInstance("apiAMissions");
                var printEvt = function(ret, name) {
                    var str = name + ":";
                    if (ret.complete) {
                        str += "已完成";
                    } else {
                        str += "未完成";
                        _.each(ret.missions, function(item, i) {
                            var des = missionMap[item.description];
                            des = des || item.description;
                            str += "<br/>" + des + ":" + item.now_progress + "/" + item.max_progress;
                        });
                    }
                    mypageLog(str);
                }
                Q.all([missionApi.getDaily(), missionApi.getWeekly(), missionApi.getEvent()]).spread(function(daily, weekly, evt) {
                    printEvt(evt.body, "活动任务");
                    mypageLog("");
                    printEvt(daily.body, "日常任务");
                    mypageLog("");
                    printEvt(weekly.body, "周常任务");
                });
            });
        };


        //检查支援
        function createCheckSupportSummonBtn() {};

        //领日常奖励
        function createCollQuestBtn() {
            var collQuestBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>DailyReward</button>");
            secondLevelMenuDiv.append(collQuestBtn);
            collQuestBtn.click(function() {
                emptyLog();
                collQuestBtn.prop("disabled", true);
                var missionApi = kh.createInstance("apiAMissions");
                Q.all([missionApi.getDaily(), missionApi.getWeekly(), missionApi.getEvent()]).spread(function(daily, weekly, evt) {
                    var pro = Promise.resolve();
                    var pushReceiveReward = function(body, type, funArr) {
                        if (!body.complete) {
                            _.each(body.missions, function(item, i) {
                                if (item.clear) {
                                    funArr.push(function() {
                                        return missionApi.receiveMissionReward(type, item.a_mission_id);
                                    });
                                }
                            });
                        }
                    }
                    var funArr = [];
                    pushReceiveReward(daily.body, "daily", funArr);
                    pushReceiveReward(weekly.body, "weekly", funArr);
                    pushReceiveReward(evt.body, "event", funArr);
                    funArr.reduce(function(curr, next) {
                        return curr.then(next);
                    }, pro).then(function() {
                        if (funArr.length > 0) {
                            mypageLog("Đã nhận");
                        } else {
                            mypageLog("Đéo có gì");
                        }

                        collQuestBtn.prop("disabled", false);
                    });
                });
            });
        };

        //抽金币
        function createGachaBtn() {
            var normalGachaBtn = $("<button type='button' class='btn' style='width:100%'>Gem</button>");
            secondLevelMenuDiv.append(normalGachaBtn);
            normalGachaBtn.click(function() {
                emptyLog();
                continuePlay();

                function continuePlay() {
                    var gachaApi = window.kh.createInstance("apiAGacha");
                    gachaApi.getCategory(3).then(function(e) {
                        debugger;
                        var isMax = e.body["is_max_weapon_or_summon"];
                        if (isMax) {
                            mypageLog("Full rương không thể gacha");
                            return;
                        }
                        var groups = e.body.groups;
                        if (groups && groups[0] && groups[0].gacha_id == 10) {
                            gachaApi.getCheckUsing(10).then(function(e) {
                                if (e.body.after_num == e.body.before_num) {
                                    mypageLog("Gacha gem");
                                    gachaApi.playGacha("normal", 10).then(function(e) {
                                        if (handleGachaResult(e)) {
                                            continuePlay();
                                        }
                                    }).fail(playFailHandler);
                                } else {
                                    mypageLog("Hết tiền cmnr");
                                    return;
                                }
                            }).fail(playFailHandler);
                        } else if (groups && groups.length > 0 && groups[0].gacha_id == 9 && groups[0].enabled) {
                            gachaApi.getCheckUsing(9).then(function(e) {
                                mypageLog("抽卡价格" + groups[0].price);
                                if (groups[0].price < 500) {
                                    mypageLog("少于5抽,扭蛋结束");
                                    return;
                                } else if (e.body.before_num < 500) {
                                    mypageLog("金币数量小于500,扭蛋结束");
                                    return;
                                } else if (e.body.before_num - e.body.after_num == groups[0].price) {
                                    mypageLog("开始" + groups[0].gacha_count + "次抽取");
                                    gachaApi.playGacha("normal", 9).then(function(e) {
                                        if (handleGachaResult(e)) {
                                            continuePlay();
                                        }
                                    }).fail(playFailHandler);
                                } else {
                                    mypageLog("Hết tiền");
                                    return;
                                }
                            }).fail(playFailHandler);
                        } else {
                            gachaApi.getCheckUsing(8).then(function(e) {
                                if (e.body.before_num < 200) {
                                    mypageLog("Hết tiền");
                                    return;
                                } else {
                                    mypageLog("gacha xong cmnr!");
                                    return;
                                }
                            }).fail(playFailHandler);
                        }
                    }).fail(playFailHandler);
                };

                function handleGachaResult(e) {
                    var arr = e.body["obtained_info"];
                    var sumN = 0;
                    var sumR = 0;
                    var weaponN = 0;
                    var weaponR = 0;
                    var itemGG = 0;
                    for (var i = 0; i < arr.length; i++) {
                        var item = arr[i];
                        if (item["weapon_info"]) {
                            if (item["weapon_info"].rare == "N") {
                                weaponN++;
                            } else if (item["weapon_info"].rare == "R") {
                                weaponR++;
                            }
                        } else if (item["summon_info"]) {
                            if (item["summon_info"].rare == "N") {
                                sumN++;
                            } else if (item["summon_info"].rare == "R") {
                                sumR++;
                            }
                        } else if (item["item_info"].id != 0) {
                            itemGG++;
                        }
                    }
                    mypageLog("n武器" + weaponN + "，r武器" + weaponR + "，n幻兽" + sumN + "，r幻兽" + sumR + "，物品" + itemGG + "。");
                    if (sumN + sumR + weaponN + weaponR + itemGG == 0) {
                        mypageLog("未抽出东西,程序结束");
                        return false;
                    }
                    return true;
                };
            });
        };



        function createGachaEvent() {
            var input = $("<input type='number' id='input_event_raid_id' placeholder='event raid id' class='input' style='width:100px'/>");
            var value = $("<input type='number' id='input_event_raid_ticket' placeholder='ticket use 0=all' class='input' stype='width:100px'/>");
            var gachaBtn = $("<button type='button' class='btn' style='white-space:nowarp'>Gacha raid Event</button>");
            secondLevelMenuDiv.append(input);
            secondLevelMenuDiv.append(gachaBtn);
            secondLevelMenuDiv.append(value);
            gachaBtn.click(function() {
                emptyLog();
                var id = document.getElementById("input_event_raid_id").value;
                var value = document.getElementById("input_event_raid_ticket").value;
                if (id) {
                    kh.createInstance("apiAItems").getTicket(1, 10).then(function(e) {
                        var ticket = getNumTicket(e)[0].num;
                        if (!ticket) {
                            mypageLog("cant find ticket!!!!");
                            return;
                        }
                        if (!value) value = ticket;
                        if (value < ticket) ticket = value;
                        gachaNonstop(ticket);
                    });
                } else {
                    mypageLog("event id not null!!!!");
                    return;
                }

                function getNumTicket(e) {
                    return e.body.data.filter(item => item.name = "Raid GT");
                }

                function gachaNonstop(ticket) {
                    if (!ticket) return;
                    var gachaApi = window.kh.createInstance("apiAGacha");
                    gachaApi.playGacha("event", id).then(function(e) {
                        handleGachaResult(e);
                        gachaNonstop(ticket - 10);
                    }).fail(playFailHandler)
                }

                function handleGachaResult(e) {
                    var arr = e.body["obtained_info"];
                    var stringDisplay = "";
                    var sumSSR = 0;
                    var weaponSSR = 0;
                    var noble = 0;
                    for (var i = 0; i < arr.length; i++) {
                        var item = arr[i];
                        if (item["weapon_info"]) {
                            if (item["weapon_info"].rare == "SSR") {
                                weaponSSR++;
                            }
                        } else if (item["summon_info"]) {
                            if (item["summon_info"].rare == "SSR") {
                                sumSSR++;
                            }
                        } else {
                            noble++;
                        }
                    }

                    if (weaponSSR > 0) {
                        stringDisplay += "Weap SSR, ";
                    }
                    if (sumSSR > 0) {
                        stringDisplay += "Eidon SSR, ";
                    }
                    if (!stringDisplay) {
                        stringDisplay += "Trash.<br/>";
                    } else {
                        stringDisplay += "<br/>";
                    }
                    mypageLog(stringDisplay);
                    return true;
                }
            });
        }

        //抽魔宝石
        function createGachaStoneBtn() {
            var gachaStoneBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap' disabled='disabled'>Jewel</button>");
            secondLevelMenuDiv.append(gachaStoneBtn);
            gachaStoneBtn.click(function() {
                emptyLog();

                continuePlay();

                function continuePlay() {
                    var gachaApi = window.kh.createInstance("apiAGacha");
                    gachaApi.getCategory("stone").then(function(e) {
                        var groups = e.body.groups;
                        if (groups && groups[1] && groups[1].gacha_id == 7) {
                            gachaApi.getCheckUsing(7).then(function(e) {
                                console.log(e.body.before_num);
                                if (e.body.before_num >= 3000) {
                                    mypageLog(new Date());
                                    gachaApi.playGacha("stone", 7).then(function(e) {
                                        if (handleGachaResult(e)) {
                                            continuePlay();
                                        }
                                    }).fail(playFailHandler);
                                } else {
                                    mypageLog("魔宝石不足,扭蛋结束");
                                    return;
                                }
                            }).fail(playFailHandler);
                        }
                    }).fail(playFailHandler);
                }

                function handleGachaResult(e) {
                    var arr = e.body["obtained_info"];
                    mypageLog(new Date());
                    var sumSSR = 0;
                    var weaponSSR = 0;
                    var noble = 0;
                    var weapId = [];
                    var weapEle = [];
                    var eidoId = [];
                    var eidoEle = [];
                    for (var i = 0; i < arr.length; i++) {
                        var item = arr[i];
                        if (item["weapon_info"]) {
                            if (item["weapon_info"].rare == "SSR") {
                                weaponSSR++;
                                weapId.push(item["weapon_info"].id);
                                weapEle.push(item["weapon_info"].element_type);
                            }
                        } else if (item["summon_info"]) {
                            if (item["summon_info"].rare == "SSR") {
                                sumSSR++;
                                eidoId.push(item["summon_info"].id);
                                eidoEle.push(item["summon_info"].element_type);
                                if (item["summon_info"].id >= 5011 && item["summon_info"].id <= 5050) {
                                    noble++;
                                } //** */
                            }
                        }
                    }
                    mypageLog("SSR武器" + weaponSSR + "，SSR幻兽" + sumSSR + "，其中贵族" + noble + "。");
                    if (weaponSSR > 0) {
                        mypageLog("SSR武器id为");
                        for (var i = 0; i < weapId.length; i++) {
                            mypageLog(weapId[i]);
                        };
                        mypageLog("元素为");
                        for (var i = 0; i < weapEle.length; i++) {
                            mypageLog(weapEle[i]);
                        };
                    }
                    if (sumSSR > 0) {
                        mypageLog("SSR幻兽id为");
                        for (var i = 0; i < eidoId.length; i++) {
                            mypageLog(eidoId[i]);
                        };
                        mypageLog("元素为");
                        for (var i = 0; i < eidoEle.length; i++) {
                            mypageLog(eidoEle[i]);
                        };
                    }
                    return true;
                }
            });
        };

        //收礼物
        function createPresentBtn() {
            var presentBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>接收礼物</button>")
            secondLevelMenuDiv.append(presentBtn);
            presentBtn.click(function() {
                emptyLog();
                _http.post({
                    url: kh.env.urlRoot + "/a_presents_receive",
                    json: {
                        type: 'normal'
                    }
                }).then(function(e) {
                    handlePresentResult(e);
                });
            });

            function handlePresentResult(e) {
                var arr = e.body["received_info"];
                var sum = 0;
                var weapon = 0;
                var acces = 0;
                var items = 0;
                var stone = 0;
                var gem = 0;
                for (var i = 0; i < arr.length; i++) {
                    var item = arr[i];
                    if (item["name"] == 'Weapon') {
                        weapon = item['count'];
                    } else if (item["name"] == 'Eidolon') {
                        sum = item['count'];
                    } else if (item["name"] == 'Accessory') {
                        acces = item['count'];
                    } else if (item["name"] == 'Item') {
                        items = item['count'];
                    } else if (item["name"] == 'Magic Jewel') {
                        stone = item['count'];
                    } else if (item["name"] == 'Gem') {
                        gem = item['count'];
                    }
                }
                mypageLog("接收礼物：</br>武器" + weapon + "，幻兽" + sum + "，首饰" + acces + "，物品" + items + "，魔宝石" + stone +
                    "，金币" + gem + "。");
                return true;
            };
        };

        //仅接收物品
        function createPrsntItmBtn() {
            var prsntItmBtn = $("<button type='button' class='btn' style='width:30%;white-space:nowrap'>收物品</button>")
            var pageInput = $("<input type=\"text\" id=\"pageInput\" name=\"num\" value=\"1\" style='width: 25px'></input>");
            var itmFiltr = $("<select id=\"itmFiltr\">" +
                "<option value=\"I\">物品除魔宝石</option>" +
                "<option value=\"RE\">幻兽材料</option>" +
                "<option value=\"R\">R武器及材料</option>" +
                "<option value=\"SRM\">SR武器材料</option>" +
                "<option value=\"SR\">SR武器</option>" +
                "<option value=\"SSR\">所有SSR</option>" +
                "<option value=\"MJ\">魔宝石</option>" +
                "</select>");
            secondLevelMenuDiv.append(itmFiltr);
            secondLevelMenuDiv.append(pageInput);
            secondLevelMenuDiv.append(prsntItmBtn);
            prsntItmBtn.click(function() {
                emptyLog();
                var pgInput = document.getElementById("pageInput");
                var pageNum = parseInt(pgInput.value);
                //var prsntpg = 1	
                //for	(; prsntpg<=ttlprsntpg;){
                //continuePlay();
                //var prsntpg = 1;
                //var ttlprsntpg = 1;
                _http.get({
                    url: kh.env.urlRoot + "/a_presents?json=%7B%22type%22%3A%22normal%22%2C%22page%22%3A" + pageNum + "%2C%22per_page%22%3A400%7D",
                    /* json: {
                    	 type: 'normal',
                    	 page: 1,
                    	 per_page: '50'
                     }*/
                }).then(function(e) {
                    var ttlprsntpg = Math.ceil(e.body["max_record_count"] / 400);
                    var prsntInfo = e.body["data"];
                    var itmAttr = document.getElementById("itmFiltr");
                    var itmSlct = itmAttr.value;
                    switch (itmSlct) {
                        case "I":
                            rcvItm();
                            break;
                        case "RE":
                            rcvEido();
                            break;
                        case "R":
                            rcvRWpn();
                            break;
                        case "SRM":
                            rcvSRWpnM();
                            break;
                        case "SR":
                            rcvSRWpn();
                            break;
                        case "SSR":
                            rcvSSR();
                            break;
                        case "MJ":
                            rcvMJ();
                            break;
                    };

                    //接收除了魔宝石的物品
                    function rcvItm() {
                        var itmnum = 0;
                        var itmid;
                        for (var i = 0; i < prsntInfo.length; i++) {
                            var item = prsntInfo[i];
                            if (item["kind"] == 'item' && item["id"] != 1 || item["kind"] == 'treasure') {
                                itmnum++;
                                itmid = item.a_present_id;
                                _http.post({
                                    url: kh.env.urlRoot + "/a_presents/" + itmid + "/receive",
                                });
                            }
                        };
                        mypageLog("总页数" + ttlprsntpg + "，接收物品" + itmnum + "。");
                        if (itmnum == 0) {
                            if (pageNum >= ttlprsntpg) {
                                mypageLog("无物品可接收。");
                            } else {
                                mypageLog("无物品可接收，请输入下一页。");
                            }
                        }
                        return true;
                    };

                    //接收魔宝石
                    function rcvMJ() {
                        var itmnum = 0;
                        var itmid;
                        var mjCount = 0;
                        for (var i = 0; i < prsntInfo.length; i++) {
                            var item = prsntInfo[i];
                            if (item["id"] == 1) {
                                itmnum++;
                                mjCount = mjCount + item["count"];
                                itmid = item.a_present_id;
                                _http.post({
                                    url: kh.env.urlRoot + "/a_presents/" + itmid + "/receive",
                                });
                            }
                        };
                        mypageLog("总页数" + ttlprsntpg + "，接收魔宝石" + itmnum + "份，总计" + mjCount + "。");
                        if (itmnum == 0) {
                            if (pageNum >= ttlprsntpg) {
                                mypageLog("无魔宝石可接收。");
                            } else {
                                mypageLog("无魔宝石可接收，请输入下一页。");
                            }
                        }
                        return true;
                    };

                    //接收幻兽材料
                    function rcvEido() {
                        var itmnum = 0;
                        var itmid;
                        for (var i = 0; i < prsntInfo.length; i++) {
                            var item = prsntInfo[i];
                            //幻兽材料id从151-162
                            if (item["id"] <= 162 && item["id"] >= 151) {
                                itmnum++;
                                itmid = item.a_present_id;
                                _http.post({
                                    url: kh.env.urlRoot + "/a_presents/" + itmid + "/receive",
                                });
                            }
                        };
                        mypageLog("总页数" + ttlprsntpg + "，接收幻兽材料" + itmnum + "。");
                        if (itmnum == 0) {
                            if (pageNum >= ttlprsntpg) {
                                mypageLog("无幻兽材料可接收。");
                            } else {
                                mypageLog("无幻兽材料可接收，请输入下一页。");
                            }
                        }
                        return true;
                    };

                    //接收R武器及材料
                    function rcvRWpn() {
                        var itmnum = 0;
                        var itmid;
                        for (var i = 0; i < prsntInfo.length; i++) {
                            var item = prsntInfo[i];
                            if (item["weapon_info"]) {
                                if (item["weapon_info"].rare == "R") {
                                    itmnum++;
                                    itmid = item.a_present_id;
                                    _http.post({
                                        url: kh.env.urlRoot + "/a_presents/" + itmid + "/receive",
                                    });
                                }
                            }
                        };
                        mypageLog("总页数" + ttlprsntpg + "，接收R武器及材料" + itmnum + "。");
                        if (itmnum == 0) {
                            if (pageNum >= ttlprsntpg) {
                                mypageLog("无R武器及材料可接收。");
                            } else {
                                mypageLog("无R武器及材料可接收，请输入下一页。");
                            }
                        }
                        return true;
                    };

                    //接收SR武器材料
                    function rcvSRWpnM() {
                        var itmnum = 0;
                        var itmid;
                        for (var i = 0; i < prsntInfo.length; i++) {
                            var item = prsntInfo[i];
                            if (item["id"] <= 234 && item["id"] >= 226 || item["id"] == 5000) {
                                itmnum++;
                                itmid = item.a_present_id;
                                _http.post({
                                    url: kh.env.urlRoot + "/a_presents/" + itmid + "/receive",
                                });
                            }
                        };
                        mypageLog("总页数" + ttlprsntpg + "，接收SR武器材料" + itmnum + "。");
                        if (itmnum == 0) {
                            if (pageNum >= ttlprsntpg) {
                                mypageLog("无SR武器材料可接收。");
                            } else {
                                mypageLog("无SR武器材料可接收，请输入下一页。");
                            }
                        }
                        return true;
                    };

                    //接收SR武器
                    function rcvSRWpn() {
                        var itmnum = 0;
                        var itmid;
                        for (var i = 0; i < prsntInfo.length; i++) {
                            var item = prsntInfo[i];
                            if (item["id"] != 5000 && item["id"] >= 235 || item["id"] <= 225) {
                                if (item["weapon_info"]) {
                                    if (item["weapon_info"].rare == "SR") {
                                        itmnum++;
                                        itmid = item.a_present_id;
                                        _http.post({
                                            url: kh.env.urlRoot + "/a_presents/" + itmid + "/receive",
                                        });
                                    }
                                }
                            }
                        };
                        mypageLog("总页数" + ttlprsntpg + "，接收SR武器" + itmnum + "。");
                        if (itmnum == 0) {
                            if (pageNum >= ttlprsntpg) {
                                mypageLog("无SR武器可接收。");
                            } else {
                                mypageLog("无SR武器可接收，请输入下一页。");
                            }
                        }
                        return true;
                    };

                    //接收SSR
                    function rcvSSR() {
                        var itmnum = 0;
                        var itmid;
                        for (var i = 0; i < prsntInfo.length; i++) {
                            var item = prsntInfo[i];
                            if (item["weapon_info"]) {
                                if (item["weapon_info"].rare == "SSR") {
                                    itmnum++;
                                    itmid = item.a_present_id;
                                    _http.post({
                                        url: kh.env.urlRoot + "/a_presents/" + itmid + "/receive",
                                    });
                                }
                            }
                            if (item["summon_info"]) {
                                if (item["summon_info"].rare == "SSR") {
                                    itmnum++;
                                    itmid = item.a_present_id;
                                    _http.post({
                                        url: kh.env.urlRoot + "/a_presents/" + itmid + "/receive",
                                    });
                                }
                            }
                        };
                        mypageLog("总页数" + ttlprsntpg + "，接收SSR武器及幻兽" + itmnum + "。");
                        if (itmnum == 0) {
                            if (pageNum >= ttlprsntpg) {
                                mypageLog("无SSR可接收。");
                            } else {
                                mypageLog("无SSR可接收，请输入下一页。");
                            }
                        }
                        return true;
                    };
                });
            });
        };

        //收限时礼物
        function createlimitPresentBtn() {
            var limitpresentBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>Receive Pressent</button>")
            secondLevelMenuDiv.append(limitpresentBtn);
            limitpresentBtn.click(function() {
                emptyLog();
                _http.post({
                    url: kh.env.urlRoot + "/a_presents_receive",
                    json: {
                        type: 'timelimit'
                    }
                }).then(function(e) {
                    handlePresentResult(e);
                });
            });

            function handlePresentResult(e) {
                var arr = e.body["received_info"];
                var sum = 0;
                var weapon = 0;
                var acces = 0;
                var items = 0;
                var stone = 0;
                var gem = 0;
                for (var i = 0; i < arr.length; i++) {
                    var item = arr[i];
                    if (item["name"] == 'Weapon') {
                        weapon = item['count'];
                    } else if (item["name"] == 'Eidolon') {
                        sum = item['count'];
                    } else if (item["name"] == 'Accessory') {
                        acces = item['count'];
                    } else if (item["name"] == 'Item') {
                        items = item['count'];
                    } else if (item["name"] == 'Magic Jewel') {
                        stone = item['count'];
                    } else if (item["name"] == 'Gem') {
                        gem = item['count'];
                    }
                }
                mypageLog("接收礼物：</br>武器" + weapon + "，幻兽" + sum + "，首饰" + acces + "，物品" + items + "，魔宝石" + stone +
                    "，金币" + gem + "。");
                return true;
            };
        }

        //模拟十连
        function createSimGacha10Btn() {
            var simGacha10Btn = $("<button type='button' class='btn'>模拟十连</button>");
            secondLevelMenuDiv.append(simGacha10Btn);
            simGacha10Btn.click(function() {
                var settings = JSON.parse($("#hiddenDiv").text());
                var extensionId = settings.extensionId;
                var img1 = $("<img src='chrome-extension://" + extensionId + "/img/corecard_item_0123.jpg' width='150' height='150'/>");
                logDiv.append(img1);
            });
        }

        //日常交换物品
        function createDailyTreasureExchangeBtn() {
            var dailyTreasureExchangeBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>Exchange</button>");
            secondLevelMenuDiv.append(dailyTreasureExchangeBtn);
            dailyTreasureExchangeBtn.click(function() {
                var index = -1;
                var itemArr = [];
                emptyLog();
                //获取满足要求的商店宝藏信息并交换
                mypageLog("开始获取商店宝藏信息");
                window.kh.createInstance("apiShop").getTreasuresTreasure(1, 100).then(function(e) {
                    var data = e.body.data;
                    if (data && data.length > 0) {
                        _.each(data, function(item, i) {
                            index = dailyTreasureExchangeList.indexOf(item.id);
                            if (typeof(item) != "undefined" //物品存在
                                &&
                                index > -1 //在列表中
                                &&
                                item.stock_info.day.remaining_num > 0 //剩余兑换次数>0
                                &&
                                item.exchange_items[0].have_num >= item.exchange_items[0].required_num) { //材料大于等于需要
                                itemArr.push(item);
                            }
                        });
                    }
                    mypageLog("获取列表完毕");
                    batchExchange(itemArr);
                }).fail(playFailHandler);
            });

            //批量交换物品（1种换1种）
            function batchExchange(itemArr) {
                var actItemArr = itemArr.splice(0, 1);
                if (actItemArr.length > 0) {
                    var item = actItemArr[0];
                    window.kh.createInstance("apiShop").exchangeTreasure(item.shop_treasure_id, 1).then(function(e) {
                        mypageLog("交换物品:" + item.exchange_items[0].name + "*" +
                            item.exchange_items[0].required_num + " -> " + item.name + "*1");
                        batchExchange(itemArr);
                    }).fail(playFailHandler);
                } else {
                    //执行完毕
                    mypageLog("执行完毕");
                }
            };
        };

        //信息按钮
        function createInfoBtn() {
            var infoBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>日版信息</button>");
            secondLevelMenuDiv.append(infoBtn);
            infoBtn.click(function() {
                showInfo();
            });

        };

        //美服信息按钮
        function createLocalizeInfoBtn() {
            var lclzInfoBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>美版信息</button>");
            secondLevelMenuDiv.append(lclzInfoBtn);
            lclzInfoBtn.click(function() {
                showLocalizeInfo();
            });

        };


        //首饰计算按钮
        function createCalBtn() {
            var calBtn = $("<button type='button' class='btn' style='width:33%;white-space:nowrap'>首饰计算</button>");
            secondLevelMenuDiv.append(calBtn);
            calBtn.click(function() {
                createCalContents();
            });
        };

        //创建计算控件组
        function createCalContents() {
            secondLevelMenuDiv.empty();
            createShowWeaponGainBtn();
            createShowPartyStateBtn();
            createCalBtn();
            createAccCommonContents();
            createAccRemainExpCalBtn();
            createAccBaseExpCalBtn();
        };

        //首饰计算通用项
        function createAccCommonContents() {
            //稀有度下拉项
            var itemRaritySelect = $("<select id=\"itemRaritySelect\">" +
                "<option value=\"0\">选择稀有度</option>" +
                "<option value=\"N\">N</option>" +
                "<option value=\"R\">R</option>" +
                "<option value=\"SR\">SR</option>" +
                "<option value=\"SSR\">SSR</option>" +
                "</select>");
            secondLevelMenuDiv.append(itemRaritySelect);
            //当前等级输入框
            var itemLvInput = $("<input type=\"text\" id=\"itemLvInput\" name=\"exp\" value=\"输入当前等级\"></input>");
            secondLevelMenuDiv.append(itemLvInput);
            //点击文本框默认字符消失
            /*function addListener(element,e,fn){      
				if(element.addEventListener){      
					 element.addEventListener(e,fn,false);      
				 } else {      
					 element.attachEvent("on" + e,fn);      
				  }      
		   	};
				addListener(itemLvInput,"click",function(){  
					itemLvInput.value = "";  
				});
				addListener(itemLvInput,"blur",function(){  
					itemLvInput.value = "输入当前等级";  
				});*/
            //到下一等级需要经验输入框
            var itemRemainExpInput = $("<input type=\"text\" id=\"itemExpInput\" name=\"exp\" value=\"输入当前等级剩余经验\"></input>");
            secondLevelMenuDiv.append(itemRemainExpInput);
        };

        //首饰剩余经验值计算
        function createAccRemainExpCalBtn() {
            var accRemainExpBtn = $("<button type='button' class='btn' style='width:49%;white-space:nowrap'>首饰剩余经验</button>");
            secondLevelMenuDiv.append(accRemainExpBtn);
            accRemainExpBtn.click(function() {
                emptyLog();
                //根据控件ID获取控件对象
                var itemRaritySelect = document.getElementById("itemRaritySelect");
                var itemLvInput = document.getElementById("itemLvInput");
                var itemRemainExpInput = document.getElementById("itemRemainExpInput");
                var lv = parseInt(itemLvInput.value);
                var maxLv = accessoryRarityMaxLv[itemRaritySelect.value];
                var nextLvExp = accessoryEnhanceExpTotal[Math.min(lv + 1, maxLv)];
                var maxExp = accessoryEnhanceExpTotal[maxLv];
                var lvRemainExp = parseInt(itemExpInput.value);
                var gainedExp = nextLvExp - lvRemainExp;
                var totalRemainExp = maxExp - gainedExp;
                mypageLog("首饰稀有度：" + itemRaritySelect.value);
                mypageLog("首饰lv：" + itemLvInput.value);
                mypageLog("首饰满级总共需要exp：" + maxExp);
                mypageLog("首饰距离下一等级需要exp：" + itemExpInput.value);
                mypageLog("首饰已获得exp：" + gainedExp);
                mypageLog("首饰距离满级需要exp：" + totalRemainExp);
            });
        };

        //首饰提供经验值计算
        function createAccBaseExpCalBtn() {
            var accBaseExpBtn = $("<button type='button' class='btn' style='width:49%;white-space:nowrap'>首饰提供经验</button>");
            secondLevelMenuDiv.append(accBaseExpBtn);
            accBaseExpBtn.click(function() {
                emptyLog();
                //根据控件ID获取控件对象
                var itemRaritySelect = document.getElementById("itemRaritySelect");
                var itemLvInput = document.getElementById("itemLvInput");
                var itemRemainExpInput = document.getElementById("itemRemainExpInput");
                var lv = parseInt(itemLvInput.value);
                var rarityExp = accessoryBaseExp[itemRaritySelect.value];
                var levelExp = accessoryLevelExp[itemLvInput.value];
                mypageLog("首饰稀有度：" + itemRaritySelect.value);
                mypageLog("首饰lv：" + itemLvInput.value);
                mypageLog("首饰可提供exp（异色）：" + (rarityExp + levelExp));
                mypageLog("首饰可提供exp（同色）：" + Math.ceil((rarityExp + levelExp) * 1.5));
            });
        };


        //显示信息
        function showInfo() {
            emptyLog();
            mypageLog("修改：swebok");
            mypageLog("更新日期：2017/12/10");
            mypageLog("暗号：535942143");
            mypageLog("更新日志：");
            mypageLog("0.0.18.3：战斗界面刷新快捷键：z；");
            mypageLog("商店自动交换修正；");
            mypageLog("特殊分类（非常用功能）：增加R武器强化到lv2功能（未经测试）;");
            mypageLog("0.0.18.2：计算攻刃更新背水中小;");
            mypageLog("自动强化无视已装备武器。")
            mypageLog("0.0.18.1：增加领日常奖励功能；");
            mypageLog("日常兑换更新；");
            mypageLog("修正卖出N首饰错误。");
            mypageLog("0.0.18.0：UI全面更新；");
            mypageLog("增加队伍状态检查、卖N首饰、日常兑换、自动战斗功能；");
            mypageLog("计算攻刃更新；");
        };

        //显示美服本地化信息
        function showLocalizeInfo() {
            emptyLog();
            mypageLog("***************************");
            mypageLog("美服本地化信息");
            mypageLog("修改：一只暹罗猫");
            mypageLog("美服群号：609046256");
            mypageLog("版本号：18.3.6");
            mypageLog("软件界面修正及优化");
            mypageLog("添加筛选接收礼物功能");
            mypageLog("信息显示优化");
            mypageLog("武器筛选优化");
            mypageLog("刷号功能强化");
            mypageLog("整合日版首饰计算功能");
            mypageLog("属攻计算修正（群内大佬所写）");
            mypageLog("版本号：18.3.5");
            mypageLog("武器技能计算适配美服");
            mypageLog("恢复卖幻兽武器功能");
            mypageLog("按键位置调整");
            mypageLog("整合刷号功能（群内大佬所写）");
            mypageLog("日常兑换回滚");
            mypageLog("武器强化修正");
            mypageLog("添加强化sr武至2级、3级");
            mypageLog("添加卖r武器狗粮");
            mypageLog("修复战斗结束时的错误");
        };

        /////////////////////////////////////////////////////////////////////////////////////////////////
        //文本框操作
        /////////////////////////////////////////////////////////////////////////////////////////////////
        //清除文本
        function emptyLog() {
            logDiv.empty();
        };

        //打印文本
        function mypageLog(str) {
            logDiv.append(str + "<br/>");
        };

        /////////////////////////////////////////////////////////////////////////////////////////////////
        //出错句柄
        /////////////////////////////////////////////////////////////////////////////////////////////////
        //出错时文本框显示执行失败
        function playFailHandler() {
            mypageLog("执行失败");
        };

        /////////////////////////////////////////////////////////////////////////////////////////////////
        //调试方法
        /////////////////////////////////////////////////////////////////////////////////////////////////
        //调试按钮
        function createDebugBtn() {
            var debugBtn = $("<button type='button' class='btn'>调试</button>");
            mainMenuDiv.append(debugBtn);
            var textArea = $("<textarea>");
            mainMenuDiv.append(textArea);
            debugBtn.click(function() {
                emptyLog();
                var obj = window.kh;
                textArea.append(JSON.stringify(window.kh.Api));
                window.console.log("123");
                //mypageLog(JSON.stringify(window.kh));
                //mypageLog(window.kh.createInstance("apiAParties"));
                //console.log(window.kh.createInstance("apiAWeapons"));
                //console.log(window.kh.createInstance("apiASummons"));
                //console.log(window.kh.createInstance("apiAParties"));
                /*window.kh.createInstance("apiAParties").getDeck("selected").then(function(e) {
                	var deck = e.body.deck;
                	console.log(e);
                	if(deck&&deck.length>0){
                		_.each(deck,function(item,i){
                			console.log(item);
                		});
                	}
                }).fail(playFailHandler);*/
                /*window.kh.createInstance("apiACharacters").getList("", 1, 200).then(function(e){
                	var data = e.body.data;
                	if(data&&data.length>0){
                		_.each(data,function(item,i){
                			console.log(item);
                		});
                	}
                }).fail(playFailHandler);*/
                /*window.kh.createInstance("apiASummons").getSupporters(0).then(function(e){
                	var data = e.body.data;
                	if(data&&data.length>0){
                		_.each(data,function(item,i){
                			console.log(item);
                		});
                	}
                }).fail(playFailHandler);*/
                //console.log(window.kh.createInstance("apiAAccessories"));
                //console.log(window.kh.createInstance("apiShop"));
            });
        };

        function initLogDivContent() {
            heightArr = [142, 244, 199, 284, 143, 107, 132, 276, 114, 133, 262, 218, 349, 240, 243, 135, 268, 248, 268];
            extArr = ["jpg", "jpg", "jpg", "jpg", "jpg", "gif", "jpg", "jpg", "jpg", "jpg", "jpg", "jpg", "jpg", "gif", "jpg", "jpg", "jpg", "jpg", "jpg"]
            var index = 1 + Math.floor(19 * Math.random());
            var settings = JSON.parse($("#hiddenDiv").text());
            var extensionId = settings.extensionId;
            var img = $("<img src='chrome-extension://" + extensionId + "/img/img" + index + "." + extArr[index - 1] + "' width='240' height='" + heightArr[index - 1] + "'/>");
            logDiv.append(img);
        }

        //var wrapDiv = $("<div></div>");
        //con.append(wrapDiv);

    }, 1000);

});