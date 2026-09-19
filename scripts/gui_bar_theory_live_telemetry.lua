function widget:GetInfo()
    return {
        name    = "BAR Theory Tactical Overlay",
        desc    = "Native 16-bit arcade tactical HUD, live battle intel feeds, build queue, and telemetry exporter",
        author  = "Theory-App",
        date    = "2026-09-18",
        license = "GNU GPL, v2 or later",
        layer   = 50,
        enabled = true
    }
end

--------------------------------------------------------------------------------
-- Engine API shortcuts
--------------------------------------------------------------------------------
local spGetMyTeamID       = Spring.GetMyTeamID
local spGetMyAllyTeamID   = Spring.GetMyAllyTeamID
local spGetMyPlayerID     = Spring.GetMyPlayerID
local spGetPlayerInfo     = Spring.GetPlayerInfo
local spGetTeamResources  = Spring.GetTeamResources
local spGetTeamUnits      = Spring.GetTeamUnits
local spGetUnitDefID      = Spring.GetUnitDefID
local spGetUnitAllyTeam   = Spring.GetUnitAllyTeam
local spGetVisibleUnits   = Spring.GetVisibleUnits
local spGetTeamList       = Spring.GetTeamList
local spGetTeamInfo       = Spring.GetTeamInfo
local spGetGaiaTeamID     = Spring.GetGaiaTeamID
local spGetUnitHealth     = Spring.GetUnitHealth
local spGetGameFrame      = Spring.GetGameFrame
local spGetWind           = Spring.GetWind
local spIsGameOver        = Spring.IsGameOver

local glColor             = gl.Color
local glRect              = gl.Rect
local glLineWidth         = gl.LineWidth
local glPolygonMode       = gl.PolygonMode
local glText              = gl.Text

local GL_FRONT_AND_BACK   = GL.FRONT_AND_BACK
local GL_LINE             = GL.LINE
local GL_FILL             = GL.FILL

--------------------------------------------------------------------------------
-- UI Window State
--------------------------------------------------------------------------------
local vsx, vsy = 1920, 1080
local isVisible = true
local isDragging = false
local dragOffsetX, dragOffsetY = 0, 0

local winW, winH = 350, 490
local winX, winY = 1560, 470 -- Default position docked on right (120px from top, 10px from right)

local pillX, pillY = 1760, 936
local pillW, pillH = 150, 24
local customPositionLoaded = false
local isGameOver = false

-- Navigation & View Modes: "SPLIT" (default), "INTEL", "QUEUE"
local activeTab = "SPLIT"
local activePreset = 1 -- 1: BOT, 2: VEH, 3: ECO, 4: APP
local scrollOffset = 0
local radarAngle = 0

--------------------------------------------------------------------------------
-- Color Constants (Spring text formatting & OpenGL)
--------------------------------------------------------------------------------
local cWhite    = string.char(255, 255, 255, 255)
local cCyan     = string.char(255, 56, 189, 248)
local cGreen    = string.char(255, 74, 222, 128)
local cYellow   = string.char(255, 250, 204, 21)
local cGold     = string.char(255, 251, 146, 60)
local cGray     = string.char(255, 148, 163, 184)
local cDarkGray = string.char(255, 100, 116, 139)
local cRed      = string.char(255, 248, 113, 113)
local cPurple   = string.char(255, 168, 85, 247)
local cBlue     = string.char(255, 96, 165, 250)

--------------------------------------------------------------------------------
-- Unit Name Mappings
--------------------------------------------------------------------------------
local UNIT_NAME_TRANSLATIONS = {
    armsolar = "Solar Collector",
    corsolar = "Solar Collector",
    armmex = "Metal Extractor",
    cormex = "Metal Extractor",
    armwin = "Wind Generator",
    corwin = "Wind Generator",
    armlab = "Bot Lab",
    corlab = "Bot Lab",
    armvp = "Vehicle Plant",
    corvp = "Vehicle Plant",
    armap = "Aircraft Plant",
    corap = "Aircraft Plant",
    armllt = "Light Laser Tower",
    corllt = "Light Laser Tower",
    armck = "Construction Bot",
    corck = "Construction Bot",
    armcv = "Construction Vehicle",
    corcv = "Construction Vehicle",
    armbeaver = "Construction Vehicle",
    corbeaver = "Construction Vehicle",
    armpw = "Pawn",
    corak = "Grunt",
    armrock = "Rocko",
    corstorm = "Storm",
    armflash = "Flash",
    corstump = "Stumpy",
    armblitz = "Blitz",
    corraider = "Raider",
    armcom = "Commander",
    corcom = "Commander",
    armmakr = "Energy Converter",
    cormakr = "Energy Converter",
    armestor = "Energy Storage",
    corestor = "Energy Storage",
    armmstor = "Metal Storage",
    cormmstor = "Metal Storage",
    armfido = "Hound",
    corsheld = "Sheldon",
    armlatnk = "Lazarus",
    cornecro = "Necro",
    armbraw = "Brawler",
    corbraw = "Banshee",
    armblade = "Blade",
    armrad = "Radar Tower",
    corrad = "Radar Tower",
}

