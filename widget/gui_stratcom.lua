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

local spCreateDir = Spring.CreateDir

function widget:Initialize()
  if spCreateDir then
    spCreateDir("stratcom")
  end
end
