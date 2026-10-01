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

-- Call-ins (05 §4)
function widget:Initialize()
  if spCreateDir then
    spCreateDir("stratcom")
  end
  runProbe()
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
