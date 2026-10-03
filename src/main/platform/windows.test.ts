import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createWindowsPlatform,
  getCandidateDataDirs,
  parseDisplayIconFromRegOutput,
  parseEnginePathToDataDir,
  registeredInstallDataDir,
  runningEngineDataDir
} from './windows';

describe('Windows Platform Path Detection (T05.1)', () => {
  const sampleRealRegOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\a5671b31-085d-5fba-830a-66a891c6a4a4
    DisplayName    REG_SZ    Beyond-All-Reason 1.2988.0
    UninstallString    REG_SZ    "D:\\BAR\\Beyond-All-Reason\\Uninstall Beyond-All-Reason.exe" /currentuser
    QuietUninstallString    REG_SZ    "D:\\BAR\\Beyond-All-Reason\\Uninstall Beyond-All-Reason.exe" /currentuser /S
    DisplayIcon    REG_SZ    D:\\BAR\\Beyond-All-Reason\\Beyond-All-Reason.exe,0

End of search: 4 match(es) found.
`;

  describe('parseDisplayIconFromRegOutput', () => {
    it('parses real captured registry output from owner machine', () => {
      const parsed = parseDisplayIconFromRegOutput(sampleRealRegOutput);
      expect(parsed).toBe(path.join('D:\\BAR\\Beyond-All-Reason', 'data'));
    });

    it('handles quoted DisplayIcon with comma index', () => {
      const output = '    DisplayIcon    REG_SZ    "C:\\Games\\Beyond-All-Reason\\Beyond-All-Reason.exe",0';
      const parsed = parseDisplayIconFromRegOutput(output);
      expect(parsed).toBe(path.join('C:\\Games\\Beyond-All-Reason', 'data'));
    });

    it('handles quoted DisplayIcon without comma index', () => {
      const output = '    DisplayIcon    REG_SZ    "C:\\BAR\\Beyond-All-Reason\\Beyond-All-Reason.exe"';
      const parsed = parseDisplayIconFromRegOutput(output);
      expect(parsed).toBe(path.join('C:\\BAR\\Beyond-All-Reason', 'data'));
    });

    it('falls back to InstallLocation if DisplayIcon is absent', () => {
      const output = `
HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\BAR
    DisplayName    REG_SZ    Beyond-All-Reason
    InstallLocation    REG_SZ    "C:\\Games\\Beyond-All-Reason"
`;
      const parsed = parseDisplayIconFromRegOutput(output);
      expect(parsed).toBe(path.join('C:\\Games\\Beyond-All-Reason', 'data'));
    });

    it('returns null on empty or non-matching output', () => {
      expect(parseDisplayIconFromRegOutput('')).toBeNull();
      expect(parseDisplayIconFromRegOutput('End of search: 0 match(es) found.')).toBeNull();
    });
  });

  describe('parseEnginePathToDataDir', () => {
    it('parses engine recoil path to data directory', () => {
      const enginePath = 'D:\\BAR\\Beyond-All-Reason\\data\\engine\\recoil_2026.07.04\\spring.exe\r\n';
      const parsed = parseEnginePathToDataDir(enginePath);
      expect(parsed).toBe(path.resolve('D:\\BAR\\Beyond-All-Reason\\data'));
    });

    it('parses quoted engine path', () => {
      const enginePath = '"C:\\Games\\BAR\\data\\engine\\recoil_1.0\\spring.exe"';
      const parsed = parseEnginePathToDataDir(enginePath);
      expect(parsed).toBe(path.resolve('C:\\Games\\BAR\\data'));
    });

    it('parses direct engine subfolder path', () => {
      const enginePath = 'C:\\BAR\\data\\engine\\spring.exe';
      const parsed = parseEnginePathToDataDir(enginePath);
      expect(parsed).toBe(path.resolve('C:\\BAR\\data'));
    });

    it('returns null on empty or whitespace output', () => {
      expect(parseEnginePathToDataDir('')).toBeNull();
      expect(parseEnginePathToDataDir('   \r\n  ')).toBeNull();
    });
  });

  describe('getCandidateDataDirs', () => {
    it('constructs candidate directories from environment variables', () => {
      const env = {
        LOCALAPPDATA: 'C:\\Users\\test\\AppData\\Local',
        ProgramFiles: 'C:\\Program Files',
        'ProgramFiles(x86)': 'C:\\Program Files (x86)'
      };

      const candidates = getCandidateDataDirs(env);
      expect(candidates).toEqual([
        path.join('C:\\Users\\test\\AppData\\Local', 'Programs', 'Beyond-All-Reason', 'data'),
        path.join('C:\\Program Files', 'Beyond-All-Reason', 'data'),
        path.join('C:\\Program Files (x86)', 'Beyond-All-Reason', 'data')
      ]);
    });
  });

  describe('registeredInstallDataDir execution', () => {
    it('returns parsed path on successful reg query', async () => {
      const mockExec = async (cmd: string, args: readonly string[]) => {
        expect(cmd).toBe('reg');
        expect(args[0]).toBe('query');
        return { stdout: sampleRealRegOutput, stderr: '' };
      };

      const result = await registeredInstallDataDir(mockExec);
      expect(result).toBe(path.join('D:\\BAR\\Beyond-All-Reason', 'data'));
    });

    it('gracefully returns null when reg query fails or throws', async () => {
      const mockExec = async () => {
        throw new Error('ERROR: The key was not found.');
      };

      const result = await registeredInstallDataDir(mockExec);
      expect(result).toBeNull();
    });
  });

  describe('runningEngineDataDir execution', () => {
    it('returns data directory when powershell finds spring.exe', async () => {
      const mockExec = async (cmd: string, args: readonly string[]) => {
        expect(cmd).toBe('powershell.exe');
        expect(args).toContain('-NoProfile');
        return {
          stdout: 'D:\\BAR\\Beyond-All-Reason\\data\\engine\\recoil_2026.07.04\\spring.exe\r\n',
          stderr: ''
        };
      };

      const result = await runningEngineDataDir(mockExec);
      expect(result).toBe(path.resolve('D:\\BAR\\Beyond-All-Reason\\data'));
    });

    it('gracefully returns null when powershell produces empty output or throws', async () => {
      const mockExecEmpty = async () => ({ stdout: '', stderr: '' });
      expect(await runningEngineDataDir(mockExecEmpty)).toBeNull();

      const mockExecThrow = async () => {
        throw new Error('Process timed out');
      };
      expect(await runningEngineDataDir(mockExecThrow)).toBeNull();
    });
  });

  describe('createWindowsPlatform', () => {
    it('creates platform interface with candidates and query methods', async () => {
      const platform = createWindowsPlatform(async () => ({ stdout: '', stderr: '' }));
      expect(Array.isArray(platform.candidateDataDirs())).toBe(true);
      expect(await platform.registeredInstallDataDir()).toBeNull();
      expect(await platform.runningEngineDataDir()).toBeNull();
    });
  });
});
