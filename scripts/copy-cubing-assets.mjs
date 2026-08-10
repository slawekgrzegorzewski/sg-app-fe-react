import {cp, mkdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const sourceDirectory = path.join(projectDirectory, 'src', 'cubes', 'library', 'cubing');
const destinationDirectory = path.join(projectDirectory, 'public', 'vendor', 'cubing');

await rm(destinationDirectory, {recursive: true, force: true});
await mkdir(path.dirname(destinationDirectory), {recursive: true});
await cp(sourceDirectory, destinationDirectory, {recursive: true});

console.log('Copied checked-in cubing.js browser modules to public/vendor/cubing.');
