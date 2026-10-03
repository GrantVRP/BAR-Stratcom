export interface Platform {
  candidateDataDirs(): string[];
  registeredInstallDataDir(): Promise<string | null>;
  runningEngineDataDir(): Promise<string | null>;
}
