/**
 * Reads Lua table constructors from BAR data files (effects/*.lua) into plain JS values. Only data is
 * supported: tables, strings ("", '', [[ ]]), numbers, booleans, nil, `[key] = value`, `name = value`,
 * and string keys built with `..` from known variables (genericunitexplosion.lua uses `root.. "-tiny"`).
 */
export type LuaValue = string | number | boolean | null | LuaTable;
export interface LuaTable {
  [key: string]: LuaValue;
}

class Reader {
  i = 0;
  constructor(
    readonly s: string,
    readonly vars: Record<string, string>
  ) {}

  skip(): void {
    for (;;) {
      while (this.i < this.s.length && /\s/.test(this.s[this.i]!)) this.i += 1;
      if (this.s.startsWith('--[[', this.i)) {
        const end = this.s.indexOf(']]', this.i + 4);
        this.i = end < 0 ? this.s.length : end + 2;
      } else if (this.s.startsWith('--', this.i)) {
        const end = this.s.indexOf('\n', this.i);
        this.i = end < 0 ? this.s.length : end + 1;
      } else return;
    }
  }

  expect(ch: string): void {
    this.skip();
    if (this.s[this.i] !== ch) throw new Error(`Lua table: expected "${ch}" at ${this.i}, found "${this.s.slice(this.i, this.i + 20)}"`);
    this.i += 1;
  }

  string(): string | null {
    this.skip();
    const c = this.s[this.i];
    if (c === '"' || c === "'") {
      const end = this.s.indexOf(c, this.i + 1);
      const v = this.s.slice(this.i + 1, end);
      this.i = end + 1;
      return v;
    }
    if (this.s.startsWith('[[', this.i)) {
      const end = this.s.indexOf(']]', this.i + 2);
      const v = this.s.slice(this.i + 2, end);
      this.i = end + 2;
      return v;
    }
    return null;
  }

  name(): string | null {
    this.skip();
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.s.slice(this.i, this.i + 80));
    if (!m) return null;
    this.i += m[0].length;
    return m[0];
  }

  /** A string expression: "a".. var.. "b" */
  stringExpr(): string {
    let out = '';
    for (;;) {
      const lit = this.string();
      if (lit !== null) out += lit;
      else {
        const n = this.name();
        if (n === null || !(n in this.vars)) throw new Error(`Lua table: unknown key expression at ${this.i}`);
        out += this.vars[n];
      }
      this.skip();
      if (!this.s.startsWith('..', this.i)) return out;
      this.i += 2;
    }
  }

  value(): LuaValue {
    this.skip();
    const c = this.s[this.i];
    if (c === '{') return this.table();
    const str = this.string();
    if (str !== null) return str;
    const num = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?/i.exec(this.s.slice(this.i, this.i + 40));
    if (num) {
      this.i += num[0].length;
      return Number(num[0]);
    }
    const n = this.name();
    if (n === 'true') return true;
    if (n === 'false') return false;
    if (n === 'nil') return null;
    // a variable such as `impulsefactor = impulsefactor`: its value if known, else nil
    if (n !== null) return this.vars[n] ?? null;
    throw new Error(`Lua table: unsupported value at ${this.i}: "${this.s.slice(this.i, this.i + 20)}"`);
  }

  table(): LuaTable {
    this.expect('{');
    const t: LuaTable = {};
    let index = 1;
    for (;;) {
      this.skip();
      if (this.s[this.i] === '}') {
        this.i += 1;
        return t;
      }
      let key: string;
      if (this.s[this.i] === '[' && this.s[this.i + 1] !== '[') {
        this.i += 1;
        this.skip();
        const num = /^-?\d+(\.\d+)?/.exec(this.s.slice(this.i, this.i + 20));
        if (num) {
          this.i += num[0].length;
          key = String(Number(num[0]));
        } else key = this.stringExpr();
        this.expect(']');
        this.expect('=');
      } else {
        const save = this.i;
        const n = this.name();
        this.skip();
        if (n !== null && this.s[this.i] === '=' && this.s[this.i + 1] !== '=') {
          this.i += 1;
          key = n;
        } else {
          this.i = save;
          key = String(index++);
        }
      }
      t[key] = this.value();
      this.skip();
      if (this.s[this.i] === ',' || this.s[this.i] === ';') this.i += 1;
    }
  }
}

/** Parses the table constructor that follows `marker` (e.g. "local definitions =") in a Lua file. */
export function readLuaTable(src: string, marker: string, vars: Record<string, string> = {}): LuaTable {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`Lua table: "${marker}" not found`);
  const r = new Reader(src, vars);
  r.i = at + marker.length;
  return r.table();
}
