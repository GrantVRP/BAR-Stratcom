function widget:GetInfo()
    return {
        name    = "BAR Theory Live Telemetry",
        desc    = "Live match telemetry and unit completion exporter for BAR Theory-App overlay",
        author  = "Theory-App",
        date    = "2026-09-18",
        license = "GNU GPL, v2 or later",
        layer   = 0,
        enabled = true
    }
end

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
local spGetGameFrame      = Spring.GetGameFrame
local spEcho              = Spring.Echo

local finishedCounts = {}

local function sanitize(str)
    if not str then return "" end
    return tostring(str):gsub('"', '\\"'):gsub('\n', ' '):gsub('\r', '')
end

function widget:Initialize()
    finishedCounts = {}
end

function widget:UnitFinished(unitID, unitDefID, unitTeam)
    if unitTeam ~= spGetMyTeamID() then return end
    if not unitDefID or not UnitDefs or not UnitDefs[unitDefID] then return end
    local def = UnitDefs[unitDefID]
    local hName = def.humanName or def.name
    if hName and #hName > 0 then
        finishedCounts[hName] = (finishedCounts[hName] or 0) + 1
        if def.name and def.name ~= hName then
            finishedCounts[def.name] = (finishedCounts[def.name] or 0) + 1
        end
    end
end

