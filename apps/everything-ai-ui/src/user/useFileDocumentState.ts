import { useState } from 'react';
import type { IndexedFile } from '../api';
import type { DocumentContext } from './types';

export function useFileDocumentState() {
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null);

  const selectedFile = selectedFileId
    ? files.find((file) => file.id === selectedFileId)
    : files[0];

  function loadFiles(nextFiles: IndexedFile[]) {
    setFiles(nextFiles);
    if (!selectedFileId && nextFiles[0]) setSelectedFileId(nextFiles[0].id);
  }

  function selectFile(fileId: string) {
    setSelectedFileId(fileId);
  }

  return {
    files,
    setFiles,
    selectedFileId,
    setSelectedFileId,
    selectedFile,
    documentContext,
    setDocumentContext,
    loadFiles,
    selectFile,
  };
}
