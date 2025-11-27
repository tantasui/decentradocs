import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import { WalrusService } from '../src/services/walrusService';
import { getConfig } from '../src/config';

const app = express();
const config = getConfig();

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(express.json());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Initialize services
const walrusService = new WalrusService();

// Health check endpoints
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    services: {
      walrus: 'configured',
      sui: config.suiPackageId ? 'configured' : 'not_configured',
      rag: 'not_available',
      openai: config.openaiApiKey ? 'configured' : 'not_configured',
    },
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
  });
});

// Upload document endpoint
app.post('/upload-document', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const walletAddress = req.body.wallet_address;
    const isPublic = req.body.is_public === 'true' || req.body.is_public === true;

    if (!walletAddress) {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

    console.log(`Uploading document: ${req.file.originalname} for wallet: ${walletAddress}`);

    // Step 1: Upload to Walrus
    console.log('Uploading to Walrus...');
    const walrusResult = await walrusService.uploadBlob(req.file.buffer);

    const blobId = walrusResult.blob_id;

    // Step 2: Prepare Sui transaction data (if configured)
    let suiTransactionData = null;
    if (config.suiPackageId) {
      suiTransactionData = {
        package_id: config.suiPackageId,
        module_name: config.suiModuleName,
        function_name: 'mint_document',
        arguments: {
          name: req.file.originalname,
          walrus_blob_id: blobId,
          is_public: isPublic,
        },
        gas_budget: 10000000,
      };
    }

    // Step 3: RAG processing would go here (disabled for now)
    console.log('RAG processing skipped (not available)');

    res.json({
      walrus_blob_id: blobId,
      sui_transaction_digest: null,
      document_id: null,
      message: 'Document uploaded to Walrus. Please sign the transaction to mint NFT on Sui.',
      sui_transaction_data: suiTransactionData,
    });
  } catch (error: any) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Query documents endpoint
app.post('/query', async (req: Request, res: Response) => {
  try {
    const { question, document_ids, wallet_address } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    // RAG service not available
    res.status(503).json({
      error: 'RAG service is not available. ChromaDB is required for RAG functionality.',
    });
  } catch (error: any) {
    console.error('Query failed:', error);
    res.status(500).json({ error: error.message || 'Query failed' });
  }
});

// Get user documents
app.get('/documents/:wallet_address', async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;

    if (!config.suiPackageId) {
      return res.json({
        documents: [],
        total: 0,
      });
    }

    // Sui service not available
    res.json({
      documents: [],
      total: 0,
    });
  } catch (error: any) {
    console.error('Failed to get documents:', error);
    res.status(500).json({ error: error.message || 'Failed to get documents' });
  }
});

// Get specific document
app.get('/documents/:wallet_address/:document_id', async (req: Request, res: Response) => {
  try {
    const { document_id, wallet_address } = req.params;

    if (!config.suiPackageId) {
      return res.status(404).json({ error: 'Sui not configured' });
    }

    // Sui service not available
    res.status(404).json({ error: 'Sui service not available' });
  } catch (error: any) {
    console.error('Failed to get document:', error);
    res.status(500).json({ error: error.message || 'Failed to get document' });
  }
});

// Download document
app.get('/download/:blob_id', async (req: Request, res: Response) => {
  try {
    const { blob_id } = req.params;
    const { wallet_address } = req.query;

    console.log(`Downloading blob: ${blob_id}`);

    const content = await walrusService.downloadBlob(blob_id);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${blob_id}`);
    res.send(content);
  } catch (error: any) {
    console.error('Download failed:', error);
    res.status(500).json({ error: error.message || 'Download failed' });
  }
});

// Delete document
app.delete('/documents/:blob_id', async (req: Request, res: Response) => {
  try {
    const { blob_id } = req.params;
    const { wallet_address } = req.query;

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

    console.log(`Deleting document: ${blob_id}`);

    // RAG service not available
    res.status(503).json({
      error: 'RAG service is not available. ChromaDB is required for RAG functionality.',
    });
  } catch (error: any) {
    console.error('Delete failed:', error);
    res.status(500).json({ error: error.message || 'Delete failed' });
  }
});

// Complete upload
app.post('/complete-upload', async (req: Request, res: Response) => {
  try {
    const { blob_id, transaction_digest, wallet_address } = req.body;

    if (!blob_id || !transaction_digest || !wallet_address) {
      return res.status(400).json({ error: 'blob_id, transaction_digest, and wallet_address are required' });
    }

    console.log(`Completing upload for blob ${blob_id} with transaction ${transaction_digest}`);

    res.json({
      status: 'success',
      message: 'Upload completed successfully',
      blob_id,
      transaction_digest,
    });
  } catch (error: any) {
    console.error('Failed to complete upload:', error);
    res.status(500).json({ error: error.message || 'Failed to complete upload' });
  }
});

// Get document stats
app.get('/stats/:blob_id', async (req: Request, res: Response) => {
  try {
    const { blob_id } = req.params;

    // RAG service not available
    res.status(503).json({
      error: 'RAG service is not available. ChromaDB is required for RAG functionality.',
    });
  } catch (error: any) {
    console.error('Failed to get stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get stats' });
  }
});

// Export for Vercel
export default app;

