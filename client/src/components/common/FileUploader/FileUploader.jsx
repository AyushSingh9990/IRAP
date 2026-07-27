import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  acceptedDocumentTypes,
  documentMaxFileSize,
  formatFileSize,
} from '../../../config/documentConfig.js';
import Icon from '../Icon/Icon.jsx';
import styles from './FileUploader.module.css';

function messageForRejection(rejection) {
  const firstError = rejection.errors?.[0];
  if (firstError?.code === 'file-too-large') {
    return `The selected file exceeds ${formatFileSize(documentMaxFileSize)}.`;
  }
  if (firstError?.code === 'file-invalid-type') {
    return 'Upload PDF, JPG, JPEG, PNG, WEBP, DOC, or DOCX files only.';
  }
  return firstError?.message || 'The selected file could not be accepted.';
}

function FileUploader({
  file,
  onChange,
  onError,
  disabled = false,
  id,
  required = false,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}) {
  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        onError?.(messageForRejection(rejectedFiles[0]));
        onChange(null);
        return;
      }
      onError?.('');
      onChange(acceptedFiles[0] || null);
    },
    [onChange, onError],
  );

  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    accept: acceptedDocumentTypes,
    maxFiles: 1,
    maxSize: documentMaxFileSize,
    multiple: false,
    noClick: true,
    disabled,
    onDrop,
  });

  return (
    <div
      {...getRootProps({
        className: `${styles.dropzone} ${isDragActive ? styles.active : ''}`,
      })}
    >
      <input
        {...getInputProps({
          id,
          required,
          'aria-describedby': ariaDescribedBy,
          'aria-invalid': ariaInvalid,
        })}
      />
      <Icon name="upload" size={28} />
      {file ? (
        <div className={styles.fileDetails}>
          <strong>{file.name}</strong>
          <span>{formatFileSize(file.size)}</span>
        </div>
      ) : (
        <div>
          <strong>Drag one document here</strong>
          <p>PDF, JPG, JPEG, PNG, WEBP, DOC, or DOCX up to {formatFileSize(documentMaxFileSize)}.</p>
        </div>
      )}
      <button type="button" className={styles.browseButton} onClick={open} disabled={disabled}>
        {file ? 'Choose another file' : 'Browse files'}
      </button>
    </div>
  );
}

export default FileUploader;