--------------------------------------------------------------------------------
-- Default Built-in Presets
--------------------------------------------------------------------------------
local DEFAULT_PRESETS = {
    Armada = {
        {
            name = "BOT SKIRMISH",
            badge = "BOT",
            title = "Bot Skirmish (Standard Frontline)",
            steps = {
                { time = "00:00", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 1, codes = {"armsolar"} },
                { time = "00:25", builder = "Com", unit = "Metal Extractor", count = 2, cumulative = 2, codes = {"armmex"} },
                { time = "00:50", builder = "Com", unit = "Bot Lab", count = 1, cumulative = 1, codes = {"armlab"} },
                { time = "01:15", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 2, codes = {"armsolar"} },
                { time = "01:35", builder = "Lab", unit = "Pawn", count = 1, cumulative = 1, codes = {"armpw"} },
                { time = "01:50", builder = "Lab", unit = "Construction Bot", count = 1, cumulative = 1, codes = {"armck"} },
                { time = "02:10", builder = "Lab", unit = "Rocko", count = 3, cumulative = 3, codes = {"armrock"} },
                { time = "02:40", builder = "Con", unit = "Metal Extractor", count = 2, cumulative = 4, codes = {"armmex"} },
                { time = "03:10", builder = "Con", unit = "Light Laser Tower", count = 1, cumulative = 1, codes = {"armllt"} },
            }
        },
        {
            name = "RAIDER RUSH",
            badge = "VEH",
            title = "Raider Rush (Fast Vehicle Harass)",
            steps = {
                { time = "00:00", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 1, codes = {"armsolar"} },
                { time = "00:20", builder = "Com", unit = "Metal Extractor", count = 2, cumulative = 2, codes = {"armmex"} },
                { time = "00:45", builder = "Com", unit = "Vehicle Plant", count = 1, cumulative = 1, codes = {"armvp"} },
                { time = "01:05", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 2, codes = {"armsolar"} },
                { time = "01:25", builder = "Plant", unit = "Blitz", count = 2, cumulative = 2, codes = {"armblitz"} },
                { time = "01:50", builder = "Plant", unit = "Construction Vehicle", count = 1, cumulative = 1, codes = {"armcv", "armbeaver"} },
                { time = "02:15", builder = "Plant", unit = "Flash", count = 4, cumulative = 4, codes = {"armflash"} },
                { time = "02:50", builder = "Con", unit = "Light Laser Tower", count = 1, cumulative = 1, codes = {"armllt"} },
            }
        },
        {
            name = "FAST ECO",
            badge = "ECO",
            title = "Fast Wind Eco & T2 Rush",
            steps = {
                { time = "00:00", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 1, codes = {"armsolar"} },
                { time = "00:20", builder = "Com", unit = "Metal Extractor", count = 3, cumulative = 3, codes = {"armmex"} },
                { time = "00:45", builder = "Com", unit = "Wind Generator", count = 3, cumulative = 3, codes = {"armwin"} },
                { time = "01:15", builder = "Com", unit = "Bot Lab", count = 1, cumulative = 1, codes = {"armlab"} },
                { time = "01:40", builder = "Lab", unit = "Construction Bot", count = 2, cumulative = 2, codes = {"armck"} },
                { time = "02:10", builder = "Con", unit = "Energy Converter", count = 1, cumulative = 1, codes = {"armmakr"} },
                { time = "02:45", builder = "Con", unit = "Energy Storage", count = 1, cumulative = 1, codes = {"armestor"} },
                { time = "03:30", builder = "Lab", unit = "Bot Lab", count = 1, cumulative = 2, codes = {"armlab"} },
            }
        }
    },
    Cortex = {
        {
            name = "BOT SKIRMISH",
            badge = "BOT",
            title = "Bot Skirmish (Standard Frontline)",
            steps = {
                { time = "00:00", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 1, codes = {"corsolar"} },
                { time = "00:25", builder = "Com", unit = "Metal Extractor", count = 2, cumulative = 2, codes = {"cormex"} },
                { time = "00:50", builder = "Com", unit = "Bot Lab", count = 1, cumulative = 1, codes = {"corlab"} },
                { time = "01:15", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 2, codes = {"corsolar"} },
                { time = "01:35", builder = "Lab", unit = "Grunt", count = 1, cumulative = 1, codes = {"corak"} },
                { time = "01:50", builder = "Lab", unit = "Construction Bot", count = 1, cumulative = 1, codes = {"corck"} },
                { time = "02:10", builder = "Lab", unit = "Storm", count = 3, cumulative = 3, codes = {"corstorm"} },
                { time = "02:40", builder = "Con", unit = "Metal Extractor", count = 2, cumulative = 4, codes = {"cormex"} },
                { time = "03:10", builder = "Con", unit = "Light Laser Tower", count = 1, cumulative = 1, codes = {"corllt"} },
            }
        },
        {
            name = "RAIDER RUSH",
            badge = "VEH",
            title = "Raider Rush (Fast Vehicle Harass)",
            steps = {
                { time = "00:00", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 1, codes = {"corsolar"} },
                { time = "00:20", builder = "Com", unit = "Metal Extractor", count = 2, cumulative = 2, codes = {"cormex"} },
                { time = "00:45", builder = "Com", unit = "Vehicle Plant", count = 1, cumulative = 1, codes = {"corvp"} },
                { time = "01:05", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 2, codes = {"corsolar"} },
                { time = "01:25", builder = "Plant", unit = "Raider", count = 2, cumulative = 2, codes = {"corraider"} },
                { time = "01:50", builder = "Plant", unit = "Construction Vehicle", count = 1, cumulative = 1, codes = {"corcv", "corbeaver"} },
                { time = "02:15", builder = "Plant", unit = "Stumpy", count = 4, cumulative = 4, codes = {"corstump"} },
                { time = "02:50", builder = "Con", unit = "Light Laser Tower", count = 1, cumulative = 1, codes = {"corllt"} },
            }
        },
        {
            name = "FAST ECO",
            badge = "ECO",
            title = "Fast Wind Eco & T2 Rush",
            steps = {
                { time = "00:00", builder = "Com", unit = "Solar Collector", count = 1, cumulative = 1, codes = {"corsolar"} },
                { time = "00:20", builder = "Com", unit = "Metal Extractor", count = 3, cumulative = 3, codes = {"cormex"} },
                { time = "00:45", builder = "Com", unit = "Wind Generator", count = 3, cumulative = 3, codes = {"corwin"} },
                { time = "01:15", builder = "Com", unit = "Bot Lab", count = 1, cumulative = 1, codes = {"corlab"} },
                { time = "01:40", builder = "Lab", unit = "Construction Bot", count = 2, cumulative = 2, codes = {"corck"} },
                { time = "02:10", builder = "Con", unit = "Energy Converter", count = 1, cumulative = 1, codes = {"cormakr"} },
                { time = "02:45", builder = "Con", unit = "Energy Storage", count = 1, cumulative = 1, codes = {"corestor"} },
                { time = "03:30", builder = "Lab", unit = "Bot Lab", count = 1, cumulative = 2, codes = {"corlab"} },
            }
        }
    }
}

local appCustomPreset = nil

--------------------------------------------------------------------------------
-- Live State Data
--------------------------------------------------------------------------------
local finishedCounts = {}
local currentCounts = {}
local liveStats = {
    frame = 0,
    gameSec = 0,
    playerName = "Commander",
    faction = "Armada",
    mCurr = 1000,
    mInc = 0,
    mExp = 0,
    eCurr = 1000,
    eInc = 0,
    eExp = 0,
    wind = 12.0,
    combatUnits = 0,
    commanders = 1,
    builders = 0,
    buildings = 0,
    raiders = 0,
    skirmishers = 0,
    assault = 0,
    air = 0,
    enemyCount = 0,
    enemyRaiders = 0,
    enemySkirmishers = 0,
    enemyAssault = 0,
    enemyAir = 0,
    enemyCommanders = 0
}

--------------------------------------------------------------------------------
-- Helpers
--------------------------------------------------------------------------------
local function sanitize(str)
    if not str then return "" end
    return tostring(str):gsub('"', '\\"'):gsub('\n', ' '):gsub('\r', '')
end

local function recordUnit(tbl, def)
    if not def then return end
    local code = def.name and tostring(def.name):lower() or ""
    local human = UNIT_NAME_TRANSLATIONS[code] or def.humanName or def.name
    
    if human and #human > 0 then
        tbl[human] = (tbl[human] or 0) + 1
        local normH = tostring(human):lower():gsub("[^a-z0-9]", "")
        if #normH > 0 and normH ~= human then
            tbl[normH] = (tbl[normH] or 0) + 1
        end
    end
    
    if code and #code > 0 then
        tbl[code] = (tbl[code] or 0) + 1
        local normC = code:gsub("[^a-z0-9]", "")
        if #normC > 0 and normC ~= code then
            tbl[normC] = (tbl[normC] or 0) + 1
        end
    end
end

local function getUnitCount(unitName, codes)
    local best = 0
    if unitName then
        local c1 = finishedCounts[unitName] or 0
        local c2 = currentCounts[unitName] or 0
        best = math.max(c1, c2)
        local norm = tostring(unitName):lower():gsub("[^a-z0-9]", "")
        if norm and #norm > 0 then
            local n1 = finishedCounts[norm] or 0
            local n2 = currentCounts[norm] or 0
            best = math.max(best, n1, n2)
        end
    end
    if codes then
        for _, code in ipairs(codes) do
            local lc = code:lower()
            local c1 = finishedCounts[lc] or 0
            local c2 = currentCounts[lc] or 0
            best = math.max(best, c1, c2)
        end
    end
    return best
