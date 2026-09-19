function widget:GetInfo()
    return {
        name    = "BAR Theory Tactical Overlay",
        desc    = "Native 16-bit arcade tactical HUD, live build order checklist, and telemetry exporter",
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

local winW, winH = 350, 420
local winX, winY = 1560, 540 -- Default position in white highlighted area (120px from top, 10px from right)

local pillX, pillY = 1760, 936
local pillW, pillH = 150, 24
local customPositionLoaded = false
local isGameOver = false

local activePreset = 1 -- 1: BOT, 2: VEH, 3: ECO, 4: APP
local scrollOffset = 0
local maxVisibleSteps = 9

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
    cormstor = "Metal Storage",
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
    eCurr = 1000,
    eInc = 0,
    combatUnits = 0,
    commanders = 1,
    buildings = 0
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
    
    -- Lightweight resilient parser for the JSON build order
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
    
    -- Default position docked to the right in the white highlighted area (120px from top)
    if not customPositionLoaded then
        winX = math.max(10, vsx - winW - 10)
        winY = math.max(20, vsy - winH - 120)
        
        pillX = math.max(10, vsx - pillW - 10)
        pillY = math.max(20, vsy - pillH - 120)
    end
    
    isVisible = true
    isGameOver = false
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
        activePreset = activePreset
    }
end

function widget:SetConfigData(data)
    if data then
        if data.winX and data.winX > 100 then
            winX = data.winX
        else
            winX = math.max(10, vsx - winW - 10)
        end
        -- Only preserve winY if it was manually dragged and is not an old legacy default (350)
        if data.winY and data.winY > 100 and data.winY ~= 350 then
            winY = data.winY
            customPositionLoaded = true
        else
            winY = math.max(20, vsy - winH - 120)
        end
        if data.pillX and data.pillX > 100 then pillX = data.pillX else pillX = math.max(10, vsx - pillW - 10) end
        if data.pillY and data.pillY > 100 and data.pillY ~= 350 and data.pillY ~= 740 then
            pillY = data.pillY
        else
            pillY = math.max(20, vsy - pillH - 120)
        end
        if data.activePreset then activePreset = data.activePreset end
    end
end

