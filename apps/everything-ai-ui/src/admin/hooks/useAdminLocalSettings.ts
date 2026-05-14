import { useState } from 'react';

const DEFAULT_API = 'http://127.0.0.1:4100';
const DEFAULT_TOKEN = 'replace-with-your-local-development-token';
const DEFAULT_DESTINATION_FOLDER = 'Organized Files';

export function useAdminLocalSettings() {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('everythingai.ui.baseUrl') || DEFAULT_API);
  const [token, setToken] = useState(localStorage.getItem('everythingai.ui.token') || DEFAULT_TOKEN);
  const [folderPath, setFolderPath] = useState(localStorage.getItem('everythingai.ui.folderPath') || '');
  const [destinationFolder, setDestinationFolder] = useState(
    localStorage.getItem('everythingai.ui.destinationFolder') || DEFAULT_DESTINATION_FOLDER,
  );

  function saveLocalSettings() {
    localStorage.setItem('everythingai.ui.baseUrl', baseUrl);
    localStorage.setItem('everythingai.ui.token', token);
    localStorage.setItem('everythingai.ui.folderPath', folderPath);
    localStorage.setItem('everythingai.ui.destinationFolder', destinationFolder);
  }

  return {
    baseUrl,
    setBaseUrl,
    token,
    setToken,
    folderPath,
    setFolderPath,
    destinationFolder,
    setDestinationFolder,
    saveLocalSettings,
  };
}

export default useAdminLocalSettings;