end

--------------------------------------------------------------------------------
-- Check for external build order sync from Theory-App
--------------------------------------------------------------------------------
local lastFileCheck = 0
local function checkAppBuildOrderSync()
    local f = io.open("bar_active_build_order.json", "r")
    if not f then return end
    local content = f:read("*a")
    f:close()
    
    if not content or #content < 10 then return end
    
    local titleMatch = content:match('"strategyTitle"%s*:%s*"([^"]+)"')
    local steps = {}
    
    for stepStr in content:gmatch("%{([^{}]+)%}") do
        local uName = stepStr:match('"unit"%s*:%s*"([^"]+)"')
        local timeS = stepStr:match('"time"%s*:%s*"([^"]+)"') or "00:00"
        local bldS  = stepStr:match('"builder"%s*:%s*"([^"]+)"') or "Com"
        local cNum  = tonumber(stepStr:match('"count"%s*:%s*(%d+)')) or 1
        local cumN  = tonumber(stepStr:match('"cumulative"%s*:%s*(%d+)')) or cNum
        
        if uName then
            table.insert(steps, {
                time = timeS,
                builder = bldS:sub(1, 4),
                unit = uName,
                count = cNum,
                cumulative = cumN,
                codes = { uName:lower():gsub("%s+", "") }
            })
        end
    end
    
    if #steps > 0 then
        appCustomPreset = {
            name = "APP",
            badge = "APP",
            title = titleMatch or "Custom Strategy (Theory-App)",
            steps = steps
        }
    end
end

--------------------------------------------------------------------------------
-- Widget Callbacks
--------------------------------------------------------------------------------
function widget:Initialize()
    finishedCounts = {}
    currentCounts = {}
    vsx, vsy = widgetHandler:GetViewSizes()
    if not vsx or vsx <= 0 then vsx = 1920 end
    if not vsy or vsy <= 0 then vsy = 1080 end
    
    -- Default position docked to the right in the white highlighted area (120px from top, 10px from right)
    if not customPositionLoaded then
        winX = math.max(10, vsx - winW - 10)
        winY = math.max(20, vsy - winH - 120)
        
        pillX = math.max(10, vsx - pillW - 10)
        pillY = math.max(20, vsy - pillH - 120)
    end
    
    isVisible = true
    isGameOver = false
    activeTab = "SPLIT"
    checkAppBuildOrderSync()
end

function widget:GameOver(winningAllyTeams)
    isVisible = false
    isGameOver = true
end

function widget:TeamDied(teamID)
    if teamID == spGetMyTeamID() then
        isVisible = false
    end
end

function widget:Shutdown()
    isVisible = false
    isGameOver = true
end

function widget:GetConfigData()
    return {
        winX = winX,
        winY = winY,
        pillX = pillX,
        pillY = pillY,
        isVisible = false, -- Always close overlay after every game
        activePreset = activePreset,
        activeTab = activeTab
    }
end

function widget:SetConfigData(data)
    if data then
        if data.winX and data.winX > 50 then
            winX = data.winX
        else
            winX = math.max(10, vsx - winW - 10)
        end
        -- Only preserve winY if it was manually dragged and is not an old legacy default (350)
        if data.winY and data.winY > 50 and data.winY ~= 350 then
            winY = data.winY
            customPositionLoaded = true
        else
            winY = math.max(20, vsy - winH - 120)
        end
        if data.pillX and data.pillX > 50 then pillX = data.pillX else pillX = math.max(10, vsx - pillW - 10) end
        if data.pillY and data.pillY > 50 and data.pillY ~= 350 and data.pillY ~= 740 then
            pillY = data.pillY
        else
            pillY = math.max(20, vsy - pillH - 120)
        end
        if data.activePreset then activePreset = data.activePreset end
        if data.activeTab then activeTab = data.activeTab end
    end
end

local triggerCounter = 0
function widget:Update()
    radarAngle = (radarAngle + 0.04) % (math.pi * 2)

    triggerCounter = triggerCounter + 1
    if triggerCounter >= 20 then
        triggerCounter = 0
        local f = io.open("bar_reload_trigger.txt", "r")
        if f then
            f:close()
            os.remove("bar_reload_trigger.txt")
            Spring.SendCommands("clear")
            Spring.SendCommands("luaui reload")
        end
    end
end

function widget:ViewResize(viewSizeX, viewSizeY)
    vsx = viewSizeX
    vsy = viewSizeY
    winX = math.max(5, math.min(vsx - winW - 5, winX))
    winY = math.max(5, math.min(vsy - winH - 5, winY))
    pillX = math.max(5, math.min(vsx - pillW - 5, pillX))
    pillY = math.max(5, math.min(vsy - pillH - 5, pillY))
end

function widget:UnitFinished(unitID, unitDefID, unitTeam)
    if unitTeam ~= spGetMyTeamID() then return end
    if not unitDefID or not UnitDefs or not UnitDefs[unitDefID] then return end
    recordUnit(finishedCounts, UnitDefs[unitDefID])
end

