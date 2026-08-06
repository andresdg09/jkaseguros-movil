const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// El entorno de sandbox de este equipo bloquea spawn() para los workers de
// transformación de Metro (Error: spawn EPERM). Forzamos un solo worker para
// que corra en el proceso principal en lugar de child_process.fork().
config.maxWorkers = 1;

module.exports = config;
