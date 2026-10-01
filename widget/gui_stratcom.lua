-- License: GPL-2.0-or-later
-- STRATCOM_WIDGET_VERSION 3.0.0
-- STRATCOM_PROTOCOL 1

function widget:GetInfo()
  return {
    name = "BAR StratCom",
    desc = "Live tactical coaching companion for Beyond All Reason",
    author = "Grant",
    date = "2026",
    license = "GPL-2.0-or-later",
    layer = 0,
    enabled = true,
    handler = true
  }
end

-- Localised API shortcuts (guarded per 05 §2)
local spCreateDir = Spring.CreateDir
local spGetGameFrame = Spring.GetGameFrame
local spGetGameSeconds = Spring.GetGameSeconds
local spIsReplay = Spring.IsReplay
local spGetSpectatingState = Spring.GetSpectatingState
local spGetMyTeamID = Spring.GetMyTeamID
local spGetMyAllyTeamID = Spring.GetMyAllyTeamID
local spGetMyPlayerID = Spring.GetMyPlayerID
local spGetPlayerInfo = Spring.GetPlayerInfo
local spGetTeamResources = Spring.GetTeamResources
local spGetTeamRulesParam = Spring.GetTeamRulesParam
local spGetTeamUnits = Spring.GetTeamUnits
local spGetTeamUnitsCounts = Spring.GetTeamUnitsCounts
local spGetUnitDefID = Spring.GetUnitDefID
local spGetUnitHealth = Spring.GetUnitHealth
local spGetUnitPosition = Spring.GetUnitPosition
local spGetUnitIsBeingBuilt = Spring.GetUnitIsBeingBuilt
local spGetUnitIsBuilding = Spring.GetUnitIsBuilding
local spGetUnitCurrentBuildPower = Spring.GetUnitCurrentBuildPower
local spGetUnitCommands = Spring.GetUnitCommands
local spGetUnitCommandCount = Spring.GetUnitCommandCount
local spGetFactoryCommands = Spring.GetFactoryCommands
local spGetVisibleUnits = Spring.GetVisibleUnits
local spGetWind = Spring.GetWind
local spEcho = Spring.Echo
local spGetTimer = Spring.GetTimer
local spDiffTimers = Spring.DiffTimers
local spGetModOptions = Spring.GetModOptions
local spSetActiveCommand = Spring.SetActiveCommand
local spGetActiveCmdDescs = Spring.GetActiveCmdDescs
local spGetUnitTeam = Spring.GetUnitTeam
local spGetUnitAllyTeam = Spring.GetUnitAllyTeam
local spGetTeamList = Spring.GetTeamList
local spGetTeamInfo = Spring.GetTeamInfo
local spGetGaiaTeamID = Spring.GetGaiaTeamID

-- Constants & State
local PROTOCOL = 1
local WIDGET_VERSION = "3.0.0"
local DIR = "stratcom/"

local jsonNull = (type(Json) == "table" and Json.null) or nil

local gameStarted = false
local gameOver = false
local currentSessionId = nil
local timeSinceHeartbeat = 0
local snapshotSeq = 0
local lastSnapshotMs = 0

local config = {
  hudX = nil,
  hudY = nil,
  hudVisible = true,
  hudScale = 1.0
}

-- Utility functions (05 §3)
local function atomicWrite(name, tbl)
  local path = DIR .. name
  local tmpPath = path .. ".tmp"
  local f = io.open(tmpPath, "w")
  if not f then
    return false
  end
  local jsonStr = Json.encode(tbl)
  f:write(jsonStr)
  f:close()
  os.remove(path)
  os.rename(tmpPath, path)
  return true
end

local function safeDecode(str)
  if not str or str == "" then
    return nil
  end
  local ok, res = pcall(Json.decode, str)
  if ok then
    return res
  end
  return nil
end

local function makeArray(tbl)
  tbl = tbl or {}
  if type(Json) == "table" and type(Json.array) == "function" then
    return Json.array(tbl)
  end
  return setmetatable(tbl, { __jsontype = "array" })
end

local function detectMode()
  if spIsReplay and spIsReplay() then
    return "replay"
  elseif spGetSpectatingState and spGetSpectatingState() then
    return "spectator"
  elseif not gameStarted then
    return "pregame"
  else
    return "player"
  end
end

