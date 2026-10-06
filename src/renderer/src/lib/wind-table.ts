import windJson from '../../../../data/wind/avg-wind.json';

export const AVG_WIND_TABLE: Record<string, Record<string, number>> = windJson.table;
/** BAR's wind-risk table (percent of the time below 6 wind), imported from the game (Q-06). */
export const WIND_RISK_TABLE: Record<string, Record<string, number>> | null = 'riskTable' in windJson ? windJson.riskTable : null;
