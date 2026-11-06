// npm removes the scope marker and replaces the separator in packed filenames.
export function releaseBasename(name, version) {
  return `${name.replace(/^@/, '').replaceAll('/', '-')}-${version}`;
}