local function resolveFaction(teamId)
  local startUnitName = nil
  if spGetTeamRulesParam then
    startUnitName = spGetTeamRulesParam(teamId, "startUnit")
  end

  if not startUnitName and spGetTeamUnits and (type(UnitDefs) == "table" or type(UnitDefs) == "userdata") then
    local teamUnits = spGetTeamUnits(teamId) or {}
    for _, uId in ipairs(teamUnits) do
      local defId = spGetUnitDefID and spGetUnitDefID(uId)
      local def = defId and UnitDefs[defId]
      if def and def.customParams and def.customParams.iscommander == "1" then
        startUnitName = def.name
        break
      end
    end
  end

  local factionId = nil
  if startUnitName then
    local lowerName = string.lower(startUnitName)
    local pfx = string.sub(lowerName, 1, 3)
    if pfx == "arm" then
      factionId = "armada"
    elseif pfx == "cor" then
      factionId = "cortex"
    elseif pfx == "leg" then
      factionId = "legion"
    end
  end

  return factionId, startUnitName
end

local function getResources(teamId)
  if not spGetTeamResources then
    local zeroRes = {
      current = 0, storage = 0, pull = 0, income = 0,
      expense = 0, share = 0, sent = 0, received = 0
    }
    return { metal = zeroRes, energy = zeroRes }
  end

  local mc, ms, mp, mi, me, msh, mse, mr = spGetTeamResources(teamId, "metal")
  local ec, es, ep, ei, ee, esh, ese, er = spGetTeamResources(teamId, "energy")

  return {
    metal = {
      current = mc or 0,
      storage = ms or 0,
      pull = mp or 0,
      income = mi or 0,
      expense = me or 0,
      share = msh or 0,
      sent = mse or 0,
      received = mr or 0
    },
    energy = {
      current = ec or 0,
      storage = es or 0,
      pull = ep or 0,
      income = ei or 0,
      expense = ee or 0,
      share = esh or 0,
      sent = ese or 0,
      received = er or 0
    }
  }
end

local function resolveWindInfo(wMin, wMax)
  local ok, wf = pcall(require, "common/wind_functions")
  if not ok or (type(wf) ~= "table" and type(wf) ~= "userdata") then
    return nil, nil
  end

  local avg = nil
  local risk = nil

  if type(wf.averageWindLookup) == "table" or type(wf.averageWindLookup) == "userdata" then
    local minTbl = wf.averageWindLookup[wMin] or wf.averageWindLookup[tostring(wMin)]
    if type(minTbl) == "table" or type(minTbl) == "userdata" then
      avg = minTbl[wMax] or minTbl[tostring(wMax)]
    end
  end

  if type(wf.getWindRisk) == "function" or type(wf.getWindRisk) == "userdata" then
    local okRisk, r = pcall(wf.getWindRisk)
    if okRisk and type(r) == "number" then
      risk = r
    end
  end

  return avg, risk
end

local function runProbe()
  local okWind = false
  local okReq, wf = pcall(require, "common/wind_functions")
  if okReq and (type(wf) == "table" or type(wf) == "userdata") then
    okWind = true
  end

  local probe = {
    protocol = PROTOCOL,
    widgetVersion = WIDGET_VERSION,
    apis = {
      ["Spring.GetTeamRulesParam"] = type(Spring and Spring.GetTeamRulesParam),
      ["Spring.GetTeamUnitsCounts"] = type(Spring and Spring.GetTeamUnitsCounts),
      ["Spring.GetUnitIsBeingBuilt"] = type(Spring and Spring.GetUnitIsBeingBuilt),
      ["Spring.GetUnitIsBuilding"] = type(Spring and Spring.GetUnitIsBuilding),
      ["Spring.GetUnitCurrentBuildPower"] = type(Spring and Spring.GetUnitCurrentBuildPower),
      ["Spring.GetUnitCommandCount"] = type(Spring and Spring.GetUnitCommandCount),
      ["Spring.GetFactoryCommands"] = type(Spring and Spring.GetFactoryCommands),
      ["Spring.GetVisibleUnits"] = type(Spring and Spring.GetVisibleUnits),
      ["Spring.SetActiveCommand"] = type(Spring and Spring.SetActiveCommand),
      ["Spring.GetActiveCmdDescs"] = type(Spring and Spring.GetActiveCmdDescs),
      ["widgetHandler.actionHandler:AddAction"] = type(widgetHandler and widgetHandler.actionHandler and widgetHandler.actionHandler.AddAction),
      ["WG['fonts']"] = type(WG and WG["fonts"])
    },
    types = {
      Game = type(Game),
      Engine = type(Engine)
    },
    engineVersion = (Engine and Engine.version) or "unknown",
    gameVersion = (Game and Game.gameVersion) or "unknown",
    canControlUnits = (widget.canControlUnits == true),
    windFunctions = okWind
  }

  atomicWrite("probe.json", probe)
