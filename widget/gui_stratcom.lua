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

-- Constants & State
local PROTOCOL = 1
local WIDGET_VERSION = "3.0.0"
local DIR = "stratcom/"

local jsonNull = (type(Json) == "table" and Json.null) or nil

local gameStarted = false
local gameOver = false
local currentSessionId = nil
local timeSinceHeartbeat = 0

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
    perf = jsonNull,
    degraded = false,
    heartbeat = os.time()
  }

  atomicWrite("widget.json", heartbeatData)
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
  writeHeartbeat()
end

function widget:GameOver(winners)
  gameOver = true
  writeHeartbeat()
end

function widget:GameFrame(n)
  if n % 30 == 0 then
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
