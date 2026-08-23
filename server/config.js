const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MODELS_DIR = process.env.PTAHN_MODELS_DIR || path.join(ROOT_DIR, 'models');
const DATA_DIR = process.env.PTAHN_DATA_DIR || path.join(ROOT_DIR, 'ptah-data');
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

module.exports = {
  ROOT_DIR,
  MODELS_DIR,
  DATA_DIR,
  PORT,
  HOST
};
