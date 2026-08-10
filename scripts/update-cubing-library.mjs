import {spawn} from 'node:child_process';
import {copyFile, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const packageDirectory = path.join(projectDirectory, 'node_modules', 'cubing');
const sourceDirectory = path.join(packageDirectory, 'dist', 'lib', 'cubing');
const destinationDirectory = path.join(projectDirectory, 'src', 'cubes', 'library', 'cubing');
const dependenciesDirectory = path.join(destinationDirectory, 'dependencies');
const threeModulePath = path.join(dependenciesDirectory, 'three', 'three.module.js');
const randomUIntBelowModulePath = path.join(dependenciesDirectory, 'random-uint-below', 'index.js');
const copyOnly = process.argv.includes('--copy-only');

function runNpm(args) {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    return new Promise((resolve, reject) => {
        const child = spawn(npmCommand, args, {cwd: projectDirectory, stdio: 'inherit'});
        child.on('error', reject);
        child.on('exit', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`npm exited with code ${code ?? 'unknown'}`));
            }
        });
    });
}

function relativeModuleSpecifier(fromFile, toFile) {
    const relativePath = path.relative(path.dirname(fromFile), toFile).split(path.sep).join('/');
    return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function rewriteDependencyImports(source, destinationPath) {
    const threeSpecifier = relativeModuleSpecifier(destinationPath, threeModulePath);
    const randomUIntBelowSpecifier = relativeModuleSpecifier(destinationPath, randomUIntBelowModulePath);

    return source
        .replace(/(["'])three\/src\/[^"']+\1/g, (_match, quote) => `${quote}${threeSpecifier}${quote}`)
        .replace(/(["'])random-uint-below\1/g, (_match, quote) => `${quote}${randomUIntBelowSpecifier}${quote}`);
}

async function copyJavaScriptModules(source, destination) {
    await mkdir(destination, {recursive: true});

    for (const entry of await readdir(source, {withFileTypes: true})) {
        const sourcePath = path.join(source, entry.name);
        const destinationPath = path.join(destination, entry.name);

        if (entry.isDirectory()) {
            await copyJavaScriptModules(sourcePath, destinationPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const sourceCode = await readFile(sourcePath, 'utf8');
            await writeFile(destinationPath, rewriteDependencyImports(sourceCode, destinationPath));
        }
    }
}

async function findInstalledPackageDirectory(packageName) {
    const packagePath = packageName.split('/');
    const candidates = [
        path.join(packageDirectory, 'node_modules', ...packagePath),
        path.join(projectDirectory, 'node_modules', ...packagePath),
    ];

    for (const candidate of candidates) {
        try {
            await readFile(path.join(candidate, 'package.json'), 'utf8');
            return candidate;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    throw new Error(`Cannot find installed dependency: ${packageName}`);
}

if (!copyOnly) {
    await runNpm(['install', '--save-exact', 'cubing@latest']);
}

const packageJson = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
const threePackageDirectory = await findInstalledPackageDirectory('three');
const randomUIntBelowPackageDirectory = await findInstalledPackageDirectory('random-uint-below');
const threePackageJson = JSON.parse(await readFile(path.join(threePackageDirectory, 'package.json'), 'utf8'));
const randomUIntBelowPackageJson = JSON.parse(
    await readFile(path.join(randomUIntBelowPackageDirectory, 'package.json'), 'utf8')
);

await rm(destinationDirectory, {recursive: true, force: true});
await copyJavaScriptModules(sourceDirectory, destinationDirectory);
await mkdir(path.dirname(threeModulePath), {recursive: true});
await mkdir(path.dirname(randomUIntBelowModulePath), {recursive: true});
await copyFile(path.join(threePackageDirectory, 'build', 'three.module.js'), threeModulePath);
await copyFile(path.join(threePackageDirectory, 'LICENSE'), path.join(path.dirname(threeModulePath), 'LICENSE.txt'));
await copyFile(path.join(randomUIntBelowPackageDirectory, 'dist', 'esm', 'index.js'), randomUIntBelowModulePath);
await copyFile(
    path.join(randomUIntBelowPackageDirectory, 'LICENSE.md'),
    path.join(path.dirname(randomUIntBelowModulePath), 'LICENSE.txt')
);
await writeFile(
    path.join(destinationDirectory, 'README.txt'),
    [
        `cubing.js ${packageJson.version}`,
        'Local copy of the browser modules published in the cubing npm package.',
        'Updated manually with: npm run update-cubing',
        `Source: ${packageJson.repository.url}`,
        `License: ${packageJson.license}`,
        '',
        'Included runtime dependencies:',
        `- three ${threePackageJson.version} (${threePackageJson.license})`,
        `- random-uint-below ${randomUIntBelowPackageJson.version} (${randomUIntBelowPackageJson.license})`,
        '',
    ].join('\n')
);

console.log(`Updated checked-in cubing.js sources to version ${packageJson.version}.`);
