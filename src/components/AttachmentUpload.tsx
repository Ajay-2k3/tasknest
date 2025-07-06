import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  File, 
  Image, 
  FileText, 
  Download, 
  Trash2,
  Eye,
  Paperclip
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

interface Attachment {
  _id: string;
  name: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: { _id: string; name: string };
  uploadedAt: string;
}

interface AttachmentUploadProps {
  taskId: string;
  attachments: Attachment[];
  onAttachmentUploaded: (attachment: Attachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  canUpload: boolean;
}

const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  taskId,
  attachments,
  onAttachmentUploaded,
  onAttachmentDeleted,
  canUpload
}) => {
  const { showSuccess, showError } = useNotification();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
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
      onAttachmentUploaded(response.data.attachment);
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
      onAttachmentDeleted(attachmentId);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleDownload = (attachment: Attachment) => {
    window.open(`${axios.defaults.baseURL}/files/${attachment.name}`, '_blank');
  };

  const handlePreview = (attachment: Attachment) => {
    if (attachment.mimeType.startsWith('image/') || attachment.mimeType === 'application/pdf') {
      setPreviewFile(attachment);
    } else {
      handleDownload(attachment);
    }
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
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Paperclip className="w-5 h-5 mr-2" />
        Attachments ({attachments.length})
      </h2>

      {/* Upload Area */}
      {canUpload && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-6 ${
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
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(attachment.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-3">
                Uploaded by {attachment.uploadedBy.name} on{' '}
                {new Date(attachment.uploadedAt).toLocaleDateString()}
              </div>

              {/* Preview for images */}
              {attachment.mimeType.startsWith('image/') && (
                <div className="mb-3">
                  <img
                    src={`${axios.defaults.baseURL}/files/${attachment.name}`}
                    alt={attachment.originalName}
                    className="w-full h-32 object-cover rounded cursor-pointer"
                    onClick={() => handlePreview(attachment)}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePreview(attachment)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {attachment.mimeType.startsWith('image/') || attachment.mimeType === 'application/pdf' ? 'Preview' : 'Open'}
                </button>
                
                <button
                  onClick={() => handleDownload(attachment)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </button>
                
                {canUpload && (
                  <button
                    onClick={() => handleDelete(attachment._id, attachment.originalName)}
                    className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Paperclip className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No attachments</h3>
          <p className="text-gray-500">
            {canUpload 
              ? 'Upload files to share with your team.'
              : 'No files have been attached to this task yet.'
            }
          </p>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setPreviewFile(null)}
            />

            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {previewFile.originalName}
                </h3>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="max-h-96 overflow-auto">
                {previewFile.mimeType.startsWith('image/') ? (
                  <img
                    src={`${axios.defaults.baseURL}/files/${previewFile.name}`}
                    alt={previewFile.originalName}
                    className="w-full h-auto"
                  />
                ) : previewFile.mimeType === 'application/pdf' ? (
                  <iframe
                    src={`${axios.defaults.baseURL}/files/${previewFile.name}`}
                    className="w-full h-96"
                    title={previewFile.originalName}
                  />
                ) : (
                  <div className="text-center py-8">
                    <File className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Preview not available for this file type</p>
                    <button
                      onClick={() => handleDownload(previewFile)}
                      className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUpload;