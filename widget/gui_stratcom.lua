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
local startRecorded = false
local eventBuffer = {}

local lastCoachSeq = -1
local currentCoachDoc = nil
local timeSinceCoachRead = 0
local seenEchoIds = {}
local seenEchoQueue = {}
local MAX_SEEN_ECHOS = 64
local lastDrawMs = 0
local isDragging = false
local dragOffsetX = 0
local dragOffsetY = 0

local TONE_COLORS = {
  info = { 203 / 255, 213 / 255, 225 / 255, 1.0 },   -- #cbd5e1
  good = { 74 / 255, 222 / 255, 128 / 255, 1.0 },    -- #4ade80
  warn = { 251 / 255, 191 / 255, 36 / 255, 1.0 },    -- #fbbf24
  danger = { 248 / 255, 113 / 255, 113 / 255, 1.0 }, -- #f87171
  dim = { 113 / 255, 113 / 255, 122 / 255, 1.0 }     -- #71717a
}

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

local arrayMt = { __jsontype = "array" }
local function makeArray(tbl)
  tbl = tbl or {}
  if type(Json) == "table" and type(Json.array) == "function" then
    return Json.array(tbl)
  end
  return setmetatable(tbl, arrayMt)
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
  local function readRes(resType)
    if not spGetTeamResources then
      return { current = 0, storage = 0, pull = 0, income = 0, expense = 0, share = 0, sent = 0, received = 0 }
    end
    local c, s, p, i, e, sh, se, r = spGetTeamResources(teamId, resType)
    return {
      current = c or 0, storage = s or 0, pull = p or 0, income = i or 0,
      expense = e or 0, share = sh or 0, sent = se or 0, received = r or 0
    }
  end
  return { metal = readRes("metal"), energy = readRes("energy") }
end

local cachedWindFunctions = false
local function getWindFunctions()
  if cachedWindFunctions ~= false then
    return cachedWindFunctions
  end
  local ok, wf = pcall(require, "common/wind_functions")
  if ok and (type(wf) == "table" or type(wf) == "userdata") then
    cachedWindFunctions = wf
  else
    cachedWindFunctions = nil
  end
  return cachedWindFunctions
end

