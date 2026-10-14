import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BuildPlanSchema, type BuildPlan } from '../../core/schemas';
import { decodePlan, encodePlan } from '../../core/sharecode';
import { planFromFile, planToDiscordText } from '../../core/plans/files';
import { findDataDir } from '../registry/loader';
import { isSafeName, namedFile } from '../fs/path-guard';

export interface PlanStoreOptions {
  userDataDir?: string;
  bundledDir?: string;
}

export class PlanStore {
  private readonly userDataDir: string;
  private readonly bundledDir: string;

  constructor(options: PlanStoreOptions = {}) {
    if (options.userDataDir) {
      this.userDataDir = options.userDataDir;
    } else {
      try {
        this.userDataDir = path.join(app.getPath('userData'), 'plans');
      } catch {
        this.userDataDir = path.join(process.cwd(), 'userData', 'plans');
      }
    }

    if (options.bundledDir) {
      this.bundledDir = options.bundledDir;
    } else {
      this.bundledDir = path.join(findDataDir(), 'builds');
    }
  }

  getUserDataDir(): string {
    return this.userDataDir;
  }

  getBundledDir(): string {
    return this.bundledDir;
  }

  private readPlansFromDir(dir: string): BuildPlan[] {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const plans: BuildPlan[] = [];
    const scan = (currentDir: string): void => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          // "_" folders hold curation work in progress (data/builds/_candidates), not library plans
          if (!entry.name.startsWith('_')) scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const parsed = JSON.parse(content);
            const validated = BuildPlanSchema.safeParse(parsed);
            if (validated.success) {
              plans.push(validated.data);
            } else {
              console.warn(`Plan validation failed for ${fullPath}:`, validated.error.message);
            }
          } catch (err) {
            console.warn(`Failed to read plan from ${fullPath}:`, err);
          }
        }
      }
    };

    scan(dir);
    return plans;
  }

  list(): BuildPlan[] {
    const bundledPlans = this.readPlansFromDir(this.bundledDir);
    const userPlans = this.readPlansFromDir(this.userDataDir);

    const planMap = new Map<string, BuildPlan>();
    for (const plan of bundledPlans) {
      planMap.set(plan.id, plan);
    }
    // User plans override bundled plans with same ID if any
    for (const plan of userPlans) {
      planMap.set(plan.id, plan);
    }

    return Array.from(planMap.values());
  }

  get(id: string): BuildPlan | null {
    // Check user plans first
    // ids name files: a plain name only (path guard)
    if (!isSafeName(id)) return null;
    const userFile = namedFile(this.userDataDir, id, '.json');
    if (fs.existsSync(userFile)) {
      try {
        const content = fs.readFileSync(userFile, 'utf-8');
        const parsed = JSON.parse(content);
        const validated = BuildPlanSchema.safeParse(parsed);
        if (validated.success) return validated.data;
      } catch (err) {
        console.warn(`Failed to read user plan ${id}:`, err);
      }
    }

    // Check bundled plans directly or in samples/
    const directBundledFile = path.join(this.bundledDir, `${id}.json`);
    const sampleBundledFile = path.join(this.bundledDir, 'samples', `${id}.json`);
    const bundledFile = fs.existsSync(directBundledFile)
      ? directBundledFile
      : fs.existsSync(sampleBundledFile)
        ? sampleBundledFile
        : null;

    if (bundledFile) {
      try {
        const content = fs.readFileSync(bundledFile, 'utf-8');
        const parsed = JSON.parse(content);
        const validated = BuildPlanSchema.safeParse(parsed);
        if (validated.success) return validated.data;
      } catch (err) {
        console.warn(`Failed to read bundled plan ${id}:`, err);
      }
    }

    // Fallback: search all bundled plans in case file name differs from ID
    const allBundled = this.readPlansFromDir(this.bundledDir);
    const foundBundled = allBundled.find((p) => p.id === id);
    if (foundBundled) return foundBundled;

    // Fallback: search all user plans
    const allUser = this.readPlansFromDir(this.userDataDir);
    const foundUser = allUser.find((p) => p.id === id);
    return foundUser ?? null;
  }

  save(plan: BuildPlan): BuildPlan {
    const validated = BuildPlanSchema.parse(plan);
    fs.mkdirSync(this.userDataDir, { recursive: true });
    const targetFile = namedFile(this.userDataDir, validated.id, '.json');
    fs.writeFileSync(targetFile, `${JSON.stringify(validated, null, 2)}\n`, 'utf-8');
    return validated;
  }

  delete(id: string): { ok: boolean } {
    // Check if it's a bundled plan
    const isBundled = this.readPlansFromDir(this.bundledDir).some((p) => p.id === id);
    const userFile = namedFile(this.userDataDir, id, '.json');
    const hasUserOverride = fs.existsSync(userFile);

    if (isBundled && !hasUserOverride) {
      throw new Error(`Cannot delete bundled curated plan: ${id}`);
    }

    if (hasUserOverride) {
      fs.unlinkSync(userFile);
      return { ok: true };
    }

    // Also check if any file in userDataDir has this ID
    const allUser = fs.readdirSync(this.userDataDir).filter((f) => f.endsWith('.json'));
    for (const f of allUser) {
      const full = path.join(this.userDataDir, f);
      try {
        const parsed = JSON.parse(fs.readFileSync(full, 'utf-8'));
        if (parsed.id === id) {
          fs.unlinkSync(full);
          return { ok: true };
        }
      } catch {
        // ignore
      }
    }

    return { ok: true };
  }

  import(shareCode: string): BuildPlan {
    const result = decodePlan(shareCode);
    if (!result.ok) {
      throw new Error(`Invalid share code: ${result.error.message}`);
    }
    const plan = { ...result.plan };
    if (this.get(plan.id)) {
      plan.id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return this.save(plan);
  }

  importTextOrCode(content: string): BuildPlan {
    const trimmed = content.trim();
    if (trimmed.startsWith('BSC1.')) {
      return this.import(trimmed);
    }
    const fileRes = planFromFile(trimmed);
    if (!fileRes.ok) {
      throw new Error(`Failed to parse plan JSON: ${fileRes.error}`);
    }
    const plan = { ...fileRes.plan };
    if (this.get(plan.id)) {
      plan.id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return this.save(plan);
  }

  export(id: string): { shareCode: string; discordText: string } {
    const plan = this.get(id);
    if (!plan) {
      throw new Error(`Plan not found: ${id}`);
    }
    return {
      shareCode: encodePlan(plan),
      discordText: planToDiscordText(plan)
    };
  }
}

export const defaultPlanStore = new PlanStore();
