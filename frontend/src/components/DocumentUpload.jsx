import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import axios from 'axios';

function DocumentUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setUploadResult(null);

    try {
      // Step 1: Upload to Walrus and get transaction data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet_address', currentAccount.address);
      formData.append('is_public', isPublic);

      const response = await axios.post('/api/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
      setSuccess(`Document uploaded to Walrus! Blob ID: ${response.data.walrus_blob_id}`);

      // Step 2: If Sui transaction data is provided, prompt user to sign
      if (response.data.sui_transaction_data) {
        await handleSignTransaction(response.data);
      } else {
        // No Sui transaction needed, complete
        setFile(null);
        if (onUploadSuccess) {
          onUploadSuccess(response.data);
        }
        document.getElementById('file-input').value = '';
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignTransaction = async (uploadData) => {
    if (!uploadData.sui_transaction_data) {
      return;
    }

    setSigning(true);
    setError(null);

    try {
      const txData = uploadData.sui_transaction_data;
      
      // Construct the transaction
      const tx = new Transaction();
      
      // Convert strings to bytes (vector<u8>)
      const nameBytes = new TextEncoder().encode(txData.arguments.name);
      const blobIdBytes = new TextEncoder().encode(txData.arguments.walrus_blob_id);
      
      // Build the move call
      tx.moveCall({
        target: `${txData.package_id}::${txData.module_name}::${txData.function_name}`,
        arguments: [
          tx.pure.vector('u8', Array.from(nameBytes)),
          tx.pure.vector('u8', Array.from(blobIdBytes)),
          tx.pure.bool(txData.arguments.is_public),
          tx.object('0x6'), // Clock object
        ],
      });

      // Sign and execute the transaction
      signAndExecute(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        },
        {
          onSuccess: async (result) => {
            console.log('Transaction successful:', result);
            
            // Step 3: Complete the upload by sending transaction digest to backend
            try {
              const completeFormData = new FormData();
              completeFormData.append('blob_id', uploadData.walrus_blob_id);
              completeFormData.append('transaction_digest', result.digest);
              completeFormData.append('wallet_address', currentAccount.address);

              await axios.post('/api/complete-upload', completeFormData);

              setSuccess(
                `Document uploaded successfully! Blob ID: ${uploadData.walrus_blob_id}, Transaction: ${result.digest}`
              );
              setFile(null);
              
              if (onUploadSuccess) {
                onUploadSuccess({
                  ...uploadData,
                  sui_transaction_digest: result.digest,
                });
              }
              
              document.getElementById('file-input').value = '';
            } catch (err) {
              console.error('Failed to complete upload:', err);
              setError('Transaction signed but failed to complete upload. Transaction: ' + result.digest);
            }
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            setError(`Transaction failed: ${error.message || 'User rejected or transaction failed'}`);
          },
        }
      );
    } catch (err) {
      console.error('Failed to construct transaction:', err);
      setError(`Failed to construct transaction: ${err.message}`);
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="document-upload">
      <h2>Upload Document</h2>

      <div className="upload-form">
        <div className="form-group">
          <label htmlFor="file-input">Select File (PDF, TXT, etc.)</label>
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.txt,.md,.doc,.docx"
            disabled={loading || !currentAccount}
          />
        </div>

        {file && (
          <div className="file-info">
            <p>Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
          </div>
        )}

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={loading}
            />
            Make document public
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={loading || signing || !file || !currentAccount}
          className="btn-primary"
        >
          {signing ? 'Signing Transaction...' : loading ? 'Uploading...' : 'Upload to Walrus & Sui'}
        </button>
        
        {uploadResult && uploadResult.sui_transaction_data && !signing && (
          <div className="transaction-prompt">
            <p>Please approve the transaction in your wallet to mint the document NFT on Sui.</p>
          </div>
        )}

        {!currentAccount && (
          <p className="warning">Please connect your wallet to upload documents</p>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </div>
  );
}

export default DocumentUpload;