end

local function writeHeartbeat()
  local mode = detectMode()
  local wMin = (Game and Game.windMin) or 0
  local wMax = (Game and Game.windMax) or 0
  local tidal = (Game and Game.tidal) or 0
  local mapName = (Game and Game.mapName) or "unknown"
  local avgWind, windRisk = resolveWindInfo(wMin, wMax)

  local perfData = jsonNull
  if lastSnapshotMs > 0 then
    perfData = {
      frameMs = 0,
      drawMs = 0,
      snapshotMs = lastSnapshotMs
    }
  end

  local heartbeatData = {
    protocol = PROTOCOL,
    widgetVersion = WIDGET_VERSION,
    engineVersion = (Engine and Engine.version) or "unknown",
    gameVersion = (Game and Game.gameVersion) or "unknown",
    sessionId = currentSessionId or jsonNull,
    mode = mode,
    canControlUnits = (widget.canControlUnits == true),
    frame = (spGetGameFrame and spGetGameFrame()) or 0,
    gameStarted = gameStarted,
    gameOver = gameOver,
    map = {
      scriptName = mapName,
      windMin = wMin,
      windMax = wMax,
      avgWind = avgWind or jsonNull,
      windRisk = windRisk or jsonNull,
      tidal = tidal
    },
    perf = perfData,
    degraded = false,
    heartbeat = os.time()
  }

  atomicWrite("widget.json", heartbeatData)
end

