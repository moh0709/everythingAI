import path from 'node:path';

export function isInsideDirectory(candidatePath, parentDirectory) {
  const relative = path.relative(parentDirectory, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function deriveIndexedRoot(absolutePath, relativePath) {
  if (!absolutePath || !relativePath) return null;

  const resolvedAbsolutePath = path.resolve(absolutePath);
  const normalizedRelativePath = path.normalize(relativePath);
  const lowerAbsolutePath = resolvedAbsolutePath.toLowerCase();
  const lowerRelativePath = normalizedRelativePath.toLowerCase();

  if (!lowerAbsolutePath.endsWith(lowerRelativePath)) return null;

  const root = resolvedAbsolutePath
    .slice(0, resolvedAbsolutePath.length - normalizedRelativePath.length)
    .replace(/[\\/]+$/, '');

  return root || path.parse(resolvedAbsolutePath).root;
}
