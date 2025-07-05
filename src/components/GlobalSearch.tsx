import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, FolderOpen, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface SearchResult {
  tasks?: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    project: { name: string };
  }>;
  projects?: Array<{
    _id: string;
    name: string;
    status: string;
    progress: number;
  }>;
  users?: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    department: string;
  }>;
}

interface SearchSuggestion {
  type: 'task' | 'project' | 'user';
  text: string;
  id: string;
}

const GlobalSearch: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({});
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
        getSuggestions();
      } else {
        setResults({});
        setSuggestions([]);
        setTotalResults(0);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [query]);

  const performSearch = async () => {
    if (query.trim().length < 2) return;

    setIsLoading(true);
    try {
      const response = await axios.get('/search', {
        params: { q: query.trim(), limit: 5 }
      });
      setResults(response.data.results);
      setTotalResults(response.data.totalResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestions = async () => {
    if (query.trim().length < 2) return;

    try {
      const response = await axios.get('/search/suggestions', {
        params: { q: query.trim() }
      });
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Suggestions error:', error);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    setResults({});
    setSuggestions([]);
    setTotalResults(0);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'review': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search projects, tasks, users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2 || suggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : (
            <>
              {/* Suggestions */}
              {suggestions.length > 0 && query.length < 3 && (
                <div className="p-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2 px-2">Suggestions</p>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                    >
                      {suggestion.type === 'task' && <FileText className="w-4 h-4 mr-2 text-gray-400" />}
                      {suggestion.type === 'project' && <FolderOpen className="w-4 h-4 mr-2 text-gray-400" />}
                      {suggestion.type === 'user' && <User className="w-4 h-4 mr-2 text-gray-400" />}
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Search Results */}
              {totalResults > 0 ? (
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-500 mb-2 px-2">
                    {totalResults} result{totalResults !== 1 ? 's' : ''} found
                  </p>

                  {/* Tasks */}
                  {results.tasks && results.tasks.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1 px-2">Tasks</p>
                      {results.tasks.map((task) => (
                        <Link
                          key={task._id}
                          to={`/tasks/${task._id}`}
                          onClick={() => setIsOpen(false)}
                          className="block px-3 py-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {task.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {task.project.name}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusColor(task.status)}`}>
                                {task.status.replace('-', ' ')}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Projects */}
                  {results.projects && results.projects.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1 px-2">Projects</p>
                      {results.projects.map((project) => (
                        <Link
                          key={project._id}
                          to={`/projects/${project._id}`}
                          onClick={() => setIsOpen(false)}
                          className="block px-3 py-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {project.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {project.progress}% complete
                              </p>
                            </div>
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusColor(project.status)}`}>
                              {project.status.replace('-', ' ')}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Users (Admin only) */}
                  {user?.role === 'admin' && results.users && results.users.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1 px-2">Team Members</p>
                      {results.users.map((user) => (
                        <Link
                          key={user._id}
                          to={`/admin/users`}
                          onClick={() => setIsOpen(false)}
                          className="block px-3 py-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.department} • {user.email}
                              </p>
                            </div>
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : query.length >= 2 ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No results found for "{query}"</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;