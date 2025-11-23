import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server
  port: parseInt(process.env.PORT || '8000', 10),
  debug: process.env.DEBUG === 'true',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173'],

  // Walrus Configuration
  walrusPublisherUrl: process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',
  walrusAggregatorUrl: process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
  walrusEpochs: parseInt(process.env.WALRUS_EPOCHS || '5', 10),

  // OpenAI Configuration
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  // RAG Configuration
  chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
  similarityTopK: parseInt(process.env.SIMILARITY_TOP_K || '5', 10),
  llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),

  // Sui Configuration (for transaction data only, no backend calls)
  suiPackageId: process.env.SUI_PACKAGE_ID || '',
  suiModuleName: process.env.SUI_MODULE_NAME || 'registry',

  // App info
  appName: 'DecentraDocs API (Express.js)',
};

export default config;
