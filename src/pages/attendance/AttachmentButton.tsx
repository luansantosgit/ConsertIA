import React, { useEffect, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { AttachmentMenu } from './AttachmentMenu';
import { CameraCaptureModal } from './camera/CameraCaptureModal';

interface AttachmentButtonProps {
  disabled?: boolean;
  onSendFile: (file: File) => void;
  onFilesAdded: (files: File[]) => void;
  onMenuOpen?: () => void;
}

/** Clipe do chat: balão com câmera própria, galeria e documentos. */
export const AttachmentButton: React.FC<AttachmentButtonProps> = ({
  disabled,
  onSendFile,
  onFilesAdded,
  onMenuOpen,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);

  // Fecha o balão ao clicar fora ou pressionar Esc (padrão do EmojiPicker).
  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    if (!menuOpen) onMenuOpen?.();
    setMenuOpen(previous => !previous);
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 1) onSendFile(files[0]);
    else if (files.length > 1) onFilesAdded(files);
  };

  const openGallery = () => {
    setMenuOpen(false);
    galleryRef.current?.click();
  };

  const openDocument = () => {
    setMenuOpen(false);
    documentRef.current?.click();
  };

  const openCamera = () => {
    setMenuOpen(false);
    setCameraOpen(true);
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={handleFiles}
      />
      <input
        ref={documentRef}
        type="file"
        accept="audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
        multiple
        hidden
        onChange={handleFiles}
      />

      <button
        type="button"
        className="chat-icon-btn"
        onClick={toggleMenu}
        disabled={disabled}
        title="Anexar"
        aria-label="Anexar arquivo ou mídia"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <Paperclip size={18} />
      </button>

      {menuOpen && (
        <AttachmentMenu
          onCamera={openCamera}
          onGallery={openGallery}
          onDocument={openDocument}
        />
      )}

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={onSendFile}
      />
    </div>
  );
};