function widget:GameFrame(frame)
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
    
    -- Metal & Energy resources
    local mCurr, mStor, mPull, mInc, mExp = spGetTeamResources(myTeamID, "metal")
    local eCurr, eStor, ePull, eInc, eExp = spGetTeamResources(myTeamID, "energy")
    
    mCurr = math.floor(mCurr or 0)
    mInc  = math.floor((mInc or 0) * 10) / 10
    mExp  = math.floor((mExp or 0) * 10) / 10
    eCurr = math.floor(eCurr or 0)
    eInc  = math.floor((eInc or 0) * 10) / 10
    eExp  = math.floor((eExp or 0) * 10) / 10
    
    -- Count friendly units & census
    local myUnits = spGetTeamUnits(myTeamID) or {}
    local friendlyCount = 0
    local raiders = 0
    local skirmishers = 0
    local assault = 0
    local air = 0
    local commanders = 0
    local builders = 0
    local buildings = 0
    local currentCounts = {}
    
    for i = 1, #myUnits do
        local uID = myUnits[i]
        local uDefID = spGetUnitDefID(uID)
        if uDefID and UnitDefs and UnitDefs[uDefID] then
            local def = UnitDefs[uDefID]
            local uName = (def.name or ""):lower()
            local hName = def.humanName or def.name
            
            if hName and #hName > 0 then
                currentCounts[hName] = (currentCounts[hName] or 0) + 1
                if def.name and def.name ~= hName then
                    currentCounts[def.name] = (currentCounts[def.name] or 0) + 1
                end
            end
            
            if def.isBuilding or def.speed == 0 then
                buildings = buildings + 1
            elseif def.isCommander or uName:find("com") then
                commanders = commanders + 1
            elseif def.isBuilder and (not def.weapons or #def.weapons == 0) then
                builders = builders + 1
            else
                friendlyCount = friendlyCount + 1
                if def.canFly then
                    air = air + 1
                elseif uName:find("flash") or uName:find("pw") or uName:find("pawn") or uName:find("gator") or uName:find("grunt") then
                    raiders = raiders + 1
                elseif uName:find("rock") or uName:find("storm") or uName:find("hound") or uName:find("sheldon") then
                    skirmishers = skirmishers + 1
                else
                    assault = assault + 1
                end
            end
        end
    end
    
    -- Merge finished and current counts for completed units
    local completedUnitsJson = {}
    local allUnitKeys = {}
    for k, _ in pairs(finishedCounts) do allUnitKeys[k] = true end
    for k, _ in pairs(currentCounts) do allUnitKeys[k] = true end
    
    for k, _ in pairs(allUnitKeys) do
        local count = math.max(finishedCounts[k] or 0, currentCounts[k] or 0)
        table.insert(completedUnitsJson, string.format('"%s":%d', sanitize(k), count))
    end
    
    -- Visible enemy units
    local visUnits = spGetVisibleUnits(-1, nil, false) or {}
    local enemyCount = 0
    local eRaiders = 0
    local eSkirmishers = 0
    local eAssault = 0
    local eAir = 0
    
    for i = 1, #visUnits do
        local uID = visUnits[i]
        local aTeam = spGetUnitAllyTeam(uID)
        if aTeam and aTeam ~= myAllyTeamID then
            local uDefID = spGetUnitDefID(uID)
            if uDefID and UnitDefs and UnitDefs[uDefID] then
                local def = UnitDefs[uDefID]
                if not def.isBuilding and def.speed > 0 and not def.isCommander then
                    enemyCount = enemyCount + 1
                    local uName = (def.name or ""):lower()
                    if def.canFly then
                        eAir = eAir + 1
                    elseif uName:find("flash") or uName:find("pw") or uName:find("pawn") or uName:find("gator") or uName:find("grunt") then
                        eRaiders = eRaiders + 1
                    elseif uName:find("rock") or uName:find("storm") or uName:find("hound") or uName:find("sheldon") then
                        eSkirmishers = eSkirmishers + 1
                    else
                        eAssault = eAssault + 1
                    end
                end
            else
                enemyCount = enemyCount + 1
            end
        end
    end
    
    -- Teammates
    local teammatesJson = {}
    local allyTeams = spGetTeamList(myAllyTeamID) or {}
    local gaiaID = spGetGaiaTeamID()
    for i = 1, #allyTeams do
        local tID = allyTeams[i]
        if tID ~= myTeamID and tID ~= gaiaID then
            local _, tLeader, _, _, tSide = spGetTeamInfo(tID)
            local tName = "Ally " .. tID
            if tLeader and tLeader >= 0 then
                local lName = spGetPlayerInfo(tLeader)
                if lName and #lName > 0 then tName = lName end
            end
            local tmMCurr, _, _, tmMInc = spGetTeamResources(tID, "metal")
            local tmECurr, _, _, tmEInc = spGetTeamResources(tID, "energy")
            tmMInc = math.floor((tmMInc or 0) * 10) / 10
            tmEInc = math.floor(tmEInc or 0)
            
            local status = "NORMAL"
            if tmECurr and tmECurr < 30 then status = "STALLING_ENERGY"
            elseif tmMCurr and tmMCurr < 15 then status = "STALLING_METAL"
            elseif tmMInc > 30 then status = "ECO_BOOMING" end
            
            table.insert(teammatesJson, string.format('{"name":"%s","faction":"%s","role":"%s","metalIncome":%s,"energyIncome":%s,"status":"%s","techTier":"%s"}',
                sanitize(tName), sanitize(tSide or "Armada"), (tmMInc > 30 and "Backline Eco" or "Frontline Combat"), tmMInc, tmEInc, status, (tmMInc > 30 and "T2" or "T1")))
        end
    end
    
    local gameSec = math.floor(frame / 30)
    
    local jsonStr = string.format('{"gameFrame":%d,"gameTimeSeconds":%d,"playerName":"%s","faction":"%s","metal":{"current":%d,"income":%s,"expense":%s},"energy":{"current":%d,"income":%s,"expense":%s},"friendlyUnits":{"total":%d,"commanders":%d,"combat":%d,"raiders":%d,"skirmishers":%d,"assault":%d,"air":%d,"builders":%d,"buildings":%d},"enemyUnits":{"total":%d,"raiders":%d,"skirmishers":%d,"assault":%d,"air":%d},"teammates":[%s],"completedUnits":{%s}}',
        frame, gameSec, sanitize(playerName), sanitize(myFaction), mCurr, mInc, mExp, eCurr, eInc, eExp, (friendlyCount + commanders), commanders, friendlyCount, raiders, skirmishers, assault, air, builders, buildings, enemyCount, eRaiders, eSkirmishers, eAssault, eAir, table.concat(teammatesJson, ","), table.concat(completedUnitsJson, ","))
        
    -- 1. Try direct file export
    local f = io.open("bar_live_telemetry.json", "w")
    if f then
        f:write(jsonStr)
        f:close()
    end
    
    -- 2. Also echo to engine log so infolog.txt captures telemetry
    if spEcho then
        spEcho("BAR_THEORY_TELEMETRY:" .. jsonStr)
    end
end
