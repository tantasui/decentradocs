export interface Config {
  suiPackageId: string;
  suiNetwork: string;
  suiModuleName: string;
  walrusPublisherUrl: string;
  walrusAggregatorUrl: string;
  walrusEpochs: number;
  openaiApiKey: string;
  appName: string;
  debug: boolean;
  corsOrigins: string[];
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    suiPackageId: process.env.SUI_PACKAGE_ID || '',
    suiNetwork: process.env.SUI_NETWORK || 'testnet',
    suiModuleName: process.env.SUI_MODULE_NAME || 'registry',
    walrusPublisherUrl:
      process.env.WALRUS_PUBLISHER_URL ||
      'https://publisher-devnet.walrus.space',
    walrusAggregatorUrl:
      process.env.WALRUS_AGGREGATOR_URL ||
      'https://aggregator-devnet.walrus.space',
    walrusEpochs: parseInt(process.env.WALRUS_EPOCHS || '5', 10),
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    appName: 'Decentralized RAG System',
    debug: process.env.DEBUG === 'true',
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173'],
  };

  return cachedConfig;
}