function widget:GameFrame(frame)
    if spIsGameOver and spIsGameOver() then
        isVisible = false
        isGameOver = true
        return
    end
    if (frame % 30 ~= 0) then return end
    
    local myTeamID = spGetMyTeamID()
    local myAllyTeamID = spGetMyAllyTeamID()
    local myPlayerID = spGetMyPlayerID()
    local playerName = "Commander"
    if myPlayerID then
        local pName = spGetPlayerInfo(myPlayerID)
        if pName and #pName > 0 then playerName = pName end
    end
    
    local _, _, _, _, mySide = spGetTeamInfo(myTeamID)
    local myFaction = mySide or "Armada"
    if myFaction:lower():find("cor") then myFaction = "Cortex" else myFaction = "Armada" end
    
    -- Metal & Energy resources
    local mCurr, mStor, mPull, mInc, mExp = spGetTeamResources(myTeamID, "metal")
    local eCurr, eStor, ePull, eInc, eExp = spGetTeamResources(myTeamID, "energy")
    
    mCurr = math.floor(mCurr or 0)
    mInc  = math.floor((mInc or 0) * 10) / 10
    mExp  = math.floor((mExp or 0) * 10) / 10
    eCurr = math.floor(eCurr or 0)
    eInc  = math.floor((eInc or 0) * 10) / 10
    eExp  = math.floor((eExp or 0) * 10) / 10
    
    -- Live Wind Speed
    local currentWind = 12.0
    if spGetWind then
        local wx, wy, wz, ws = spGetWind()
        if ws and ws > 0 then
            currentWind = math.floor(ws * 10) / 10
        elseif wx and wz then
            local mag = math.sqrt(wx * wx + (wz or 0) * (wz or 0))
            if mag > 0 then
                currentWind = math.floor(mag * 10) / 10
            end
        end
    end
    
    -- Friendly Forces Census & Breakdown
    local myUnits = spGetTeamUnits(myTeamID) or {}
    local friendlyCount = 0
    local commanders = 0
    local builders = 0
    local buildings = 0
    local raiders = 0
    local skirmishers = 0
    local assault = 0
    local air = 0
    local currentFrameCounts = {}
    
    for i = 1, #myUnits do
        local uID = myUnits[i]
        local isComplete = true
        if spGetUnitHealth then
            local _, _, _, _, bp = spGetUnitHealth(uID)
            if bp and bp < 1.0 then isComplete = false end
        end

        local uDefID = spGetUnitDefID(uID)
        if uDefID and UnitDefs and UnitDefs[uDefID] then
            local def = UnitDefs[uDefID]
            local uName = (def.name or ""):lower()
            
            if isComplete then
                recordUnit(currentFrameCounts, def)
            end
            
            local isCom = (def.customParams and (def.customParams.iscommander == "1" or def.customParams.iscommander == true)) or uName:find("com") or uName:find("commander")
            if def.isBuilding or def.speed == 0 then
                buildings = buildings + 1
            elseif isCom then
                commanders = commanders + 1
            elseif def.isBuilder and (not def.weapons or #def.weapons == 0) then
                builders = builders + 1
            else
                friendlyCount = friendlyCount + 1
                if def.canFly then
                    air = air + 1
                elseif uName:find("pw") or uName:find("ak") or uName:find("grunt") or uName:find("pawn") or uName:find("flash") or uName:find("raider") then
                    raiders = raiders + 1
                elseif uName:find("rock") or uName:find("storm") or uName:find("stump") then
                    skirmishers = skirmishers + 1
                else
                    assault = assault + 1
                end
            end
        end
    end
    currentCounts = currentFrameCounts

    -- Visible Enemy Units Census & Radar Scanning
    local enemyCount = 0
    local enemyRaiders = 0
    local enemySkirmishers = 0
    local enemyAssault = 0
    local enemyAir = 0
    local enemyCommanders = 0
    
    if spGetVisibleUnits then
        local visUnits = spGetVisibleUnits(-1, nil, false) or {}
        for i = 1, #visUnits do
            local uID = visUnits[i]
            local uAlly = spGetUnitAllyTeam(uID)
            if uAlly and uAlly ~= myAllyTeamID then
                enemyCount = enemyCount + 1
                local uDefID = spGetUnitDefID(uID)
                if uDefID and UnitDefs and UnitDefs[uDefID] then
                    local def = UnitDefs[uDefID]
                    local uName = (def.name or ""):lower()
                    local isCom = (def.customParams and (def.customParams.iscommander == "1" or def.customParams.iscommander == true)) or uName:find("com") or uName:find("commander")
                    if isCom then
                        enemyCommanders = enemyCommanders + 1
                    elseif def.canFly then
                        enemyAir = enemyAir + 1
                    elseif uName:find("pw") or uName:find("ak") or uName:find("grunt") or uName:find("pawn") or uName:find("flash") or uName:find("raider") then
                        enemyRaiders = enemyRaiders + 1
                    elseif uName:find("rock") or uName:find("storm") or uName:find("stump") then
                        enemySkirmishers = enemySkirmishers + 1
                    else
                        enemyAssault = enemyAssault + 1
                    end
                end
            end
        end
    end
    
    local gameSec = math.floor(frame / 30)
    liveStats.frame = frame
    liveStats.gameSec = gameSec
    liveStats.playerName = playerName
    liveStats.faction = myFaction
    liveStats.mCurr = mCurr
    liveStats.mInc = mInc
    liveStats.mExp = mExp
    liveStats.eCurr = eCurr
    liveStats.eInc = eInc
    liveStats.eExp = eExp
    liveStats.wind = currentWind
    liveStats.combatUnits = friendlyCount
    liveStats.commanders = commanders
    liveStats.builders = builders
    liveStats.buildings = buildings
    liveStats.raiders = raiders
    liveStats.skirmishers = skirmishers
    liveStats.assault = assault
    liveStats.air = air
    liveStats.enemyCount = enemyCount
    liveStats.enemyRaiders = enemyRaiders
    liveStats.enemySkirmishers = enemySkirmishers
    liveStats.enemyAssault = enemyAssault
    liveStats.enemyAir = enemyAir
    liveStats.enemyCommanders = enemyCommanders
    
    -- Silently export live telemetry to disk for Theory-App
    local completedUnitsJson = {}
    local allUnitKeys = {}
    for k, _ in pairs(finishedCounts) do allUnitKeys[k] = true end
    for k, _ in pairs(currentCounts) do allUnitKeys[k] = true end
    for k, _ in pairs(allUnitKeys) do
        local count = math.max(finishedCounts[k] or 0, currentCounts[k] or 0)
        table.insert(completedUnitsJson, string.format('"%s":%d', sanitize(k), count))
    end
    
    local jsonStr = string.format('{"gameFrame":%d,"gameTimeSeconds":%d,"playerName":"%s","faction":"%s","metal":{"current":%d,"income":%s,"expense":%s},"energy":{"current":%d,"income":%s,"expense":%s},"wind":%.1f,"friendlyUnits":{"total":%d,"commanders":%d,"combat":%d,"builders":%d,"buildings":%d,"raiders":%d,"skirmishers":%d,"assault":%d,"air":%d},"enemyUnits":{"total":%d,"commanders":%d,"raiders":%d,"skirmishers":%d,"assault":%d,"air":%d},"completedUnits":{%s}}',
        frame, gameSec, sanitize(playerName), sanitize(myFaction), mCurr, mInc, mExp, eCurr, eInc, eExp, currentWind,
        (friendlyCount + commanders), commanders, friendlyCount, builders, buildings, raiders, skirmishers, assault, air,
        enemyCount, enemyCommanders, enemyRaiders, enemySkirmishers, enemyAssault, enemyAir,
        table.concat(completedUnitsJson, ","))
        
    local f = io.open("bar_live_telemetry.json", "w")
    if f then
        f:write(jsonStr)
        f:close()
    end
    
    -- Periodic check for custom build order synced from web app
    if frame - lastFileCheck >= 60 then
        lastFileCheck = frame
        checkAppBuildOrderSync()
    end
end

--------------------------------------------------------------------------------
-- Input Handling (F8 Toggle, Mouse Drag, Tabs)
--------------------------------------------------------------------------------
function widget:KeyPress(key, mods, isRepeat)
    local KEY_F8     = Spring.KEY_F8 or 289
    local KEY_F7     = Spring.KEY_F7 or 288
    local KEY_INSERT = Spring.KEY_INSERT or 277
    local KEY_HOME   = Spring.KEY_HOME or 278
    
    if key == KEY_F8 or key == KEY_F7 or key == KEY_INSERT or key == KEY_HOME then
        isVisible = not isVisible
        if isVisible then isGameOver = false end
        return true
    end
    return false
end

function widget:MousePress(mx, my, button)
    if button ~= 1 then return false end
    
    -- If HUD is minimized, check if clicked the floating pill
    if not isVisible then
        if mx >= pillX and mx <= (pillX + pillW) and my >= pillY and my <= (pillY + pillH) then
            isVisible = true
            isGameOver = false
            return true
        end
        return false
    end
    
    -- If HUD is visible, check bounds
    if mx >= winX and mx <= (winX + winW) and my >= winY and my <= (winY + winH) then
        local headerY = winY + winH - 26

        -- 1. Close button clicked [ ✕ ]
        if mx >= (winX + winW - 28) and mx <= (winX + winW - 8) and my >= (headerY + 3) and my <= (headerY + 21) then
            isVisible = false
            return true
        end

        -- 2. Minimize button clicked [ - ]
        if mx >= (winX + winW - 50) and mx <= (winX + winW - 30) and my >= (headerY + 3) and my <= (headerY + 21) then
            isVisible = false
            return true
        end
        
        -- 3. Header bar clicked -> start window drag
        if my >= headerY then
            isDragging = true
            dragOffsetX = mx - winX
            dragOffsetY = my - winY
            return true
        end
        
        -- 4. Tactical View Navigation Tabs Bar
        local tabY1 = headerY - 3 - 28 - 4 - 24
        local tabY2 = tabY1 + 24
        if my >= tabY1 and my <= tabY2 then
            local tW = (winW - 12) / 3
            if mx >= (winX + 6) and mx <= (winX + 6 + tW) then
                activeTab = "INTEL"
                scrollOffset = 0
                return true
            elseif mx > (winX + 6 + tW) and mx <= (winX + 6 + tW * 2) then
                activeTab = "QUEUE"
                scrollOffset = 0
                return true
            elseif mx > (winX + 6 + tW * 2) and mx <= (winX + winW - 6) then
                activeTab = "SPLIT"
                scrollOffset = 0
                return true
            end
        end

        -- 5. Footer preset buttons: BOT, VEH, ECO, APP
        local footerY = winY + 6
        if my >= footerY and my <= (footerY + 24) then
            local pW = 42
            local pStartX = winX + 68
            for p = 1, 4 do
                local px1 = pStartX + (p - 1) * (pW + 6)
                local px2 = px1 + pW
                if mx >= px1 and mx <= px2 then
                    activePreset = p
                    scrollOffset = 0
                    return true
                end
            end
        end
        
        -- Return true for any click inside HUD to prevent accidental unit orders
        return true
    end
    
    return false
end

function widget:MouseMove(mx, my, dx, dy, button)
    if isDragging then
        winX = mx - dragOffsetX
        winY = my - dragOffsetY
        -- Clamping
        winX = math.max(5, math.min(vsx - winW - 5, winX))
        winY = math.max(5, math.min(vsy - winH - 5, winY))
        return true
    end
    return false
end

function widget:MouseRelease(mx, my, button)
    if isDragging then
        isDragging = false
        return true
    end
    return false
end

function widget:MouseWheel(up, value)
    if not isVisible then return false end
    local x, y = Spring.GetMouseState()
    if x >= winX and x <= (winX + winW) and y >= winY and y <= (winY + winH) then
        if up then
            scrollOffset = math.max(0, scrollOffset - 1)
        else
            scrollOffset = scrollOffset + 1
        end
        return true
    end
    return false
end

--------------------------------------------------------------------------------
-- 2D OpenGL Screen Drawing
--------------------------------------------------------------------------------
function widget:DrawScreen()
    if isGameOver then return end

    -- MINIMIZED FLOATING PILL
    if not isVisible then
        glColor(0.04, 0.08, 0.16, 0.92)
        glRect(pillX, pillY, pillX + pillW, pillY + pillH)
        
        glColor(0.22, 0.74, 0.97, 0.90)
        glLineWidth(1.5)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
        glRect(pillX, pillY, pillX + pillW, pillY + pillH)
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
        
        glText(cCyan .. "◈ " .. cWhite .. "THEORY HUD " .. cYellow .. "[F8]", pillX + 10, pillY + 6, 11, "on")
        return
    end

    ----------------------------------------------------------------------------
    -- 1. MAIN WINDOW CONTAINER
    ----------------------------------------------------------------------------
    -- Deep Obsidian / Glassy backdrop
    glColor(0.03, 0.05, 0.10, 0.94)
    glRect(winX, winY, winX + winW, winY + winH)
    
    -- Neon Cyan Outer Border
    glColor(0.22, 0.74, 0.97, 0.85)
    glLineWidth(1.5)
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
    glRect(winX, winY, winX + winW, winY + winH)
    glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
    
    ----------------------------------------------------------------------------
    -- 2. TITLE / HEADER BAR
    ----------------------------------------------------------------------------
    local headerH = 26
    local headerY = winY + winH - headerH
    glColor(0.07, 0.12, 0.22, 0.98)
    glRect(winX, headerY, winX + winW, winY + winH)
    
    -- Header underline
    glColor(0.22, 0.74, 0.97, 0.5)
    glRect(winX, headerY, winX + winW, headerY + 1)
    
    -- Title: ⚡ BAR HUD
    glText(cCyan .. "⚡ BAR HUD", winX + 10, headerY + 7, 11, "on")
    
    -- Faction Tag Badge
    local fTag = (liveStats.faction == "Cortex") and (cRed .. "[CORTEX]") or (cCyan .. "[ARMADA]")
    glText(fTag, winX + 115, headerY + 8, 9, "on")
    
    -- Minimize button [ - ]
    glColor(0.12, 0.18, 0.28, 0.9)
    glRect(winX + winW - 50, headerY + 3, winX + winW - 32, headerY + 21)
    glText(cWhite .. "-", winX + winW - 44, headerY + 5, 11, "on")

    -- Close button [ ✕ ]
    glColor(0.35, 0.10, 0.12, 0.9)
    glRect(winX + winW - 28, headerY + 3, winX + winW - 8, headerY + 21)
    glText(cRed .. "x", winX + winW - 21, headerY + 5, 10, "on")

    ----------------------------------------------------------------------------
    -- 3. SUB-HEADER: LINK [✓] GAME: MM:SS  |  WIND SPEED
    ----------------------------------------------------------------------------
    local subY2 = headerY - 4
    local subY1 = subY2 - 28
    local subLeftW = (winW - 18) * 0.58
    local subRightW = (winW - 18) - subLeftW

    -- Left Box: Link + Game Clock
    local leftX1 = winX + 6
    local leftX2 = leftX1 + subLeftW
    glColor(0.05, 0.10, 0.20, 0.92)
    glRect(leftX1, subY1, leftX2, subY2)
    glColor(0.25, 0.70, 0.95, 0.85)
    glLineWidth(1)
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
    glRect(leftX1, subY1, leftX2, subY2)
    glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)

    local clockStr = string.format("%02d:%02d", math.floor(liveStats.gameSec / 60), liveStats.gameSec % 60)
    glText(cCyan .. "Link " .. cGreen .. "[✓] " .. cCyan .. "Game: " .. cWhite .. clockStr, leftX1 + 8, subY1 + 8, 10, "on")

    -- Right Box: Live Wind Speed
    local rightX1 = leftX2 + 6
    local rightX2 = winX + winW - 6
    glColor(0.06, 0.09, 0.15, 0.92)
    glRect(rightX1, subY1, rightX2, subY2)
    glColor(0.25, 0.35, 0.45, 0.75)
    glLineWidth(1)
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
    glRect(rightX1, subY1, rightX2, subY2)
    glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)

    glText(cCyan .. "💨 WIND: " .. cWhite .. string.format("%.1f", liveStats.wind) .. cDarkGray .. " M/S", rightX1 + 8, subY1 + 8, 9, "on")

    ----------------------------------------------------------------------------
    -- 4. TACTICAL VIEW NAVIGATION TABS (INTEL FEEDS | BUILD QUEUE | ✨ SPLIT)
    ----------------------------------------------------------------------------
    local tabY2 = subY1 - 4
    local tabY1 = tabY2 - 24
    local tabW = (winW - 12) / 3
    local tabLabels = { "INTEL FEEDS", "BUILD QUEUE", "✨ SPLIT" }
    local tabKeys   = { "INTEL", "QUEUE", "SPLIT" }

    for t = 1, 3 do
        local tx1 = winX + 6 + (t - 1) * tabW
        local tx2 = tx1 + tabW - 2
        local isActive = (activeTab == tabKeys[t])

        if isActive then
            glColor(0.09, 0.18, 0.32, 0.95)
            glRect(tx1, tabY1, tx2, tabY2)
            -- Glowing cyan highlight bottom line
            glColor(0.25, 0.80, 1.0, 1.0)
            glRect(tx1, tabY1, tx2, tabY1 + 2)
            glText(cWhite .. tabLabels[t], tx1 + 10, tabY1 + 7, 9, "on")
        else
            glColor(0.04, 0.07, 0.12, 0.75)
            glRect(tx1, tabY1, tx2, tabY2)
            glText(cGray .. tabLabels[t], tx1 + 10, tabY1 + 7, 9, "on")
        end
    end

    ----------------------------------------------------------------------------
    -- 5. RESOLVE ACTIVE PRESET & STEPS
    ----------------------------------------------------------------------------
    local factionPresets = DEFAULT_PRESETS[liveStats.faction] or DEFAULT_PRESETS.Armada
    local currentPreset = nil
    
    if activePreset == 4 and appCustomPreset then
        currentPreset = appCustomPreset
    else
        currentPreset = factionPresets[math.min(activePreset, #factionPresets)] or factionPresets[1]
    end
    local steps = currentPreset.steps or {}

    -- Identify the first incomplete step as active
    local firstIncompleteIdx = -1
    for i, step in ipairs(steps) do
        local builtCount = getUnitCount(step.unit, step.codes)
        if builtCount < step.cumulative then
            firstIncompleteIdx = i
            break
        end
    end

    -- Next step countdown calculation
    local nextStepTime = "00:00"
    local nextStepSeconds = 0
    if firstIncompleteIdx > 0 and steps[firstIncompleteIdx] then
        local s = steps[firstIncompleteIdx]
        nextStepTime = s.time or "00:00"
        local m, sec = nextStepTime:match("(%d+):(%d+)")
        if m and sec then
            local targetSec = tonumber(m) * 60 + tonumber(sec)
            nextStepSeconds = math.max(0, targetSec - liveStats.gameSec)
        end
    end

    ----------------------------------------------------------------------------
    -- 6. CONTENT RENDERING BY ACTIVE TAB
    ----------------------------------------------------------------------------
    local contentTopY = tabY1 - 6
    local footerY = winY + 6
    local footerH = 26
    local contentBotY = footerY + footerH + 4

    ----------------------------------------------------------------------------
    -- HELPER: Draw Friendly Intel Card
    ----------------------------------------------------------------------------
    local function drawFriendlyCard(cardX1, cardY1, cardX2, cardY2, isCompact)
        local cardW = cardX2 - cardX1
        local cardH = cardY2 - cardY1

        -- Background
        glColor(0.04, 0.07, 0.13, 0.95)
        glRect(cardX1, cardY1, cardX2, cardY2)

        -- Radar Grid Lines
        glColor(0.20, 0.60, 0.90, 0.09)
        glLineWidth(1)
        for gy = cardY1 + 15, cardY2 - 15, 20 do
            glRect(cardX1 + 4, gy, cardX2 - 4, gy + 1)
        end
        for gx = cardX1 + 25, cardX2 - 25, 35 do
            glRect(gx, cardY1 + 4, gx + 1, cardY2 - 4)
        end

        -- Animated Radar Sweep
        local sweepX = cardX1 + (math.sin(radarAngle) * 0.5 + 0.5) * cardW
        glColor(0.22, 0.74, 0.97, 0.18)
        glRect(sweepX - 1, cardY1 + 2, sweepX + 1, cardY2 - 2)

        -- Radar friendly blips (green dots)
        glColor(0.29, 0.87, 0.50, 0.5)
        glRect(cardX1 + 90, cardY1 + 35, cardX1 + 93, cardY1 + 38)
        glRect(cardX1 + 180, cardY1 + 65, cardX1 + 183, cardY1 + 68)
        glRect(cardX1 + 240, cardY1 + 45, cardX1 + 243, cardY1 + 48)

        -- Card Outer Border
        glColor(0.20, 0.35, 0.50, 0.85)
        glLineWidth(1)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
        glRect(cardX1, cardY1, cardX2, cardY2)
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)

        -- Top-Left Badge: Purple [✓] Checkmark
        local badgeY2 = cardY2 - 4
        local badgeY1 = badgeY2 - 16
        glColor(0.28, 0.24, 0.68, 0.95)
        glRect(cardX1 + 6, badgeY1, cardX1 + 24, badgeY2)
        glText(cWhite .. "✓", cardX1 + 11, badgeY1 + 4, 10, "on")

        -- Sub-Badge: Commander / Combat Breakdown
        local comBadgeText = "1x COMMANDER (ARMOR ACTIVE)"
        if liveStats.combatUnits > 0 then
            comBadgeText = string.format("%dx COMBAT (%dx R | %dx S)", liveStats.combatUnits, liveStats.raiders, liveStats.skirmishers)
        end
        glColor(0.08, 0.12, 0.20, 0.85)
        glRect(cardX1 + 30, badgeY1, cardX1 + 195, badgeY2)
        glText(cGreen .. comBadgeText, cardX1 + 34, badgeY1 + 4, 7.5, "on")

        -- Top-Right Badge: 🛡 FRIENDLY: N
        local frCount = liveStats.combatUnits + liveStats.commanders
        local frText = string.format("🛡 FRIENDLY: %d", frCount)
        glColor(0.06, 0.25, 0.12, 0.95)
        glRect(cardX2 - 95, badgeY1, cardX2 - 6, badgeY2)
        glColor(0.29, 0.87, 0.50, 0.8)
        glLineWidth(1)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
        glRect(cardX2 - 95, badgeY1, cardX2 - 6, badgeY2)
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
        glText(cGreen .. frText, cardX2 - 90, badgeY1 + 4, 8, "on")

        -- Economy & Command Row
        local ecoY = badgeY1 - 18
        glText(cGray .. "📈 PLAYER COMMAND & ECONOMY:", cardX1 + 8, ecoY + 4, 8, "on")

        local pRowY = ecoY - 18
        glColor(0.06, 0.09, 0.16, 0.8)
        glRect(cardX1 + 6, pRowY, cardX2 - 6, pRowY + 16)
        
        local pNameText = string.format("%s● %s %s(%s)", cBlue, liveStats.playerName, cDarkGray, liveStats.faction)
        local pEcoText = string.format("%s▤ +%.1f  %s⚡ +%d", cGray, liveStats.mInc, cYellow, math.floor(liveStats.eInc))
        glText(pNameText, cardX1 + 10, pRowY + 4, 8.5, "on")
        glText(pEcoText, cardX2 - 95, pRowY + 4, 8.5, "on")

        -- Bottom Player Status Pill
        local pillBoxY = cardY1 + 6
        local pillWd = 160
        local pillX1 = cardX1 + (cardW - pillWd) / 2
        glColor(0.06, 0.08, 0.14, 0.9)
        glRect(pillX1, pillBoxY, pillX1 + pillWd, pillBoxY + 14)
        glColor(0.20, 0.30, 0.45, 0.7)
        glLineWidth(1)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
        glRect(pillX1, pillBoxY, pillX1 + pillWd, pillBoxY + 14)
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
        glText(cGreen .. "● " .. cWhite .. liveStats.playerName .. cGray .. " (Commander)", pillX1 + 12, pillBoxY + 3, 7.5, "on")
    end

    ----------------------------------------------------------------------------
    -- HELPER: Draw Enemy Intel Card
    ----------------------------------------------------------------------------
    local function drawEnemyCard(cardX1, cardY1, cardX2, cardY2, isCompact)
        local cardW = cardX2 - cardX1
        local cardH = cardY2 - cardY1

        -- Background
        glColor(0.08, 0.04, 0.06, 0.95)
        glRect(cardX1, cardY1, cardX2, cardY2)

        -- Radar Grid Lines (subtle crimson)
        glColor(0.90, 0.20, 0.20, 0.07)
        glLineWidth(1)
        for gy = cardY1 + 15, cardY2 - 15, 20 do
            glRect(cardX1 + 4, gy, cardX2 - 4, gy + 1)
        end
        for gx = cardX1 + 25, cardX2 - 25, 35 do
            glRect(gx, cardY1 + 4, gx + 1, cardY2 - 4)
        end

        -- Animated Radar Sweep
        local sweepX = cardX1 + (math.sin(radarAngle + 1.2) * 0.5 + 0.5) * cardW
        glColor(0.95, 0.25, 0.25, 0.14)
        glRect(sweepX - 1, cardY1 + 2, sweepX + 1, cardY2 - 2)

        -- Card Outer Border
        glColor(0.45, 0.18, 0.22, 0.85)
        glLineWidth(1)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
        glRect(cardX1, cardY1, cardX2, cardY2)
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)

        -- Top-Left Badge: Crosshair [⌖]
        local badgeY2 = cardY2 - 4
        local badgeY1 = badgeY2 - 16
        glColor(0.16, 0.18, 0.25, 0.95)
        glRect(cardX1 + 6, badgeY1, cardX1 + 24, badgeY2)
        glText(cRed .. "⌖", cardX1 + 10, badgeY1 + 4, 10, "on")

        -- Sub-Badge: Hostile Contact Status
        local hostBadgeText = (liveStats.enemyCount == 0) and "NO HOSTILE CONTACTS IN SIGHT" or string.format("HOSTILE CONTACT CONFIRMED (~%d)", liveStats.enemyCount)
        glColor(0.12, 0.08, 0.10, 0.85)
        glRect(cardX1 + 30, badgeY1, cardX1 + 205, badgeY2)
        glText((liveStats.enemyCount == 0 and cGray or cRed) .. hostBadgeText, cardX1 + 34, badgeY1 + 4, 7.5, "on")

        -- Top-Right Badge: ⚔ ENEMY: ~N
        local enText = string.format("⚔ ENEMY: ~%d", liveStats.enemyCount)
        glColor(0.35, 0.08, 0.10, 0.95)
        glRect(cardX2 - 85, badgeY1, cardX2 - 6, badgeY2)
        glColor(0.95, 0.25, 0.25, 0.8)
        glLineWidth(1)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
        glRect(cardX2 - 85, badgeY1, cardX2 - 6, badgeY2)
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
        glText(cRed .. enText, cardX2 - 80, badgeY1 + 4, 8, "on")

        -- Middle Content: FOG OF WAR or HOSTILE CONTACT
        local midY = badgeY1 - 22
        if liveStats.enemyCount == 0 then
            -- Fog of war clear
            glColor(0.04, 0.06, 0.08, 0.8)
            glRect(cardX1 + 16, midY - 6, cardX2 - 16, midY + 16)
            glColor(0.18, 0.22, 0.28, 0.7)
            glLineWidth(1)
            glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
            glRect(cardX1 + 16, midY - 6, cardX2 - 16, midY + 16)
            glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)

            glText(cGreen .. "● FOG OF WAR // RADAR CLEAR", cardX1 + 65, midY + 3, 8.5, "on")
            glText(cDarkGray .. "No hostile combat formations detected in forward sectors.", cardX1 + 24, midY - 14, 7.5, "on")

            -- Bottom status pill
            local pillBoxY = cardY1 + 6
            local pillWd = 160
            local pillX1 = cardX1 + (cardW - pillWd) / 2
            glColor(0.08, 0.06, 0.08, 0.9)
            glRect(pillX1, pillBoxY, pillX1 + pillWd, pillBoxY + 14)
            glText(cRed .. "● " .. cGray .. "Enemy Force " .. cDarkGray .. "[Radar Sweep]", pillX1 + 14, pillBoxY + 3, 7.5, "on")
        else
            -- Enemy Spotted
            glColor(0.25, 0.06, 0.08, 0.85)
            glRect(cardX1 + 16, midY - 6, cardX2 - 16, midY + 16)
            glColor(0.85, 0.20, 0.20, 0.8)
            glLineWidth(1)
            glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
            glRect(cardX1 + 16, midY - 6, cardX2 - 16, midY + 16)
            glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)

            glText(cRed .. "● HOSTILE UNITS DETECTED", cardX1 + 80, midY + 3, 8.5, "on")
            local enDetail = string.format("~%dx Raiders  ~%dx Skirmish  ~%dx Air", liveStats.enemyRaiders, liveStats.enemySkirmishers, liveStats.enemyAir)
            glText(cYellow .. enDetail, cardX1 + 45, midY - 14, 8, "on")

            -- Bottom status pill
            local pillBoxY = cardY1 + 6
            local pillWd = 160
            local pillX1 = cardX1 + (cardW - pillWd) / 2
            glColor(0.12, 0.06, 0.08, 0.9)
            glRect(pillX1, pillBoxY, pillX1 + pillWd, pillBoxY + 14)
            glText(cRed .. "● " .. cWhite .. "Enemy Detected " .. cYellow .. "[Recon]", pillX1 + 14, pillBoxY + 3, 7.5, "on")
        end
    end

    ----------------------------------------------------------------------------
    -- HELPER: Draw Build Queue Rows
    ----------------------------------------------------------------------------
    local function drawBuildQueueRows(listX1, listYTop, listX2, listYBottom, rowH, maxStepsCount)
        local totalSteps = #steps
        local visibleCount = math.min(maxStepsCount, math.floor((listYTop - listYBottom) / rowH))
        if scrollOffset > (totalSteps - visibleCount) then
            scrollOffset = math.max(0, totalSteps - visibleCount)
        end

        for i = 1, visibleCount do
            local stepIdx = i + scrollOffset
            if stepIdx > totalSteps then break end

            local step = steps[stepIdx]
            local rowY = listYTop - (i * rowH)
            local builtCount = getUnitCount(step.unit, step.codes)
            local isComplete = (builtCount >= step.cumulative)
            local isActive = (stepIdx == firstIncompleteIdx)

            -- Row highlight box for active step
            if isActive then
                glColor(0.12, 0.28, 0.48, 0.45)
                glRect(listX1, rowY - 1, listX2, rowY + rowH - 3)
                glColor(0.25, 0.80, 1.0, 0.85)
                glLineWidth(1)
                glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
                glRect(listX1, rowY - 1, listX2, rowY + rowH - 3)
                glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
            elseif isComplete then
                glColor(0.04, 0.12, 0.07, 0.3)
                glRect(listX1, rowY - 1, listX2, rowY + rowH - 3)
            else
                glColor(0.05, 0.07, 0.12, 0.35)
                glRect(listX1, rowY - 1, listX2, rowY + rowH - 3)
            end

            -- Status Icon
            local statusIcon = isComplete and (cGreen .. "[✓] ") or (isActive and (cYellow .. "[►] ") or (cDarkGray .. "[ ] "))
            local textCol = isComplete and cGreen or (isActive and cWhite or cGray)
            local countRatio = string.format("(%d/%d)", math.min(step.cumulative, builtCount), step.cumulative)

            local stepStr = string.format("%s%s%s %s%s: %s%dx %s %s%s",
                statusIcon,
                cCyan, step.time,
                cYellow, step.builder,
                textCol, step.count, step.unit,
                (isComplete and cGreen or cDarkGray), countRatio
            )

            glText(stepStr, listX1 + 4, rowY + 3, 8.5, "on")
        end
    end

    ----------------------------------------------------------------------------
    -- VIEW MODE 1: SPLIT VIEW (DUAL INTEL CARDS + COMPACT BUILD QUEUE)
    ----------------------------------------------------------------------------
    if activeTab == "SPLIT" then
        -- Section Header: 📺 Screenshare • BATTLE INTEL • ● LIVE 60FPS
        local intelHeaderY = contentTopY - 12
        glText(cGray .. "📺 Screenshare • " .. cWhite .. "BATTLE INTEL • " .. cGreen .. "● LIVE 60FPS", winX + 8, intelHeaderY, 8.5, "on")

        -- Card 1: Friendly Intel Card (H: 98px)
        local card1Y2 = intelHeaderY - 5
        local card1Y1 = card1Y2 - 98
        drawFriendlyCard(winX + 6, card1Y1, winX + winW - 6, card1Y2, true)

        -- Card 2: Enemy Intel Card (H: 98px)
        local card2Y2 = card1Y1 - 6
        local card2Y1 = card2Y2 - 98
        drawEnemyCard(winX + 6, card2Y1, winX + winW - 6, card2Y2, true)

        -- Separator & Build Queue Header
        local queueHeaderY = card2Y1 - 16
        glColor(0.20, 0.25, 0.35, 0.5)
        glRect(winX + 6, queueHeaderY + 12, winX + winW - 6, queueHeaderY + 13)

        local queueTitle = string.format("%s🗂 BUILD QUEUE (%d STEPS)", cGray, #steps)
        local nextPrompt = string.format("%sNEXT: %s (%ds)", cGold, nextStepTime, nextStepSeconds)
        glText(queueTitle, winX + 8, queueHeaderY, 8.5, "on")
        glText(nextPrompt, winX + winW - 130, queueHeaderY, 8.5, "on")

        -- Build Queue Step Rows (H: ~100px available down to footer)
        local listYTop = queueHeaderY - 4
        drawBuildQueueRows(winX + 6, listYTop, winX + winW - 6, contentBotY, 23, 4)

    ----------------------------------------------------------------------------
    -- VIEW MODE 2: INTEL FEEDS (EXPANDED BATTLE INTEL CARDS)
    ----------------------------------------------------------------------------
    elseif activeTab == "INTEL" then
        local intelHeaderY = contentTopY - 12
        glText(cGray .. "📺 Screenshare • " .. cWhite .. "FULL BATTLE INTEL STREAM • " .. cGreen .. "● LIVE 60FPS", winX + 8, intelHeaderY, 8.5, "on")

        local cardH = (intelHeaderY - contentBotY - 16) / 2
        local card1Y2 = intelHeaderY - 5
        local card1Y1 = card1Y2 - cardH
        drawFriendlyCard(winX + 6, card1Y1, winX + winW - 6, card1Y2, false)

        local card2Y2 = card1Y1 - 6
        local card2Y1 = card2Y2 - cardH
        drawEnemyCard(winX + 6, card2Y1, winX + winW - 6, card2Y2, false)

    ----------------------------------------------------------------------------
    -- VIEW MODE 3: BUILD QUEUE (FULL BUILD ORDER CHECKLIST & PRESET SELECTOR)
    ----------------------------------------------------------------------------
    elseif activeTab == "QUEUE" then
        -- Preset selector bar
        local stratTitle = currentPreset.title or currentPreset.name
        glText(cYellow .. "▶ " .. cWhite .. stratTitle, winX + 8, contentTopY - 12, 9.5, "on")

        local queueTitle = string.format("%s🗂 BUILD QUEUE (%d STEPS)", cGray, #steps)
        local nextPrompt = string.format("%sNEXT: %s (%ds)", cGold, nextStepTime, nextStepSeconds)
        glText(queueTitle, winX + 8, contentTopY - 28, 8.5, "on")
        glText(nextPrompt, winX + winW - 130, contentTopY - 28, 8.5, "on")

        local listYTop = contentTopY - 32
        drawBuildQueueRows(winX + 6, listYTop, winX + winW - 6, contentBotY, 24, 12)
    end

    ----------------------------------------------------------------------------
    -- 7. FOOTER BAR: PRESET SWITCHER
    ----------------------------------------------------------------------------
    glColor(0.06, 0.09, 0.16, 0.95)
    glRect(winX + 4, footerY, winX + winW - 4, footerY + footerH)
    glColor(0.22, 0.74, 0.97, 0.4)
    glRect(winX + 4, footerY + footerH, winX + winW - 4, footerY + footerH + 1)

    -- Preset Switcher
    glText(cDarkGray .. "PRESET:", winX + 12, footerY + 8, 8, "on")
    local presetNames = { "BOT", "VEH", "ECO", "APP" }
    local pW = 42
    local pStartX = winX + 68

    for p = 1, 4 do
        local px1 = pStartX + (p - 1) * (pW + 6)
        local px2 = px1 + pW
        local isAct = (p == activePreset)
        if isAct then
            glColor(0.16, 0.45, 0.85, 0.95)
            glRect(px1, footerY + 3, px2, footerY + 21)
            glColor(0.4, 0.8, 1.0, 1.0)
            glLineWidth(1)
            glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
            glRect(px1, footerY + 3, px2, footerY + 21)
            glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
            glText(cWhite .. presetNames[p], px1 + 10, footerY + 7, 8.5, "on")
        else
            glColor(0.08, 0.12, 0.18, 0.8)
            glRect(px1, footerY + 3, px2, footerY + 21)
            glText(cGray .. presetNames[p], px1 + 10, footerY + 7, 8.5, "on")
        end
    end
end
