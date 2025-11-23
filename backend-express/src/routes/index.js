import { Router } from 'express';
import multer from 'multer';
import config from '../config.js';
import walrusService from '../services/walrusService.js';
import ragService from '../services/ragService.js';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// ============================================
// Health Check Endpoints
// ============================================

/**
 * GET / - Main health check with service status
 */
router.get('/', (req, res) => {
  const ragStats = ragService.getStoreStats();

  res.json({
    status: 'healthy',
    message: `Welcome to ${config.appName}`,
    services: {
      walrus: {
        available: true,
        publisherUrl: config.walrusPublisherUrl,
        aggregatorUrl: config.walrusAggregatorUrl,
      },
      rag: {
        available: ragService.isAvailable(),
        documentsLoaded: ragStats.totalDocuments,
        chunksLoaded: ragStats.totalChunks,
      },
    },
    version: '1.0.0',
  });
});

/**
 * GET /health - Simple health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Service is running',
  });
});

// ============================================
// Document Upload Endpoints
// ============================================

/**
 * POST /upload-document - Upload document to Walrus and process for RAG
 * Body (multipart/form-data):
 *   - file: The document file
 *   - wallet_address: User's wallet address
 *   - is_public: Whether document is public (optional, default false)
 */
router.post('/upload-document', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const walletAddress = req.body.wallet_address;
    const isPublic = req.body.is_public === 'true';

    if (!file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a file',
      });
    }

    if (!walletAddress) {
      return res.status(400).json({
        error: 'No wallet address provided',
        message: 'Please provide a wallet address',
      });
    }

    console.log(`Uploading document: ${file.originalname} for wallet: ${walletAddress}`);

    // 1. Upload to Walrus
    const walrusResult = await walrusService.uploadBlob(file.buffer);
    console.log(`Uploaded to Walrus: ${walrusResult.blobId}`);

    // 2. Process for RAG (if available)
    let ragResult = null;
    if (ragService.isAvailable()) {
      ragResult = await ragService.processDocument(
        walrusResult.blobId,
        file.buffer,
        file.originalname,
        {
          walletAddress,
          isPublic,
          uploadedAt: Date.now(),
        }
      );
      console.log(`RAG processing: ${ragResult.chunksCreated} chunks created`);
    }

    // 3. Prepare Sui transaction data for frontend to execute
    const suiTransactionData = config.suiPackageId
      ? {
          package_id: config.suiPackageId,
          module_name: config.suiModuleName,
          function_name: 'mint_document',
          arguments: {
            name: file.originalname,
            walrus_blob_id: walrusResult.blobId,
            is_public: isPublic,
          },
          gas_budget: 10000000,
        }
      : null;

    res.json({
      walrus_blob_id: walrusResult.blobId,
      sui_transaction_digest: null, // Frontend will handle this
      document_id: null, // Will be set after Sui transaction
      message: 'Document uploaded to Walrus. Please sign the Sui transaction to complete.',
      sui_transaction_data: suiTransactionData,
      rag_processed: ragResult?.success || false,
      chunks_created: ragResult?.chunksCreated || 0,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
});

/**
 * POST /complete-upload - Complete upload after Sui transaction is signed
 * Body (multipart/form-data or JSON):
 *   - blob_id: Walrus blob ID
 *   - transaction_digest: Sui transaction digest
 *   - wallet_address: User's wallet address
 */
router.post('/complete-upload', upload.none(), async (req, res) => {
  try {
    const blobId = req.body.blob_id;
    const transactionDigest = req.body.transaction_digest;
    const walletAddress = req.body.wallet_address;

    if (!blobId) {
      return res.status(400).json({
        error: 'Missing blob_id',
        message: 'Please provide the blob_id',
      });
    }

    console.log(`Completing upload for blob: ${blobId}, tx: ${transactionDigest}`);

    // For now, just acknowledge the completion
    // In a production system, you might want to store this mapping
    res.json({
      status: 'success',
      message: 'Upload completed successfully',
      blob_id: blobId,
      transaction_digest: transactionDigest,
    });
  } catch (error) {
    console.error('Complete upload error:', error);
    res.status(500).json({
      error: 'Failed to complete upload',
      message: error.message,
    });
  }
});

// ============================================
// Document Retrieval Endpoints
// ============================================

/**
 * GET /download/:blobId - Download document from Walrus
 */
router.get('/download/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;

    console.log(`Downloading blob: ${blobId}`);

    const content = await walrusService.downloadBlob(blobId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${blobId}"`);
    res.setHeader('Content-Length', content.length);

    res.send(content);
  } catch (error) {
    console.error('Download error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Document not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Download failed',
      message: error.message,
    });
  }
});

/**
 * GET /documents/:walletAddress - Get documents for a wallet (placeholder)
 * Note: In the Express version, document listing is handled by the frontend
 * querying the Sui blockchain directly. This endpoint is kept for compatibility.
 */
router.get('/documents/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  // Return empty list - frontend should query Sui blockchain directly
  res.json({
    documents: [],
    total: 0,
    message: 'Document listing is handled by frontend via Sui blockchain queries',
  });
});

/**
 * GET /documents/:walletAddress/:documentId - Get specific document metadata
 */
router.get('/documents/:walletAddress/:documentId', async (req, res) => {
  const { walletAddress, documentId } = req.params;

  // Return not implemented - frontend should query Sui blockchain directly
  res.json({
    message: 'Document metadata is handled by frontend via Sui blockchain queries',
    documentId,
    walletAddress,
  });
});

/**
 * DELETE /documents/:blobId - Delete document embeddings from RAG
 */
router.delete('/documents/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;

    console.log(`Deleting document embeddings for blob: ${blobId}`);

    const result = ragService.deleteDocument(blobId);

    res.json({
      message: 'Document embeddings deleted',
      blob_id: blobId,
      deleted_chunks: result.deletedChunks,
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message,
    });
  }
});

/**
 * GET /stats/:blobId - Get RAG stats for a document
 */
router.get('/stats/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;

    const stats = ragService.getDocumentStats(blobId);

    res.json({
      blob_id: stats.blobId,
      total_chunks: stats.totalChunks,
      exists: stats.exists,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
    });
  }
});

// ============================================
// AI Query Endpoint
// ============================================

/**
 * POST /query - Query documents with AI
 * Body (JSON):
 *   - question: The question to ask
 *   - document_ids: Optional array of blob IDs to search (null for all)
 *   - wallet_address: Optional wallet address
 */
router.post('/query', async (req, res) => {
  try {
    const { question, document_ids, wallet_address } = req.body;

    if (!question) {
      return res.status(400).json({
        error: 'No question provided',
        message: 'Please provide a question',
      });
    }

    if (!ragService.isAvailable()) {
      return res.status(503).json({
        error: 'RAG service unavailable',
        message: 'The AI query service is not configured. Please set OPENAI_API_KEY.',
      });
    }

    console.log(`Query: "${question}" for wallet: ${wallet_address || 'any'}`);

    const result = await ragService.queryDocuments(question, document_ids);

    res.json({
      answer: result.answer,
      sources: result.sources,
      question: result.question,
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      error: 'Query failed',
      message: error.message,
    });
  }
});

export default router;
