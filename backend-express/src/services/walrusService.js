import config from '../config.js';

class WalrusService {
  constructor() {
    this.publisherUrl = config.walrusPublisherUrl;
    this.aggregatorUrl = config.walrusAggregatorUrl;
    this.epochs = config.walrusEpochs;
  }

  /**
   * Upload a blob to Walrus storage
   * @param {Buffer} content - File content as buffer
   * @returns {Promise<{blobId: string, suiRefType: string, certifiedEpoch: number}>}
   */
  async uploadBlob(content) {
    const url = `${this.publisherUrl}/v1/blobs?epochs=${this.epochs}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: content,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Walrus upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Handle different response formats from Walrus
      // Can be { newlyCreated: { blobObject: {...} } } or { alreadyCertified: {...} }
      let blobInfo;
      if (result.newlyCreated) {
        blobInfo = result.newlyCreated.blobObject;
      } else if (result.alreadyCertified) {
        blobInfo = result.alreadyCertified;
      } else {
        // Fallback for direct response format
        blobInfo = result;
      }

      return {
        blobId: blobInfo.blobId || blobInfo.blob_id,
        suiRefType: result.newlyCreated ? 'newlyCreated' : 'alreadyCertified',
        certifiedEpoch: blobInfo.certifiedEpoch || blobInfo.certified_epoch || 0,
      };
    } catch (error) {
      console.error('Walrus upload error:', error);
      throw error;
    }
  }

  /**
   * Download a blob from Walrus storage
   * @param {string} blobId - The blob ID to download
   * @returns {Promise<Buffer>} - File content as buffer
   */
  async downloadBlob(blobId) {
    const url = `${this.aggregatorUrl}/v1/blobs/${blobId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Blob not found: ${blobId}`);
        }
        const errorText = await response.text();
        throw new Error(`Walrus download failed: ${response.status} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Walrus download error:', error);
      throw error;
    }
  }

  /**
   * Check if a blob exists in Walrus storage
   * @param {string} blobId - The blob ID to check
   * @returns {Promise<{exists: boolean, statusCode: number}>}
   */
  async checkBlobStatus(blobId) {
    const url = `${this.aggregatorUrl}/v1/blobs/${blobId}`;

    try {
      const response = await fetch(url, {
        method: 'HEAD',
      });

      return {
        exists: response.ok,
        statusCode: response.status,
      };
    } catch (error) {
      console.error('Walrus status check error:', error);
      return {
        exists: false,
        statusCode: 500,
      };
    }
  }
}

// Export singleton instance
const walrusService = new WalrusService();
export default walrusService;
