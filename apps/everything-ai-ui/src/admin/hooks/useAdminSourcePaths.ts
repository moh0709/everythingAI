import { useState } from 'react';
import type { ApiOptions } from '../../api';
import {
  addSourcePath,
  listSourcePaths,
  pauseSourcePath,
  resumeSourcePath,
  type SourcePathRecord,
} from '../../sourcePathsApi';

export function useAdminSourcePaths() {
  const [sourcePaths, setSourcePaths] = useState<SourcePathRecord[]>([]);

  async function refreshSourcePaths(options: ApiOptions) {
    const payload = await listSourcePaths(options);
    setSourcePaths(payload.sources || []);
    return payload.sources || [];
  }

  async function consumeSourcePath(options: ApiOptions, pathValue: string, watch = true) {
    const payload = await addSourcePath(options, pathValue, watch);
    setSourcePaths(payload.sources || []);
    return payload.sources || [];
  }

  async function pauseSource(options: ApiOptions, source: SourcePathRecord) {
    const payload = await pauseSourcePath(options, source.path);
    setSourcePaths(payload.sources || []);
    return payload.sources || [];
  }

  async function resumeSource(options: ApiOptions, source: SourcePathRecord) {
    const payload = await resumeSourcePath(options, source.path);
    setSourcePaths(payload.sources || []);
    return payload.sources || [];
  }

  return {
    sourcePaths,
    setSourcePaths,
    refreshSourcePaths,
    consumeSourcePath,
    pauseSource,
    resumeSource,
  };
}

export default useAdminSourcePaths;
