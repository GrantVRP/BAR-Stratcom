export const LUA_JSON_BOOTSTRAP = `
local json = {}
local json_null = {}
json.null = json_null

local array_mt = { __jsontype = "array" }
json.array = function(t) return setmetatable(t or {}, array_mt) end

local function json_encode(val)
  if val == nil or val == json_null or (type(Json) == "table" and val == Json.null) then
    return "null"
  end
  local t = type(val)
  if t == "boolean" then return val and "true" or "false"
  elseif t == "number" then return tostring(val)
  elseif t == "string" then
    local s = val:gsub('\\\\', '\\\\\\\\'):gsub('"', '\\\\"'):gsub('\\n', '\\\\n'):gsub('\\r', '\\\\r'):gsub('\\t', '\\\\t')
    return '"' .. s .. '"'
  elseif t == "table" then
    local mt = getmetatable(val)
    local forced_array = mt and (mt.__jsontype == "array" or mt.__array == true)
    if forced_array then
      local n = #val
      if n == 0 then return "[]" end
      local parts = {}
      for i = 1, n do
        parts[i] = json_encode(val[i])
      end
      return "[" .. table.concat(parts, ",") .. "]"
    end
    local is_array = true
    local max_i = 0
    local count = 0
    for k, _ in pairs(val) do
      count = count + 1
      if type(k) == "number" and k > 0 and math.floor(k) == k then
        if k > max_i then max_i = k end
      else
        is_array = false
      end
    end
    if is_array and max_i == count and count > 0 then
      local parts = {}
      for i = 1, max_i do
        parts[i] = json_encode(val[i])
      end
      return "[" .. table.concat(parts, ",") .. "]"
    elseif count == 0 then
      return "{}"
    else
      local parts = {}
      for k, v in pairs(val) do
        local ks = tostring(k):gsub('\\\\', '\\\\\\\\'):gsub('"', '\\\\"')
        table.insert(parts, '"' .. ks .. '":' .. json_encode(v))
      end
      return "{" .. table.concat(parts, ",") .. "}"
    end
  end
  return "null"
end

local function json_decode_val(str, pos)
  pos = str:find("%S", pos) or pos
  local first = str:sub(pos, pos)
  if first == '"' then
    local e = pos + 1
    while e <= #str do
      local c = str:sub(e, e)
      if c == '"' and str:sub(e - 1, e - 1) ~= '\\\\' then
        break
      end
      e = e + 1
    end
    local val = str:sub(pos + 1, e - 1):gsub('\\\\"', '"'):gsub('\\\\n', '\\n'):gsub('\\\\\\\\', '\\\\')
    return val, e + 1
  elseif first == "{" then
    local obj = {}
    local p = pos + 1
    while true do
      p = str:find("%S", p) or p
      if str:sub(p, p) == "}" then return obj, p + 1 end
      local key, next_p = json_decode_val(str, p)
      p = str:find(":", next_p) or next_p
      p = p + 1
      local val, val_p = json_decode_val(str, p)
      obj[key] = val
      p = str:find("%S", val_p) or val_p
      if str:sub(p, p) == "," then p = p + 1 end
    end
  elseif first == "[" then
    local arr = {}
    local p = pos + 1
    while true do
      p = str:find("%S", p) or p
      if str:sub(p, p) == "]" then return arr, p + 1 end
      local val, val_p = json_decode_val(str, p)
      table.insert(arr, val)
      p = str:find("%S", val_p) or val_p
      if str:sub(p, p) == "," then p = p + 1 end
    end
  elseif first == "t" and str:sub(pos, pos + 3) == "true" then
    return true, pos + 4
  elseif first == "f" and str:sub(pos, pos + 4) == "false" then
    return false, pos + 5
  elseif first == "n" and str:sub(pos, pos + 3) == "null" then
    return nil, pos + 4
  else
    local e = str:find("[,%]}%s]", pos) or (#str + 1)
    local num_str = str:sub(pos, e - 1)
    return tonumber(num_str), e
  end
end

json.encode = json_encode
json.decode = function(str)
  local val = json_decode_val(str, 1)
  return val
end

Json = json
`;

