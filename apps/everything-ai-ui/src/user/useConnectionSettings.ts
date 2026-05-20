import { useMemo, useState } from 'react';
import type { ApiOptions } from '../api';
import { DEFAULT_API, DEFAULT_TOKEN } from './userUtils';

export function useConnectionSettings() {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('everythingai.ui.baseUrl') || DEFAULT_API);
  const [token, setToken] = useState(localStorage.getItem('everythingai.ui.token') || DEFAULT_TOKEN);
  const [folderPath, setFolderPath] = useState(localStorage.getItem('everythingai.ui.folderPath') || '');

  const options: ApiOptions = useMemo(() => ({ baseUrl, token }), [baseUrl, token]);

  function saveConnectionSettings() {
    localStorage.setItem('everythingai.ui.baseUrl', baseUrl);
    localStorage.setItem('everythingai.ui.token', token);
    localStorage.setItem('everythingai.ui.folderPath', folderPath);
  }

  return {
    baseUrl,
    setBaseUrl,
    token,
    setToken,
    folderPath,
    setFolderPath,
    options,
    saveConnectionSettings,
  };
}