local function resolveWindInfo(wMin, wMax)
  local wf = getWindFunctions()
  if not wf then
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
  local wf = getWindFunctions()
  local okWind = (wf ~= nil)

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
  if lastSnapshotMs > 0 or lastDrawMs > 0 then
    perfData = {
      frameMs = 0,
      drawMs = lastDrawMs,
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

-- Recorder & Session (05 §7, 03 §7.3, §7.7)
local function recordEvent(evt)
  table.insert(eventBuffer, evt)
end

local function flushEvents()
  if #eventBuffer == 0 or not currentSessionId then
    return
  end
  local path = DIR .. "events-" .. currentSessionId .. ".ndjson"
  local f = io.open(path, "a")
  if not f then
    return
  end
  for _, evt in ipairs(eventBuffer) do
    f:write(Json.encode(evt) .. "\n")
  end
  f:close()
  eventBuffer = {}
end

local function isTrackedTeam(teamId)
  if type(teamId) ~= "number" then
    return false
  end
  local gaiaTeam = (spGetGaiaTeamID and spGetGaiaTeamID()) or -1
  if teamId == gaiaTeam then
    return false
  end
  local isReplay = (spIsReplay and spIsReplay()) or false
  local isSpec = (spGetSpectatingState and spGetSpectatingState()) or false
  if isSpec or isReplay then
    return true
  end
  local myTeam = (spGetMyTeamID and spGetMyTeamID()) or 0
  return teamId == myTeam
end

local function getTeamInfoDetails(tId)
  local allyTeamId, leaderId, isAiTeam = 0, nil, false
  if spGetTeamInfo then
    local _, lId, _, isAi, _, aId = spGetTeamInfo(tId)
    leaderId, isAiTeam, allyTeamId = lId, (isAi == true), aId or 0
  end
  local playerName = "Player " .. tostring(tId)
  if leaderId and spGetPlayerInfo then
    local pName = spGetPlayerInfo(leaderId)
    if pName and pName ~= "" then playerName = pName end
  end
  return allyTeamId, isAiTeam, playerName, resolveFaction(tId)
end

local function writeSessionFile(hasStart)
  if not currentSessionId then
    return
  end
  local mode = detectMode()
  if mode == "pregame" then
    mode = "player"
  end

  local myTeam = (spGetMyTeamID and spGetMyTeamID()) or 0
  local gaiaTeam = (spGetGaiaTeamID and spGetGaiaTeamID()) or -1
  local teamList = (spGetTeamList and spGetTeamList()) or {}
  local teamsList = makeArray({})

  for _, tId in ipairs(teamList) do
    if tId ~= gaiaTeam then
      local allyTeamId, isAiTeam, playerName, tFaction = getTeamInfoDetails(tId)
      table.insert(teamsList, {
        teamId = tId,
        allyTeamId = allyTeamId,
        playerName = playerName,
        factionId = tFaction or jsonNull,
        isAI = isAiTeam,
        isMe = (mode == "player" and tId == myTeam)
      })
    end
  end

  if #teamsList == 0 then
    table.insert(teamsList, {
      teamId = myTeam,
      allyTeamId = (spGetMyAllyTeamID and spGetMyAllyTeamID()) or 0,
      playerName = "Player " .. tostring(myTeam),
      factionId = resolveFaction(myTeam) or jsonNull,
      isAI = false,
      isMe = (mode == "player")
    })
  end

  table.sort(teamsList, function(a, b) return a.teamId < b.teamId end)

  local startObj = jsonNull
  if hasStart and mode == "player" then
    local mc, ms, ec, es = 0, 0, 0, 0
    if spGetTeamResources then
      local rM1, rM2 = spGetTeamResources(myTeam, "metal")
      local rE1, rE2 = spGetTeamResources(myTeam, "energy")
      mc, ms = rM1 or 0, rM2 or 0
      ec, es = rE1 or 0, rE2 or 0
    end
    startObj = {
      metal = mc,
      energy = ec,
      metalStorage = ms,
      energyStorage = es
    }
  end

  local sessionDoc = {
    protocol = PROTOCOL,
    kind = "session",
    sessionId = currentSessionId,
    mode = mode,
    gameVersion = (Game and Game.gameVersion) or "unknown",
    engineVersion = (Engine and Engine.version) or "unknown",
    map = {
      scriptName = (Game and Game.mapName) or "unknown",
      windMin = (Game and Game.windMin) or 0,
      windMax = (Game and Game.windMax) or 0,
      tidal = (Game and Game.tidal) or 0
    },
    teams = teamsList,
    start = startObj
  }

  atomicWrite("session-" .. currentSessionId .. ".json", sessionDoc)
end

local function writeSensorState()
  local t0 = spGetTimer and spGetTimer()
  snapshotSeq = snapshotSeq + 1

  if not currentSessionId then
    currentSessionId = string.format("%s-%04x", os.date("!%Y%m%d-%H%M%S"), math.random(0, 0xffff))
  end

  if not startRecorded then
    startRecorded = true
    writeSessionFile(true)
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
        local allyTeamId, _, playerName, tFaction = getTeamInfoDetails(tId)
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

  -- Debug state recording switch (T02.7)
  local flagFile = io.open(DIR .. "record_state.flag", "r")
  if flagFile then
    flagFile:close()
    if currentSessionId then
      local sf = io.open(DIR .. "state-" .. currentSessionId .. ".ndjson", "a")
      if sf then
        sf:write(Json.encode(stateDoc) .. "\n")
        sf:close()
      end
    end
  end

  local t1 = spGetTimer and spGetTimer()
  if t0 and t1 and spDiffTimers then
    lastSnapshotMs = spDiffTimers(t1, t0)
  end
end

-- Exporters (05 §5)
local TRACKED_RAW_FIELDS = {
  "name", "translatedHumanName", "translatedTooltip", "metalCost", "energyCost",
  "buildTime", "buildSpeed", "isBuilder", "isFactory", "isBuilding", "canFly", "canMove",
  "speed", "health", "maxWeaponRange", "sightDistance", "radarDistance", "energyMake",
  "metalMake", "energyUpkeep", "metalUpkeep", "extractsMetal", "windGenerator",
  "tidalGenerator", "energyStorage", "metalStorage", "buildOptions"
}

local ALLOWED_CUSTOM_PARAM_KEYS = {
  "techlevel", "unitgroup", "iscommander", "energyconv_capacity", "energyconv_efficiency", "faction"
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
  local foundCount = 0
  local totalTrackedFields = #TRACKED_RAW_FIELDS

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
          name = def.name, translatedHumanName = def.translatedHumanName, translatedTooltip = def.translatedTooltip,
          metalCost = def.metalCost, energyCost = def.energyCost, buildTime = def.buildTime, buildSpeed = def.buildSpeed,
          isBuilder = def.isBuilder, isFactory = def.isFactory, isBuilding = def.isBuilding, canFly = def.canFly, canMove = def.canMove,
          speed = def.speed, health = def.health, maxWeaponRange = def.maxWeaponRange,
          sightDistance = def.sightDistance or def.losRadius, radarDistance = def.radarDistance or def.radarRadius,
          energyMake = def.energyMake, metalMake = def.metalMake, energyUpkeep = def.energyUpkeep, metalUpkeep = def.metalUpkeep,
          extractsMetal = def.extractsMetal, windGenerator = def.windGenerator, tidalGenerator = def.tidalGenerator,
          energyStorage = def.energyStorage, metalStorage = def.metalStorage, buildOptions = convertedBuildOptions
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
        if foundCount < totalTrackedFields then
          for _, fieldName in ipairs(TRACKED_RAW_FIELDS) do
            if not foundAny[fieldName] then
              if fieldName == "sightDistance" then
                if def.sightDistance ~= nil or def.losRadius ~= nil then
                  foundAny["sightDistance"] = true
                  foundCount = foundCount + 1
                end
              elseif fieldName == "radarDistance" then
                if def.radarDistance ~= nil or def.radarRadius ~= nil then
                  foundAny["radarDistance"] = true
                  foundCount = foundCount + 1
                end
              elseif def[fieldName] ~= nil then
                foundAny[fieldName] = true
                foundCount = foundCount + 1
              end
            end
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
    return a.name < b.name
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

  local wf = getWindFunctions()
  if not wf or (type(wf) ~= "table" and type(wf) ~= "userdata") then
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

-- Coach & HUD (05 §8.1-§8.3)
local function readCoach()
  local f = io.open(DIR .. "coach.json", "r")
  if not f then
    return
  end
  local content = f:read("*a")
  f:close()
  if not content or content == "" then
    return
  end
  local doc = safeDecode(content)
  if type(doc) ~= "table" and type(doc) ~= "userdata" then
    return
  end
  if doc.protocol ~= PROTOCOL then
    return
  end
  if type(doc.seq) ~= "number" or doc.seq <= lastCoachSeq then
    return
  end

  lastCoachSeq = doc.seq
  currentCoachDoc = doc

  -- Process echo entries (05 §8.2)
  if (type(doc.echo) == "table" or type(doc.echo) == "userdata") and #doc.echo > 0 then
    for i = 1, #doc.echo do
      local item = doc.echo[i]
      if (type(item) == "table" or type(item) == "userdata") and type(item.id) == "string" and type(item.text) == "string" then
        if not seenEchoIds[item.id] then
          seenEchoIds[item.id] = true
          table.insert(seenEchoQueue, item.id)
          if #seenEchoQueue > MAX_SEEN_ECHOS then
            local oldest = table.remove(seenEchoQueue, 1)
            if oldest then
              seenEchoIds[oldest] = nil
            end
          end
          if spEcho then
            spEcho("[StratCom] " .. item.text)
          end
        end
      end
    end
  end
end

local function getCapturedTeamCount()
  local teamList = (spGetTeamList and spGetTeamList()) or {}
  local gaiaTeam = (spGetGaiaTeamID and spGetGaiaTeamID()) or -1
  local count = 0
  for _, tId in ipairs(teamList) do
    if tId ~= gaiaTeam then
      count = count + 1
    end
  end
  if count == 0 then
    count = 2
  end
  return count
end

local function drawHud()
  local t0 = spGetTimer and spGetTimer()

  if gameOver then
    return
  end
  if config.hudVisible == false then
    return
  end
  if not currentCoachDoc then
    return
  end
  if currentCoachDoc.mode == "off" then
    return
  end
  if not currentCoachDoc.hud or currentCoachDoc.hud.visible == false then
    return
  end

  local mode = detectMode()
  local isSpec = (mode == "spectator" or mode == "replay")

  local nowSec = (os.time and os.time()) or 0
  local genSec = (type(currentCoachDoc.generatedAtSec) == "number" and currentCoachDoc.generatedAtSec) or 0
  local isStale = (nowSec - genSec > 5)

  local vsx, vsy = 1920, 1080
  if Spring and Spring.GetViewGeometry then
    local gx, gy = Spring.GetViewGeometry()
    if gx and gy and gx > 0 and gy > 0 then
      vsx, vsy = gx, gy
    end
  end

  local uiScale = 1.0
  if Spring and Spring.GetConfigFloat then
    uiScale = Spring.GetConfigFloat("ui_scale", 1.0) or 1.0
  end

  local hudScale = config.hudScale or 1.0
  local scale = (vsy / 1080) * uiScale * hudScale
  if scale < 0.5 then
    scale = 0.5
  end

  local paddingX = 12 * scale
  local paddingY = 8 * scale
  local titleHeight = 24 * scale
  local panelWidth = 320 * scale

  local itemsToDraw = {}
  if isStale then
    table.insert(itemsToDraw, { text = "STRATCOM OFFLINE", tone = "dim", big = false })
  elseif isSpec then
    local nTeams = getCapturedTeamCount()
    table.insert(itemsToDraw, { text = "REC \226\151\143 capturing " .. nTeams .. " teams", tone = "danger", big = false })
  else
    local rawLines = (currentCoachDoc.hud and currentCoachDoc.hud.lines) or {}
    local maxLines = math.min(4, #rawLines)
    for i = 1, maxLines do
      local l = rawLines[i]
      if type(l) == "table" or type(l) == "userdata" then
        table.insert(itemsToDraw, {
          text = tostring(l.text or ""),
          tone = l.tone or "info",
          big = (l.big == true)
        })
      end
    end
  end

  local contentHeight = 0
  for _, item in ipairs(itemsToDraw) do
    contentHeight = contentHeight + (item.big and (24 * scale) or (20 * scale))
  end
  if contentHeight == 0 then
    contentHeight = 20 * scale
  end

  local panelHeight = titleHeight + contentHeight + paddingY * 2

  local defaultX = vsx * 0.65
  local defaultY = vsy - (60 * scale)
  local hudX = math.max(0, math.min(vsx - panelWidth, config.hudX or defaultX))
  local hudY = math.max(panelHeight, math.min(vsy, config.hudY or defaultY))

  if gl then
    -- Background: #0a0c14 at 85% opacity
    gl.Color(10 / 255, 12 / 255, 20 / 255, 0.85)
    gl.Rect(hudX, hudY - panelHeight, hudX + panelWidth, hudY)

    -- Faction accent border (2 px)
    local myTeam = (spGetMyTeamID and spGetMyTeamID()) or 0
    local myFaction = resolveFaction(myTeam)
    local borderR, borderG, borderB = 68 / 255, 155 / 255, 237 / 255 -- Armada default
    if myFaction == "cortex" then
      borderR, borderG, borderB = 255 / 255, 34 / 255, 68 / 255
    elseif myFaction == "legion" then
      borderR, borderG, borderB = 46 / 255, 196 / 255, 182 / 255
    end

    local bw = 2 * scale
    gl.Color(borderR, borderG, borderB, 1.0)
    gl.Rect(hudX, hudY - bw, hudX + panelWidth, hudY)
    gl.Rect(hudX, hudY - panelHeight, hudX + panelWidth, hudY - panelHeight + bw)
    gl.Rect(hudX, hudY - panelHeight, hudX + bw, hudY)
    gl.Rect(hudX + panelWidth - bw, hudY - panelHeight, hudX + panelWidth, hudY)

    -- Divider between title and content
    gl.Color(borderR, borderG, borderB, 0.4)
    gl.Rect(hudX, hudY - titleHeight, hudX + panelWidth, hudY - titleHeight + bw)

    -- Title
    local titleText = "STRATCOM"
    if not isStale and currentCoachDoc.hud and currentCoachDoc.hud.title then
      titleText = string.upper(tostring(currentCoachDoc.hud.title))
      if currentCoachDoc.hud.progress then
        local p = currentCoachDoc.hud.progress
        if type(p.done) == "number" and type(p.total) == "number" then
          titleText = titleText .. "  " .. tostring(p.done) .. "/" .. tostring(p.total)
        end
      end
    end

    local assistTag = ""
    if not isStale and currentCoachDoc.assist and currentCoachDoc.assist.enabled then
      local en = currentCoachDoc.assist.enabled
      if en.armNext or en.factoryQueue then
        assistTag = "ASSIST ON"
      end
    end

    local titleY = hudY - titleHeight + (6 * scale)
    gl.Color(228 / 255, 228 / 255, 231 / 255, 1.0)
    gl.Text(titleText, hudX + paddingX, titleY, 14 * scale, "o")

    if assistTag ~= "" then
      gl.Color(74 / 255, 222 / 255, 128 / 255, 1.0)
      gl.Text(assistTag, hudX + panelWidth - paddingX - (70 * scale), titleY, 11 * scale, "o")
    end

    -- Lines
    local curY = hudY - titleHeight - paddingY
    for _, item in ipairs(itemsToDraw) do
      local isBig = item.big
      local fontSize = isBig and (20 * scale) or (16 * scale)
      local stepY = isBig and (24 * scale) or (20 * scale)
      curY = curY - stepY

      local col = TONE_COLORS[item.tone] or TONE_COLORS.info
      gl.Color(col[1], col[2], col[3], col[4])
      gl.Text(item.text, hudX + paddingX, curY + (3 * scale), fontSize, "o")
    end
  end

  if t0 and spDiffTimers and spGetTimer then
    local dt = spDiffTimers(spGetTimer(), t0)
    if lastDrawMs == 0 then
      lastDrawMs = dt
    else
      lastDrawMs = lastDrawMs * 0.9 + dt * 0.1
    end
  end
end

-- Call-ins (05 §4)
function widget:Initialize()
  startRecorded = false
  eventBuffer = {}
  timeSinceCoachRead = 0
  if spCreateDir then
    spCreateDir("stratcom")
  end
  runProbe()
  exportUnitdefs()
  exportWindLookup()
  readCoach()
  if widgetHandler then
    pcall(function()
      if widgetHandler.AddAction then
        widgetHandler:AddAction("stratcom_hud_toggle", function()
          config.hudVisible = not config.hudVisible
          return true
        end)
      elseif widgetHandler.actionHandler and widgetHandler.actionHandler.AddAction then
        widgetHandler.actionHandler:AddAction(widget, "stratcom_hud_toggle", function()
          config.hudVisible = not config.hudVisible
          return true
        end)
      end
    end)
  end
  writeHeartbeat()
end

function widget:GameStart()
  gameStarted = true
  if not currentSessionId then
    currentSessionId = string.format("%s-%04x", os.date("!%Y%m%d-%H%M%S"), math.random(0, 0xffff))
  end
  writeSessionFile(false)
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  recordEvent({ f = frame, e = "gamestart" })
  writeSensorState()
  writeHeartbeat()
end

function widget:GameOver(winners)
  gameOver = true
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  local evt = { f = frame, e = "gameover" }
  if type(winners) == "table" or type(winners) == "userdata" then
    local wList = makeArray({})
    for i = 1, #winners do
      local w = winners[i]
      if type(w) == "number" then
        table.insert(wList, w)
      end
    end
    if #wList > 0 then
      evt.w = wList
    end
  end
  recordEvent(evt)
  flushEvents()
  writeHeartbeat()
end

function widget:GameFrame(n)
  if n % 30 == 0 then
    writeSensorState()
    flushEvents()
    writeHeartbeat()
  end
end

function widget:Update(dt)
  timeSinceCoachRead = timeSinceCoachRead + (dt or 0)
  if timeSinceCoachRead >= 0.5 then
    timeSinceCoachRead = 0
    readCoach()
  end

  if not gameStarted then
    timeSinceHeartbeat = timeSinceHeartbeat + (dt or 0)
    if timeSinceHeartbeat >= 1.0 then
      timeSinceHeartbeat = 0
      writeHeartbeat()
    end
  end
end

function widget:Shutdown()
  if widgetHandler then
    pcall(function()
      if widgetHandler.RemoveAction then
        widgetHandler:RemoveAction("stratcom_hud_toggle")
      elseif widgetHandler.actionHandler and widgetHandler.actionHandler.RemoveAction then
        widgetHandler.actionHandler:RemoveAction(widget, "stratcom_hud_toggle")
      end
    end)
  end
  flushEvents()
  writeHeartbeat()
end

function widget:UnitCreated(unitID, unitDefID, unitTeam, builderID)
  if not isTrackedTeam(unitTeam) then
    return
  end
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  local def = UnitDefs and UnitDefs[unitDefID]
  local dName = (def and def.name) or ""
  local evt = {
    f = frame,
    e = "created",
    u = unitID,
    d = dName,
    tm = unitTeam
  }
  if type(builderID) == "number" then
    evt.b = builderID
    local bDefId = spGetUnitDefID and spGetUnitDefID(builderID)
    local bDef = bDefId and UnitDefs and UnitDefs[bDefId]
    evt.bd = (bDef and bDef.name) or jsonNull
  end
  recordEvent(evt)
end

function widget:UnitFinished(unitID, unitDefID, unitTeam)
  if not isTrackedTeam(unitTeam) then
    return
  end
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  local def = UnitDefs and UnitDefs[unitDefID]
  local dName = (def and def.name) or ""
  recordEvent({
    f = frame,
    e = "finished",
    u = unitID,
    d = dName,
    tm = unitTeam
  })
end

function widget:UnitDestroyed(unitID, unitDefID, unitTeam, attackerID, attackerDefID, attackerTeam)
  if not isTrackedTeam(unitTeam) then
    return
  end
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  local def = UnitDefs and UnitDefs[unitDefID]
  local dName = (def and def.name) or ""
  recordEvent({
    f = frame,
    e = "destroyed",
    u = unitID,
    d = dName,
    tm = unitTeam
  })
end

function widget:UnitGiven(unitID, unitDefID, newTeam, oldTeam)
  if not isTrackedTeam(newTeam) then
    return
  end
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  local def = UnitDefs and UnitDefs[unitDefID]
  local dName = (def and def.name) or ""
  recordEvent({
    f = frame,
    e = "given",
    u = unitID,
    d = dName,
    tm = newTeam
  })
end

function widget:UnitTaken(unitID, unitDefID, oldTeam, newTeam)
  if not isTrackedTeam(oldTeam) then
    return
  end
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  local def = UnitDefs and UnitDefs[unitDefID]
  local dName = (def and def.name) or ""
  recordEvent({
    f = frame,
    e = "taken",
    u = unitID,
    d = dName,
    tm = oldTeam
  })
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

function widget:DrawScreen()
  drawHud()
end

function widget:MousePress(mx, my, button)
  if button ~= 1 then
    return false
  end
  if gameOver or config.hudVisible == false or not currentCoachDoc or currentCoachDoc.mode == "off" then
    return false
  end
  if not currentCoachDoc.hud or currentCoachDoc.hud.visible == false then
    return false
  end

  local vsx, vsy = 1920, 1080
  if Spring and Spring.GetViewGeometry then
    local gx, gy = Spring.GetViewGeometry()
    if gx and gy and gx > 0 and gy > 0 then
      vsx, vsy = gx, gy
    end
  end
  local uiScale = (Spring and Spring.GetConfigFloat and Spring.GetConfigFloat("ui_scale", 1.0)) or 1.0
  local hudScale = config.hudScale or 1.0
  local scale = (vsy / 1080) * uiScale * hudScale
  if scale < 0.5 then
    scale = 0.5
  end

  local panelWidth = 320 * scale
  local titleHeight = 24 * scale
  local defaultX = vsx * 0.65
  local defaultY = vsy - (60 * scale)
  local hudX = math.max(0, math.min(vsx - panelWidth, config.hudX or defaultX))
  local hudY = math.max(titleHeight, math.min(vsy, config.hudY or defaultY))

  if mx >= hudX and mx <= (hudX + panelWidth) and my <= hudY and my >= (hudY - titleHeight) then
    isDragging = true
    dragOffsetX = mx - hudX
    dragOffsetY = my - hudY
    return true
  end
  return false
end

function widget:MouseMove(mx, my, dx, dy, button)
  if not isDragging then
    return false
  end
  local vsx, vsy = 1920, 1080
  if Spring and Spring.GetViewGeometry then
    local gx, gy = Spring.GetViewGeometry()
    if gx and gy and gx > 0 and gy > 0 then
      vsx, vsy = gx, gy
    end
  end
  local uiScale = (Spring and Spring.GetConfigFloat and Spring.GetConfigFloat("ui_scale", 1.0)) or 1.0
  local hudScale = config.hudScale or 1.0
  local scale = (vsy / 1080) * uiScale * hudScale
  if scale < 0.5 then
    scale = 0.5
  end

  local panelWidth = 320 * scale
  local titleHeight = 24 * scale

  local newX = mx - dragOffsetX
  local newY = my - dragOffsetY
  config.hudX = math.max(0, math.min(vsx - panelWidth, newX))
  config.hudY = math.max(titleHeight, math.min(vsy, newY))
  return true
end

function widget:MouseRelease(mx, my, button)
  if isDragging and button == 1 then
    isDragging = false
    return true
  end
  return false
end

function widget:ViewResize(vsx, vsy)
  if config.hudX and vsx and vsx > 0 then
    local panelWidth = 320
    if config.hudX > vsx - panelWidth then
      config.hudX = math.max(0, vsx - panelWidth)
    end
  end
  if config.hudY and vsy and vsy > 0 then
    if config.hudY > vsy then
      config.hudY = vsy
    end
  end
end
