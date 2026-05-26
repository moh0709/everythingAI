type UseConnectionActionsArgs = {
  saveConnectionSettings: () => void;
  setStatus: (status: string) => void;
};

export function useConnectionActions({ saveConnectionSettings, setStatus }: UseConnectionActionsArgs) {
  function saveConnection() {
    saveConnectionSettings();
    setStatus('Connection settings saved.');
  }

  return { saveConnection };
}
