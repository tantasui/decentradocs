import { useState } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import QueryInterface from './components/QueryInterface';
import './App.css';

function App() {
  const currentAccount = useCurrentAccount();
  const [documents, setDocuments] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = (data) => {
    console.log('Upload successful:', data);
    // Trigger document list refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDocumentsUpdate = (docs) => {
    setDocuments(docs);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>DecentraDocs</h1>
          <p className="subtitle">Decentralized Document Management & AI Query</p>
        </div>
        <div className="wallet-section">
          <ConnectButton />
        </div>
      </header>

      <main className="app-main">
        {currentAccount ? (
          <>
            <section className="welcome-section">
              <h2>Welcome</h2>
              <p>
                Connected as: <code>{currentAccount.address.slice(0, 12)}...{currentAccount.address.slice(-8)}</code>
              </p>
            </section>

            <div className="main-grid">
              <div className="left-panel">
                <DocumentUpload onUploadSuccess={handleUploadSuccess} />
                <DocumentList
                  onDocumentsUpdate={handleDocumentsUpdate}
                  refreshTrigger={refreshTrigger}
                />
              </div>

              <div className="right-panel">
                <QueryInterface documents={documents} />
              </div>
            </div>
          </>
        ) : (
          <section className="connect-prompt">
            <div className="prompt-content">
              <h2>Get Started</h2>
              <p>Connect your Sui wallet to:</p>
              <ul>
                <li>Upload documents to Walrus storage</li>
                <li>Mint document NFTs on Sui blockchain</li>
                <li>Query your documents with AI</li>
              </ul>
              <p className="cta">Click "Connect Wallet" above to begin</p>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Built with Walrus, Sui, OpenAI, and LangChain |{' '}
          <a
            href="https://github.com/your-repo"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
