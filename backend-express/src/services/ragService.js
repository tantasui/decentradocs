import OpenAI from 'openai';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import config from '../config.js';

class RAGService {
  constructor() {
    this.openai = null;
    this.available = false;

    // In-memory vector store: Map<blobId, Array<{chunkIndex, text, embedding, metadata}>>
    this.vectorStore = new Map();

    this.chunkSize = config.chunkSize;
    this.chunkOverlap = config.chunkOverlap;
    this.topK = config.similarityTopK;
    this.temperature = config.llmTemperature;

    this._initialize();
  }

  _initialize() {
    if (config.openaiApiKey) {
      try {
        this.openai = new OpenAI({
          apiKey: config.openaiApiKey,
        });
        this.available = true;
        console.log('RAG Service initialized with OpenAI');
      } catch (error) {
        console.warn('Failed to initialize OpenAI:', error.message);
        this.available = false;
      }
    } else {
      console.warn('RAG Service: OpenAI API key not configured');
      this.available = false;
    }
  }

  /**
   * Extract text from file content based on file type
   * @param {Buffer} content - File content
   * @param {string} filename - Original filename
   * @returns {Promise<string>} - Extracted text
   */
  async extractText(content, filename) {
    const extension = filename.toLowerCase().split('.').pop();

    try {
      switch (extension) {
        case 'pdf':
          const pdfData = await pdf(content);
          return pdfData.text;

        case 'txt':
        case 'md':
        case 'markdown':
        case 'py':
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
        case 'json':
        case 'yaml':
        case 'yml':
        case 'html':
        case 'css':
        case 'xml':
        case 'csv':
        case 'sql':
        case 'sh':
        case 'bash':
        case 'env':
        case 'gitignore':
        case 'dockerfile':
          return content.toString('utf-8');

        default:
          // Try to decode as text
          return content.toString('utf-8');
      }
    } catch (error) {
      console.error(`Error extracting text from ${filename}:`, error);
      // Fallback to raw text
      return content.toString('utf-8');
    }
  }

  /**
   * Split text into overlapping chunks
   * @param {string} text - Text to split
   * @returns {string[]} - Array of text chunks
   */
  splitIntoChunks(text) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += this.chunkSize - this.chunkOverlap;

      // Prevent infinite loop
      if (start >= text.length) break;
    }

    return chunks;
  }

  /**
   * Get embeddings for text using OpenAI
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async getEmbedding(text) {
    if (!this.available) {
      throw new Error('RAG Service not available');
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @returns {number} - Similarity score (0-1)
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Process and store a document for RAG
   * @param {string} blobId - Walrus blob ID
   * @param {Buffer} content - File content
   * @param {string} filename - Original filename
   * @param {object} metadata - Additional metadata
   * @returns {Promise<{success: boolean, blobId: string, chunksCreated: number, textLength: number}>}
   */
  async processDocument(blobId, content, filename, metadata = {}) {
    if (!this.available) {
      return {
        success: false,
        blobId,
        chunksCreated: 0,
        textLength: 0,
        error: 'RAG Service not available',
      };
    }

    try {
      // Extract text from file
      const text = await this.extractText(content, filename);

      if (!text || text.trim().length === 0) {
        return {
          success: false,
          blobId,
          chunksCreated: 0,
          textLength: 0,
          error: 'No text content extracted',
        };
      }

      // Split into chunks
      const chunks = this.splitIntoChunks(text);

      // Process each chunk
      const documentChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.getEmbedding(chunk);

        documentChunks.push({
          chunkIndex: i,
          text: chunk,
          embedding,
          metadata: {
            ...metadata,
            filename,
            blobId,
          },
        });
      }

      // Store in memory
      this.vectorStore.set(blobId, documentChunks);

      console.log(`Processed document ${filename}: ${chunks.length} chunks, ${text.length} chars`);

      return {
        success: true,
        blobId,
        chunksCreated: chunks.length,
        textLength: text.length,
      };
    } catch (error) {
      console.error('Error processing document:', error);
      return {
        success: false,
        blobId,
        chunksCreated: 0,
        textLength: 0,
        error: error.message,
      };
    }
  }

  /**
   * Query documents with a question
   * @param {string} question - User's question
   * @param {string[]|null} documentIds - Specific blob IDs to search (null for all)
   * @param {number} topK - Number of results to return
   * @returns {Promise<{answer: string, sources: Array, question: string}>}
   */
  async queryDocuments(question, documentIds = null, topK = null) {
    if (!this.available) {
      throw new Error('RAG Service not available');
    }

    topK = topK || this.topK;

    // Get question embedding
    const questionEmbedding = await this.getEmbedding(question);

    // Collect all relevant chunks
    const allChunks = [];

    if (documentIds && documentIds.length > 0) {
      // Search specific documents
      for (const docId of documentIds) {
        const chunks = this.vectorStore.get(docId);
        if (chunks) {
          allChunks.push(...chunks);
        }
      }
    } else {
      // Search all documents
      for (const chunks of this.vectorStore.values()) {
        allChunks.push(...chunks);
      }
    }

    if (allChunks.length === 0) {
      return {
        answer: "I don't have any documents to search. Please upload some documents first.",
        sources: [],
        question,
      };
    }

    // Calculate similarity scores
    const scoredChunks = allChunks.map(chunk => ({
      ...chunk,
      score: this.cosineSimilarity(questionEmbedding, chunk.embedding),
    }));

    // Sort by score and get top K
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, topK);

    // Build context from top chunks
    const context = topChunks
      .map((chunk, i) => `[Source ${i + 1}]: ${chunk.text}`)
      .join('\n\n');

    // Generate answer using OpenAI
    const systemPrompt = `You are a helpful assistant that answers questions based on the provided document context.
Use only the information from the context to answer the question.
If the context doesn't contain enough information to answer the question, say so.
Always cite your sources by referring to [Source N] when using information from the context.`;

    const userPrompt = `Context:
${context}

Question: ${question}

Please provide a comprehensive answer based on the context above.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      max_tokens: 1000,
    });

    const answer = completion.choices[0].message.content;

    // Format sources
    const sources = topChunks.map(chunk => ({
      blobId: chunk.metadata.blobId,
      excerpt: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''),
      chunkIndex: chunk.chunkIndex,
      score: chunk.score,
    }));

    return {
      answer,
      sources,
      question,
    };
  }

  /**
   * Delete document embeddings from the store
   * @param {string} blobId - Blob ID to delete
   * @returns {{success: boolean, deletedChunks: number}}
   */
  deleteDocument(blobId) {
    const chunks = this.vectorStore.get(blobId);
    const deletedChunks = chunks ? chunks.length : 0;

    this.vectorStore.delete(blobId);

    return {
      success: true,
      deletedChunks,
    };
  }

  /**
   * Get statistics for a document
   * @param {string} blobId - Blob ID to check
   * @returns {{blobId: string, totalChunks: number, exists: boolean}}
   */
  getDocumentStats(blobId) {
    const chunks = this.vectorStore.get(blobId);

    return {
      blobId,
      totalChunks: chunks ? chunks.length : 0,
      exists: !!chunks,
    };
  }

  /**
   * Check if service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.available;
  }

  /**
   * Get total documents and chunks in store
   * @returns {{totalDocuments: number, totalChunks: number}}
   */
  getStoreStats() {
    let totalChunks = 0;
    for (const chunks of this.vectorStore.values()) {
      totalChunks += chunks.length;
    }

    return {
      totalDocuments: this.vectorStore.size,
      totalChunks,
    };
  }
}

// Export singleton instance
const ragService = new RAGService();
export default ragService;
