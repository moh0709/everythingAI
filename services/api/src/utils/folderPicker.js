import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const WINDOWS_FOLDER_PICKER_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select a folder for EverythingAI'
$dialog.ShowNewFolderButton = $true
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.WriteLine($dialog.SelectedPath)
}
`;

export async function selectFolder({ execFileImpl = execFileAsync } = {}) {
  if (process.platform !== 'win32') {
    const error = new Error('Folder picker is currently supported on Windows only.');
    error.status = 501;
    throw error;
  }

  const { stdout } = await execFileImpl('powershell.exe', [
    '-NoProfile',
    '-STA',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    WINDOWS_FOLDER_PICKER_SCRIPT,
  ], {
    windowsHide: false,
  });

  const folderPath = stdout.trim();

  return {
    cancelled: !folderPath,
    folderPath: folderPath || null,
  };
}
