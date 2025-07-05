import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, Download, Trash2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

interface FileUploadProps {
  taskId: string;
  attachments: Array<{
    _id: string;
    name: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
    uploadedBy: { _id: string; name: string };
    uploadedAt: string;
  }>;
  onFileUploaded: (attachment: any) => void;
  onFileDeleted: (attachmentId: string) => void;
  canUpload: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  taskId,
  attachments,
  onFileUploaded,
  onFileDeleted,
  canUpload
}) => {
  const { showSuccess, showError } = useNotification();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!canUpload) {
      showError('Error', 'You do not have permission to upload files to this task');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showError('Error', 'File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = /\.(jpg|jpeg|png|gif|pdf|doc|docx|txt|xlsx|xls|ppt|pptx)$/i;
    if (!allowedTypes.test(file.name)) {
      showError('Error', 'Only images and documents are allowed');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`/files/tasks/${taskId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Success', 'File uploaded successfully');
      onFileUploaded(response.data.attachment);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      await axios.delete(`/files/tasks/${taskId}/attachments/${attachmentId}`);
      showSuccess('Success', 'File deleted successfully');
      onFileDeleted(attachmentId);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleDownload = (attachment: any) => {
    window.open(`${axios.defaults.baseURL}/files/${attachment.name}`, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileText className="w-5 h-5 text-green-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUpload && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-1">
                Drag and drop a file here, or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-500">
                Max 10MB • Images, PDFs, Documents
              </p>
            </div>
          )}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Attachments ({attachments.length})
          </h4>
          
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(attachment.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)} • 
                      Uploaded by {attachment.uploadedBy.name} • 
                      {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  {canUpload && (
                    <button
                      onClick={() => handleDelete(attachment._id, attachment.originalName)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;