local triggerCounter = 0
function widget:Update()
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
    if Spring.IsGameOver and Spring.IsGameOver() then
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
    
    -- Count friendly units
    local myUnits = spGetTeamUnits(myTeamID) or {}
    local friendlyCount = 0
    local commanders = 0
    local builders = 0
    local buildings = 0
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
            end
        end
    end
    currentCounts = currentFrameCounts
    
    local gameSec = math.floor(frame / 30)
    liveStats.frame = frame
    liveStats.gameSec = gameSec
    liveStats.playerName = playerName
    liveStats.faction = myFaction
    liveStats.mCurr = mCurr
    liveStats.mInc = mInc
    liveStats.eCurr = eCurr
    liveStats.eInc = eInc
    liveStats.combatUnits = friendlyCount
    liveStats.commanders = commanders
    liveStats.buildings = buildings
    
    -- Silently export live telemetry to disk for Theory-App
    local completedUnitsJson = {}
    local allUnitKeys = {}
    for k, _ in pairs(finishedCounts) do allUnitKeys[k] = true end
    for k, _ in pairs(currentCounts) do allUnitKeys[k] = true end
    for k, _ in pairs(allUnitKeys) do
        local count = math.max(finishedCounts[k] or 0, currentCounts[k] or 0)
        table.insert(completedUnitsJson, string.format('"%s":%d', sanitize(k), count))
    end
    
    local jsonStr = string.format('{"gameFrame":%d,"gameTimeSeconds":%d,"playerName":"%s","faction":"%s","metal":{"current":%d,"income":%s,"expense":%s},"energy":{"current":%d,"income":%s,"expense":%s},"friendlyUnits":{"total":%d,"commanders":%d,"combat":%d,"buildings":%d},"completedUnits":{%s}}',
        frame, gameSec, sanitize(playerName), sanitize(myFaction), mCurr, mInc, mExp, eCurr, eInc, eExp, (friendlyCount + commanders), commanders, friendlyCount, buildings, table.concat(completedUnitsJson, ","))
        
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
        -- 1. Minimize button clicked [ - ]
        if mx >= (winX + winW - 32) and mx <= (winX + winW - 8) and my >= (winY + winH - 26) and my <= (winY + winH - 6) then
            isVisible = false
            return true
        end
        
        -- 2. Header bar clicked -> start window drag
        if my >= (winY + winH - 30) then
            isDragging = true
            dragOffsetX = mx - winX
            dragOffsetY = my - winY
            return true
        end
        
        -- 3. Preset switcher tabs (Y: winY + winH - 74 to winY + winH - 52)
        local tabY1 = winY + winH - 74
        local tabY2 = winY + winH - 52
        if my >= tabY1 and my <= tabY2 then
            local tW = (winW - 20) / 4
            for t = 1, 4 do
                local tX1 = winX + 10 + (t - 1) * tW
                local tX2 = tX1 + tW - 4
                if mx >= tX1 and mx <= tX2 then
                    activePreset = t
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
        -- Pill background
        glColor(0.04, 0.08, 0.16, 0.90)
        glRect(pillX, pillY, pillX + pillW, pillY + pillH)
        
        -- Pill border
        glColor(0.22, 0.74, 0.97, 0.90)
        glLineWidth(1.5)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
        glRect(pillX, pillY, pillX + pillW, pillY + pillH)
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
        
        -- Pill text
        glText(cCyan .. "◈ " .. cWhite .. "THEORY HUD " .. cYellow .. "[F8]", pillX + 10, pillY + 6, 11, "on")
        return
    end

    ----------------------------------------------------------------------------
    -- 1. MAIN WINDOW CONTAINER
    ----------------------------------------------------------------------------
    -- Glassy backdrop
    glColor(0.03, 0.05, 0.10, 0.92)
    glRect(winX, winY, winX + winW, winY + winH)
    
    -- Outer neon cyan border
    glColor(0.22, 0.74, 0.97, 0.85)
    glLineWidth(1.5)
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
    glRect(winX, winY, winX + winW, winY + winH)
    glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
    
    ----------------------------------------------------------------------------
    -- 2. TITLE / HEADER BAR
    ----------------------------------------------------------------------------
    local headerH = 30
    local headerY = winY + winH - headerH
    glColor(0.07, 0.12, 0.22, 0.98)
    glRect(winX, headerY, winX + winW, winY + winH)
    
    -- Bottom line under header
    glColor(0.22, 0.74, 0.97, 0.5)
    glRect(winX, headerY, winX + winW, headerY + 1)
    
    -- Title: THEORY HUD
    glText(cCyan .. "THEORY HUD", winX + 10, headerY + 8, 12, "on")
    
    -- Faction tag
    local fTag = (liveStats.faction == "Cortex") and (cRed .. "[CORTEX]") or (cCyan .. "[ARMADA]")
    glText(fTag, winX + 115, headerY + 9, 10, "on")
    
    -- Game Clock (MM:SS)
    local clockStr = string.format("%02d:%02d", math.floor(liveStats.gameSec / 60), liveStats.gameSec % 60)
    glText(cGreen .. clockStr, winX + 200, headerY + 8, 12, "on")
    
    -- Minimize button [ - ]
    glColor(0.12, 0.20, 0.32, 0.9)
    glRect(winX + winW - 32, headerY + 5, winX + winW - 8, headerY + 23)
    glText(cWhite .. "-", winX + winW - 22, headerY + 7, 12, "on")
    
    ----------------------------------------------------------------------------
    -- 3. RESOURCE & FORCE STATS SUBHEADER
    ----------------------------------------------------------------------------
    local statsY = headerY - 24
    glColor(0.05, 0.08, 0.15, 0.8)
    glRect(winX + 4, statsY, winX + winW - 4, statsY + 22)
    
    local metalStr = string.format("%sM:+%.1f %s(%d)", cWhite, liveStats.mInc, cGray, liveStats.mCurr)
    local energyStr = string.format("%sE:+%d %s(%d)", cYellow, math.floor(liveStats.eInc), cGray, liveStats.eCurr)
    local armyStr = string.format("%sArmy:%d %sBld:%d", cGreen, liveStats.combatUnits, cGray, liveStats.buildings)
    
    glText(metalStr, winX + 10, statsY + 6, 9, "on")
    glText(energyStr, winX + 125, statsY + 6, 9, "on")
    glText(armyStr, winX + 235, statsY + 6, 9, "on")

    ----------------------------------------------------------------------------
    -- 4. PRESET SWITCHER TABS
    ----------------------------------------------------------------------------
    local tabY = statsY - 26
    local tabNames = { "BOT", "VEH", "ECO", "APP" }
    local tW = (winW - 20) / 4
    
    for t = 1, 4 do
        local tX1 = winX + 10 + (t - 1) * tW
        local tX2 = tX1 + tW - 4
        
        if t == activePreset then
            -- Active tab: glowing blue
            glColor(0.16, 0.45, 0.85, 0.95)
            glRect(tX1, tabY, tX2, tabY + 20)
            glColor(0.4, 0.8, 1.0, 1.0)
            glLineWidth(1.5)
            glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
            glRect(tX1, tabY, tX2, tabY + 20)
            glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
            glText(cWhite .. tabNames[t], tX1 + 14, tabY + 5, 10, "on")
        else
            -- Inactive tab: dim slate
            glColor(0.08, 0.12, 0.20, 0.75)
            glRect(tX1, tabY, tX2, tabY + 20)
            glText(cGray .. tabNames[t], tX1 + 14, tabY + 5, 10, "on")
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
    
    -- Subtitle showing active strategy name
    local subY = tabY - 20
    local stratTitle = currentPreset.title or currentPreset.name
    glText(cYellow .. "▶ " .. cWhite .. stratTitle, winX + 10, subY + 4, 10, "on")

    ----------------------------------------------------------------------------
    -- 6. BUILD ORDER STEP CHECKLIST
    ----------------------------------------------------------------------------
    local listYTop = subY - 10
    local listYBottom = winY + 45
    local rowH = 25
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
    
    -- Clamp scrolling
    local totalSteps = #steps
    local visibleCount = math.min(maxVisibleSteps, math.floor((listYTop - listYBottom) / rowH))
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
        
        -- Row highlight for active step
        if isActive then
            glColor(0.20, 0.45, 0.70, 0.35)
            glRect(winX + 6, rowY - 2, winX + winW - 6, rowY + rowH - 4)
            glColor(0.25, 0.80, 1.0, 0.75)
            glLineWidth(1)
            glPolygonMode(GL_FRONT_AND_BACK, GL_LINE)
            glRect(winX + 6, rowY - 2, winX + winW - 6, rowY + rowH - 4)
            glPolygonMode(GL_FRONT_AND_BACK, GL_FILL)
        elseif isComplete then
            glColor(0.05, 0.15, 0.08, 0.25)
            glRect(winX + 6, rowY - 2, winX + winW - 6, rowY + rowH - 4)
        end
        
        -- Status Icon Badge
        local statusIcon = ""
        local textCol = cGray
        if isComplete then
            statusIcon = cGreen .. "[✓] "
            textCol = cGreen
        elseif isActive then
            statusIcon = cYellow .. "[►] "
            textCol = cWhite
        else
            statusIcon = cDarkGray .. "[ ] "
            textCol = cGray
        end
        
        -- Step text line
        local countRatio = string.format("(%d/%d)", math.min(step.cumulative, builtCount), step.cumulative)
        local stepStr = string.format("%s%s%s %s%s: %s%dx %s %s%s",
            statusIcon,
            cCyan, step.time,
            cYellow, step.builder,
            textCol, step.count, step.unit,
            (isComplete and cGreen or cDarkGray), countRatio
        )
        
        glText(stepStr, winX + 10, rowY + 3, 9, "on")
    end

    ----------------------------------------------------------------------------
    -- 7. FOOTER & RECOMMENDATION
    ----------------------------------------------------------------------------
    local footerY = winY + 6
    local footerH = 34
    glColor(0.06, 0.10, 0.18, 0.95)
    glRect(winX + 4, footerY, winX + winW - 4, footerY + footerH)
    glColor(0.22, 0.74, 0.97, 0.4)
    glRect(winX + 4, footerY + footerH, winX + winW - 4, footerY + footerH + 1)
    
    local nextActionText = "Build order complete! Maintain frontline & scale T2."
    if firstIncompleteIdx > 0 and steps[firstIncompleteIdx] then
        local s = steps[firstIncompleteIdx]
        nextActionText = string.format("NEXT: %dx %s (%s) @ %s", s.count, s.unit, s.builder, s.time)
    end
    
    glText(cYellow .. "▶ " .. cWhite .. nextActionText, winX + 10, footerY + 18, 9, "on")
    glText(cGray .. "F8: Toggle HUD  •  Drag header to move", winX + 10, footerY + 5, 8, "on")
end
