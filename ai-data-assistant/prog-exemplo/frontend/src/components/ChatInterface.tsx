import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Trash2,
  RotateCcw,
  Lightbulb,
  Clock,
  Database
} from 'lucide-react';
import { ChatMessage, generateId } from '@ai-data-assistant/shared';
import { chatApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';

interface ChatInterfaceProps {
  sessionId: string;
  onQueryResult?: (result: any) => void;
  currentTable?: string;
  availableTables?: string[];
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId,
  onQueryResult,
  currentTable,
  availableTables = [],
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // API hooks
  const { execute: sendMessage, loading: sendingMessage } = useApi(chatApi.sendMessage, {
    showToast: false
  });

  const { execute: loadHistory } = useApi(chatApi.getChatHistory, {
    showToast: false,
    onSuccess: (history) => {
      setMessages(history);
      setShowSuggestions(history.length === 0);
    }
  });

  const { execute: clearHistory } = useApi(chatApi.clearChatHistory, {
    onSuccess: () => {
      setMessages([]);
      setShowSuggestions(true);
      toast.success('Histórico limpo com sucesso');
    }
  });

  const { execute: loadSuggestions } = useApi(chatApi.getSuggestions, {
    showToast: false,
    onSuccess: setSuggestions
  });

  // Load initial data
  useEffect(() => {
    loadHistory(sessionId);
    loadSuggestions();
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sendingMessage) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const response = await sendMessage({
        message: userMessage.content,
        sessionId,
        context: {
          currentTable,
          availableTables,
          previousQueries: messages
            .filter(msg => msg.queryGenerated)
            .slice(-3)
            .map(msg => msg.queryGenerated!)
        }
      });

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        content: response.message.content,
        role: 'assistant',
        timestamp: new Date(),
        queryGenerated: response.sqlQuery,
        resultsCount: response.queryResult?.count
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If there's a query result, notify parent
      if (response.queryResult && onQueryResult) {
        onQueryResult({
          ...response.queryResult,
          query: response.sqlQuery,
          confidence: response.confidence
        });
      }
    } catch (error: any) {
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleClearHistory = () => {
    if (confirm('Tem certeza que deseja limpar o histórico de conversas?')) {
      clearHistory(sessionId);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`card flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            {currentTable && (
              <div className="flex items-center space-x-1 text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                <Database className="w-3 h-3" />
                <span>{currentTable}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => inputRef.current?.focus()}
              className="btn-outline px-2 py-1 text-xs"
              title="Focar no input"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            <button
              onClick={handleClearHistory}
              className="btn-outline px-2 py-1 text-xs"
              title="Limpar histórico"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && showSuggestions ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Olá! Como posso ajudar?
            </h3>
            <p className="text-gray-600 mb-6">
              Faça perguntas sobre seus dados em linguagem natural.
            </p>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                  <Lightbulb className="w-4 h-4" />
                  <span>Sugestões:</span>
                </div>
                <div className="grid gap-2 max-w-md mx-auto">
                  {suggestions.slice(0, 4).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.role === 'user' ? 'user' : ''}`}
              >
                <div className="flex-shrink-0">
                  {message.role === 'user' ? (
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`chat-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {message.queryGenerated && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                        <div className="text-gray-600 mb-1">Query gerada:</div>
                        <code>{message.queryGenerated}</code>
                      </div>
                    )}

                    {message.resultsCount !== undefined && (
                      <div className="mt-2 text-xs text-gray-600">
                        📊 {message.resultsCount} resultado(s) encontrado(s)
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="chat-message">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-600" />
            </div>
            <div className="chat-bubble assistant">
              <div className="loading-dots">
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="Digite sua pergunta sobre os dados..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendingMessage}
              className="input resize-none"
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sendingMessage}
            className="btn-primary px-3 py-2 disabled:opacity-50"
          >
            {sendingMessage ? (
              <div className="loading-dots">
                <div></div>
                <div></div>
                <div></div>
              </div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {availableTables.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Tabelas disponíveis: {availableTables.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;