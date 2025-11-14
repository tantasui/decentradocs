import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import axios from 'axios';

// Sui package configuration - should match backend .env
const SUI_PACKAGE_ID = '0x29882692892abd61964dbff7de9364bb56a96c4fcfe45c26e3e4b4d4f722b48c';
const SUI_MODULE_NAME = 'registry';

function DocumentList({ onDocumentsUpdate, refreshTrigger }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();

  const fetchDocuments = useCallback(async () => {
    if (!currentAccount || !client) return;

    setLoading(true);
    setError(null);

    try {
      // Query owned objects of DocumentAsset type from Sui
      const objectType = `${SUI_PACKAGE_ID}::${SUI_MODULE_NAME}::DocumentAsset`;
      
      const ownedObjects = await client.getOwnedObjects({
        owner: currentAccount.address,
        filter: {
          StructType: objectType,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      // Parse the objects into document format
      const parsedDocuments = [];
      
      for (const obj of ownedObjects.data) {
        if (obj.data && obj.data.content && 'fields' in obj.data.content) {
          const fields = obj.data.content.fields;
          parsedDocuments.push({
            id: obj.data.objectId,
            name: fields.name || '',
            owner: fields.owner || currentAccount.address,
            walrus_blob_id: fields.walrus_blob_id || '',
            uploaded_at: fields.uploaded_at || 0,
            is_public: fields.is_public || false,
          });
        }
      }

      setDocuments(parsedDocuments);

      if (onDocumentsUpdate) {
        onDocumentsUpdate(parsedDocuments);
      }

    } catch (err) {
      setError(err.message || 'Failed to load documents');
      console.error('Fetch documents error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentAccount, client]);

  useEffect(() => {
    if (currentAccount && client) {
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [currentAccount, refreshTrigger, client, fetchDocuments]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Sui timestamps are in milliseconds
    try {
      const date = new Date(Number(timestamp));
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  if (!currentAccount) {
    return (
      <div className="document-list">
        <h2>My Documents</h2>
        <p className="info">Connect your wallet to view your documents</p>
      </div>
    );
  }

  return (
    <div className="document-list">
      <div className="list-header">
        <h2>My Documents</h2>
        <button onClick={fetchDocuments} disabled={loading} className="btn-secondary">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <p>Loading documents...</p>}

      {!loading && documents.length === 0 && (
        <p className="info">No documents found. Upload your first document!</p>
      )}

      {!loading && documents.length > 0 && (
        <div className="documents-grid">
          {documents.map((doc) => (
            <div key={doc.id} className="document-card">
              <h3>{doc.name}</h3>
              <div className="document-details">
                <p>
                  <strong>Blob ID:</strong>{' '}
                  <span className="blob-id">{doc.walrus_blob_id.slice(0, 20)}...</span>
                </p>
                <p>
                  <strong>Uploaded:</strong> {formatDate(doc.uploaded_at)}
                </p>
                <p>
                  <strong>Visibility:</strong>{' '}
                  <span className={doc.is_public ? 'public' : 'private'}>
                    {doc.is_public ? 'Public' : 'Private'}
                  </span>
                </p>
              </div>
              <div className="document-actions">
                <a
                  href={`/api/download/${doc.walrus_blob_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && documents.length > 0 && (
        <p className="document-count">
          Total: {documents.length} document(s)
        </p>
      )}
    </div>
  );
}

export default DocumentList;
