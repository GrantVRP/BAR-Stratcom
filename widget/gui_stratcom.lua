-- License: GPL-2.0-or-later
-- STRATCOM_WIDGET_VERSION 3.0.3
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
local spGetFactoryCommandCount = Spring.GetFactoryCommandCount
local spGetAllUnits = Spring.GetAllUnits
local spGetUnitLosState = Spring.GetUnitLosState
local spGetTeamStartPosition = Spring.GetTeamStartPosition
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
local spGetAIInfo = Spring.GetAIInfo
local spGetGaiaTeamID = Spring.GetGaiaTeamID
local spGetSelectedUnits = Spring.GetSelectedUnits

-- Constants & State
local PROTOCOL = 1
local WIDGET_VERSION = "3.0.7"
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
local lastFrameMs = 0
local frameTimeSum = 0
local frameCount = 0
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

-- HUD boxes (05 §8.1, T09.4): one look for every box. Size and brightness carry the levels: headers and
-- tags quiet, the big row brightest, queue rows dimmer; colour is kept for meaning (late, pace, alerts).
local HUD_WIDTH = 360 -- px at 1080p, before scaling
-- Radar scope (T09.5/T09.6): side edges `range` elmos from the centre, same scale both ways; a 2:1 strip
-- under the plan boxes, a square when the radar is the only box (radar mode, or the others switched off)
local RADAR_SCOPE_H = 168 -- px at 1080p (the strip)
local RADAR_MAX_OWN = 300
local RADAR_MAX_ENEMY = 200
local radar = { seq = 0, range = 2400, centred = false, commander = false, own = {}, enemy = {}, contacts = 0 }
local radarList = { id = nil, seq = -1, x = 0, y = 0, h = 0, scale = 0 }
local HUD_TEXT = {
  label = { 148 / 255, 163 / 255, 184 / 255, 1.0 },     -- #94a3b8 headers
  tag = { 100 / 255, 116 / 255, 139 / 255, 1.0 },       -- #64748b who builds it
  primary = { 244 / 255, 244 / 255, 245 / 255, 1.0 },   -- #f4f4f5 the big row
  secondary = { 161 / 255, 161 / 255, 170 / 255, 1.0 }, -- #a1a1aa queue rows
  muted = { 113 / 255, 113 / 255, 122 / 255, 1.0 }      -- #71717a queue timings
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
    local startUnitVal = spGetTeamRulesParam(teamId, "startUnit")
    if startUnitVal ~= nil then
      if type(startUnitVal) == "number" and (type(UnitDefs) == "table" or type(UnitDefs) == "userdata") then
        local def = UnitDefs[startUnitVal]
        if def and def.name then
          startUnitName = def.name
        end
      elseif type(startUnitVal) == "string" and startUnitVal ~= "" then
        local numId = tonumber(startUnitVal)
        if numId and (type(UnitDefs) == "table" or type(UnitDefs) == "userdata") and UnitDefs[numId] and UnitDefs[numId].name then
          startUnitName = UnitDefs[numId].name
        else
          startUnitName = startUnitVal
        end
      end
    end
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
  if startUnitName and type(startUnitName) == "string" then
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

  if type(startUnitName) ~= "string" then
    startUnitName = nil
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
      local rawAvg = minTbl[wMax] or minTbl[tostring(wMax)]
      if rawAvg ~= nil then
        avg = tonumber(rawAvg)
      end
    end
  end

  if type(wf.getWindRisk) == "function" or type(wf.getWindRisk) == "userdata" then
    -- BAR returns the risk as a string ("100"), like the average wind lookup (engine-facts.md)
    local okRisk, r = pcall(wf.getWindRisk)
    if okRisk and r ~= nil then
      risk = tonumber(r)
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
      ["Spring.GetAllUnits"] = type(Spring and Spring.GetAllUnits),
      ["Spring.GetUnitLosState"] = type(Spring and Spring.GetUnitLosState),
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
  if lastSnapshotMs > 0 or lastDrawMs > 0 or lastFrameMs > 0 then
    perfData = {
      frameMs = lastFrameMs,
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
  if isAiTeam then
    local aiName = nil
    if spGetAIInfo then
      local ok, _, name = pcall(spGetAIInfo, tId)
      if ok and name and name ~= "" then
        aiName = name .. " (AI)"
      end
    end
    if not aiName then
      aiName = "AI " .. tostring(tId)
    end
    playerName = aiName
  else
    if leaderId and spGetPlayerInfo then
      local pName = spGetPlayerInfo(leaderId)
      if pName and pName ~= "" then playerName = pName end
    end
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
    widgetVersion = WIDGET_VERSION,
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
            local factoryCmdCount = 0
            if spGetFactoryCommandCount then
              factoryCmdCount = spGetFactoryCommandCount(u) or 0
            elseif spGetFactoryCommands then
              local res = spGetFactoryCommands(u)
              if type(res) == "number" then
                factoryCmdCount = res
              elseif type(res) == "table" then
                factoryCmdCount = #res
              end
            end
            local hasQueue = (cmdCount > 0) or (factoryCmdCount > 0)
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

    -- Gaia (neutral) units such as critters are not enemies (H1b: a Seagull raised "enemy air")
    local enemies = {}
    local gaiaTeam = (spGetGaiaTeamID and spGetGaiaTeamID()) or -1
    -- every identified enemy in LOS (03 §7.3); GetVisibleUnits would only see the camera view (engine-facts.md)
    local knownUnits = (spGetAllUnits and spGetAllUnits()) or {}
    for _, u in ipairs(knownUnits) do
      local uAlly = spGetUnitAllyTeam and spGetUnitAllyTeam(u)
      local uTeam = spGetUnitTeam and spGetUnitTeam(u)
      local los = uAlly and uAlly ~= myAlly and uTeam ~= gaiaTeam and spGetUnitLosState and spGetUnitLosState(u, myAlly)
      if type(los) == "table" and los.los then
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
    -- DiffTimers answers in seconds unless asked for milliseconds (engine-facts.md)
    lastSnapshotMs = spDiffTimers(t1, t0, true)
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
  local unitsCount = 0
  local foundAny = {}
  local remainingTracked = {}
  local remCount = #TRACKED_RAW_FIELDS
  for idx, fieldName in ipairs(TRACKED_RAW_FIELDS) do
    remainingTracked[idx] = fieldName
  end

  for _, def in pairs(UnitDefs) do
    if type(def) == "table" or type(def) == "userdata" then
      if def.name then
        -- Convert buildOptions from defIDs to names
        local convertedBuildOptions = makeArray({})
        local optCount = 0
        if type(def.buildOptions) == "table" or type(def.buildOptions) == "userdata" then
          for _, opt in ipairs(def.buildOptions) do
            optCount = optCount + 1
            if type(opt) == "number" then
              local bDef = UnitDefs and UnitDefs[opt]
              if bDef and bDef.name then
                convertedBuildOptions[optCount] = bDef.name
              else
                convertedBuildOptions[optCount] = tostring(opt)
              end
            elseif type(opt) == "string" then
              convertedBuildOptions[optCount] = opt
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

        unitsCount = unitsCount + 1
        unitsList[unitsCount] = u

        -- Track field presence for missingFields efficiently
        if remCount > 0 then
          local i = 1
          while i <= remCount do
            local fieldName = remainingTracked[i]
            if u[fieldName] ~= nil then
              foundAny[fieldName] = true
              remainingTracked[i] = remainingTracked[remCount]
              remainingTracked[remCount] = nil
              remCount = remCount - 1
            else
              i = i + 1
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
        local nVal = tonumber(val)
        if nVal ~= nil then
          exportTable[sMin][sMax] = nVal
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

-- Opt-in assist (05 §8.3, D-06). The functions below are the only place that may issue orders
-- (lint:lua allows GiveOrder* only inside functions named assist*).
local ASSIST_MAX_ORDERS = 20
local ASSIST_MESSAGE_SEC = 2
local assistMessage = nil -- { text, tone, ttl } shown on the HUD for 2 s

local function showAssistMessage(text, tone)
  assistMessage = { text = text, tone = tone or "info", ttl = ASSIST_MESSAGE_SEC }
end

local function isTable(v)
  return type(v) == "table" or type(v) == "userdata"
end

local function defHumanName(def)
  return def.translatedHumanName or def.humanName or def.name
end

-- coach.json `assist` block when the given switch is on in both places (enabled + payload)
local function assistPayload(key)
  local a = currentCoachDoc and currentCoachDoc.assist
  if not isTable(a) or not isTable(a.enabled) or a.enabled[key] ~= true then
    return nil
  end
  local payload = a[key]
  if not isTable(payload) then
    return nil
  end
  return payload
end

local function canBuild(builderDefId, defId)
  local builderDef = UnitDefs and UnitDefs[builderDefId]
  if not builderDef or not isTable(builderDef.buildOptions) then
    return false
  end
  for _, opt in ipairs(builderDef.buildOptions) do
    if opt == defId then
      return true
    end
  end
  return false
end

-- Arms the build command of the next step; the player clicks to place it. Issues no order.
local function assistArmNext()
  local target = assistPayload("armNext")
  if not target then
    return false
  end
  local def = type(target.unitId) == "string" and UnitDefNames and UnitDefNames[target.unitId]
  if not def or not def.id then
    showAssistMessage("UNKNOWN UNIT IN PLAN", "warn")
    return false
  end
  local hasBuilder = false
  for _, uId in ipairs((spGetSelectedUnits and spGetSelectedUnits()) or {}) do
    if canBuild(spGetUnitDefID and spGetUnitDefID(uId), def.id) then
      hasBuilder = true
      break
    end
  end
  if not hasBuilder then
    showAssistMessage("SELECT A BUILDER FIRST", "warn")
    return false
  end
  local cmdIndex = nil
  for index, desc in pairs((spGetActiveCmdDescs and spGetActiveCmdDescs()) or {}) do
    if isTable(desc) and desc.id == -def.id then
      cmdIndex = index
      break
    end
  end
  if not cmdIndex or not spSetActiveCommand then
    showAssistMessage("SELECT A BUILDER FIRST", "warn")
    return false
  end
  spSetActiveCommand(cmdIndex)
  showAssistMessage("ARMED: " .. defHumanName(def), "good")
  return true
end

-- Queues the planned units in the selected factory. Needs a lobby that allows unit-control widgets.
local function assistLoadQueue()
  local queue = assistPayload("factoryQueue")
  if not queue or type(queue.factoryUnitId) ~= "string" or not isTable(queue.items) then
    return false
  end
  if widget.canControlUnits ~= true then
    showAssistMessage("ASSIST BLOCKED BY LOBBY", "warn")
    return false
  end
  local factoryDef = UnitDefNames and UnitDefNames[queue.factoryUnitId]
  local factoryId = nil
  for _, uId in ipairs((spGetSelectedUnits and spGetSelectedUnits()) or {}) do
    if factoryDef and spGetUnitDefID and spGetUnitDefID(uId) == factoryDef.id then
      factoryId = uId
      break
    end
  end
  if not factoryId then
    showAssistMessage("SELECT THE FACTORY FIRST", "warn")
    return false
  end
  local issued = 0
  for _, item in ipairs(queue.items) do
    local def = isTable(item) and type(item.unitId) == "string" and UnitDefNames[item.unitId]
    local count = isTable(item) and math.floor(tonumber(item.count) or 0) or 0
    if def and def.id and canBuild(factoryDef.id, def.id) then
      for _ = 1, count do
        if issued >= ASSIST_MAX_ORDERS then
          break
        end
        -- pcall: a sandboxed GiveOrder raises, and an error here would unload the widget
        if not pcall(Spring.GiveOrderToUnit, factoryId, -def.id, {}, {}) then
          showAssistMessage("ASSIST BLOCKED BY LOBBY", "warn")
          return false
        end
        issued = issued + 1
      end
    end
  end
  showAssistMessage("QUEUED " .. issued .. " UNITS", "good")
  return issued > 0
end

-- HUD lines from coach.json (at most 4) as draw items
local function hudItems(rawLines)
  local items = {}
  if not isTable(rawLines) then
    return items
  end
  for i = 1, math.min(4, #rawLines) do
    local l = rawLines[i]
    if isTable(l) then
      table.insert(items, {
        text = tostring(l.text or ""),
        tone = l.tone or "info",
        big = (l.big == true),
        right = (type(l.right) == "string") and l.right or nil,
        tag = (type(l.tag) == "string") and l.tag or nil,
        unitId = (type(l.unitId) == "string") and l.unitId or nil
      })
    end
  end
  return items
end

local function itemsHeight(items, scale)
  local h = 0
  for _, item in ipairs(items) do
    h = h + (item.big and (24 * scale) or (20 * scale))
  end
  if h == 0 then
    h = 20 * scale
  end
  return h
end

-- One HUD panel: background, faction border, title bar (title + optional tag), lines
local function drawPanel(x, top, width, height, title, tag, items, scale, border)
  local paddingX = 12 * scale
  local paddingY = 8 * scale
  local titleHeight = 24 * scale

  -- Background: #0a0c14 at 85% opacity
  gl.Color(10 / 255, 12 / 255, 20 / 255, 0.85)
  gl.Rect(x, top - height, x + width, top)

  -- Faction accent border (2 px)
  local bw = 2 * scale
  gl.Color(border[1], border[2], border[3], 1.0)
  gl.Rect(x, top - bw, x + width, top)
  gl.Rect(x, top - height, x + width, top - height + bw)
  gl.Rect(x, top - height, x + bw, top)
  gl.Rect(x + width - bw, top - height, x + width, top)

  -- Divider between title and content
  gl.Color(border[1], border[2], border[3], 0.4)
  gl.Rect(x, top - titleHeight, x + width, top - titleHeight + bw)

  local titleY = top - titleHeight + (6 * scale)
  gl.Color(228 / 255, 228 / 255, 231 / 255, 1.0)
  gl.Text(title, x + paddingX, titleY, 14 * scale, "o")
  if tag ~= "" then
    gl.Color(74 / 255, 222 / 255, 128 / 255, 1.0)
    gl.Text(tag, x + width - paddingX - (70 * scale), titleY, 11 * scale, "o")
  end

  local curY = top - titleHeight - paddingY
  for _, item in ipairs(items) do
    local fontSize = item.big and (20 * scale) or (16 * scale)
    curY = curY - (item.big and (24 * scale) or (20 * scale))
    local col = TONE_COLORS[item.tone] or TONE_COLORS.info
    gl.Color(col[1], col[2], col[3], col[4])
    gl.Text(item.text, x + paddingX, curY + (3 * scale), fontSize, "o")
  end
end

-- Radar blips (05 §8.1, T09.5), refreshed every 15 frames: own units and every enemy the player has in
-- LOS or radar (GetAllUnits), positions from the engine (radar error included), as elmos from the
-- commander (else the start position); the scope scales them when it draws.
local function updateRadar(range)
  local myTeam = (spGetMyTeamID and spGetMyTeamID()) or 0
  local myAlly = (spGetMyAllyTeamID and spGetMyAllyTeamID()) or 0
  local gaiaTeam = (spGetGaiaTeamID and spGetGaiaTeamID()) or -1
  local cx, cz, commander = nil, nil, false
  local ownPos = {}
  for _, u in ipairs((spGetTeamUnits and spGetTeamUnits(myTeam)) or {}) do
    local x, _, z = spGetUnitPosition(u)
    if x then
      local defId = spGetUnitDefID and spGetUnitDefID(u)
      local def = defId and UnitDefs and UnitDefs[defId]
      if not commander and def and def.customParams and def.customParams.iscommander == "1" then
        cx, cz, commander = x, z, true
      end
      if #ownPos < RADAR_MAX_OWN then
        ownPos[#ownPos + 1] = { x, z }
      end
    end
  end
  if not cx and spGetTeamStartPosition then
    local sx, _, sz, valid = spGetTeamStartPosition(myTeam)
    if sx and valid ~= false then
      cx, cz = sx, sz
    end
  end

  radar.seq = radar.seq + 1
  radar.range = range
  radar.centred = (cx ~= nil)
  radar.commander = commander
  radar.own, radar.enemy, radar.contacts = {}, {}, 0
  if not cx then
    return
  end
  for _, p in ipairs(ownPos) do
    radar.own[#radar.own + 1] = { p[1] - cx, p[2] - cz }
  end
  for _, u in ipairs((spGetAllUnits and spGetAllUnits()) or {}) do
    local uAlly = spGetUnitAllyTeam and spGetUnitAllyTeam(u)
    local uTeam = spGetUnitTeam and spGetUnitTeam(u)
    if uAlly and uAlly ~= myAlly and uTeam ~= gaiaTeam then
      local x, _, z = spGetUnitPosition(u)
      if x then
        radar.contacts = radar.contacts + 1
        if #radar.enemy < RADAR_MAX_ENEMY then
          radar.enemy[#radar.enemy + 1] = { x - cx, z - cz, (spGetUnitDefID and spGetUnitDefID(u)) ~= nil }
        end
      end
    end
  end
end

-- The dots, recorded into a display list: a faint cross through the centre, own units green, enemies
-- red (dimmer when pinned to the edge or not identified), the commander a light square in the middle
local function drawRadarDots(sx, sy, halfW, halfH, scale)
  local ppe = halfW / radar.range -- pixels per elmo, the same both ways (north up)
  gl.Color(1, 1, 1, 0.06)
  gl.Rect(sx - halfW, sy - 0.5 * scale, sx + halfW, sy + 0.5 * scale)
  gl.Rect(sx - 0.5 * scale, sy - halfH, sx + 0.5 * scale, sy + halfH)
  local g = TONE_COLORS.good
  gl.Color(g[1], g[2], g[3], 0.75)
  local own = 1.5 * scale
  for _, p in ipairs(radar.own) do
    local dx, dy = p[1] * ppe, p[2] * ppe
    if math.abs(dx) <= halfW and math.abs(dy) <= halfH then
      gl.Rect(sx + dx - own, sy - dy - own, sx + dx + own, sy - dy + own)
    end
  end
  local d = TONE_COLORS.danger
  local foe = 2 * scale
  for _, p in ipairs(radar.enemy) do
    local dx, dy = p[1] * ppe, p[2] * ppe
    local k = math.max(math.abs(dx) / halfW, math.abs(dy) / halfH)
    if k > 1 then
      dx, dy = dx / k, dy / k -- pinned to the edge, pointing where it is
    end
    gl.Color(d[1], d[2], d[3], (k > 1 or not p[3]) and 0.5 or 1.0)
    gl.Rect(sx + dx - foe, sy - dy - foe, sx + dx + foe, sy - dy + foe)
  end
  if radar.commander then
    local c = HUD_TEXT.primary
    gl.Color(c[1], c[2], c[3], 1.0)
    gl.Rect(sx - 2.5 * scale, sy - 2.5 * scale, sx + 2.5 * scale, sy + 2.5 * scale)
  end
end

local function radarBoxHeight(items, scale, scopeH)
  return (24 + 6 + 6 + 8) * scale + scopeH + #items * 20 * scale
end

local function setColor(c)
  gl.Color(c[1], c[2], c[3], c[4])
end

-- Width of text at a font size (gl.GetTextWidth answers for size 1)
local function textWidth(text, size)
  local w = gl.GetTextWidth and gl.GetTextWidth(text)
  if type(w) == "number" then
    return w * size
  end
  return #text * size * 0.6
end

-- A tone's colour, or the fallback for plain info
local function toneOr(tone, fallback)
  if tone ~= "info" and TONE_COLORS[tone] then
    return TONE_COLORS[tone]
  end
  return fallback
end

local function factionAccent()
  local myFaction = resolveFaction((spGetMyTeamID and spGetMyTeamID()) or 0)
  if myFaction == "cortex" then
    return { 255 / 255, 34 / 255, 68 / 255 }
  elseif myFaction == "legion" then
    return { 46 / 255, 196 / 255, 182 / 255 }
  end
  return { 68 / 255, 155 / 255, 237 / 255 } -- Armada default
end

-- coach.json box -> { title, meta, items } or nil
local function boxFrom(raw)
  if not isTable(raw) or type(raw.title) ~= "string" then
    return nil
  end
  local items = hudItems(raw.lines)
  if #items == 0 then
    return nil
  end
  local meta = {}
  if isTable(raw.meta) then
    for i = 1, math.min(3, #raw.meta) do
      local m = raw.meta[i]
      if isTable(m) and type(m.text) == "string" then
        table.insert(meta, { text = m.text, tone = m.tone or "info" })
      end
    end
  end
  return { title = string.upper(raw.title), meta = meta, items = items }
end

local function boxHeight(items, scale)
  local h = 38 * scale -- header 24 + 6 above the rows + 8 below
  for _, item in ipairs(items) do
    h = h + (item.big and (40 * scale) or (20 * scale))
  end
  return h
end

-- One box: quiet header (title left, meta right-aligned), then rows in three columns: who (tag or the
-- big row's build picture), what, when (right-aligned). A tag is drawn only when it changes.
local function drawBoxFrame(x, top, width, height, title, meta, scale, accent)
  local padX = 12 * scale
  local headerH = 24 * scale

  gl.Color(10 / 255, 12 / 255, 20 / 255, 0.85)
  gl.Rect(x, top - height, x + width, top)
  gl.Color(accent[1], accent[2], accent[3], 1.0) -- faction accent on the top edge only
  gl.Rect(x, top - 3 * scale, x + width, top)

  local headerY = top - headerH + 7 * scale
  setColor(HUD_TEXT.label)
  gl.Text(title, x + padX, headerY, 12 * scale, "o")
  local rx = x + width - padX
  for i = #meta, 1, -1 do
    local m = meta[i]
    setColor(toneOr(m.tone, HUD_TEXT.label))
    gl.Text(m.text, rx, headerY, 12 * scale, "or")
    rx = rx - textWidth(m.text, 12 * scale) - 12 * scale
  end
  gl.Color(1, 1, 1, 0.08)
  gl.Rect(x + padX, top - headerH, x + width - padX, top - headerH + scale)
end

-- Rows from y down: who (tag or the big row's build picture), what, when (right-aligned)
local function drawRows(items, x, y, width, scale)
  local padX = 12 * scale
  local nameX = x + padX + 40 * scale
  local rightX = x + width - padX
  local prevTag = nil
  for _, item in ipairs(items) do
    -- the tone colours the timing; a row without one (PLAN COMPLETE) takes it on its text
    local textTone = (item.right == nil) and item.tone or "info"
    if item.big then
      local def = item.unitId and UnitDefNames and UnitDefNames[item.unitId]
      if def and gl.Texture and gl.TexRect then
        gl.Color(1, 1, 1, 1)
        if gl.Texture("#" .. def.id) then
          gl.TexRect(x + padX, y - 36 * scale, x + padX + 32 * scale, y - 4 * scale)
          gl.Texture(false)
        end
      end
      if item.tag then
        setColor(HUD_TEXT.tag)
        gl.Text(item.tag, nameX, y - 13 * scale, 11 * scale, "o")
      end
      setColor(toneOr(textTone, HUD_TEXT.primary))
      gl.Text(item.text, nameX, y - 33 * scale, 19 * scale, "o")
      if item.right then
        setColor(toneOr(item.tone, HUD_TEXT.secondary))
        gl.Text(item.right, rightX, y - 33 * scale, 15 * scale, "or")
      end
      y = y - 40 * scale
    else
      if item.tag and item.tag ~= prevTag then
        setColor(HUD_TEXT.tag)
        gl.Text(item.tag, x + padX, y - 15 * scale, 11 * scale, "o")
      end
      setColor(toneOr(textTone, HUD_TEXT.secondary))
      gl.Text(item.text, nameX, y - 15 * scale, 15 * scale, "o")
      if item.right then
        setColor(toneOr(item.tone, HUD_TEXT.muted))
        gl.Text(item.right, rightX, y - 15 * scale, 13 * scale, "or")
      end
      y = y - 20 * scale
    end
    prevTag = item.tag or prevTag
  end
end

local function drawBox(x, top, width, height, box, scale, accent)
  drawBoxFrame(x, top, width, height, box.title, box.meta, scale, accent)
  drawRows(box.items, x, top - 30 * scale, width, scale)
end

-- RADAR: the scope (from a display list, rebuilt when the blips refresh or the HUD moves), then the
-- app's enemy contact rows
local function drawRadarBox(x, top, width, height, items, scale, accent, scopeH)
  local meta = { { text = tostring(radar.range) .. " RANGE", tone = "info" } }
  if radar.contacts > 0 then
    meta[2] = { text = radar.contacts .. ((radar.contacts == 1) and " CONTACT" or " CONTACTS"), tone = "danger" }
  else
    meta[2] = { text = "NO CONTACT", tone = "info" }
  end
  drawBoxFrame(x, top, width, height, "RADAR", meta, scale, accent)

  local padX = 12 * scale
  local scopeTop = top - 30 * scale
  gl.Color(0, 0, 0, 0.25)
  gl.Rect(x + padX, scopeTop - scopeH, x + width - padX, scopeTop)
  local sx, sy = x + width / 2, scopeTop - scopeH / 2
  local halfW, halfH = width / 2 - padX, scopeH / 2
  if radar.centred then
    if gl.CreateList and gl.CallList then
      local stale = radarList.seq ~= radar.seq or radarList.x ~= sx or radarList.y ~= sy or radarList.h ~= halfH
        or radarList.scale ~= scale
      if radarList.id == nil or stale then
        if radarList.id and gl.DeleteList then
          gl.DeleteList(radarList.id)
        end
        radarList.id = gl.CreateList(drawRadarDots, sx, sy, halfW, halfH, scale)
        radarList.seq, radarList.x, radarList.y, radarList.h, radarList.scale = radar.seq, sx, sy, halfH, scale
      end
      if radarList.id and radarList.id ~= 0 then
        gl.CallList(radarList.id)
      end
    else
      drawRadarDots(sx, sy, halfW, halfH, scale)
    end
  end
  drawRows(items, x, scopeTop - scopeH - 6 * scale, width, scale)
end

local function alertsHeight(alerts, scale)
  if #alerts == 0 then
    return 0
  end
  return 12 * scale + #alerts * 22 * scale
end

-- Alerts under the boxes: a severity bar and the text in the alert's colour
local function drawAlerts(x, top, width, alerts, scale)
  gl.Color(10 / 255, 12 / 255, 20 / 255, 0.85)
  gl.Rect(x, top - alertsHeight(alerts, scale), x + width, top)
  local y = top - 6 * scale
  for _, a in ipairs(alerts) do
    setColor(TONE_COLORS[a.tone] or TONE_COLORS.info)
    gl.Rect(x + 12 * scale, y - 19 * scale, x + 16 * scale, y - 3 * scale)
    gl.Text(a.text, x + 24 * scale, y - 16 * scale, 15 * scale, "o")
    y = y - 22 * scale
  end
end

-- The HUD from widget 3.0.5: BUILDINGS, FACTORY and alerts, stacked under the dragged position
local function drawBoxes(hud, vsx, vsy, scale)
  local boxes = {}
  for _, raw in ipairs({ hud.build, hud.factory }) do
    local box = boxFrom(raw)
    if box then
      table.insert(boxes, box)
    end
  end
  local alerts = {}
  if isTable(hud.alerts) then
    for i = 1, math.min(2, #hud.alerts) do
      local a = hud.alerts[i]
      if isTable(a) and type(a.text) == "string" then
        table.insert(alerts, { text = a.text, tone = a.tone or "info" })
      end
    end
  end
  if assistMessage then
    table.insert(alerts, { text = assistMessage.text, tone = assistMessage.tone })
  end
  local en = currentCoachDoc.assist and currentCoachDoc.assist.enabled
  if boxes[1] and isTable(en) and (en.armNext or en.factoryQueue) then
    table.insert(boxes[1].meta, 1, { text = "ASSIST", tone = "good" })
  end

  local width = HUD_WIDTH * scale
  local gap = 8 * scale
  local total = 0
  for i, box in ipairs(boxes) do
    box.height = boxHeight(box.items, scale)
    total = total + box.height + ((i > 1) and gap or 0)
  end
  local radarItems, scopeH = nil, RADAR_SCOPE_H * scale
  if isTable(hud.radar) and detectMode() == "player" then
    radarItems = hudItems(hud.radar.lines)
    while #radarItems > 3 do
      table.remove(radarItems)
    end
    if #boxes == 0 then
      scopeH = width - 24 * scale -- alone: a square
    end
    total = total + ((#boxes > 0) and gap or 0) + radarBoxHeight(radarItems, scale, scopeH)
  end
  local aH = alertsHeight(alerts, scale)
  if aH > 0 then
    total = total + gap + aH
  end

  local x = math.max(0, math.min(vsx - width, config.hudX or (vsx * 0.65)))
  local top = math.max(total, math.min(vsy, config.hudY or (vsy - 60 * scale)))
  local accent = factionAccent()
  for _, box in ipairs(boxes) do
    drawBox(x, top, width, box.height, box, scale, accent)
    top = top - box.height - gap
  end
  if radarItems then
    local h = radarBoxHeight(radarItems, scale, scopeH)
    drawRadarBox(x, top, width, h, radarItems, scale, accent, scopeH)
    top = top - h - gap
  end
  if aH > 0 then
    drawAlerts(x, top, width, alerts, scale)
  end
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

  local hud = currentCoachDoc.hud
  if not isStale and not isSpec and isTable(hud) and (isTable(hud.build) or isTable(hud.factory) or isTable(hud.radar) or isTable(hud.alerts)) then
    if gl then
      drawBoxes(hud, vsx, vsy, scale)
    end
    if t0 and spDiffTimers and spGetTimer then
      local dt = spDiffTimers(spGetTimer(), t0, true)
      lastDrawMs = (lastDrawMs == 0) and dt or (lastDrawMs * 0.9 + dt * 0.1)
    end
    return
  end

  -- Single panel: offline / spectator line, or a coach.json from an app before 3.0.5
  local paddingY = 8 * scale
  local titleHeight = 24 * scale
  local panelWidth = HUD_WIDTH * scale

  local itemsToDraw = {}
  if isStale then
    table.insert(itemsToDraw, { text = "STRATCOM OFFLINE", tone = "dim", big = false })
  elseif isSpec then
    local nTeams = getCapturedTeamCount()
    table.insert(itemsToDraw, { text = "REC \226\151\143 capturing " .. nTeams .. " teams", tone = "danger", big = false })
  else
    itemsToDraw = hudItems(currentCoachDoc.hud and currentCoachDoc.hud.lines)
    if assistMessage then
      table.insert(itemsToDraw, { text = assistMessage.text, tone = assistMessage.tone, big = false })
    end
  end

  local panelHeight = titleHeight + itemsHeight(itemsToDraw, scale) + paddingY * 2

  local defaultX = vsx * 0.65
  local defaultY = vsy - (60 * scale)
  local hudX = math.max(0, math.min(vsx - panelWidth, config.hudX or defaultX))
  local hudY = math.max(panelHeight, math.min(vsy, config.hudY or defaultY))

  if gl then
    local border = factionAccent()

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

    drawPanel(hudX, hudY, panelWidth, panelHeight, titleText, assistTag, itemsToDraw, scale, border)
  end

  if t0 and spDiffTimers and spGetTimer then
    local dt = spDiffTimers(spGetTimer(), t0, true)
    if lastDrawMs == 0 then
      lastDrawMs = dt
    else
      lastDrawMs = lastDrawMs * 0.9 + dt * 0.1
    end
  end
end

-- Actions the player binds in BAR, e.g. /bind Ctrl+Shift+N stratcom_arm_next (05 §8.3)
local function registerAction(name, fn)
  if not widgetHandler then
    return
  end
  pcall(function()
    if widgetHandler.AddAction then
      widgetHandler:AddAction(name, fn)
    elseif widgetHandler.actionHandler and widgetHandler.actionHandler.AddAction then
      widgetHandler.actionHandler:AddAction(widget, name, fn)
    end
  end)
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
  registerAction("stratcom_hud_toggle", function()
    config.hudVisible = not config.hudVisible
    return true
  end)
  registerAction("stratcom_arm_next", function()
    assistArmNext()
    return true
  end)
  registerAction("stratcom_load_queue", function()
    assistLoadQueue()
    return true
  end)
  local frame = (spGetGameFrame and spGetGameFrame()) or 0
  if frame > 0 and not gameStarted then
    widget:GameStart()
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
  local t0 = spGetTimer and spGetTimer()
  if not gameStarted and n > 0 then
    widget:GameStart()
  end
  if n % 30 == 0 then
    local ok, err = pcall(function()
      writeSensorState()
      flushEvents()
      writeHeartbeat()
    end)
    if not ok and spEcho then
      spEcho("BAR StratCom GameFrame error: " .. tostring(err))
    end
  end
  local radarDoc = currentCoachDoc and isTable(currentCoachDoc.hud) and currentCoachDoc.hud.radar
  if n % 15 == 0 and isTable(radarDoc) and config.hudVisible ~= false and detectMode() == "player" then
    local range = math.max(500, math.min(8000, tonumber(radarDoc.range) or 2400))
    local ok, err = pcall(updateRadar, range)
    if not ok and spEcho then
      spEcho("BAR StratCom radar error: " .. tostring(err))
    end
  end
  -- per-frame cost (08 §5 budget): average over 30-frame windows (including the snapshot frame), smoothed
  if t0 and spDiffTimers and spGetTimer then
    frameTimeSum = frameTimeSum + spDiffTimers(spGetTimer(), t0, true)
    frameCount = frameCount + 1
    if frameCount >= 30 then
      local avg = frameTimeSum / frameCount
      lastFrameMs = (lastFrameMs == 0) and avg or (lastFrameMs * 0.8 + avg * 0.2)
      frameTimeSum, frameCount = 0, 0
    end
  end
end

function widget:Update(dt)
  if assistMessage then
    assistMessage.ttl = assistMessage.ttl - (dt or 0)
    if assistMessage.ttl <= 0 then
      assistMessage = nil
    end
  end

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
  if radarList.id and gl and gl.DeleteList then
    gl.DeleteList(radarList.id)
    radarList.id = nil
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

  local panelWidth = HUD_WIDTH * scale
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

  local panelWidth = HUD_WIDTH * scale
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
    local panelWidth = HUD_WIDTH
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
