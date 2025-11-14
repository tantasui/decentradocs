import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import axios from 'axios';

function QueryInterface({ documents }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentAccount = useCurrentAccount();

  const handleQuery = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      // Prepare document IDs from user's documents
      const documentIds = documents?.map(doc => doc.walrus_blob_id) || [];

      const response = await axios.post('/api/query', {
        question: question.trim(),
        document_ids: documentIds.length > 0 ? documentIds : null,
        wallet_address: currentAccount?.address || null,
      });

      setAnswer(response.data);

    } catch (err) {
      setError(err.response?.data?.detail || 'Query failed. Please try again.');
      console.error('Query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <div className="query-interface">
      <h2>Ask Questions About Your Documents</h2>

      <div className="query-form">
        <div className="form-group">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documents..."
            rows="4"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleQuery}
          disabled={loading || !question.trim()}
          className="btn-primary"
        >
          {loading ? 'Searching...' : 'Ask AI'}
        </button>

        {documents && documents.length > 0 && (
          <p className="info">
            Searching across {documents.length} document(s)
          </p>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>

      {answer && (
        <div className="answer-section">
          <h3>Answer:</h3>
          <div className="answer-content">
            <p>{answer.answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default QueryInterface;
