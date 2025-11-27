import axios, { AxiosInstance } from 'axios';
import { getConfig } from '../config';

export class WalrusService {
  private publisherUrl: string;
  private aggregatorUrl: string;
  private epochs: number;
  private client: AxiosInstance;

  constructor() {
    const config = getConfig();
    this.publisherUrl = config.walrusPublisherUrl;
    this.aggregatorUrl = config.walrusAggregatorUrl;
    this.epochs = config.walrusEpochs;

    this.client = axios.create({
      timeout: 60000,
    });
  }

  async uploadBlob(content: Buffer): Promise<{
    blob_id: string;
    sui_ref_type: string;
    certified_epoch: number;
  }> {
    try {
      const response = await this.client.put(
        `${this.publisherUrl}/v1/blobs`,
        content,
        {
          params: { epochs: this.epochs },
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        }
      );

      const result = response.data;

      // Handle different response formats
      if (result.newlyCreated) {
        const blobData = result.newlyCreated.blobObject;
        return {
          blob_id: blobData.blobId,
          sui_ref_type: 'newlyCreated',
          certified_epoch: blobData.certifiedEpoch || 0,
        };
      } else if (result.alreadyCertified) {
        const blobData = result.alreadyCertified.blobObject;
        return {
          blob_id: blobData.blobId,
          sui_ref_type: 'alreadyCertified',
          certified_epoch: blobData.certifiedEpoch || 0,
        };
      } else {
        throw new Error(`Unexpected Walrus response format: ${JSON.stringify(result)}`);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message;
        throw new Error(`Failed to upload to Walrus: ${message}`);
      }
      throw new Error(`Failed to upload to Walrus: ${error}`);
    }
  }

  async downloadBlob(blobId: string): Promise<Buffer> {
    try {
      const response = await this.client.get(
        `${this.aggregatorUrl}/v1/blobs/${blobId}`,
        {
          responseType: 'arraybuffer',
        }
      );
      return Buffer.from(response.data);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to download from Walrus: ${error.message}`);
      }
      throw new Error(`Failed to download from Walrus: ${error}`);
    }
  }

  async checkBlobStatus(blobId: string): Promise<{
    exists: boolean;
    status_code: number | null;
  }> {
    try {
      const response = await this.client.head(
        `${this.aggregatorUrl}/v1/blobs/${blobId}`
      );
      return {
        exists: response.status === 200,
        status_code: response.status,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          exists: false,
          status_code: error.response.status,
        };
      }
      return {
        exists: false,
        status_code: null,
      };
    }
  }
}

