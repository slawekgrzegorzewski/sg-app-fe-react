import {networkInterfaces} from 'node:os';
import {isIPv4} from 'node:net';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const reactScriptsPath = path.join(projectDirectory, 'node_modules', 'react-scripts', 'bin', 'react-scripts.js');

function isPrivateIPv4(address) {
    const octets = address.split('.').map(Number);
    return (
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168)
    );
}

function findLocalIPv4() {
    const override = process.env.SG_APP_DEVICE_IP;
    if (override) {
        if (!isIPv4(override)) {
            throw new Error(`SG_APP_DEVICE_IP is not a valid IPv4 address: ${override}`);
        }
        return {address: override, interfaceName: 'SG_APP_DEVICE_IP override'};
    }

    const candidates = Object.entries(networkInterfaces()).flatMap(([interfaceName, addresses]) =>
        (addresses ?? [])
            .filter(
                address => address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.')
            )
            .map(address => ({address: address.address, interfaceName}))
    );

    candidates.sort((left, right) => {
        const interfacePriority = name => (name === 'en0' ? 0 : name.startsWith('en') ? 1 : 2);
        return (
            interfacePriority(left.interfaceName) - interfacePriority(right.interfaceName) ||
            Number(isPrivateIPv4(right.address)) - Number(isPrivateIPv4(left.address))
        );
    });

    const candidate = candidates.find(({address}) => isPrivateIPv4(address)) ?? candidates[0];
    if (!candidate) {
        throw new Error('No external IPv4 address was found. Connect the computer to a network and try again.');
    }
    return candidate;
}

function replaceLocalhost(urlValue, address) {
    if (!urlValue) {
        throw new Error('REACT_APP_BACKEND_URL is missing from .env.macos.');
    }

    const backendUrl = new URL(urlValue);
    if (['localhost', '127.0.0.1', '[::1]'].includes(backendUrl.hostname)) {
        backendUrl.hostname = address;
    }
    return backendUrl.toString().replace(/\/$/, '');
}

const {address, interfaceName} = findLocalIPv4();
const environment = {
    ...process.env,
    HOST: process.env.HOST ?? '0.0.0.0',
    REACT_APP_BACKEND_URL: replaceLocalhost(process.env.REACT_APP_BACKEND_URL, address),
};

console.log(`Using ${interfaceName} address: ${address}`);
console.log(`Backend URL: ${environment.REACT_APP_BACKEND_URL}`);
console.log(`Open the application on another device at: http://${address}:3000`);

if (!process.argv.includes('--print-only')) {
    process.exitCode = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [reactScriptsPath, 'start'], {
            cwd: projectDirectory,
            env: environment,
            stdio: 'inherit',
        });
        child.once('error', reject);
        child.once('exit', code => resolve(code ?? 1));
    });
}