export const LUA_IO_OS_BOOTSTRAP = `
io = {
  open = function(filepath, mode)
    mode = mode or "r"
    local buffer = ""
    local exists = __fs_exists(filepath)
    if mode:find("w") then
      buffer = ""
    elseif mode:find("a") then
      buffer = exists and (__fs_read(filepath) or "") or ""
    elseif mode:find("r") then
      if not exists then return nil, "No such file" end
      buffer = __fs_read(filepath) or ""
    end

    local handle = {}
    handle.write = function(self, ...)
      local args = { ... }
      for i = 1, #args do
        buffer = buffer .. tostring(args[i])
      end
      __fs_write(filepath, buffer)
      return true
    end

    handle.read = function(self, pattern)
      pattern = pattern or "*a"
      if pattern == "*a" or pattern == "*all" then
        local res = buffer
        buffer = ""
        return res
      elseif pattern == "*l" or pattern == "*line" then
        local nl = buffer:find("\\n")
        if nl then
          local line = buffer:sub(1, nl - 1)
          buffer = buffer:sub(nl + 1)
          return line
        else
          local res = buffer
          buffer = ""
          return #res > 0 and res or nil
        end
      end
      return buffer
    end

    handle.flush = function(self)
      __fs_write(filepath, buffer)
    end

    handle.close = function(self)
      __fs_write(filepath, buffer)
      return true
    end

    handle.lines = function(self)
      return function()
        return handle:read("*l")
      end
    end

    return handle
  end
}

os.remove = function(filepath)
  return __fs_remove(filepath)
end

os.rename = function(oldpath, newpath)
  return __fs_rename(oldpath, newpath)
end

os.time = function()
  if __os_time then
    return __os_time()
  end
  return math.floor(os.clock())
end
`;

export const LUA_SPRING_BOOTSTRAP = `
Spring = {
  CreateDir = function(d) return __sp_create_dir(d) end,
  GetGameFrame = function() return __sp_get_game_frame() end,
  GetGameSeconds = function() return __sp_get_game_seconds() end,
  IsReplay = function() return __sp_is_replay() end,
  GetSpectatingState = function() return __sp_get_spectating_state() end,
  GetMyTeamID = function() return __sp_get_my_team_id() end,
  GetMyAllyTeamID = function() return __sp_get_my_ally_team_id() end,
  GetMyPlayerID = function() return __sp_get_my_player_id() end,
  GetPlayerInfo = function(id)
    local r = __sp_get_player_info(id)
    return r[1], r[2], r[3], r[4], r[5]
  end,
  GetTeamResources = function(teamId, resType)
    local r = __sp_get_team_resources(teamId, resType)
    return r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]
  end,
  GetTeamRulesParam = function(teamId, param)
    return __sp_get_team_rules_param(teamId, param)
  end,
  GetTeamUnits = function(teamId)
    return __sp_get_team_units(teamId)
  end,
  GetTeamUnitsCounts = function(teamId)
    local s = __sp_get_team_units_counts_json(teamId)
    if s and s ~= "" then
      local raw = Json.decode(s)
      local res = {}
      for k, v in pairs(raw) do
        res[tonumber(k) or k] = v
      end
      return res
    end
    return {}
  end,
  GetUnitDefID = function(unitId)
    return __sp_get_unit_def_id(unitId)
  end,
  GetUnitHealth = function(unitId)
    local r = __sp_get_unit_health(unitId)
    return r[1], r[2], r[3], r[4], r[5]
  end,
  GetUnitPosition = function(unitId)
    local r = __sp_get_unit_position(unitId)
    return r[1], r[2], r[3]
  end,
  GetUnitIsBeingBuilt = function(unitId)
    return __sp_get_unit_is_being_built(unitId)
  end,
  GetUnitIsBuilding = function(unitId)
    return __sp_get_unit_is_building(unitId)
  end,
  GetUnitCurrentBuildPower = function(unitId)
    return __sp_get_unit_current_build_power(unitId)
  end,
  GetUnitCommands = function() return {} end,
  GetUnitCommandCount = function(unitId)
    return __sp_get_unit_command_count(unitId)
  end,
  GetFactoryCommands = function(unitId, count)
    return __sp_get_factory_commands(unitId, count)
  end,
  GetUnitTeam = function(unitId)
    return __sp_get_unit_team(unitId)
  end,
  GetUnitAllyTeam = function(unitId)
    return __sp_get_unit_ally_team(unitId)
  end,
  GetTeamList = function()
    return __sp_get_team_list()
  end,
  GetTeamInfo = function(teamId)
    local r = __sp_get_team_info(teamId)
    return r[1], r[2], r[3], r[4], r[5], r[6]
  end,
  GetGaiaTeamID = function()
    return __sp_get_gaia_team_id()
  end,
  GetVisibleUnits = function()
    return __sp_get_visible_units()
  end,
  GetWind = function()
    local r = __sp_get_wind()
    return r[1], r[2], r[3], r[4]
  end,
  Echo = function(text) __sp_echo(text) end,
  GetTimer = function() return 1000 end,
  DiffTimers = function() return 0.001 end,
  GetModOptions = function()
    return { allowuserwidgets = "1", allowunitcontrolwidgets = "1" }
  end,
  GetActiveCmdDescs = function() return {} end,
  SetActiveCommand = function() return true end,
  GiveOrderToUnit = function() return true end,
  GetViewGeometry = function() return 1920, 1080 end,
  GetConfigFloat = function(name, defaultVal) return defaultVal or 1.0 end
}
`;