local function writeSensorState()
  local t0 = spGetTimer and spGetTimer()
  snapshotSeq = snapshotSeq + 1

  if not currentSessionId then
    currentSessionId = string.format("%s-%04x", os.date("!%Y%m%d-%H%M%S"), math.random(0, 0xffff))
  end

  local mode = detectMode()
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  local gameSec = (spGetGameSeconds and spGetGameSeconds()) or 0

  local windSpeed = 0
  if spGetWind then
    local _, _, _, w = spGetWind()
    windSpeed = w or 0
  end

  local stateDoc = {
    protocol = PROTOCOL,
    sessionId = currentSessionId,
    seq = snapshotSeq,
    frame = frame,
    gameSeconds = gameSec,
    wind = { current = windSpeed },
    counts = {},
    builders = { total = 0, idle = 0 },
    factories = { total = 0, idle = 0 },
    commander = { alive = false, idle = false },
    bp = { total = 0, active = 0 },
    enemies = {}
  }

  if mode == "spectator" or mode == "replay" then
    stateDoc.me = jsonNull
    stateDoc.res = jsonNull

    local teamsList = makeArray({})
    local teamList = (spGetTeamList and spGetTeamList()) or {}
    local gaiaTeam = (spGetGaiaTeamID and spGetGaiaTeamID()) or -1
    local numTeams = #teamList

    for _, tId in ipairs(teamList) do
      if tId ~= gaiaTeam then
        local allyTeamId = 0
        local leaderId = nil
        if spGetTeamInfo then
          local _, lId, _, _, _, aId = spGetTeamInfo(tId)
          leaderId = lId
          allyTeamId = aId or 0
        end

        local playerName = "Player " .. tostring(tId)
        if leaderId and spGetPlayerInfo then
          local pName = spGetPlayerInfo(leaderId)
          if pName and pName ~= "" then
            playerName = pName
          end
        end

        local tFaction = resolveFaction(tId)
        local tRes = getResources(tId)

        local tCounts = {}
        if spGetTeamUnitsCounts then
          local rawCounts = spGetTeamUnitsCounts(tId) or {}
          for dId, cnt in pairs(rawCounts) do
            local d = UnitDefs and UnitDefs[dId]
            if d and d.name then
              tCounts[d.name] = { alive = cnt, building = 0 }
            end
          end
        end

        local computeBp = (numTeams <= 8) or (snapshotSeq % 5 == 0)
        local tBpTotal = 0
        local tBpActive = 0
        if computeBp and spGetTeamUnits then
          for _, u in ipairs(spGetTeamUnits(tId) or {}) do
            local defId = spGetUnitDefID and spGetUnitDefID(u)
            local def = defId and UnitDefs and UnitDefs[defId]
            if def and (def.isBuilder or def.isFactory or (def.customParams and def.customParams.iscommander == "1")) then
              local beingBuilt = spGetUnitIsBeingBuilt and spGetUnitIsBeingBuilt(u)
              if not beingBuilt and def.buildSpeed and def.buildSpeed > 0 then
                tBpTotal = tBpTotal + def.buildSpeed
                local curP = (spGetUnitCurrentBuildPower and spGetUnitCurrentBuildPower(u)) or 0
                tBpActive = tBpActive + (def.buildSpeed * curP)
              end
            end
          end
        end

        table.insert(teamsList, {
          teamId = tId,
          allyTeamId = allyTeamId,
          playerName = playerName,
          factionId = tFaction or jsonNull,
          res = tRes,
          counts = tCounts,
          bp = { total = tBpTotal, active = tBpActive }
        })
      end
    end

    table.sort(teamsList, function(a, b) return a.teamId < b.teamId end)
    stateDoc.teams = teamsList
  else
    local myTeam = (spGetMyTeamID and spGetMyTeamID()) or 0
    local myAlly = (spGetMyAllyTeamID and spGetMyAllyTeamID()) or 0

    local myPlayerName = "CommanderPlayer"
    local myPlayerId = (spGetMyPlayerID and spGetMyPlayerID()) or 0
    if spGetPlayerInfo then
      local pName = spGetPlayerInfo(myPlayerId)
      if pName and pName ~= "" then
        myPlayerName = pName
      end
    end

    local myFaction, myStartUnit = resolveFaction(myTeam)

    stateDoc.me = {
      teamId = myTeam,
      allyTeamId = myAlly,
      factionId = myFaction or jsonNull,
      startUnitId = myStartUnit or jsonNull,
      playerName = myPlayerName
    }

    stateDoc.res = getResources(myTeam)

    local counts = {}
    local buildersTotal = 0
    local buildersIdle = 0
    local factoriesTotal = 0
    local factoriesIdle = 0
    local commanderAlive = false
    local commanderIdle = false
    local bpTotal = 0
    local bpActive = 0

    local teamUnits = (spGetTeamUnits and spGetTeamUnits(myTeam)) or {}
    for _, u in ipairs(teamUnits) do
      local defId = spGetUnitDefID and spGetUnitDefID(u)
      local def = defId and UnitDefs and UnitDefs[defId]
      if def and def.name then
        local defName = def.name
        if not counts[defName] then
          counts[defName] = { alive = 0, building = 0 }
        end

        local beingBuilt = spGetUnitIsBeingBuilt and spGetUnitIsBeingBuilt(u)
        if beingBuilt then
          counts[defName].building = counts[defName].building + 1
        else
          counts[defName].alive = counts[defName].alive + 1

          local isCommander = (def.customParams and def.customParams.iscommander == "1")
          local cmdCount = (spGetUnitCommandCount and spGetUnitCommandCount(u)) or 0
          local isBuildingSomething = (spGetUnitIsBuilding and spGetUnitIsBuilding(u)) ~= nil

          if isCommander then
            commanderAlive = true
            commanderIdle = (cmdCount == 0 and not isBuildingSomething)
          elseif def.isBuilder and not def.isBuilding then
            buildersTotal = buildersTotal + 1
            if cmdCount == 0 and not isBuildingSomething then
              buildersIdle = buildersIdle + 1
            end
          elseif def.isFactory then
            factoriesTotal = factoriesTotal + 1
            local factoryCmds = spGetFactoryCommands and spGetFactoryCommands(u, 0)
            local hasQueue = (cmdCount > 0) or (factoryCmds and #factoryCmds > 0)
            if not hasQueue and not isBuildingSomething then
              factoriesIdle = factoriesIdle + 1
            end
          end

          if (def.isBuilder or def.isFactory or isCommander) and def.buildSpeed and def.buildSpeed > 0 then
            local bSpeed = def.buildSpeed
            bpTotal = bpTotal + bSpeed
            local curPower = (spGetUnitCurrentBuildPower and spGetUnitCurrentBuildPower(u)) or 0
            bpActive = bpActive + (bSpeed * curPower)
          end
        end
      end
    end

    stateDoc.counts = counts
    stateDoc.builders = { total = buildersTotal, idle = buildersIdle }
    stateDoc.factories = { total = factoriesTotal, idle = factoriesIdle }
    stateDoc.commander = { alive = commanderAlive, idle = commanderIdle }
    stateDoc.bp = { total = bpTotal, active = bpActive }

    local enemies = {}
    local visibleUnits = (spGetVisibleUnits and spGetVisibleUnits()) or {}
    for _, u in ipairs(visibleUnits) do
      local uAlly = spGetUnitAllyTeam and spGetUnitAllyTeam(u)
      if uAlly and uAlly ~= myAlly then
        local defId = spGetUnitDefID and spGetUnitDefID(u)
        if defId and defId > 0 and UnitDefs and UnitDefs[defId] then
          local def = UnitDefs[defId]
          if def and def.name then
            enemies[def.name] = (enemies[def.name] or 0) + 1
          end
        end
      end
    end
    stateDoc.enemies = enemies
  end

  atomicWrite("state.json", stateDoc)

  local t1 = spGetTimer and spGetTimer()
  if t0 and t1 and spDiffTimers then
    lastSnapshotMs = spDiffTimers(t1, t0)
  end
end

-- Exporters (05 §5)
local TRACKED_RAW_FIELDS = {
  "name",
  "translatedHumanName",
  "translatedTooltip",
  "metalCost",
  "energyCost",
  "buildTime",
  "buildSpeed",
  "isBuilder",
  "isFactory",
  "isBuilding",
  "canFly",
  "canMove",
  "speed",
  "health",
  "maxWeaponRange",
  "sightDistance",
  "radarDistance",
  "energyMake",
  "metalMake",
  "energyUpkeep",
  "metalUpkeep",
  "extractsMetal",
  "windGenerator",
  "tidalGenerator",
  "energyStorage",
  "metalStorage",
  "buildOptions"
}

local ALLOWED_CUSTOM_PARAM_KEYS = {
  "techlevel",
  "unitgroup",
  "iscommander",
  "energyconv_capacity",
  "energyconv_efficiency",
  "faction"
}

local function getSafeGameVersion()
  local gv = (Game and Game.gameVersion) or "unknown"
  return string.gsub(gv, "[^%w%.%-]", "_")
end

local function exportUnitdefs()
  local realGameVersion = (Game and Game.gameVersion) or "unknown"
  local safeVersion = getSafeGameVersion()
  local filename = "unitdefs-" .. safeVersion .. ".json"
  local checkFile = io.open(DIR .. filename, "r")
  if checkFile then
    checkFile:close()
    return true
  end

  if type(UnitDefs) ~= "table" and type(UnitDefs) ~= "userdata" then
    return false
  end

  local unitsList = makeArray({})
  local foundAny = {}

  for _, def in pairs(UnitDefs) do
    if type(def) == "table" or type(def) == "userdata" then
      if def.name then
        -- Convert buildOptions from defIDs to names
        local convertedBuildOptions = makeArray({})
        if type(def.buildOptions) == "table" or type(def.buildOptions) == "userdata" then
          for _, opt in ipairs(def.buildOptions) do
            if type(opt) == "number" then
              local bDef = UnitDefs and UnitDefs[opt]
              if bDef and bDef.name then
                table.insert(convertedBuildOptions, bDef.name)
              else
                table.insert(convertedBuildOptions, tostring(opt))
              end
            elseif type(opt) == "string" then
              table.insert(convertedBuildOptions, opt)
            end
          end
        end

        local u = {
          name = def.name,
          translatedHumanName = def.translatedHumanName,
          translatedTooltip = def.translatedTooltip,
          metalCost = def.metalCost,
          energyCost = def.energyCost,
          buildTime = def.buildTime,
          buildSpeed = def.buildSpeed,
          isBuilder = def.isBuilder,
          isFactory = def.isFactory,
          isBuilding = def.isBuilding,
          canFly = def.canFly,
          canMove = def.canMove,
          speed = def.speed,
          health = def.health,
          maxWeaponRange = def.maxWeaponRange,
          sightDistance = def.sightDistance or def.losRadius,
          radarDistance = def.radarDistance or def.radarRadius,
          energyMake = def.energyMake,
          metalMake = def.metalMake,
          energyUpkeep = def.energyUpkeep,
          metalUpkeep = def.metalUpkeep,
          extractsMetal = def.extractsMetal,
          windGenerator = def.windGenerator,
          tidalGenerator = def.tidalGenerator,
          energyStorage = def.energyStorage,
          metalStorage = def.metalStorage,
          buildOptions = convertedBuildOptions
        }

        -- Whitelist customParams keys
        if type(def.customParams) == "table" or type(def.customParams) == "userdata" then
          local cp = {}
          local hasCp = false
          for _, k in ipairs(ALLOWED_CUSTOM_PARAM_KEYS) do
            if def.customParams[k] ~= nil then
              cp[k] = def.customParams[k]
              hasCp = true
            end
          end
          if hasCp then
            u.customParams = cp
          end
        end

        table.insert(unitsList, u)

        -- Track field presence for missingFields
        for _, fieldName in ipairs(TRACKED_RAW_FIELDS) do
          if fieldName == "sightDistance" then
            if def.sightDistance ~= nil or def.losRadius ~= nil then
              foundAny["sightDistance"] = true
            end
          elseif fieldName == "radarDistance" then
            if def.radarDistance ~= nil or def.radarRadius ~= nil then
              foundAny["radarDistance"] = true
            end
          elseif def[fieldName] ~= nil then
            foundAny[fieldName] = true
          end
        end
      end
    end
  end

  -- Determine missing fields (absent on ALL defs)
  local missingFields = makeArray({})
  for _, fieldName in ipairs(TRACKED_RAW_FIELDS) do
    if not foundAny[fieldName] then
      table.insert(missingFields, fieldName)
    end
  end
  table.sort(missingFields)

  -- Sort units deterministically by name
  table.sort(unitsList, function(a, b)
    return tostring(a.name) < tostring(b.name)
  end)

  local doc = {
    protocol = PROTOCOL,
    kind = "unitdefs",
    gameVersion = realGameVersion,
    engineVersion = (Engine and Engine.version) or "unknown",
    units = unitsList,
    missingFields = missingFields
  }

  return atomicWrite(filename, doc)
end

local function exportWindLookup()
  local path = DIR .. "wind-lookup.json"
  local checkFile = io.open(path, "r")
  if checkFile then
    checkFile:close()
    return true
  end

  local ok, wf = pcall(require, "common/wind_functions")
  if not ok or (type(wf) ~= "table" and type(wf) ~= "userdata") then
    return false
  end

  if type(wf.averageWindLookup) ~= "table" and type(wf.averageWindLookup) ~= "userdata" then
    return false
  end

  local exportTable = {}
  for minKey, maxMap in pairs(wf.averageWindLookup) do
    local sMin = tostring(minKey)
    exportTable[sMin] = {}
    if type(maxMap) == "table" or type(maxMap) == "userdata" then
      for maxKey, val in pairs(maxMap) do
        local sMax = tostring(maxKey)
        if type(val) == "number" then
          exportTable[sMin][sMax] = val
        end
      end
    end
  end

  local doc = {
    protocol = PROTOCOL,
    kind = "wind-lookup",
    gameVersion = (Game and Game.gameVersion) or "unknown",
    table = exportTable
  }

  return atomicWrite("wind-lookup.json", doc)
end

-- Call-ins (05 §4)
function widget:Initialize()
  if spCreateDir then
    spCreateDir("stratcom")
  end
  runProbe()
  exportUnitdefs()
  exportWindLookup()
  writeHeartbeat()
end

function widget:GameStart()
  gameStarted = true
  if not currentSessionId then
    currentSessionId = string.format("%s-%04x", os.date("!%Y%m%d-%H%M%S"), math.random(0, 0xffff))
  end
  writeSensorState()
  writeHeartbeat()
end

function widget:GameOver(winners)
  gameOver = true
  writeHeartbeat()
end

function widget:GameFrame(n)
  if n % 30 == 0 then
    writeSensorState()
    writeHeartbeat()
  end
end

function widget:Update(dt)
  if not gameStarted then
    timeSinceHeartbeat = timeSinceHeartbeat + (dt or 0)
    if timeSinceHeartbeat >= 1.0 then
      timeSinceHeartbeat = 0
      writeHeartbeat()
    end
  end
end

function widget:Shutdown()
  writeHeartbeat()
end

function widget:GetConfigData()
  return {
    hudX = config.hudX,
    hudY = config.hudY,
    hudVisible = config.hudVisible,
    hudScale = config.hudScale
  }
end

function widget:SetConfigData(data)
  if type(data) == "table" or type(data) == "userdata" then
    if type(data.hudX) == "number" then config.hudX = data.hudX end
    if type(data.hudY) == "number" then config.hudY = data.hudY end
    if type(data.hudVisible) == "boolean" then config.hudVisible = data.hudVisible end
    if type(data.hudScale) == "number" then config.hudScale = data.hudScale end
  end
end
